import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react'
import { listenPublicEvents, getAllBookings } from '../firebase/firestore'
import { MONTHS } from '../utils/dateUtils'

const CAT_COLORS = { wedding:'#EC4899', dj:'#7C3AED', concert:'#F59E0B', college:'#06B6D4', corporate:'#10B981' }
const WEEKDAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function Calendar() {
  const navigate = useNavigate()
  const today  = new Date()
  // Midnight copy of "today" so date comparisons ignore the current time of day.
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents] = useState([])
  const [bookings, setBookings] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    // Live subscription so a date blocked by the admin shows up immediately.
    // This reads the publicly-readable `events` collection (works for logged-out
    // visitors and customers alike).
    const unsub = listenPublicEvents(setEvents)
    // getAllBookings only succeeds for admins; harmless (empty) for everyone else.
    getAllBookings()
      .then(data => setBookings(
        data.filter(b => ['confirmed','event_started','payment_pending','requested'].includes(b.status))
      ))
      .catch(() => {})
    return unsub
  }, [])

  const firstDay  = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Real public events (shown as colored dots / "This Month" list).
  const publicEvents  = events.filter(e => !e.blocked)
  // Admin-blocked dates (rendered as unavailable, customer details hidden).
  const blockedEvents = events.filter(e => e.blocked)

  const getEventsForDay = (day) => {
    const d = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    return publicEvents.filter(e => e.date?.startsWith(d))
  }
  const getBookingsForDay = (day) => {
    const d = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    // Prefer real booking docs (admin view); fall back to publicly-readable
    // blocked events so customers/visitors also see the date as taken.
    const fromBookings = bookings.filter(b => b.eventDate?.startsWith(d))
    if (fromBookings.length) return fromBookings
    return blockedEvents
      .filter(e => e.date?.startsWith(d))
      .map(e => ({ id: e.id, eventLocation: 'Reserved', status: 'confirmed' }))
  }

  const prevMonth = () => { if (month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1) }
  const nextMonth = () => { if (month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1) }

  // Built manually (not toISOString, which shifts by the local UTC offset and
  // can roll the date to the previous/next day) so the string always matches
  // the day the customer actually clicked.
  const toLocalDateStr = (y, m, d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

  const handleDayClick = (day) => {
    const cellDate  = new Date(year, month, day)
    const isPastDay = cellDate < todayMidnight
    const isBooked  = getBookingsForDay(day).length > 0
    if (!isPastDay && !isBooked) {
      // Free future date — send the customer straight into equipment selection.
      navigate('/equipment', { state: { eventDate: toLocalDateStr(year, month, day) } })
      return
    }
    // Past / blocked dates stay read-only: just toggle the info panel below.
    setSelected(prev => prev === day ? null : day)
  }

  const cells = []
  for (let i=0; i<firstDay; i++) cells.push(null)
  for (let d=1; d<=daysInMonth; d++) cells.push(d)

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4">

        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="mb-8">
          <span className="badge-gold mb-3 inline-block">Availability</span>
          <h1 className="section-title mb-2">Event <span className="text-gradient-v">Calendar</span></h1>
          <p className="section-subtitle">See when we're booked and plan your event around our schedule.</p>
        </motion.div>

        {/* Month navigation */}
        <div className="glass-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 rounded-xl border border-brand-border text-brand-muted hover:text-white hover:border-brand-violet/50 transition-all">
              <ChevronLeft size={18}/>
            </button>
            <h2 className="font-display font-bold text-xl text-white">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="p-2 rounded-xl border border-brand-border text-brand-muted hover:text-white hover:border-brand-violet/50 transition-all">
              <ChevronRight size={18}/>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-brand-muted text-xs font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`}/>
              const isToday     = day===today.getDate() && month===today.getMonth() && year===today.getFullYear()
              const dayEvents   = getEventsForDay(day)
              const dayBookings = getBookingsForDay(day)
              const isBooked    = dayBookings.length > 0
              const isSelected  = selected === day
              const cellDate    = new Date(year, month, day)
              const isPastDay   = cellDate < todayMidnight
              // Only free, not-yet-happened dates are actionable (book equipment).
              const isFreeFuture = !isBooked && !isPastDay
              return (
                <motion.div
                  key={day}
                  whileHover={isFreeFuture ? { scale: 1.05 } : {}}
                  className={`relative rounded-xl p-1.5 min-h-[52px] sm:min-h-[64px] transition-all border ${
                    isFreeFuture ? 'cursor-pointer' : 'cursor-default'
                  } ${
                    isBooked
                      ? 'bg-red-500/10 border-red-500/40 hover:border-red-500/60'
                      : isToday
                        ? 'bg-brand-violet/20 border-brand-violet/50'
                        : dayEvents.length > 0
                          ? 'bg-brand-surface border-brand-border hover:border-brand-violet/40'
                          : isFreeFuture
                            ? 'border-transparent hover:bg-brand-gold/10 hover:border-brand-gold/40'
                            : 'border-transparent opacity-50'
                  }`}
                  onClick={() => handleDayClick(day)}
                >
                  <span className={`text-xs font-medium ${
                    isBooked ? 'text-red-400' : isToday ? 'text-brand-violetL' : 'text-brand-muted'
                  }`}>
                    {day}
                  </span>
                  {isBooked && (
                    <div className="text-center text-red-400 text-[9px]">🚫</div>
                  )}
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {dayEvents.slice(0,2).map(e => (
                      <div
                        key={e.id}
                        title={e.name}
                        className="w-full h-1.5 rounded-full"
                        style={{ background: CAT_COLORS[e.category] || '#7C3AED' }}
                      />
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[8px] text-brand-muted">+{dayEvents.length-2}</span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-brand-border">
            {Object.entries(CAT_COLORS).map(([cat, color]) => (
              <div key={cat} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: color }}/>
                <span className="text-brand-muted text-xs capitalize">{cat}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-brand-violet/60 border border-brand-violet"/>
              <span className="text-brand-muted text-xs">Today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border border-dashed border-brand-gold/60 bg-brand-gold/10"/>
              <span className="text-brand-goldL text-xs">Tap a free date to book</span>
            </div>
          </div>
        </div>
        {/* Clicked day detail */}
        {selected && (
          <div className="mt-4 glass-card p-4">
            <h3 className="text-white font-semibold text-sm mb-3">
              {MONTHS[month]} {selected}, {year}
            </h3>
            {getBookingsForDay(selected).length > 0 && (
              <div className="mb-2">
                <p className="text-red-400 text-xs font-semibold mb-1">🚫 Booked ({getBookingsForDay(selected).length} booking)</p>
                {getBookingsForDay(selected).map(b => (
                  <div key={b.id} className="text-brand-muted text-xs py-1 border-b border-brand-border last:border-0">
                    📍 {b.eventLocation || 'Location TBD'} —
                    <span className="text-red-300 ml-1 capitalize">{b.status?.replace('_',' ')}</span>
                  </div>
                ))}
              </div>
            )}
            {getEventsForDay(selected).length > 0 && (
              <div>
                <p className="text-brand-violet text-xs font-semibold mb-1">📅 Public Events</p>
                {getEventsForDay(selected).map(e => (
                  <div key={e.id} className="text-brand-muted text-xs py-1">
                    {e.name} · {e.location}
                  </div>
                ))}
              </div>
            )}
            {getBookingsForDay(selected).length === 0 && getEventsForDay(selected).length === 0 && (
              <p className="text-brand-muted text-xs">✅ Available — no bookings on this day!</p>
            )}
          </div>
        )}

        {/* This month's events */}
        {publicEvents.filter(e => {
          const d = new Date(e.date)
          return d.getMonth()===month && d.getFullYear()===year
        }).length > 0 && (
          <div className="mt-8">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <CalIcon size={16} className="text-brand-violet"/> This Month
            </h3>
            <div className="space-y-3">
              {publicEvents
                .filter(e => { const d=new Date(e.date); return d.getMonth()===month && d.getFullYear()===year })
                .sort((a,b) => new Date(a.date)-new Date(b.date))
                .map((e,i) => (
                  <motion.div
                    key={e.id}
                    initial={{ opacity:0, x:-20 }}
                    animate={{ opacity:1, x:0 }}
                    transition={{ delay: i*0.07 }}
                    className="glass-card p-4 flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-white text-sm"
                      style={{ background: CAT_COLORS[e.category] || '#7C3AED' }}>
                      {new Date(e.date).getDate()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{e.name}</p>
                      <p className="text-brand-muted text-xs">{e.location}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                      style={{ background:`${CAT_COLORS[e.category]}20`, color:CAT_COLORS[e.category], border:`1px solid ${CAT_COLORS[e.category]}30` }}>
                      {e.category}
                    </span>
                  </motion.div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
