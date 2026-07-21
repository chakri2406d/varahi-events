import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import QRCode from 'react-qr-code'
import {
  ArrowLeft, Check, Clock, Circle, X, Calendar, MapPin, Download,
  CalendarPlus, ExternalLink, Users, Package, IndianRupee, Upload,
  CheckCircle, Copy, Star,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import {
  getBookingById, paymentBreakdown, submitBalancePayment,
  addReview, getReviewForBooking,
} from '../firebase/firestore'
import { uploadPaymentProof } from '../firebase/storage'
import { generateInvoice } from '../utils/invoiceGenerator'
import { downloadIcs, googleCalendarUrl } from '../utils/calendarExport'
import { STATUS_LABELS, STATUS_COLORS, ADDONS, BUSINESS_INFO } from '../utils/constants'
import { fmt, fmtFull } from '../utils/dateUtils'

const STEP_ORDER = ['requested', 'payment_pending', 'confirmed', 'event_started', 'completed']

const STEP_LABELS = {
  requested:       'Requested',
  payment_pending: 'Payment Submitted',
  confirmed:       'Confirmed',
  event_started:   'Event Started',
  completed:       'Completed',
}

// Firestore Timestamp or ISO string -> formatted string, or null if unusable.
// Centralised so every timeline entry (including the cancelled node) formats the same way.
const formatTs = (raw) => {
  if (!raw) return null
  const date = raw?.toDate ? raw.toDate() : raw
  const out = fmtFull(date)
  return out === '—' ? null : out
}

const stepTimestampFor = (booking, key) => formatTs({
  requested:       booking.createdAt,
  payment_pending: booking.paymentSubmittedAt,
  confirmed:       booking.confirmedAt,
  event_started:   booking.startedAt,
  completed:       booking.endedAt,
}[key])

function StatusTimeline({ booking }) {
  // Cancelled bookings don't continue the normal stepper — show only the
  // steps that genuinely happened, then a distinct red "Cancelled" node.
  if (booking.status === 'cancelled') {
    const priorSteps = STEP_ORDER
      .map(key => ({ key, label: STEP_LABELS[key], ts: stepTimestampFor(booking, key) }))
      .filter(s => s.ts)

    return (
      <div>
        {priorSteps.map(s => (
          <div key={s.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background:'rgba(34,197,94,0.12)', border:'1px solid rgba(134,239,172,0.4)' }}>
                <Check size={13} style={{ color:'#86efac' }}/>
              </div>
              <div className="w-px flex-1 my-1" style={{ background:'rgba(61,30,40,0.8)' }}/>
            </div>
            <div className="pb-5">
              <p className="text-sm font-medium text-white">{s.label}</p>
              <p className="text-xs mt-0.5" style={{ color:'#9C7A82' }}>{s.ts}</p>
            </div>
          </div>
        ))}
        <div className="flex gap-3">
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(252,165,165,0.4)' }}>
            <X size={13} style={{ color:'#fca5a5' }}/>
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color:'#fca5a5' }}>Cancelled</p>
            {formatTs(booking.cancelledAt) && (
              <p className="text-xs mt-0.5" style={{ color:'#9C7A82' }}>{formatTs(booking.cancelledAt)}</p>
            )}
            {booking.cancellationReason && (
              <p className="text-xs mt-1" style={{ color:'#9C7A82' }}>&ldquo;{booking.cancellationReason}&rdquo;</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  const currentIndex = STEP_ORDER.indexOf(booking.status)

  return (
    <div>
      {STEP_ORDER.map((key, i) => {
        const isDone    = currentIndex > i
        const isCurrent = currentIndex === i
        const isLast    = i === STEP_ORDER.length - 1
        const ts        = stepTimestampFor(booking, key)
        const color     = isDone ? '#86efac' : isCurrent ? '#E8B86D' : '#9C7A82'
        const Icon      = isDone ? Check : isCurrent ? Clock : Circle

        return (
          <div key={key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: isDone ? 'rgba(34,197,94,0.12)' : isCurrent ? 'rgba(201,147,58,0.15)' : 'rgba(13,5,8,0.6)',
                  border: `1px solid ${isDone ? 'rgba(134,239,172,0.4)' : isCurrent ? 'rgba(201,147,58,0.5)' : 'rgba(61,30,40,0.8)'}`,
                }}>
                <Icon size={13} style={{ color }}/>
              </div>
              {!isLast && <div className="w-px flex-1 my-1" style={{ background:'rgba(61,30,40,0.8)' }}/>}
            </div>
            <div className={isLast ? '' : 'pb-5'}>
              <p className="text-sm font-medium" style={{ color: isCurrent ? '#E8B86D' : '#fff' }}>
                {STEP_LABELS[key]}
              </p>
              {ts && <p className="text-xs mt-0.5" style={{ color:'#9C7A82' }}>{ts}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function BookingDetail() {
  const { id } = useParams()
  const { user, loading: authLoading } = useAuth()
  const [booking,  setBooking]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)

  // ── Pay Remaining Balance ──────────────────────────────────────────────
  const [balanceOpen,       setBalanceOpen]       = useState(false)
  const [balanceAmount,     setBalanceAmount]     = useState('')
  const [balanceTxnId,      setBalanceTxnId]      = useState('')
  const [balanceFile,       setBalanceFile]       = useState(null)
  const [balancePreviewUrl, setBalancePreviewUrl] = useState(null)
  const [balanceSubmitting, setBalanceSubmitting] = useState(false)
  const [copiedUpi,         setCopiedUpi]         = useState(false)

  // ── Leave a Review ──────────────────────────────────────────────────────
  const [review,            setReview]            = useState(null)  // existing review, or null
  const [reviewChecked,     setReviewChecked]     = useState(false) // avoids a form flash before we know
  const [rating,            setRating]            = useState(0)
  const [hoverRating,       setHoverRating]       = useState(0)
  const [comment,           setComment]           = useState('')
  const [reviewSubmitting,  setReviewSubmitting]  = useState(false)

  useEffect(() => {
    if (authLoading) return   // wait for auth to resolve before judging ownership
    if (!user) {
      setNotFound(true)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    getBookingById(id)
      .then(b => {
        if (cancelled) return
        // SECURITY: a booking that doesn't exist, or belongs to someone else,
        // must never be rendered — show the same generic "not found" either way.
        if (!b || b.userId !== user.uid) setNotFound(true)
        else setBooking(b)
      })
      .catch(() => { if (!cancelled) setNotFound(true) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [id, user, authLoading])

  // Re-fetches the booking without touching loading/notFound state — used
  // after a balance payment submission so the "awaiting verification" notice
  // appears immediately, without a full page reload.
  const refreshBooking = async () => {
    try {
      const b = await getBookingById(id)
      if (b) setBooking(b)
    } catch { /* keep showing the stale copy rather than erroring out */ }
  }

  // A completed booking may already have a review — fetch it once so we can
  // show the read-only thank-you card instead of the submission form.
  useEffect(() => {
    if (!booking || booking.status !== 'completed') return
    let cancelled = false
    getReviewForBooking(booking.id)
      .then(r => { if (!cancelled) setReview(r) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setReviewChecked(true) })
    return () => { cancelled = true }
  }, [booking?.id, booking?.status])

  const handleInvoice = () => {
    if (booking) generateInvoice(booking)
  }

  const handleIcs = () => {
    if (!booking) return
    const ok = downloadIcs(booking)
    if (!ok) toast.error('No event date set for this booking yet')
  }

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(BUSINESS_INFO.upiId)
    setCopiedUpi(true)
    toast.success('UPI ID copied!')
    setTimeout(() => setCopiedUpi(false), 2500)
  }

  const handleBalanceFileSelect = (f) => {
    if (!f) return
    if (!f.type.startsWith('image/')) { toast.error('Please upload an image file'); return }
    if (f.size > 3 * 1024 * 1024) { toast.error('File too large. Max 3MB. Please screenshot and crop tightly.'); return }
    setBalanceFile(f)
    setBalancePreviewUrl(URL.createObjectURL(f))
  }

  const handleBalanceSubmit = async () => {
    const amt = Number(balanceAmount)
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return }
    if (amt > balance) {
      toast.error(`Amount cannot exceed the balance due (₹${balance.toLocaleString('en-IN')})`)
      return
    }
    if (!balanceTxnId.trim()) { toast.error('Enter the Transaction ID / UTR'); return }

    setBalanceSubmitting(true)
    try {
      let proofUrl = null
      if (balanceFile) {
        // Best-effort — a failed screenshot upload must never block the
        // payment submission itself (mirrors PaymentSection's behaviour).
        try {
          proofUrl = await uploadPaymentProof(booking.id, balanceFile)
        } catch (uploadErr) {
          console.warn('Screenshot upload failed:', uploadErr)
          proofUrl = null
        }
      }

      await submitBalancePayment(booking.id, {
        amount:        amt,
        transactionId: balanceTxnId.trim(),
        proofUrl,
      })

      toast.success('Payment submitted! Admin will verify shortly.')
      setBalanceOpen(false)
      setBalanceAmount('')
      setBalanceTxnId('')
      setBalanceFile(null)
      setBalancePreviewUrl(null)
      await refreshBooking()
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to submit payment')
    } finally {
      setBalanceSubmitting(false)
    }
  }

  const handleReviewSubmit = async () => {
    if (!rating) { toast.error('Please select a star rating'); return }
    const text = comment.trim()
    if (text.length < 10) { toast.error('Please write a few words about your experience'); return }

    setReviewSubmitting(true)
    try {
      // addReview sets approved:false itself — the Firestore rules only
      // allow a customer-created review to have approved==false, so we must
      // NOT pass an approved field here.
      await addReview({
        bookingId:    booking.id,
        userId:       user.uid,
        customerName: booking.customerName || '',
        rating,
        comment:      text,
      })
      setReview({ rating, comment: text, approved: false })
      toast.success('Thanks for your review! It will appear on the site once approved.')
    } catch (err) {
      console.error(err)
      toast.error('Failed to submit review. Please try again.')
    } finally {
      setReviewSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-3xl mx-auto px-4 space-y-4">
          <div className="skeleton h-8 w-40 rounded-lg"/>
          <div className="skeleton h-40 rounded-2xl"/>
          <div className="skeleton h-40 rounded-2xl"/>
          <div className="skeleton h-40 rounded-2xl"/>
        </div>
      </div>
    )
  }

  if (notFound || !booking) {
    return (
      <div className="min-h-screen py-16">
        <div className="max-w-md mx-auto px-4 text-center glass-card p-10">
          <h2 className="text-white font-semibold text-lg mb-2">Booking not found</h2>
          <p className="text-sm mb-6" style={{ color:'#9C7A82' }}>
            This booking doesn&apos;t exist, or you don&apos;t have access to it.
          </p>
          <Link to="/dashboard" className="btn-primary">
            <ArrowLeft size={14}/> Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const pb      = paymentBreakdown(booking)
  const total   = Number(booking.totalAmount || 0)
  const paid    = pb.total
  const balance = Math.max(0, total - paid)
  const addonLabels = (booking.addons || []).map(a => ADDONS.find(x => x.id === a)?.label || a)
  const showCalendarActions = ['confirmed', 'event_started'].includes(booking.status) && !!booking.eventDate
  // Only offer a fresh submission when there isn't one already awaiting verification —
  // the Payment section above shows that notice, so we don't want a second form.
  const showBalanceSection = ['confirmed', 'event_started'].includes(booking.status)
    && balance > 0 && !booking.pendingPayment
  const showReviewSection = booking.status === 'completed'
  const upiLink = `upi://pay?pa=${BUSINESS_INFO.upiId}&pn=Varahi+Events&cu=INR`

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-3xl mx-auto px-4">

        {/* Header */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="mb-6">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs mb-4"
            style={{ color:'#9C7A82' }}>
            <ArrowLeft size={13}/> Back to Dashboard
          </Link>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs font-mono mb-1" style={{ color:'#9C7A82' }}>
                #{booking.bookingId || booking.id?.slice(0, 8).toUpperCase()}
              </p>
              <h1 className="font-display font-bold text-2xl text-white">
                {booking.machines?.map(m => m.name || m).join(', ') || 'Event Booking'}
              </h1>
            </div>
            <span className={STATUS_COLORS[booking.status] || 'badge-gold'}>
              {STATUS_LABELS[booking.status] || booking.status}
            </span>
          </div>
        </motion.div>

        {/* Status timeline */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.05 }}
          className="glass-card p-5 mb-5">
          <h2 className="text-white font-semibold text-sm mb-4">Status</h2>
          <StatusTimeline booking={booking}/>
        </motion.div>

        {/* Event details */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
          className="glass-card p-5 mb-5">
          <h2 className="text-white font-semibold text-sm mb-4">Event Details</h2>
          <div className="space-y-2.5 text-sm">
            {booking.eventDate && (
              <div className="flex items-center gap-2" style={{ color:'#9C7A82' }}>
                <Calendar size={14} style={{ color:'#C9933A' }}/>
                {fmt(booking.eventDate)}
                {booking.eventTime && <span> · {booking.eventTime}</span>}
              </div>
            )}
            {booking.eventLocation && (
              <div className="flex items-center gap-2" style={{ color:'#9C7A82' }}>
                <MapPin size={14} style={{ color:'#C9933A' }}/>
                {booking.eventLocation}
              </div>
            )}
            {booking.notes && (
              <p className="text-xs pt-2" style={{ color:'#9C7A82', borderTop:'1px solid rgba(61,30,40,0.6)' }}>
                {booking.notes}
              </p>
            )}
            {!booking.eventDate && !booking.eventLocation && !booking.notes && (
              <p className="text-xs" style={{ color:'#9C7A82' }}>No event details added yet.</p>
            )}
          </div>
        </motion.div>

        {/* Equipment */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}
          className="glass-card p-5 mb-5">
          <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <Package size={15} style={{ color:'#C9933A' }}/> Equipment
          </h2>

          {booking.machines?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs" style={{ color:'#9C7A82' }}>
                    <th className="pb-2 font-normal">Item</th>
                    <th className="pb-2 font-normal text-right">Qty</th>
                    <th className="pb-2 font-normal text-right">Unit Price</th>
                    <th className="pb-2 font-normal text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.machines.map((m, i) => {
                    const qty = Number(m.qty || 1)
                    const hasPrice = m.price != null
                    return (
                      <tr key={i} style={{ borderTop:'1px solid rgba(61,30,40,0.6)' }}>
                        <td className="py-2 text-white">{m.name || m}</td>
                        <td className="py-2 text-right" style={{ color:'#9C7A82' }}>{qty}</td>
                        <td className="py-2 text-right" style={{ color:'#9C7A82' }}>
                          {hasPrice ? `₹${Number(m.price).toLocaleString('en-IN')}` : 'On request'}
                        </td>
                        <td className="py-2 text-right font-medium" style={{ color:'#C9933A' }}>
                          {hasPrice ? `₹${(Number(m.price) * qty).toLocaleString('en-IN')}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs" style={{ color:'#9C7A82' }}>No equipment listed.</p>
          )}

          {addonLabels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4 pt-4" style={{ borderTop:'1px solid rgba(61,30,40,0.6)' }}>
              {addonLabels.map((label, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md text-[11px]"
                  style={{ background:'rgba(13,5,8,0.6)', border:'1px solid rgba(61,30,40,0.6)', color:'#9C7A82' }}>
                  {label}
                </span>
              ))}
            </div>
          )}
        </motion.div>

        {/* Payment */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
          className="glass-card p-5 mb-5">
          <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <IndianRupee size={15} style={{ color:'#C9933A' }}/> Payment
          </h2>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <p className="text-xs" style={{ color:'#9C7A82' }}>Total</p>
              <p className="font-semibold" style={{ color:'#C9933A' }}>₹{total.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color:'#9C7A82' }}>Paid</p>
              <p className="font-semibold" style={{ color:'#86efac' }}>₹{paid.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color:'#9C7A82' }}>Balance Due</p>
              <p className="font-semibold" style={{ color:'#fca5a5' }}>₹{balance.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {booking.pendingPayment && (
            <div className="rounded-xl p-3 mb-4 flex items-center gap-2"
              style={{ background:'rgba(201,147,58,0.08)', border:'1px solid rgba(201,147,58,0.25)' }}>
              <Clock size={13} style={{ color:'#E8B86D', flexShrink:0 }}/>
              <p className="text-xs" style={{ color:'#E8B86D' }}>
                Payment submitted — awaiting verification. Amount ₹{Number(booking.pendingPayment.amount || 0).toLocaleString('en-IN')}
                {booking.pendingPayment.transactionId && <> · Txn ID: {booking.pendingPayment.transactionId}</>}
              </p>
            </div>
          )}

          {booking.payments?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs" style={{ color:'#9C7A82' }}>
                    <th className="pb-2 font-normal">Date</th>
                    <th className="pb-2 font-normal">Method</th>
                    <th className="pb-2 font-normal">Reference</th>
                    <th className="pb-2 font-normal text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.payments.map((p, i) => (
                    <tr key={i} style={{ borderTop:'1px solid rgba(61,30,40,0.6)' }}>
                      <td className="py-2" style={{ color:'#9C7A82' }}>{fmt(p.date, 'dd MMM yyyy')}</td>
                      <td className="py-2 capitalize text-white">{p.method}</td>
                      <td className="py-2 font-mono text-xs" style={{ color:'#9C7A82' }}>{p.reference || '—'}</td>
                      <td className="py-2 text-right font-medium" style={{ color:'#86efac' }}>
                        ₹{Number(p.amount || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs" style={{ color:'#9C7A82' }}>No payments recorded yet.</p>
          )}
        </motion.div>

        {/* Pay Remaining Balance — customer-initiated top-up, mirrors PaymentSection's UPI+screenshot flow */}
        {showBalanceSection && (
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.22 }}
            className="glass-card p-5 mb-5">
            {!balanceOpen ? (
              <button
                onClick={() => { setBalanceOpen(true); setBalanceAmount(String(balance)) }}
                className="btn-primary w-full justify-center"
              >
                <IndianRupee size={14}/> Pay Remaining Balance
              </button>
            ) : (
              <div>
                <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                  <IndianRupee size={15} style={{ color:'#C9933A' }}/> Pay Remaining Balance
                </h2>

                {/* QR Code */}
                <div className="flex flex-col items-center mb-4">
                  <div className="p-4 rounded-2xl bg-white mb-2">
                    <QRCode value={upiLink} size={140} level="M" fgColor="#0D0508"/>
                  </div>
                  <p className="text-xs" style={{ color:'#9C7A82' }}>Scan with any UPI app</p>
                </div>

                {/* UPI ID copy */}
                <div className="flex items-center justify-between p-4 rounded-xl mb-4"
                  style={{ background:'rgba(13,5,8,0.8)', border:'1px solid rgba(61,30,40,0.8)' }}>
                  <div>
                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color:'#9C7A82' }}>UPI ID</p>
                    <p className="font-mono font-semibold text-white">{BUSINESS_INFO.upiId}</p>
                  </div>
                  <button onClick={handleCopyUpi}
                    className="p-2 rounded-lg transition-all"
                    style={{
                      background: copiedUpi ? 'rgba(34,197,94,0.1)' : 'transparent',
                      border: `1px solid ${copiedUpi ? 'rgba(34,197,94,0.4)' : 'rgba(61,30,40,0.8)'}`,
                      color: copiedUpi ? '#86efac' : '#9C7A82',
                    }}>
                    {copiedUpi ? <CheckCircle size={16}/> : <Copy size={16}/>}
                  </button>
                </div>

                {/* Amount */}
                <div className="mb-4">
                  <label className="label-dark">Amount (₹) *</label>
                  <div className="relative">
                    <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color:'#9C7A82' }}/>
                    <input
                      type="number"
                      className="input-dark pl-8"
                      placeholder="Enter amount"
                      value={balanceAmount}
                      onChange={e => setBalanceAmount(e.target.value)}
                      min="1"
                      max={balance}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color:'#9C7A82' }}>
                    Balance due: ₹{balance.toLocaleString('en-IN')}
                  </p>
                </div>

                {/* Transaction ID */}
                <div className="mb-4">
                  <label className="label-dark">Transaction ID / UTR Number *</label>
                  <input
                    className="input-dark"
                    placeholder="e.g. 123456789012 (12-digit UTR)"
                    value={balanceTxnId}
                    onChange={e => setBalanceTxnId(e.target.value)}
                  />
                </div>

                {/* Screenshot upload (optional) */}
                <div className="mb-5">
                  <label className="label-dark">Payment Screenshot (optional)</label>
                  {balancePreviewUrl ? (
                    <div className="relative rounded-xl overflow-hidden mb-2"
                      style={{ border:'1px solid rgba(201,147,58,0.3)' }}>
                      <img src={balancePreviewUrl} alt="Payment proof" className="w-full max-h-48 object-contain"
                        style={{ background:'#0D0508' }}/>
                      <button
                        onClick={() => { setBalanceFile(null); setBalancePreviewUrl(null) }}
                        className="absolute top-2 right-2 px-2 py-1 rounded-lg text-xs"
                        style={{ background:'rgba(239,68,68,0.8)', color:'white' }}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div
                      className="rounded-xl p-6 text-center cursor-pointer transition-all duration-200"
                      style={{ border:'2px dashed rgba(61,30,40,0.8)' }}
                      onClick={() => document.getElementById('balancePaymentFile').click()}
                    >
                      <input
                        id="balancePaymentFile"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleBalanceFileSelect(e.target.files?.[0])}
                      />
                      <div className="flex flex-col items-center gap-2">
                        <Upload size={20} style={{ color:'#C9933A' }}/>
                        <p className="text-xs" style={{ color:'#9C7A82' }}>Tap to upload screenshot (PNG, JPG · Max 3MB)</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setBalanceOpen(false); setBalanceFile(null); setBalancePreviewUrl(null) }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBalanceSubmit}
                    disabled={balanceSubmitting}
                    className="btn-primary flex-1 justify-center"
                    style={{ opacity: balanceSubmitting ? 0.6 : 1, cursor: balanceSubmitting ? 'not-allowed' : 'pointer' }}
                  >
                    {balanceSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    ) : (
                      <>Submit Payment</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Crew — only shown when crew has actually been assigned */}
        {Array.isArray(booking.crew) && booking.crew.length > 0 && (
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.25 }}
            className="glass-card p-5 mb-5">
            <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <Users size={15} style={{ color:'#C9933A' }}/> Crew Assigned
            </h2>
            <div className="flex flex-wrap gap-2">
              {booking.crew.map((c, i) => (
                <span key={c.id || i} className="px-3 py-1.5 rounded-lg text-xs"
                  style={{ background:'rgba(13,5,8,0.6)', border:'1px solid rgba(61,30,40,0.6)', color:'#E8B86D' }}>
                  {c.name}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Leave a Review — only once the event is completed */}
        {showReviewSection && reviewChecked && (
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.28 }}
            className="glass-card p-5 mb-5">
            <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <Star size={15} style={{ color:'#C9933A' }}/> {review ? 'Your Review' : 'Leave a Review'}
            </h2>

            {review ? (
              <div>
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} size={18}
                      fill={review.rating >= n ? '#C9933A' : 'none'}
                      style={{ color: review.rating >= n ? '#C9933A' : '#9C7A82' }}/>
                  ))}
                </div>
                {review.comment && (
                  <p className="text-sm text-white mb-3">&ldquo;{review.comment}&rdquo;</p>
                )}
                <p className="text-xs" style={{ color:'#9C7A82' }}>
                  Thanks for your feedback! It will appear publicly on our site once approved by our team.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs mb-3" style={{ color:'#9C7A82' }}>
                  Tell us how your event went — your review may be featured on our homepage once approved.
                </p>

                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button"
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(n)}
                      className="p-0.5"
                    >
                      <Star size={26}
                        fill={(hoverRating || rating) >= n ? '#C9933A' : 'none'}
                        style={{ color: (hoverRating || rating) >= n ? '#C9933A' : '#9C7A82' }}/>
                    </button>
                  ))}
                </div>

                <div className="mb-4">
                  <label className="label-dark">Your Comment *</label>
                  <textarea
                    className="input-dark"
                    rows={3}
                    placeholder="Share a few words about your experience..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                  />
                </div>

                <button
                  onClick={handleReviewSubmit}
                  disabled={reviewSubmitting}
                  className="btn-primary w-full justify-center"
                  style={{ opacity: reviewSubmitting ? 0.6 : 1, cursor: reviewSubmitting ? 'not-allowed' : 'pointer' }}
                >
                  {reviewSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  ) : (
                    <>Submit Review</>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Actions */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}
          className="flex flex-wrap gap-3 mb-8">
          <button onClick={handleInvoice} className="btn-secondary">
            <Download size={14}/> Download Invoice
          </button>

          {showCalendarActions && (
            <>
              <button onClick={handleIcs} className="btn-secondary">
                <CalendarPlus size={14}/> Add to Calendar
              </button>
              <a href={googleCalendarUrl(booking)} target="_blank" rel="noreferrer" className="btn-secondary">
                <ExternalLink size={14}/> Google Calendar
              </a>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
