import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarClock, Phone, MessageCircle, MapPin, Users, Package, IndianRupee, Clock, PartyPopper } from 'lucide-react'
import { listenBookings } from '../../firebase/firestore'
import { fmtTime } from '../../utils/dateUtils'

// Only these statuses represent an event that is actually going to happen /
// is happening — requested/pending/cancelled/completed have no place on the
// day sheet the owner checks each morning.
const ACTIVE_STATUSES = ['confirmed', 'event_started']

const pad = (n) => String(n).padStart(2, '0')

// Local YYYY-MM-DD key, built from calendar components — NOT toISOString(),
// which reports UTC and can silently roll the date back/forward a day
// depending on the browser's timezone offset.
const localKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const addDays = (d, n) => { const copy = new Date(d); copy.setDate(copy.getDate() + n); return copy }

// "HH:mm" (from a <input type="time">) -> "hh:mm a" for display.
const formatTimeStr = (hhmm) => {
  if (!hhmm) return null
  const d = new Date(`2000-01-01T${hhmm}:00`)
  return isNaN(d.getTime()) ? hhmm : fmtTime(d)
}

// Builds a wa.me link, prefixing the Indian country code for bare 10-digit numbers.
const waLink = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return null
  const withCode = digits.length === 10 ? `91${digits}` : digits
  return `https://wa.me/${withCode}`
}

// Bookings without a set time sort to the bottom of their group.
const sortByTime = (a, b) => {
  if (!a.eventTime && !b.eventTime) return 0
  if (!a.eventTime) return 1
  if (!b.eventTime) return -1
  return a.eventTime.localeCompare(b.eventTime)
}

const GROUPS = [
  { id: 'today',    label: 'Today'          },
  { id: 'tomorrow', label: 'Tomorrow'       },
  { id: 'week',     label: 'This Week'      },
]

function BookingRow({ b }) {
  const wa      = waLink(b.customerPhone)
  const balance = Math.max(0, (Number(b.totalAmount) || 0) - (Number(b.amountPaid) || 0))
  const machines = Array.isArray(b.machines) ? b.machines : []
  const crew     = Array.isArray(b.crew) ? b.crew : []

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <div>
          <p className="text-white font-semibold text-sm">{b.customerName || 'Unnamed customer'}</p>
          <div className="flex items-center gap-3 flex-wrap mt-1 text-xs text-brand-muted">
            {b.customerPhone && <span className="flex items-center gap-1"><Phone size={11}/> {b.customerPhone}</span>}
            {b.eventLocation && <span className="flex items-center gap-1"><MapPin size={11}/> {b.eventLocation}</span>}
          </div>
        </div>
        <span className={b.status === 'event_started' ? 'badge-gold' : 'badge-green'} style={{ fontSize: '10px' }}>
          {b.status === 'event_started' ? 'Event Started' : 'Confirmed'}
        </span>
      </div>

      <div className="flex items-center gap-4 flex-wrap mb-2 text-xs">
        {b.eventTime && (
          <span className="flex items-center gap-1" style={{ color: '#E8B86D' }}>
            <Clock size={12}/> Event {formatTimeStr(b.eventTime)}
          </span>
        )}
        {b.setupTime && (
          <span className="flex items-center gap-1 text-brand-muted">
            <Clock size={12}/> Setup by {formatTimeStr(b.setupTime)}
          </span>
        )}
        {!b.eventTime && !b.setupTime && <span className="text-brand-muted">No time set</span>}
      </div>

      {machines.length > 0 && (
        <div className="flex items-start gap-1.5 mb-2 text-xs">
          <Package size={12} className="mt-0.5 flex-shrink-0" style={{ color: '#9C7A82' }}/>
          <span className="text-brand-muted">
            {machines.map(m => `${m.name || 'Item'}${m.qty ? ` ×${m.qty}` : ''}`).join(', ')}
          </span>
        </div>
      )}

      {crew.length > 0 && (
        <div className="flex items-start gap-1.5 mb-2 text-xs">
          <Users size={12} className="mt-0.5 flex-shrink-0" style={{ color: '#9C7A82' }}/>
          <span className="text-brand-muted">{crew.map(c => c.name).filter(Boolean).join(', ') || 'Assigned'}</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-border">
        <div className="flex items-center gap-2">
          {b.customerPhone && (
            <a href={`tel:${b.customerPhone}`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-brand-border text-brand-muted hover:text-white hover:border-amber-500/40 transition-all text-xs">
              <Phone size={12}/> Call
            </a>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-green-500/30 text-green-300 hover:bg-green-500/10 transition-all text-xs">
              <MessageCircle size={12}/> WhatsApp
            </a>
          )}
        </div>
        <span className={`flex items-center gap-1 text-xs font-semibold ${balance > 0 ? 'text-red-400' : 'text-green-300'}`}>
          <IndianRupee size={12}/> {balance > 0 ? `₹${balance.toLocaleString()} due` : 'Fully paid'}
        </span>
      </div>
    </motion.div>
  )
}

export default function TodayView() {
  const [bookings, setBookings] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const unsubscribe = listenBookings((rows) => {
      setBookings(rows)
      setLoading(false)
    })
    return () => unsubscribe && unsubscribe()
  }, [])

  const now       = new Date()
  const todayKey    = localKey(now)
  const tomorrowKey = localKey(addDays(now, 1))
  const weekKeys    = new Set([...Array(5)].map((_, i) => localKey(addDays(now, i + 2)))) // day+2 .. day+6, completing the 7-day window (today + tomorrow + these 5)

  const active = bookings.filter(b => ACTIVE_STATUSES.includes(b.status) && b.eventDate)

  const grouped = {
    today:    active.filter(b => b.eventDate === todayKey).sort(sortByTime),
    tomorrow: active.filter(b => b.eventDate === tomorrowKey).sort(sortByTime),
    week:     active.filter(b => weekKeys.has(b.eventDate)).sort((a, b) => (a.eventDate === b.eventDate ? 0 : a.eventDate.localeCompare(b.eventDate)) || sortByTime(a, b)),
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center gap-3">
        <CalendarClock size={24} style={{ color: '#C9933A' }}/>
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Today's Operations</h1>
          <p className="text-brand-muted text-sm">Confirmed events at a glance — updates live</p>
        </div>
      </motion.div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-32 rounded-xl"/>)}</div>
      ) : (
        <div className="space-y-8">
          {GROUPS.map(g => {
            const rows = grouped[g.id]
            return (
              <section key={g.id}>
                <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                  {g.label}
                  <span className="badge-violet" style={{ fontSize: '10px' }}>{rows.length}</span>
                </h2>
                {rows.length === 0 ? (
                  <div className="glass-card p-8 flex flex-col items-center text-center gap-2">
                    <PartyPopper size={24} style={{ color: '#9C7A82' }}/>
                    <p className="text-brand-muted text-sm">
                      {g.id === 'today' ? 'Nothing scheduled today' : g.id === 'tomorrow' ? 'Nothing scheduled tomorrow' : 'Nothing scheduled this week'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rows.map(b => <BookingRow key={b.id} b={b}/>)}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
