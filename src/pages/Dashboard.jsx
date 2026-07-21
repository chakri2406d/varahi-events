import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Zap, Download, Clock, Package, IndianRupee, CheckCircle, QrCode, X } from 'lucide-react'
import QRCode from 'react-qr-code'
import { useAuth } from '../context/AuthContext'
import { listenUserBookings, paymentBreakdown, getInvoiceNumber,
         cancelBooking, cancellationCharge } from '../firebase/firestore'
import toast from 'react-hot-toast'
import { generateInvoice } from '../utils/invoiceGenerator'
import { STATUS_LABELS, STATUS_COLORS, ADDONS } from '../utils/constants'
import { fmt, relativeDay } from '../utils/dateUtils'

function BookingCard({ booking, index, onShowQr, onInvoice, onCancel }) {
  const pb    = paymentBreakdown(booking)
  const paid  = pb.total
  const total = Number(booking.totalAmount || 0)
  const balance = total > 0 ? Math.max(0, total - paid) : 0
  const pct   = total > 0 ? Math.round((paid / total) * 100) : null
  const isConfirmed = ['confirmed','event_started','completed'].includes(booking.status)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="glass-card p-5 relative overflow-hidden"
    >
      {/* Gold top line when confirmed */}
      {isConfirmed && (
        <div className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: 'linear-gradient(90deg, transparent, #C9933A, transparent)' }}/>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono mb-1" style={{ color:'#9C7A82' }}>
            #{booking.bookingId || booking.id?.slice(0,8).toUpperCase()}
          </p>
          <h3 className="text-white font-semibold text-sm truncate">
            {booking.machines?.map(m => m.name || m).join(', ') || 'Equipment Booking'}
          </h3>
        </div>
        <span className={STATUS_COLORS[booking.status] || 'badge-gold'}>
          {STATUS_LABELS[booking.status] || booking.status}
        </span>
      </div>

      {/* Date + Location */}
      <div className="flex flex-wrap gap-3 text-xs mb-3" style={{ color:'#9C7A82' }}>
        {booking.eventDate && (
          <span className="flex items-center gap-1.5">
            <Calendar size={11} style={{ color:'#C9933A' }}/>
            {fmt(booking.eventDate)} · {relativeDay(booking.eventDate)}
          </span>
        )}
        {booking.eventLocation && (
          <span className="flex items-center gap-1.5">
            <MapPin size={11} style={{ color:'#C9933A' }}/>
            {booking.eventLocation}
          </span>
        )}
      </div>

      {/* Add-ons */}
      {booking.addons?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {booking.addons.map(a => (
            <span key={a} className="px-2 py-0.5 rounded-md text-[10px]"
              style={{ background:'rgba(13,5,8,0.6)', border:'1px solid rgba(61,30,40,0.6)', color:'#9C7A82' }}>
              {ADDONS.find(x => x.id === a)?.label || a}
            </span>
          ))}
        </div>
      )}

      {/* Payment info */}
      {(paid > 0 || total > 0) && (
        <div className="rounded-xl p-3 mb-3 space-y-2"
          style={{ background:'rgba(13,5,8,0.6)', border:'1px solid rgba(61,30,40,0.6)' }}>

          {pb.cash > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span style={{ color:'#9C7A82' }}>💵 Cash Paid</span>
              <span className="font-semibold" style={{ color:'#86efac' }}>
                ₹{pb.cash.toLocaleString('en-IN')}
              </span>
            </div>
          )}

          {pb.online > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span style={{ color:'#9C7A82' }}>📲 Online Paid</span>
              <span className="font-semibold" style={{ color:'#93c5fd' }}>
                ₹{pb.online.toLocaleString('en-IN')}
              </span>
            </div>
          )}

          {paid > 0 && (
            <div className="flex items-center justify-between text-xs pt-1"
              style={{ borderTop:'1px solid rgba(61,30,40,0.4)' }}>
              <span style={{ color:'#9C7A82' }}>Total Paid</span>
              <span className="font-bold" style={{ color:'#86efac' }}>
                ₹{paid.toLocaleString('en-IN')}
                {pct !== null && <span className="ml-1 font-normal" style={{ color:'#9C7A82' }}>({pct}%)</span>}
              </span>
            </div>
          )}

          {total > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span style={{ color:'#9C7A82' }}>Total Amount</span>
              <span className="font-bold" style={{ color:'#C9933A' }}>
                ₹{total.toLocaleString('en-IN')}
              </span>
            </div>
          )}

          {total > 0 && paid > 0 && balance > 0 && (
            <>
              {/* Progress bar */}
              <div className="h-1 rounded-full overflow-hidden"
                style={{ background:'rgba(61,30,40,0.6)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(pct, 100)}%`,
                    background: pct >= 100
                      ? '#86efac'
                      : pct >= 40
                        ? 'linear-gradient(90deg, #8B1A2C, #C9933A)'
                        : '#fca5a5',
                  }}/>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color:'#9C7A82' }}>Balance Due on Event Day</span>
                <span className="font-semibold" style={{ color:'#fca5a5' }}>
                  ₹{balance.toLocaleString('en-IN')}
                </span>
              </div>
            </>
          )}

          {total > 0 && paid >= total && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color:'#86efac' }}>
              <CheckCircle size={11}/> Fully Paid
            </div>
          )}

          {booking.transactionId && (
            <div className="flex items-center justify-between text-xs pt-1"
              style={{ borderTop:'1px solid rgba(61,30,40,0.4)' }}>
              <span style={{ color:'#9C7A82' }}>Transaction ID</span>
              <span className="font-mono" style={{ color:'#9C7A82' }}>{booking.transactionId}</span>
            </div>
          )}
        </div>
      )}

      {/* Confirmed message */}
      {isConfirmed && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg"
          style={{ background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)' }}>
          <CheckCircle size={13} style={{ color:'#86efac', flexShrink:0 }}/>
          <p className="text-xs" style={{ color:'#86efac' }}>
            {booking.status === 'completed'
              ? 'Event completed successfully!'
              : 'Your booking is confirmed. See you at the event!'}
          </p>
        </div>
      )}

      {/* Payment pending message */}
      {booking.status === 'payment_pending' && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg"
          style={{ background:'rgba(201,147,58,0.08)', border:'1px solid rgba(201,147,58,0.2)' }}>
          <Clock size={13} style={{ color:'#E8B86D', flexShrink:0 }}/>
          <p className="text-xs" style={{ color:'#E8B86D' }}>
            Payment submitted. Admin is verifying your payment.
          </p>
        </div>
      )}

      {/* Event entry/exit QR codes */}
      {(booking.status === 'confirmed' || booking.status === 'event_started') && (
        <button
          onClick={() => onShowQr(booking)}
          className="flex items-center gap-2 w-full justify-center py-2 rounded-xl text-xs font-medium transition-all mb-2"
          style={{ background:'rgba(201,147,58,0.12)', border:'1px solid rgba(201,147,58,0.3)', color:'#E8B86D' }}
        >
          <QrCode size={13}/> Show Event QR Codes
        </button>
      )}

      {/* Invoice download */}
      {(booking.status === 'confirmed' || booking.status === 'completed') && (
        <button
          onClick={() => onInvoice(booking)}
          className="flex items-center gap-2 w-full justify-center py-2 rounded-xl text-xs transition-all"
          style={{ border:'1px solid rgba(61,30,40,0.8)', color:'#9C7A82' }}
        >
          <Download size={13}/> Download Invoice
        </button>
      )}

      {/* Cancel booking — only before the event has started */}
      {['requested','payment_pending','confirmed'].includes(booking.status) && (
        <button
          onClick={() => onCancel(booking)}
          className="flex items-center gap-2 w-full justify-center py-2 rounded-xl text-xs transition-all mt-2"
          style={{ border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5' }}
        >
          <X size={13}/> Cancel Booking
        </button>
      )}
    </motion.div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [bookings,   setBookings]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [activeTab,  setActiveTab]  = useState('all')
  const [qrBooking,  setQrBooking]  = useState(null)   // booking whose QR codes are shown
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelling,   setCancelling]   = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  // Issue a sequential invoice number (once per booking) before building the PDF
  const handleInvoice = async (booking) => {
    try {
      const no = await getInvoiceNumber(booking)
      generateInvoice({ ...booking, invoiceNo: no ?? booking.invoiceNo })
    } catch {
      generateInvoice(booking)   // numbering failed — still give them the PDF
    }
  }

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      await cancelBooking(cancelTarget.id, { reason: cancelReason.trim(), by: 'customer' })
      toast.success('Booking cancelled')
      setCancelTarget(null)
      setCancelReason('')
    } catch (e) {
      toast.error(e.message || 'Could not cancel. Please contact us.')
    } finally {
      setCancelling(false)
    }
  }

  useEffect(() => {
    if (!user) return
    // Live subscription: dashboard updates instantly when the admin
    // confirms a booking, no manual refresh needed.
    const unsub = listenUserBookings(user.uid, (data) => {
      setBookings(data)
      setLoading(false)
    })
    return unsub
  }, [user])

  const confirmed  = bookings.filter(b => ['confirmed','event_started','completed'].includes(b.status))
  const upcoming   = bookings.filter(b => b.status === 'confirmed')
  const pending    = bookings.filter(b => ['requested','payment_pending'].includes(b.status))
  const totalPaid  = bookings.reduce((sum, b) => sum + paymentBreakdown(b).total, 0)

  // Single source of truth so the tab badge and the list can't disagree.
  const ACTIVE_STATUSES = ['requested','payment_pending','confirmed','event_started']
  const active = bookings.filter(b => ACTIVE_STATUSES.includes(b.status))

  const tabs = [
    { id:'all',       label:'All',       count: bookings.length },
    { id:'active',    label:'Active',    count: active.length },
    { id:'completed', label:'Completed', count: bookings.filter(b => b.status==='completed').length },
  ]

  const filtered = activeTab === 'all'    ? bookings
    : activeTab === 'active'              ? active
    : bookings.filter(b => b.status === 'completed')

  const STATS = [
    { label:'Total Bookings',   value: bookings.length,    icon: Package,      color:'#C9933A' },
    { label:'Confirmed Events', value: confirmed.length,   icon: Zap,          color:'#86efac' },
    { label:'Upcoming',         value: upcoming.length,    icon: Calendar,     color:'#E8B86D' },
    { label:'Pending Approval', value: pending.length,     icon: Clock,        color:'#fdba74' },
  ]

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4">

        {/* Welcome header */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
          className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
            style={{ background:'linear-gradient(135deg, #6B0F1A, #8B1A2C)', boxShadow:'0 0 20px rgba(139,26,44,0.4)' }}>
            {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-white">
              Hey, {user?.displayName?.split(' ')[0] || 'there'} 👋
            </h1>
            <p className="text-sm" style={{ color:'#9C7A82' }}>{user?.email}</p>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {STATS.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.07 }}
              className="glass-card p-4">
              <s.icon size={18} style={{ color: s.color }}/>
              <p className="font-display font-bold text-2xl mt-2" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color:'#9C7A82' }}>{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Total paid summary */}
        {totalPaid > 0 && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
            className="glass-card p-4 mb-6 flex items-center gap-3"
            style={{ border:'1px solid rgba(201,147,58,0.2)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background:'rgba(201,147,58,0.1)' }}>
              <IndianRupee size={18} style={{ color:'#C9933A' }}/>
            </div>
            <div>
              <p className="text-white font-semibold">
                ₹{totalPaid.toLocaleString('en-IN')} paid so far
              </p>
              <p className="text-xs" style={{ color:'#9C7A82' }}>
                Total advance across all your bookings
              </p>
            </div>
          </motion.div>
        )}

        {/* Bookings section */}
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-white font-semibold text-lg">My Bookings</h2>
            <Link to="/equipment" className="btn-primary text-sm py-2">
              <Zap size={14}/> New Booking
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium flex-shrink-0 transition-all"
                style={{
                  background: activeTab === tab.id
                    ? 'linear-gradient(135deg, #6B0F1A, #8B1A2C)'
                    : 'rgba(26,8,16,0.8)',
                  border: `1px solid ${activeTab === tab.id ? 'rgba(201,147,58,0.3)' : 'rgba(61,30,40,0.8)'}`,
                  color: activeTab === tab.id ? '#F0D9A8' : '#9C7A82',
                }}>
                {tab.label}
                <span className="px-1.5 py-0.5 rounded-md text-xs"
                  style={{ background: activeTab === tab.id ? 'rgba(255,255,255,0.15)' : 'rgba(13,5,8,0.6)' }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_,i) => <div key={i} className="skeleton h-52 rounded-2xl"/>)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="text-5xl mb-4">🎪</div>
              <h3 className="text-white font-semibold mb-2">No bookings yet</h3>
              <p className="text-sm mb-5" style={{ color:'#9C7A82' }}>
                Start by booking some equipment for your event
              </p>
              <Link to="/equipment" className="btn-primary">Book Equipment</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((booking, i) => (
                <BookingCard key={booking.id} booking={booking} index={i} onShowQr={setQrBooking}
                  onInvoice={handleInvoice} onCancel={setCancelTarget}/>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Event QR codes modal */}
      <AnimatePresence>
        {cancelTarget && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => !cancelling && setCancelTarget(null)} />
            <motion.div
              className="relative w-full max-w-sm rounded-2xl p-5"
              style={{ background:'#1A0810', border:'1px solid rgba(61,30,40,0.9)' }}
              initial={{ scale:0.95, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.95, opacity:0 }}
            >
              <h3 className="text-white font-semibold mb-2">Cancel this booking?</h3>

              {(() => {
                const charge = cancellationCharge(cancelTarget)
                return (
                  <div className="rounded-xl p-3 mb-3"
                    style={{ background: charge.pct ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                             border: `1px solid ${charge.pct ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}` }}>
                    <p className="text-xs font-semibold" style={{ color: charge.pct ? '#fca5a5' : '#86efac' }}>
                      {charge.label}
                    </p>
                    {charge.amount > 0 && (
                      <p className="text-xs mt-1" style={{ color:'#fca5a5' }}>
                        Cancellation charge: ₹{Math.round(charge.amount).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                )
              })()}

              <label className="label-dark">Reason (optional)</label>
              <textarea className="input-dark resize-none" rows={2}
                placeholder="Let us know why, so we can improve"
                value={cancelReason} onChange={e => setCancelReason(e.target.value)} />

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setCancelTarget(null)}
                  disabled={cancelling}
                  className="flex-1 py-2.5 rounded-xl text-sm"
                  style={{ border:'1px solid rgba(61,30,40,0.8)', color:'#9C7A82' }}
                >
                  Keep Booking
                </button>
                <button
                  onClick={handleConfirmCancel}
                  disabled={cancelling}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.4)', color:'#fca5a5' }}
                >
                  {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {qrBooking && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setQrBooking(null)} />
            <motion.div
              className="relative w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background:'#1A0810', border:'1px solid rgba(61,30,40,0.9)', maxHeight:'92vh', overflowY:'auto' }}
              initial={{ scale:0.95, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.95, opacity:0 }}
            >
              <div className="p-5 flex items-center justify-between sticky top-0"
                style={{ background:'#1A0810', borderBottom:'1px solid rgba(61,30,40,0.8)' }}>
                <h3 className="text-white font-semibold">Event QR Codes</h3>
                <button onClick={() => setQrBooking(null)}
                  className="p-1.5 rounded-lg" style={{ border:'1px solid rgba(61,30,40,0.8)', color:'#9C7A82' }}>
                  <X size={16}/>
                </button>
              </div>

              <div className="p-5 space-y-5">
                <p className="text-xs text-center" style={{ color:'#9C7A82' }}>
                  Show these to the Varahi Events team. They scan <b>Start</b> when your event begins
                  and <b>End</b> when it finishes.
                </p>

                {/* Start QR */}
                <div className="rounded-xl p-4 text-center"
                  style={{ background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.25)' }}>
                  <p className="text-sm font-semibold mb-3" style={{ color:'#86efac' }}>▶ Start Event</p>
                  <div className="inline-block bg-white p-3 rounded-xl">
                    <QRCode value={`VARAHI:${qrBooking.id}:start`} size={160} level="M" fgColor="#0D0508"/>
                  </div>
                </div>

                {/* End QR */}
                <div className="rounded-xl p-4 text-center"
                  style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.25)' }}>
                  <p className="text-sm font-semibold mb-3" style={{ color:'#fca5a5' }}>■ End Event</p>
                  <div className="inline-block bg-white p-3 rounded-xl">
                    <QRCode value={`VARAHI:${qrBooking.id}:end`} size={160} level="M" fgColor="#0D0508"/>
                  </div>
                </div>

                <p className="text-[11px] text-center font-mono" style={{ color:'#9C7A82' }}>
                  Booking #{qrBooking.bookingId || qrBooking.id?.slice(0,8).toUpperCase()}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}