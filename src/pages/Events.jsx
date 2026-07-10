import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, MapPin, Search, Zap } from 'lucide-react'
import { getPublicEvents } from '../firebase/firestore'
import { fmt, relativeDay, isEventPast } from '../utils/dateUtils'
import { EVENT_CATEGORIES } from '../utils/constants'
import { Link } from 'react-router-dom'

const DEMO = [
  { id:'e1', name:'Grand Wedding Reception',    location:'Hyderabad, TS',  date:new Date(Date.now()+2*86400000).toISOString(),  category:'wedding',   machines:['CO2 Blaster x2','Stage Lighting','Full Setup'],   public:true },
  { id:'e2', name:'DJ Night — Club Pulse',      location:'Hyderabad, TS',   date:new Date(Date.now()+4*86400000).toISOString(),  category:'dj',        machines:['CO2 Blaster x1','Smoke Machine','Operator'],     public:true },
  { id:'e3', name:'Annual College Fest 2025',   location:'Guntur, AP',      date:new Date(Date.now()+7*86400000).toISOString(),  category:'college',   machines:['Stage Lighting','Generator','CO2 Blaster x3'],   public:true },
  { id:'e4', name:'Corporate Product Launch',   location:'Amaravati, AP',   date:new Date(Date.now()+10*86400000).toISOString(), category:'corporate', machines:['Lighting Rig','Smoke Machine','Full Setup'],     public:true },
  { id:'e5', name:'Open-Air Rock Concert',      location:'Nellore, AP',     date:new Date(Date.now()+14*86400000).toISOString(), category:'concert',   machines:['Stage Lighting','DJ Setup','Generator x2'],      public:true },
  { id:'e6', name:'Lavish Wedding Reception',   location:'Rajahmundry, AP', date:new Date(Date.now()+18*86400000).toISOString(), category:'wedding',   machines:['CO2 Blaster x4','Mirror Booth','Stage Lighting'], public:true },
]

const CAT_COLORS = { wedding:'#EC4899', dj:'#7C3AED', concert:'#F59E0B', college:'#06B6D4', corporate:'#10B981' }

function EventCard({ event, index }) {
  const past  = isEventPast(event.date)
  const color = CAT_COLORS[event.category] || '#7C3AED'

  return (
    <motion.div
      initial={{ opacity:0, y:20 }}
      animate={{ opacity:1, y:0 }}
      transition={{ delay: index * 0.07 }}
      className={`glass-card p-5 group ${past ? 'opacity-60' : ''}`}
    >
      {/* Color accent bar */}
      <div className="h-1 rounded-full mb-4" style={{ background: `linear-gradient(to right, ${color}, transparent)` }} />

      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2 inline-block"
            style={{ background:`${color}20`, color, border:`1px solid ${color}35` }}>
            {event.category}
          </span>
          <h3 className="text-white font-semibold text-base group-hover:text-brand-violetL transition-colors">{event.name}</h3>
        </div>
        {past && <span className="badge-red flex-shrink-0 text-[10px]">Past</span>}
      </div>

      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-2 text-brand-muted text-sm">
          <Calendar size={13} className="text-brand-violet flex-shrink-0" />
          {fmt(event.date)} · <span className="text-white font-medium">{relativeDay(event.date)}</span>
        </div>
        <div className="flex items-center gap-2 text-brand-muted text-sm">
          <MapPin size={13} className="text-brand-violet flex-shrink-0" />
          {event.location}
        </div>
      </div>

      {event.machines?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {event.machines.slice(0,3).map((m,i) => (
            <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-bg text-brand-muted text-[10px] border border-brand-border">
              <Zap size={9} className="text-brand-gold" />{m}
            </span>
          ))}
          {event.machines.length > 3 && (
            <span className="px-2 py-0.5 rounded-md bg-brand-bg text-brand-muted text-[10px] border border-brand-border">
              +{event.machines.length - 3}
            </span>
          )}
        </div>
      )}
    </motion.div>
  )
}

export default function Events() {
  const [events,   setEvents]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [category, setCategory] = useState('all')
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    getPublicEvents()
      .then(d => setEvents(d.length ? d : DEMO))
      .catch(() => setEvents(DEMO))
      .finally(() => setLoading(false))
  }, [])

  const filtered = events
    .filter(e => category === 'all' || e.category === category)
    .filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.location.toLowerCase().includes(search.toLowerCase()))

  const upcoming = filtered.filter(e => !isEventPast(e.date))
  const past     = filtered.filter(e => isEventPast(e.date))

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4">

        {/* Header */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="mb-8">
          <span className="badge-violet mb-3 inline-block">Live Schedule</span>
          <h1 className="section-title mb-2">Upcoming <span className="text-gradient-v">Events</span></h1>
          <p className="section-subtitle">Where Varahi Events will be creating magic next.</p>
        </motion.div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              type="text"
              className="input-dark pl-10 w-full"
              placeholder="Search events or locations…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {EVENT_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  category === cat.id
                    ? 'bg-brand-violet text-white shadow-glow-v'
                    : 'bg-brand-surface border border-brand-border text-brand-muted hover:text-white'
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_,i) => <div key={i} className="skeleton h-52 rounded-2xl"/>)}
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mb-10">
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
                  Upcoming · {upcoming.length} events
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcoming.map((e,i) => <EventCard key={e.id} event={e} index={i}/>)}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="text-brand-muted font-semibold mb-4">Past Events · {past.length}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {past.map((e,i) => <EventCard key={e.id} event={e} index={i}/>)}
                </div>
              </div>
            )}

            {filtered.length === 0 && (
              <div className="glass-card p-12 text-center">
                <div className="text-5xl mb-3">🔍</div>
                <p className="text-white font-semibold mb-1">No events found</p>
                <p className="text-brand-muted text-sm">Try a different search or category</p>
              </div>
            )}
          </>
        )}

        {/* Book CTA */}
        <div className="mt-12 glass-card p-6 sm:p-8 text-center">
          <p className="text-brand-muted text-sm mb-1">Want us at your event?</p>
          <h3 className="text-white text-xl font-bold font-display mb-4">Let's Create Something Incredible</h3>
          <Link to="/equipment" className="btn-primary">
            <Zap size={16}/> Book Equipment Now
          </Link>
        </div>
      </div>
    </div>
  )
}
