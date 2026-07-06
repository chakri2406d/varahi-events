import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, CalendarCheck, Clock, Package, DollarSign, Check, Eye, Wallet, Smartphone } from 'lucide-react'
import { getDashboardStats, listenBookings, updateBookingStatus, addPublicEvent } from '../../firebase/firestore'
import { STATUS_LABELS, STATUS_COLORS, BOOKING_STATUSES } from '../../utils/constants'
import { fmt } from '../../utils/dateUtils'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const [stats,     setStats]     = useState(null)
  const [bookings,  setBookings]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [totalAmts, setTotalAmts] = useState({}) // { [bookingId]: amount string }
  const [confirming,setConfirming]= useState(null)

  const loadStats = () => getDashboardStats().then(setStats).catch(console.error)

  useEffect(() => {
    loadStats()
    const unsub = listenBookings(data => { setBookings(data); setLoading(false) })
    return unsub
  }, [])

  // Recompute revenue whenever bookings change (e.g. an event is marked
  // completed) so the totals update live without needing a page refresh.
  useEffect(() => {
    if (bookings.length) loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings])

  // ── Accept booking ─────────────────────────────────────────────────────────
  const handleAccept = async (b) => {
    const total = Number(totalAmts[b.id] || b.totalAmount)
    if (!total || total <= 0) {
      toast.error('Please enter the total booking amount first'); return
    }
    const paid = Number(b.amountPaid || 0)
    if (b.status === 'payment_pending' && paid < total * 0.4) {
      toast.error(`Minimum 40% advance = ₹${Math.ceil(total*0.4).toLocaleString('en-IN')}. Customer paid ₹${paid.toLocaleString('en-IN')}.`); return
    }

    setConfirming(b.id)
    try {
      await updateBookingStatus(b.id, BOOKING_STATUSES.CONFIRMED, {
        totalAmount:     total,
        paymentVerified: true,
        confirmedAt:     new Date().toISOString(),
      })

      // Block date on calendar
      if (b.eventDate) {
        await addPublicEvent({
          name:      `${b.customerName}'s Event`,
          date:      b.eventDate,
          location:  b.eventLocation || 'TBD',
          category:  'corporate',
          public:    true,
          bookingId: b.id,
          equipment: b.machines?.map(m => m.name || m).join(', ') || '',
          customer:  b.customerName,
        })
      }

      toast.success(`✅ Confirmed! Date blocked on calendar.`)
      loadStats()
    } catch (err) {
      console.error(err)
      toast.error('Failed to confirm. Try again.')
    } finally {
      setConfirming(null)
    }
  }

  // ── Reject booking ─────────────────────────────────────────────────────────
  const handleReject = async (id) => {
    if (!confirm('Cancel this booking?')) return
    try {
      await updateBookingStatus(id, BOOKING_STATUSES.CANCELLED, { cancelledAt: new Date().toISOString() })
      toast.success('Booking cancelled.')
      loadStats()
    } catch { toast.error('Failed.') }
  }

  const recent = bookings.slice(0, 10)

  const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

  const STAT_CARDS = stats ? [
    { label:'Total Bookings',   value: stats.totalBookings,  icon: Package,       color:'#C9933A',  bg:'rgba(201,147,58,0.1)'  },
    { label:'Confirmed',        value: stats.confirmedCount, icon: CalendarCheck, color:'#86efac',  bg:'rgba(34,197,94,0.1)'   },
    { label:'Pending',          value: stats.pendingCount,   icon: Clock,         color:'#fdba74',  bg:'rgba(249,115,22,0.1)'  },
    // Collected revenue, split by method (confirmed + completed only)
    { label:'Cash Collected',   value: inr(stats.cashCollected),   icon: Wallet,        color:'#86efac',  bg:'rgba(34,197,94,0.1)'  },
    { label:'Online Collected', value: inr(stats.onlineCollected), icon: Smartphone,    color:'#93c5fd',  bg:'rgba(59,130,246,0.1)' },
    // Total Revenue = Cash + Online collected
    { label:'Total Revenue',    value: inr(stats.totalRevenue),    icon: TrendingUp,    color:'#C9933A',  bg:'rgba(201,147,58,0.1)' },
    // Still to be received vs full contracted value
    { label:'To Be Received',   value: inr(stats.outstanding),     icon: Clock,         color:'#fca5a5',  bg:'rgba(239,68,68,0.08)' },
    { label:'Booked Value',     value: inr(stats.bookedValue),     icon: CalendarCheck, color:'#E8B86D',  bg:'rgba(201,147,58,0.08)' },
    { label:'Total Expenses',   value: inr(stats.totalExpense),    icon: DollarSign,    color:'#fca5a5',  bg:'rgba(239,68,68,0.1)'  },
    { label:'Net Profit',       value: inr(stats.netProfit),       icon: TrendingUp,
      color: (stats.netProfit||0) >= 0 ? '#86efac' : '#fca5a5',
      bg:    (stats.netProfit||0) >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' },
  ] : []

  return (
    <div>
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white">Dashboard</h1>
        <p className="text-sm" style={{ color:'#9C7A82' }}>Overview of all operations</p>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {stats ? STAT_CARDS.map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.07 }}
            className="glass-card p-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: s.bg }}>
              <s.icon size={16} style={{ color: s.color }}/>
            </div>
            <p className="font-bold text-xl" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color:'#9C7A82' }}>{s.label}</p>
          </motion.div>
        )) : [...Array(10)].map((_,i) => (
          <div key={i} className="skeleton h-28 rounded-2xl"/>
        ))}
      </div>

      {/* How Total Revenue is calculated */}
      {stats && (
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
          className="glass-card p-5 mb-8">
          <p className="text-xs uppercase tracking-wider mb-4" style={{ color:'#9C7A82' }}>
            How Total Revenue is calculated
          </p>

          <div className="flex items-center justify-center gap-3 sm:gap-5 flex-wrap text-center">
            {/* Cash */}
            <div>
              <p className="font-bold text-xl" style={{ color:'#86efac' }}>{inr(stats.cashCollected)}</p>
              <p className="text-[11px] mt-0.5" style={{ color:'#9C7A82' }}>💵 Cash Collected</p>
            </div>
            <span className="text-2xl font-light" style={{ color:'#9C7A82' }}>+</span>
            {/* Online */}
            <div>
              <p className="font-bold text-xl" style={{ color:'#93c5fd' }}>{inr(stats.onlineCollected)}</p>
              <p className="text-[11px] mt-0.5" style={{ color:'#9C7A82' }}>📲 Online Collected</p>
            </div>
            <span className="text-2xl font-light" style={{ color:'#9C7A82' }}>=</span>
            {/* Total */}
            <div>
              <p className="font-bold text-2xl" style={{ color:'#C9933A' }}>{inr(stats.totalRevenue)}</p>
              <p className="text-[11px] mt-0.5" style={{ color:'#E8B86D' }}>Total Revenue</p>
            </div>
          </div>

          {/* Still to be received */}
          <div className="flex items-center justify-between mt-4 pt-4 text-sm"
            style={{ borderTop:'1px solid rgba(61,30,40,0.6)' }}>
            <span style={{ color:'#9C7A82' }}>Still to be received (not counted yet)</span>
            <span className="font-semibold" style={{ color:'#fca5a5' }}>{inr(stats.outstanding)}</span>
          </div>
          <p className="text-[11px] mt-2" style={{ color:'#9C7A82' }}>
            Only money you've actually received counts as revenue. The balance shows under "To Be Received"
            until you collect and record it.
          </p>
        </motion.div>
      )}

      {/* Recent bookings with accept/reject */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom:'1px solid rgba(61,30,40,0.8)' }}>
          <h2 className="text-white font-semibold">Recent Bookings</h2>
          <a href="/admin/bookings" className="text-xs hover:underline" style={{ color:'#E8B86D' }}>
            View All →
          </a>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(4)].map((_,i) => <div key={i} className="skeleton h-20 rounded-xl"/>)}
          </div>
        ) : recent.length === 0 ? (
          <div className="p-10 text-center" style={{ color:'#9C7A82' }}>No bookings yet</div>
        ) : (
          <div>
            {recent.map((b, i) => {
              const needsAction = b.status === 'payment_pending' || b.status === 'requested'
              const paid  = Number(b.amountPaid  || 0)
              const total = Number(totalAmts[b.id] || b.totalAmount || 0)
              const pct   = total > 0 ? Math.round((paid/total)*100) : null

              return (
                <motion.div key={b.id}
                  initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.05 }}
                  className="px-5 py-4"
                  style={{ borderBottom:'1px solid rgba(61,30,40,0.4)' }}
                >
                  {/* Top row — name + status + amount */}
                  <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-white text-sm font-semibold">{b.customerName || 'Unknown'}</p>
                        <span className={`${STATUS_COLORS[b.status] || 'badge-gold'} text-[10px]`}>
                          {STATUS_LABELS[b.status] || b.status}
                        </span>
                        {pct !== null && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{
                              background: pct >= 40 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                              border: `1px solid ${pct >= 40 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                              color: pct >= 40 ? '#86efac' : '#fca5a5',
                            }}>
                            {pct}% paid
                          </span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color:'#9C7A82' }}>
                        {b.eventLocation} · {b.eventDate ? fmt(b.eventDate) : '—'}
                      </p>
                    </div>

                    {/* Amount display */}
                    <div className="text-right flex-shrink-0">
                      {b.amountPaid && (
                        <p className="text-xs font-semibold" style={{ color:'#C9933A' }}>
                          Paid: ₹{Number(b.amountPaid).toLocaleString('en-IN')}
                        </p>
                      )}
                      {b.totalAmount && (
                        <p className="text-xs" style={{ color:'#9C7A82' }}>
                          Total: ₹{Number(b.totalAmount).toLocaleString('en-IN')}
                        </p>
                      )}
                      {b.transactionId && (
                        <p className="text-[10px] font-mono mt-0.5" style={{ color:'#9C7A82' }}>
                          UTR: {b.transactionId}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Accept/Reject row — only for pending bookings */}
                  {needsAction && (
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {/* Total amount input */}
                      <div className="relative flex-1 min-w-[120px]">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs"
                          style={{ color:'#9C7A82' }}>₹</span>
                        <input
                          type="number"
                          className="input-dark pl-6 py-1.5 text-xs h-8"
                          placeholder="Set total amount"
                          value={totalAmts[b.id] ?? (b.totalAmount || '')}
                          onChange={e => setTotalAmts(prev => ({ ...prev, [b.id]: e.target.value }))}
                          onClick={e => e.stopPropagation()}
                        />
                      </div>

                      {/* Accept */}
                      <button
                        onClick={() => handleAccept(b)}
                        disabled={confirming === b.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all h-8"
                        style={{
                          background: 'rgba(34,197,94,0.15)',
                          border: '1px solid rgba(34,197,94,0.3)',
                          color: '#86efac',
                          opacity: confirming === b.id ? 0.6 : 1,
                        }}
                      >
                        {confirming === b.id
                          ? <div className="w-3 h-3 border border-green-400/30 border-t-green-400 rounded-full animate-spin"/>
                          : <><Check size={12}/> Accept</>
                        }
                      </button>

                      {/* Reject */}
                      <button
                        onClick={() => handleReject(b.id)}
                        disabled={confirming === b.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all h-8"
                        style={{
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          color: '#fca5a5',
                        }}
                      >
                        ✕ Reject
                      </button>

                      {/* View details */}
                      <a href="/admin/bookings"
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all h-8"
                        style={{ border:'1px solid rgba(61,30,40,0.8)', color:'#9C7A82' }}>
                        <Eye size={11}/> Details
                      </a>
                    </div>
                  )}

                  {/* Confirmed — show success */}
                  {b.status === 'confirmed' && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400"/>
                      <p className="text-xs" style={{ color:'#86efac' }}>
                        Confirmed · ₹{Number(b.amountPaid||0).toLocaleString('en-IN')} advance received
                        {b.totalAmount ? ` of ₹${Number(b.totalAmount).toLocaleString('en-IN')} total` : ''}
                      </p>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}