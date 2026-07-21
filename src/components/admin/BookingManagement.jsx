import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Eye, Search, Calendar, MapPin, ExternalLink,
         IndianRupee, Receipt, CheckCircle, AlertCircle, Wallet, Plus, UserPlus, Phone,
         MessageCircle } from 'lucide-react'
import { listenBookings, updateBookingStatus, addPublicEvent, recordPayment, paymentBreakdown,
         createOfflineBooking, findBookingConflicts, notifyBookingStatus,
         cancelBooking, cancellationCharge, recordRefund, approveBalancePayment,
         rejectBalancePayment, getCrew, assignCrew, getCrewCommitmentsForDate,
         getMachines } from '../../firebase/firestore'
import { STATUS_LABELS, STATUS_COLORS, BOOKING_STATUSES, PAYMENT_METHODS } from '../../utils/constants'
import { fmt } from '../../utils/dateUtils'
import toast from 'react-hot-toast'

// Builds a wa.me link with a ready-written status update for the customer.
// Completely free — it just opens WhatsApp with the text pre-filled.
const waLink = (b) => {
  const digits = String(b.customerPhone || '').replace(/\D/g, '')
  const phone  = digits.length === 10 ? `91${digits}` : digits
  const lines = [
    `Hi ${b.customerName || ''}, this is Varahi Events.`,
    '',
    b.status === 'confirmed'
      ? `Your booking for ${b.eventDate || 'your event'} is CONFIRMED.`
      : `Update on your booking for ${b.eventDate || 'your event'}: ${STATUS_LABELS[b.status] || b.status}.`,
    b.eventLocation ? `Location: ${b.eventLocation}` : '',
    b.totalAmount ? `Total: Rs. ${Number(b.totalAmount).toLocaleString('en-IN')}` : '',
    b.amountPaid ? `Received: Rs. ${Number(b.amountPaid).toLocaleString('en-IN')}` : '',
    '',
    'Thank you for choosing Varahi Events!',
  ].filter(Boolean)
  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`
}

export default function BookingManagement() {
  const [bookings,  setBookings]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('all')
  const [search,    setSearch]    = useState('')
  const [selected,  setSelected]  = useState(null)
  const [totalAmt,  setTotalAmt]  = useState('')
  const [confirming,setConfirming]= useState(false)

  // Record-payment form (admin logging cash / offline online payments)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState(PAYMENT_METHODS.CASH)
  const [payRef,    setPayRef]    = useState('')
  const [recording, setRecording] = useState(false)

  // Balance-payment approval, refunds and crew assignment
  const [approvingPay, setApprovingPay] = useState(false)
  const [showRefund,   setShowRefund]   = useState(false)
  const [refundAmt,    setRefundAmt]    = useState('')
  const [refundMethod, setRefundMethod] = useState(PAYMENT_METHODS.CASH)
  const [refundReason, setRefundReason] = useState('')
  const [refunding,    setRefunding]    = useState(false)
  const [showCrew,  setShowCrew]  = useState(false)
  const [crewList,  setCrewList]  = useState([])
  const [crewPick,  setCrewPick]  = useState([])
  const [crewBusy,  setCrewBusy]  = useState(new Map())
  const [savingCrew,setSavingCrew]= useState(false)

  // Offline / walk-in booking form (no online request from a customer)
  const emptyOffline = { customerName:'', customerPhone:'', eventDate:'', eventLocation:'', totalAmount:'', amount:'', method: PAYMENT_METHODS.CASH }
  const [showOffline, setShowOffline] = useState(false)
  const [offline,     setOffline]     = useState(emptyOffline)
  const [savingOff,   setSavingOff]   = useState(false)
  // Equipment picker for walk-ins, so they count toward availability
  const [offMachines, setOffMachines] = useState([])

  useEffect(() => {
    if (!showOffline || offMachines.length) return
    getMachines()
      .then(list => setOffMachines(list.map(m => ({ ...m, qty: 0 }))))
      .catch(() => {})
  }, [showOffline, offMachines.length])
  const setOff = (k) => (e) => setOffline(o => ({ ...o, [k]: e.target.value }))

  useEffect(() => {
    const unsub = listenBookings(data => { setBookings(data); setLoading(false) })
    return unsub
  }, [])

  // Keep the open modal in sync with live data so a recorded payment shows
  // immediately without reopening the booking.
  useEffect(() => {
    if (!selected) return
    const fresh = bookings.find(b => b.id === selected.id)
    if (fresh && fresh !== selected) setSelected(fresh)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings])

  // When opening a booking, pre-fill total amount if already set
  const openBooking = (b) => {
    setSelected(b)
    setTotalAmt(b.totalAmount ? String(b.totalAmount) : '')
    setPayAmount(''); setPayRef(''); setPayMethod(PAYMENT_METHODS.CASH)
  }

  // ── Record a payment (cash or online) ──────────────────────────────────────
  const handleRecordPayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) {
      toast.error('Enter a valid amount'); return
    }
    setRecording(true)
    try {
      await recordPayment(selected.id, {
        amount:    payAmount,
        method:    payMethod,
        reference: payRef,
      })
      toast.success(`${payMethod === 'cash' ? 'Cash' : 'Online'} payment of ₹${Number(payAmount).toLocaleString('en-IN')} recorded`)
      setPayAmount(''); setPayRef('')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to record payment')
    } finally {
      setRecording(false)
    }
  }

  // ── Accept booking ────────────────────────────────────────────────────────
  const handleAccept = async () => {
    if (!totalAmt || Number(totalAmt) <= 0) {
      toast.error('Please set the total booking amount first')
      return
    }

    const total = Number(totalAmt)
    const paid  = selected.amountPaid || 0

    if (paid < total * 0.4) {
      toast.error(
        `Customer paid ₹${paid.toLocaleString('en-IN')} but minimum 40% advance is ₹${Math.ceil(total * 0.4).toLocaleString('en-IN')}. Cannot confirm yet.`
      )
      return
    }

    setConfirming(true)
    try {
      // 0. Make sure the equipment isn't already committed on this date.
      const conflicts = await findBookingConflicts(selected)
      if (conflicts.length) {
        const detail = conflicts
          .map(c => `${c.name}: need ${c.requested}, only ${c.free} free`)
          .join(' · ')
        toast.error(`Not enough equipment on ${selected.eventDate} — ${detail}`, { duration: 7000 })
        setConfirming(false)
        return
      }

      // 1. Update booking status to confirmed
      await updateBookingStatus(selected.id, BOOKING_STATUSES.CONFIRMED, {
        totalAmount:     total,
        paymentVerified: true,
        confirmedAt:     new Date().toISOString(),
      })

      // 2. Auto-block the date on the calendar.
      // public:true so anyone (logged-out visitors and customers) can read it
      // and see the date is taken. blocked:true tells the calendar to render it
      // as an unavailable day and to hide the customer's private details.
      if (selected.eventDate) {
        await addPublicEvent({
          name:      'Booked — Unavailable',
          date:      selected.eventDate,
          location:  '',
          category:  'corporate',
          public:    true,
          blocked:   true,
          bookingId: selected.id,
        })
      }

      await notifyBookingStatus(selected, BOOKING_STATUSES.CONFIRMED)
      toast.success(`✅ Booking confirmed! Date ${selected.eventDate} blocked on calendar.`)
      setSelected(null)
    } catch (err) {
      console.error(err)
      toast.error('Failed to confirm. Try again.')
    } finally {
      setConfirming(false)
    }
  }

  // ── Create offline / walk-in booking ──────────────────────────────────────
  const handleCreateOffline = async () => {
    if (!offline.customerName.trim()) { toast.error('Enter the customer name'); return }
    if (!offline.amount || Number(offline.amount) <= 0) { toast.error('Enter the amount received'); return }
    // Walk-ins take equipment off the shelf too — check the same availability
    // rules an online booking goes through before committing it.
    const picked = offMachines
      .filter(m => Number(m.qty) > 0)
      .map(m => ({ id: m.id, name: m.name, qty: Number(m.qty), price: m.rate ?? null }))

    if (picked.length && offline.eventDate) {
      const conflicts = await findBookingConflicts({ eventDate: offline.eventDate, machines: picked })
      if (conflicts.length) {
        const detail = conflicts.map(c => `${c.name}: need ${c.requested}, only ${c.free} free`).join(' · ')
        toast.error(`Not enough equipment on ${offline.eventDate} — ${detail}`, { duration: 7000 })
        return
      }
    }

    setSavingOff(true)
    try {
      await createOfflineBooking({
        customerName:  offline.customerName.trim(),
        customerPhone: offline.customerPhone.trim(),
        eventDate:     offline.eventDate,
        eventLocation: offline.eventLocation.trim(),
        totalAmount:   offline.totalAmount,
        amount:        offline.amount,
        method:        offline.method,
        machines:      picked,
      })
      toast.success('Offline booking added and counted in revenue')
      setOffline(emptyOffline)
      setOffMachines(ms => ms.map(m => ({ ...m, qty: 0 })))
      setShowOffline(false)
    } catch (err) {
      console.error(err)
      toast.error('Failed to add. Try again.')
    } finally {
      setSavingOff(false)
    }
  }

  // ── Reject / Cancel booking ───────────────────────────────────────────────
  const handleReject = async () => {
    // Use cancelBooking() — NOT a raw status update. It also computes the
    // cancellation charge and removes the calendar block, so the date is
    // freed up instead of staying blocked forever.
    const charge = cancellationCharge(selected)
    const msg = charge.amount > 0
      ? `Cancel this booking?\n\n${charge.label}\nCancellation charge: Rs. ${Math.round(charge.amount).toLocaleString('en-IN')}\n\nThe date will be freed on the calendar.`
      : `Cancel this booking?\n\n${charge.label}\nThe date will be freed on the calendar.`
    if (!confirm(msg)) return
    try {
      await cancelBooking(selected.id, { reason: 'Cancelled by admin', by: 'admin' })
      await notifyBookingStatus(selected, BOOKING_STATUSES.CANCELLED)
      toast.success('Booking cancelled and date released.')
      setSelected(null)
    } catch {
      toast.error('Failed to cancel.')
    }
  }

  const handleStatusChange = async (id, status) => {
    try {
      await updateBookingStatus(id, status)
      // Tell the customer too — previously only "confirmed" ever notified.
      const b = bookings.find(x => x.id === id)
      if (b) await notifyBookingStatus(b, status)
      toast.success(`Status updated to ${STATUS_LABELS[status] || status}`)
    } catch {
      toast.error('Update failed')
    }
  }

  // ── Approve / reject a customer-submitted balance payment ─────────────────
  const handleApproveBalance = async () => {
    if (!selected?.pendingPayment) return
    setApprovingPay(true)
    try {
      await approveBalancePayment(selected.id)
      toast.success('Payment approved and added to the booking')
    } catch (e) {
      toast.error(e.message || 'Could not approve payment')
    } finally { setApprovingPay(false) }
  }

  const handleRejectBalance = async () => {
    if (!confirm('Reject this submitted payment? The customer will need to submit again.')) return
    try {
      await rejectBalancePayment(selected.id)
      toast.success('Payment submission rejected')
    } catch { toast.error('Could not reject') }
  }

  // ── Refund ────────────────────────────────────────────────────────────────
  const handleRefund = async () => {
    const amt = Number(refundAmt)
    if (!amt || amt <= 0) { toast.error('Enter a valid refund amount'); return }
    if (!confirm(`Refund Rs. ${amt.toLocaleString('en-IN')} to ${selected.customerName || 'the customer'}?`)) return
    setRefunding(true)
    try {
      await recordRefund(selected.id, { amount: amt, method: refundMethod, reason: refundReason })
      toast.success('Refund recorded')
      setRefundAmt(''); setRefundReason(''); setShowRefund(false)
    } catch (e) {
      toast.error(e.message || 'Refund failed')
    } finally { setRefunding(false) }
  }

  // ── Crew assignment ───────────────────────────────────────────────────────
  const openCrewPicker = async () => {
    setShowCrew(true)
    try {
      const [list, busy] = await Promise.all([
        getCrew(),
        getCrewCommitmentsForDate(selected.eventDate, selected.id),
      ])
      setCrewList(list.filter(c => c.active !== false))
      setCrewBusy(busy)
      setCrewPick((selected.crew || []).map(c => c.id))
    } catch { toast.error('Could not load crew') }
  }

  const handleSaveCrew = async () => {
    setSavingCrew(true)
    try {
      const chosen = crewList.filter(c => crewPick.includes(c.id))
                             .map(c => ({ id: c.id, name: c.name, phone: c.phone || '' }))
      await assignCrew(selected.id, chosen)
      toast.success('Crew assigned')
      setShowCrew(false)
    } catch { toast.error('Could not assign crew') }
    finally { setSavingCrew(false) }
  }

  const STATUS_FILTERS = ['all','requested','payment_pending','confirmed','event_started','completed','cancelled']

  const filtered = bookings
    .filter(b => filter === 'all' || b.status === filter)
    .filter(b => !search
      || b.customerName?.toLowerCase().includes(search.toLowerCase())
      || b.bookingId?.toLowerCase().includes(search.toLowerCase())
      || b.eventLocation?.toLowerCase().includes(search.toLowerCase())
    )

  // ── Advance % badge ───────────────────────────────────────────────────────
  const AdvanceBadge = ({ paid, total }) => {
    if (!paid || !total) return null
    const pct = Math.round((paid / total) * 100)
    const ok  = paid >= total * 0.4
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
        style={{
          background: ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: ok ? '#86efac' : '#fca5a5',
        }}>
        {pct}% paid {ok ? '✓' : '⚠'}
      </span>
    )
  }

  return (
    <div>
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
        className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Booking Management</h1>
          <p className="text-sm" style={{ color: '#9C7A82' }}>{bookings.length} total bookings</p>
        </div>
        <button onClick={() => setShowOffline(true)}
          className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
          <UserPlus size={15} /> Add Offline Booking
        </button>
      </motion.div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#9C7A82' }} />
        <input type="text" className="input-dark pl-10"
          placeholder="Search by name, ID, location…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
        {STATUS_FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
            style={{
              background: filter === f ? 'linear-gradient(135deg, #6B0F1A, #8B1A2C)' : 'rgba(26,8,16,0.8)',
              border: `1px solid ${filter === f ? 'rgba(201,147,58,0.3)' : 'rgba(61,30,40,0.8)'}`,
              color: filter === f ? '#F0D9A8' : '#9C7A82',
            }}>
            {f === 'all' ? 'All' : STATUS_LABELS[f] || f}
          </button>
        ))}
      </div>

      {/* Booking list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_,i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-10 text-center" style={{ color: '#9C7A82' }}>
          No bookings match this filter
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b, i) => (
            <motion.div key={b.id}
              initial={{ opacity:0, y:10 }}
              animate={{ opacity:1, y:0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-card p-4"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-white font-semibold text-sm">{b.customerName || '—'}</p>
                    <span className={`${STATUS_COLORS[b.status] || 'badge-gold'} text-[10px]`}>
                      {STATUS_LABELS[b.status] || b.status}
                    </span>
                    {b.bookingId && (
                      <span className="text-[10px] font-mono" style={{ color: '#9C7A82' }}>
                        #{b.bookingId}
                      </span>
                    )}
                    <AdvanceBadge paid={b.amountPaid} total={b.totalAmount} />
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs mb-1" style={{ color: '#9C7A82' }}>
                    {b.eventDate && (
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />{fmt(b.eventDate)}
                      </span>
                    )}
                    {b.eventLocation && (
                      <span className="flex items-center gap-1">
                        <MapPin size={10} />{b.eventLocation}
                      </span>
                    )}
                    {b.amountPaid && (
                      <span className="flex items-center gap-1 font-semibold" style={{ color: '#C9933A' }}>
                        <IndianRupee size={10} />
                        Paid: ₹{Number(b.amountPaid).toLocaleString('en-IN')}
                        {b.totalAmount ? ` / ₹${Number(b.totalAmount).toLocaleString('en-IN')}` : ''}
                      </span>
                    )}
                    {b.transactionId && (
                      <span className="flex items-center gap-1 font-mono" style={{ color: '#9C7A82' }}>
                        <Receipt size={10} />UTR: {b.transactionId}
                      </span>
                    )}
                  </div>

                  {b.machines?.length > 0 && (
                    <p className="text-[10px]" style={{ color: '#9C7A82' }}>
                      {b.machines.map(m => m.name || m).join(', ')}
                    </p>
                  )}
                  {(b.startedAt || b.endedAt) && (
                    <div className="flex flex-wrap gap-3 text-[10px] mt-1">
                      {b.startedAt && (
                        <span style={{ color:'#86efac' }}>▶ Started {new Date(b.startedAt).toLocaleString('en-IN')}</span>
                      )}
                      {b.endedAt && (
                        <span style={{ color:'#fca5a5' }}>■ Ended {new Date(b.endedAt).toLocaleString('en-IN')}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => openBooking(b)}
                    className="p-2 rounded-lg transition-all"
                    style={{ border: '1px solid rgba(61,30,40,0.8)', color: '#9C7A82' }}>
                    <Eye size={14} />
                  </button>

                  {/* Quick accept button directly in list */}
                  {(b.status === 'payment_pending' || b.status === 'requested') && (
                    <button onClick={() => openBooking(b)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: 'rgba(34,197,94,0.15)',
                        border: '1px solid rgba(34,197,94,0.3)',
                        color: '#86efac',
                      }}>
                      <Check size={13}/> Review
                    </button>
                  )}

                  {b.status === 'confirmed' && (
                    <button onClick={() => handleStatusChange(b.id, BOOKING_STATUSES.EVENT_STARTED)}
                      className="px-3 py-1.5 rounded-lg text-xs transition-all"
                      style={{ background:'rgba(59,130,246,0.15)', border:'1px solid rgba(59,130,246,0.3)', color:'#93c5fd' }}>
                      Start Event
                    </button>
                  )}
                  {b.status === 'event_started' && (
                    <button onClick={() => handleStatusChange(b.id, BOOKING_STATUSES.COMPLETED)}
                      className="px-3 py-1.5 rounded-lg text-xs transition-all"
                      style={{ background:'rgba(168,85,247,0.15)', border:'1px solid rgba(168,85,247,0.3)', color:'#d8b4fe' }}>
                      Mark Done
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Add Offline Booking modal ────────────────────────────────────── */}
      <AnimatePresence>
        {showOffline && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          >
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => setShowOffline(false)} />
            <motion.div
              className="relative w-full max-w-lg rounded-2xl overflow-hidden"
              style={{ background:'#1A0810', border:'1px solid rgba(61,30,40,0.9)', boxShadow:'0 24px 64px rgba(0,0,0,0.7)', maxHeight:'90vh', overflowY:'auto' }}
              initial={{ scale:0.95, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.95, opacity:0 }}
            >
              <div className="p-5 flex items-center justify-between sticky top-0 z-10"
                style={{ background:'#1A0810', borderBottom:'1px solid rgba(61,30,40,0.8)' }}>
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <UserPlus size={16} style={{ color:'#E8B86D' }} /> Add Offline Booking
                </h3>
                <button onClick={() => setShowOffline(false)}
                  className="p-1.5 rounded-lg" style={{ border:'1px solid rgba(61,30,40,0.8)', color:'#9C7A82' }}>
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-xs" style={{ color:'#9C7A82' }}>
                  For cash received without an online request. This is saved as a confirmed booking and counts in your revenue.
                </p>

                {/* Customer name */}
                <div>
                  <label className="label-dark">Customer Name *</label>
                  <input className="input-dark" placeholder="Full name"
                    value={offline.customerName} onChange={setOff('customerName')} />
                </div>

                {/* Mobile */}
                <div>
                  <label className="label-dark">Mobile Number</label>
                  <div className="relative">
                    <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'#9C7A82' }} />
                    <input className="input-dark pl-8" placeholder="+91 XXXXX XXXXX"
                      value={offline.customerPhone} onChange={setOff('customerPhone')} />
                  </div>
                </div>

                {/* Date + Location */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-dark">Event Date</label>
                    <input type="date" className="input-dark"
                      value={offline.eventDate} onChange={setOff('eventDate')} />
                  </div>
                  <div>
                    <label className="label-dark">Location</label>
                    <input className="input-dark" placeholder="City / venue"
                      value={offline.eventLocation} onChange={setOff('eventLocation')} />
                  </div>
                </div>

                {/* Equipment going out — keeps walk-ins in the availability count */}
                <div>
                  <label className="label-dark">Equipment (optional)</label>
                  <div className="rounded-xl p-2 max-h-44 overflow-y-auto"
                    style={{ background:'rgba(13,5,8,0.6)', border:'1px solid rgba(61,30,40,0.8)' }}>
                    {offMachines.length === 0 ? (
                      <p className="text-xs p-2" style={{ color:'#9C7A82' }}>No equipment in inventory yet</p>
                    ) : offMachines.map((m, i) => (
                      <div key={m.id} className="flex items-center justify-between gap-2 py-1.5 px-1">
                        <span className="text-sm text-white truncate">{m.name}</span>
                        <input
                          type="number" min={0} className="input-dark w-16 text-center py-1"
                          value={m.qty}
                          onChange={e => {
                            const qty = Math.max(0, Number(e.target.value) || 0)
                            setOffMachines(list => list.map((x, j) => j === i ? { ...x, qty } : x))
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs mt-1" style={{ color:'#9C7A82' }}>
                    Adding equipment here blocks it from being double-booked on that date.
                  </p>
                </div>

                {/* Total + Amount received */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-dark">Total Amount (₹)</label>
                    <input type="number" className="input-dark" placeholder="optional"
                      value={offline.totalAmount} onChange={setOff('totalAmount')} min="0" />
                  </div>
                  <div>
                    <label className="label-dark">Amount Received (₹) *</label>
                    <input type="number" className="input-dark" placeholder="e.g. 5000"
                      value={offline.amount} onChange={setOff('amount')} min="1" />
                  </div>
                </div>

                {/* Method */}
                <div>
                  <label className="label-dark">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: PAYMENT_METHODS.CASH,   label:'💵 Cash' },
                      { id: PAYMENT_METHODS.ONLINE, label:'📲 Online' },
                    ].map(opt => (
                      <button key={opt.id} type="button"
                        onClick={() => setOffline(o => ({ ...o, method: opt.id }))}
                        className="py-2 rounded-xl text-sm font-medium transition-all"
                        style={{
                          background: offline.method === opt.id ? 'rgba(201,147,58,0.15)' : 'rgba(13,5,8,0.6)',
                          border: `1px solid ${offline.method === opt.id ? 'rgba(201,147,58,0.4)' : 'rgba(61,30,40,0.8)'}`,
                          color: offline.method === opt.id ? '#F0D9A8' : '#9C7A82',
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCreateOffline}
                  disabled={savingOff || !offline.customerName || !offline.amount}
                  className="btn-primary w-full justify-center py-3 text-sm"
                  style={{ opacity: (savingOff || !offline.customerName || !offline.amount) ? 0.5 : 1 }}
                >
                  {savingOff
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Check size={15} /> Save Booking</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Detail modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          >
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => setSelected(null)} />
            <motion.div
              className="relative w-full max-w-lg rounded-2xl overflow-hidden"
              style={{
                background: '#1A0810',
                border: '1px solid rgba(61,30,40,0.9)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
              initial={{ scale:0.95, opacity:0 }}
              animate={{ scale:1, opacity:1 }}
              exit={{ scale:0.95, opacity:0 }}
            >
              {/* Modal header */}
              <div className="p-5 flex items-center justify-between sticky top-0 z-10"
                style={{ background: '#1A0810', borderBottom: '1px solid rgba(61,30,40,0.8)' }}>
                <h3 className="text-white font-semibold">Booking Details</h3>
                <button onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ border: '1px solid rgba(61,30,40,0.8)', color: '#9C7A82' }}>
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">

                {/* Customer info */}
                <div className="glass-card p-4 space-y-1.5">
                  <p className="text-xs uppercase tracking-wider mb-2" style={{ color: '#9C7A82' }}>Customer</p>
                  <p className="text-white font-semibold">{selected.customerName}</p>
                  <p className="text-sm" style={{ color: '#9C7A82' }}>{selected.customerEmail}</p>
                  {selected.customerPhone && (
                    <p className="text-sm" style={{ color: '#9C7A82' }}>{selected.customerPhone}</p>
                  )}

                  {/* Free WhatsApp message — opens WhatsApp with a pre-written
                      update. No paid API, you just tap send. */}
                  {selected.customerPhone && (
                    <a
                      href={waLink(selected)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all"
                      style={{ background:'rgba(37,211,102,0.12)', border:'1px solid rgba(37,211,102,0.35)', color:'#6ee7a0' }}
                    >
                      <MessageCircle size={13}/> Message on WhatsApp
                    </a>
                  )}
                </div>

                {/* Customer-submitted balance payment awaiting approval */}
                {selected.pendingPayment && (
                  <div className="glass-card p-4" style={{ border:'1px solid rgba(201,147,58,0.4)' }}>
                    <p className="text-xs uppercase tracking-wider mb-2" style={{ color:'#E8B86D' }}>
                      Payment submitted — needs verification
                    </p>
                    <p className="text-white font-semibold">
                      ₹{Number(selected.pendingPayment.amount || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color:'#9C7A82' }}>
                      Txn: {selected.pendingPayment.transactionId || '—'}
                    </p>
                    {selected.pendingPayment.proofUrl && (
                      <img src={selected.pendingPayment.proofUrl} alt="Payment proof"
                        className="w-full max-h-48 object-contain rounded-lg mt-2"
                        style={{ background:'#0D0508' }} />
                    )}
                    <div className="flex gap-2 mt-3">
                      <button onClick={handleApproveBalance} disabled={approvingPay}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold"
                        style={{ background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.4)', color:'#86efac' }}>
                        {approvingPay ? 'Approving…' : 'Approve & Add'}
                      </button>
                      <button onClick={handleRejectBalance}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold"
                        style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.35)', color:'#fca5a5' }}>
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* Crew assignment */}
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wider" style={{ color: '#9C7A82' }}>Crew</p>
                    <button onClick={openCrewPicker} className="text-xs hover:underline" style={{ color:'#E8B86D' }}>
                      {selected.crew?.length ? 'Change' : 'Assign'}
                    </button>
                  </div>
                  {selected.crew?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selected.crew.map(c => (
                        <span key={c.id} className="px-2 py-0.5 rounded-md text-xs"
                          style={{ background:'rgba(201,147,58,0.12)', border:'1px solid rgba(201,147,58,0.3)', color:'#E8B86D' }}>
                          {c.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs" style={{ color:'#9C7A82' }}>Nobody assigned yet</p>
                  )}
                </div>

                {/* Event info */}
                <div className="glass-card p-4 space-y-1.5">
                  <p className="text-xs uppercase tracking-wider mb-2" style={{ color: '#9C7A82' }}>Event Details</p>
                  <p className="text-white text-sm">{selected.eventDate ? fmt(selected.eventDate) : '—'}</p>
                  <p className="text-sm" style={{ color: '#9C7A82' }}>{selected.eventLocation}</p>
                  {selected.notes && (
                    <p className="text-xs mt-1" style={{ color: '#9C7A82' }}>{selected.notes}</p>
                  )}
                  {(selected.startedAt || selected.endedAt) && (
                    <div className="mt-2 pt-2 space-y-1" style={{ borderTop:'1px solid rgba(61,30,40,0.4)' }}>
                      {selected.startedAt && (
                        <div className="flex items-center justify-between text-xs">
                          <span style={{ color:'#9C7A82' }}>▶ Started</span>
                          <span style={{ color:'#86efac' }}>{new Date(selected.startedAt).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {selected.endedAt && (
                        <div className="flex items-center justify-between text-xs">
                          <span style={{ color:'#9C7A82' }}>■ Ended</span>
                          <span style={{ color:'#fca5a5' }}>{new Date(selected.endedAt).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Equipment */}
                <div className="glass-card p-4">
                  <p className="text-xs uppercase tracking-wider mb-3" style={{ color: '#9C7A82' }}>Equipment</p>
                  {selected.machines?.map((m, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 text-sm"
                      style={{ borderBottom: '1px solid rgba(61,30,40,0.4)' }}>
                      <span className="text-white">{m.name || m}</span>
                      {m.qty && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background:'rgba(201,147,58,0.12)', border:'1px solid rgba(201,147,58,0.25)', color:'#E8B86D' }}>
                          ×{m.qty}
                        </span>
                      )}
                    </div>
                  ))}
                  {selected.addons?.length > 0 && (
                    <p className="text-xs mt-2" style={{ color: '#9C7A82' }}>
                      Add-ons: {selected.addons.join(', ')}
                    </p>
                  )}
                </div>

                {/* Payment summary — cash / online / total split */}
                {(() => {
                  const pb = paymentBreakdown(selected)
                  const total   = Number(selected.totalAmount || 0)
                  const balance = total > 0 ? Math.max(0, total - pb.total) : 0
                  if (pb.total === 0 && total === 0 && !selected.transactionId) return null
                  return (
                    <div className="glass-card p-4 space-y-2">
                      <p className="text-xs uppercase tracking-wider mb-2" style={{ color: '#9C7A82' }}>Payment Summary</p>

                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: '#9C7A82' }}>💵 Cash</span>
                        <span className="font-semibold text-sm" style={{ color: '#86efac' }}>
                          ₹{pb.cash.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: '#9C7A82' }}>📲 Online / UPI</span>
                        <span className="font-semibold text-sm" style={{ color: '#93c5fd' }}>
                          ₹{pb.online.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1"
                        style={{ borderTop: '1px solid rgba(61,30,40,0.4)' }}>
                        <span className="text-xs font-semibold" style={{ color: '#E8B86D' }}>Total Paid</span>
                        <span className="font-bold" style={{ color: '#C9933A' }}>
                          ₹{pb.total.toLocaleString('en-IN')}
                          {total > 0 && (
                            <span className="ml-1 font-normal text-xs" style={{ color: '#9C7A82' }}>
                              / ₹{total.toLocaleString('en-IN')}
                            </span>
                          )}
                        </span>
                      </div>
                      {total > 0 && balance > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: '#9C7A82' }}>Balance Due</span>
                          <span className="font-semibold text-sm" style={{ color: '#fca5a5' }}>
                            ₹{balance.toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                      {total > 0 && pb.total >= total && (
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: '#86efac' }}>
                          <CheckCircle size={11} /> Fully Paid
                        </div>
                      )}
                      {selected.transactionId && (
                        <div className="flex items-center justify-between pt-1"
                          style={{ borderTop: '1px solid rgba(61,30,40,0.4)' }}>
                          <span className="text-xs" style={{ color: '#9C7A82' }}>Customer UTR</span>
                          <span className="font-mono text-xs" style={{ color: '#E8B86D' }}>{selected.transactionId}</span>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Record a payment (cash or online) — for any active booking */}
                {selected.status !== 'cancelled' && (
                  <div className="glass-card p-4 space-y-3"
                    style={{ border: '1px solid rgba(34,197,94,0.2)' }}>
                    <p className="text-xs uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#86efac' }}>
                      <Wallet size={12} /> Record a Payment
                    </p>

                    {/* Method toggle */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: PAYMENT_METHODS.CASH,   label: '💵 Cash' },
                        { id: PAYMENT_METHODS.ONLINE, label: '📲 Online' },
                      ].map(opt => (
                        <button key={opt.id} type="button"
                          onClick={() => setPayMethod(opt.id)}
                          className="py-2 rounded-xl text-sm font-medium transition-all"
                          style={{
                            background: payMethod === opt.id ? 'rgba(201,147,58,0.15)' : 'rgba(13,5,8,0.6)',
                            border: `1px solid ${payMethod === opt.id ? 'rgba(201,147,58,0.4)' : 'rgba(61,30,40,0.8)'}`,
                            color: payMethod === opt.id ? '#F0D9A8' : '#9C7A82',
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {/* Amount */}
                    <div className="relative">
                      <IndianRupee size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9C7A82' }} />
                      <input
                        type="number"
                        className="input-dark pl-8"
                        placeholder="Amount received"
                        value={payAmount}
                        onChange={e => setPayAmount(e.target.value)}
                        min="1"
                      />
                    </div>

                    {/* Optional reference / note */}
                    <input
                      type="text"
                      className="input-dark"
                      placeholder={payMethod === PAYMENT_METHODS.ONLINE ? 'UTR / reference (optional)' : 'Note (optional)'}
                      value={payRef}
                      onChange={e => setPayRef(e.target.value)}
                    />

                    <button
                      onClick={handleRecordPayment}
                      disabled={recording || !payAmount}
                      className="btn-primary w-full justify-center py-2.5 text-sm"
                      style={{ opacity: (recording || !payAmount) ? 0.5 : 1 }}
                    >
                      {recording
                        ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <><Plus size={14} /> Add Payment</>}
                    </button>
                    <p className="text-[10px] text-center" style={{ color: '#9C7A82' }}>
                      Recorded payments show on the customer's portal and count toward revenue once the booking is confirmed.
                    </p>
                  </div>
                )}

                {/* Payment screenshot */}
                {selected.paymentProofUrl && (
                  <div className="glass-card p-4">
                    <p className="text-xs uppercase tracking-wider mb-3" style={{ color: '#9C7A82' }}>
                      Payment Screenshot
                    </p>
                    <img
                      src={selected.paymentProofUrl}
                      alt="Payment proof"
                      className="w-full rounded-xl max-h-64 object-contain"
                      style={{ background: '#0D0508' }}
                    />
                    <a href={selected.paymentProofUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs mt-2 hover:underline"
                      style={{ color: '#E8B86D' }}>
                      <ExternalLink size={11} /> Open full size
                    </a>
                  </div>
                )}

                {/* ── Admin action panel ── */}
                {(selected.status === 'payment_pending' || selected.status === 'requested') && (
                  <div className="glass-card p-4 space-y-4"
                    style={{ border: '1px solid rgba(201,147,58,0.2)' }}>
                    <p className="text-xs uppercase tracking-wider" style={{ color: '#E8B86D' }}>
                      Admin Action
                    </p>

                    {/* Set total amount */}
                    <div>
                      <label className="label-dark">Set Total Booking Amount (₹)</label>
                      <div className="relative">
                        <IndianRupee size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
                          style={{ color: '#9C7A82' }} />
                        <input
                          type="number"
                          className="input-dark pl-8"
                          placeholder="e.g. 15000"
                          value={totalAmt}
                          onChange={e => setTotalAmt(e.target.value)}
                          min="1"
                        />
                      </div>

                      {/* 40% check preview */}
                      {totalAmt && selected.amountPaid && (
                        <div className="mt-2 p-2 rounded-lg"
                          style={{ background: 'rgba(13,5,8,0.6)', border: '1px solid rgba(61,30,40,0.6)' }}>
                          <p className="text-xs" style={{ color: '#9C7A82' }}>
                            Total: ₹{Number(totalAmt).toLocaleString('en-IN')} &nbsp;|&nbsp;
                            40% min: ₹{Math.ceil(Number(totalAmt) * 0.4).toLocaleString('en-IN')} &nbsp;|&nbsp;
                            Customer paid: ₹{Number(selected.amountPaid).toLocaleString('en-IN')}
                          </p>
                          {Number(selected.amountPaid) >= Number(totalAmt) * 0.4 ? (
                            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#86efac' }}>
                              <CheckCircle size={10} /> Advance sufficient — can confirm
                            </p>
                          ) : (
                            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#fca5a5' }}>
                              <AlertCircle size={10} /> Advance insufficient — request more payment
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Accept + Reject buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleAccept}
                        disabled={confirming || !totalAmt}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all"
                        style={{
                          background: (!totalAmt || confirming)
                            ? 'rgba(34,197,94,0.1)'
                            : 'linear-gradient(135deg, rgba(34,197,94,0.3), rgba(34,197,94,0.2))',
                          border: '1px solid rgba(34,197,94,0.4)',
                          color: '#86efac',
                          opacity: (!totalAmt || confirming) ? 0.5 : 1,
                        }}
                      >
                        {confirming ? (
                          <div className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                        ) : (
                          <><Check size={15} /> Accept & Confirm</>
                        )}
                      </button>

                      <button
                        onClick={handleReject}
                        disabled={confirming}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all"
                        style={{
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          color: '#fca5a5',
                        }}
                      >
                        <X size={15} /> Reject
                      </button>
                    </div>

                    <p className="text-[10px] text-center" style={{ color: '#9C7A82' }}>
                      Accepting will confirm the booking and block the date on the public calendar.
                    </p>
                  </div>
                )}

                {/* Refund — only makes sense once money has been collected */}
                {paymentBreakdown(selected).total > 0 && (
                  <div className="glass-card p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-wider" style={{ color:'#9C7A82' }}>Refund</p>
                      <button onClick={() => setShowRefund(v => !v)} className="text-xs hover:underline"
                        style={{ color:'#fca5a5' }}>
                        {showRefund ? 'Close' : 'Record a refund'}
                      </button>
                    </div>

                    {showRefund && (
                      <div className="mt-3 space-y-3">
                        <p className="text-[11px]" style={{ color:'#9C7A82' }}>
                          Collected so far: ₹{paymentBreakdown(selected).total.toLocaleString('en-IN')}.
                          A refund is logged as a negative payment so revenue and P&amp;L stay accurate.
                        </p>
                        <div>
                          <label className="label-dark">Refund amount (₹)</label>
                          <input type="number" min={1} className="input-dark" value={refundAmt}
                            onChange={e => setRefundAmt(e.target.value)} placeholder="e.g. 1500" />
                        </div>
                        <div>
                          <label className="label-dark">Method</label>
                          <select className="input-dark" value={refundMethod}
                            onChange={e => setRefundMethod(e.target.value)}>
                            <option value={PAYMENT_METHODS.CASH}   className="bg-brand-surface">Cash</option>
                            <option value={PAYMENT_METHODS.ONLINE} className="bg-brand-surface">Online / UPI</option>
                          </select>
                        </div>
                        <div>
                          <label className="label-dark">Reason</label>
                          <input className="input-dark" value={refundReason}
                            onChange={e => setRefundReason(e.target.value)} placeholder="e.g. Cancelled — advance returned" />
                        </div>
                        <button onClick={handleRefund} disabled={refunding}
                          className="w-full py-2.5 rounded-xl text-sm font-semibold"
                          style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.4)', color:'#fca5a5' }}>
                          {refunding ? 'Recording…' : 'Record Refund'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crew picker */}
      <AnimatePresence>
        {showCrew && selected && (
          <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCrew(false)} />
            <motion.div className="relative w-full max-w-sm rounded-2xl p-5 max-h-[85vh] overflow-y-auto"
              style={{ background:'#1A0810', border:'1px solid rgba(61,30,40,0.9)' }}
              initial={{ scale:0.95 }} animate={{ scale:1 }} exit={{ scale:0.95 }}>
              <h3 className="text-white font-semibold mb-1">Assign Crew</h3>
              <p className="text-xs mb-4" style={{ color:'#9C7A82' }}>
                {selected.eventDate ? `For ${fmt(selected.eventDate)}` : 'No event date set'}
              </p>

              {crewList.length === 0 ? (
                <p className="text-xs py-6 text-center" style={{ color:'#9C7A82' }}>
                  No active crew yet — add people under Crew.
                </p>
              ) : crewList.map(c => {
                // Flag anyone already committed to another event that day
                const busyWith = crewBusy.get(c.id)
                const picked   = crewPick.includes(c.id)
                return (
                  <label key={c.id}
                    className="flex items-start gap-3 p-3 rounded-xl mb-2 cursor-pointer"
                    style={{ background: picked ? 'rgba(201,147,58,0.1)' : 'rgba(13,5,8,0.6)',
                             border: `1px solid ${picked ? 'rgba(201,147,58,0.4)' : 'rgba(61,30,40,0.8)'}` }}>
                    <input type="checkbox" className="mt-0.5 accent-amber-500" checked={picked}
                      onChange={() => setCrewPick(p => picked ? p.filter(x => x !== c.id) : [...p, c.id])} />
                    <div className="min-w-0">
                      <p className="text-sm text-white">{c.name}</p>
                      {c.role && <p className="text-[11px]" style={{ color:'#9C7A82' }}>{c.role}</p>}
                      {busyWith && (
                        <p className="text-[11px] mt-0.5" style={{ color:'#fca5a5' }}>
                          Already on another event this day
                        </p>
                      )}
                    </div>
                  </label>
                )
              })}

              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowCrew(false)} className="flex-1 py-2.5 rounded-xl text-sm"
                  style={{ border:'1px solid rgba(61,30,40,0.8)', color:'#9C7A82' }}>Cancel</button>
                <button onClick={handleSaveCrew} disabled={savingCrew}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold btn-primary justify-center">
                  {savingCrew ? 'Saving…' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}