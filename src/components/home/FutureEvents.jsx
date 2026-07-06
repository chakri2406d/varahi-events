import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { MapPin, Calendar, Zap, ArrowRight } from 'lucide-react'
import { getPublicEvents } from '../../firebase/firestore'
import { fmt, relativeDay } from '../../utils/dateUtils'

const CAT_COLORS = {
  wedding:   '#EC4899',
  dj:        '#7C3AED',
  concert:   '#F59E0B',
  college:   '#06B6D4',
  corporate: '#10B981',
}

function EventCard({ event, delay }) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.2 })
  const color = CAT_COLORS[event.category] || '#7C3AED'

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="glass-card p-5 group hover:border-brand-violet/50"
    >
      {/* Top: date pill + category */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
          style={{ background: `${color}25`, border: `1px solid ${color}40` }}>
          <Calendar size={11} />
          {relativeDay(event.date)}
        </div>
        <span className="text-xs text-brand-muted capitalize">{event.category || 'Event'}</span>
      </div>

      {/* Title */}
      <h3 className="text-white font-semibold text-base mb-2 group-hover:text-brand-violetL transition-colors">
        {event.name}
      </h3>

      {/* Location */}
      <div className="flex items-center gap-1.5 text-brand-muted text-sm mb-4">
        <MapPin size={13} />
        {event.location}
      </div>

      {/* Machines booked */}
      {event.machines && event.machines.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {event.machines.slice(0, 3).map((m, i) => (
            <span key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-bg text-brand-muted text-xs border border-brand-border">
              <Zap size={10} className="text-brand-gold" />
              {m}
            </span>
          ))}
          {event.machines.length > 3 && (
            <span className="px-2 py-1 rounded-lg bg-brand-bg text-brand-muted text-xs border border-brand-border">
              +{event.machines.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Bottom accent line */}
      <div className="h-0.5 rounded-full mt-2" style={{ background: `linear-gradient(to right, ${color}60, transparent)` }} />
    </motion.div>
  )
}

// Fallback demo events if Firebase has none
const DEMO_EVENTS = [
  { id: '1', name: 'Grand Wedding Reception', location: 'Vijayawada, AP', date: new Date(Date.now() + 2*86400000).toISOString(), category: 'wedding', machines: ['CO2 Blaster x2', 'Stage Lighting', 'Full Setup'] },
  { id: '2', name: 'DJ Night — Club Pulse',   location: 'Hyderabad, TS',  date: new Date(Date.now() + 5*86400000).toISOString(), category: 'dj',      machines: ['CO2 Blaster x1', 'Smoke Machine', 'Operator'] },
  { id: '3', name: 'Annual College Fest',      location: 'Guntur, AP',     date: new Date(Date.now() + 8*86400000).toISOString(), category: 'college', machines: ['Stage Lighting', 'Generator', 'CO2 Blaster x3'] },
]

export default function FutureEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [titleRef, titleInView] = useInView({ triggerOnce: true })

  useEffect(() => {
    getPublicEvents()
      .then(data => setEvents(data.length ? data.slice(0, 6) : DEMO_EVENTS))
      .catch(() => setEvents(DEMO_EVENTS))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="py-20 sm:py-28 relative">
      {/* Subtle bg pattern */}
      <div className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(124,58,237,1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          ref={titleRef}
          initial={{ opacity: 0, y: 20 }}
          animate={titleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
        >
          <div>
            <span className="badge-gold mb-3 inline-block">Live Calendar</span>
            <h2 className="section-title">
              Upcoming
              <span className="text-gradient-v"> Events</span>
            </h2>
            <p className="section-subtitle mt-2">Real bookings. Real hype. See where we'll be next.</p>
          </div>
          <Link to="/calendar" className="btn-secondary flex-shrink-0">
            Full Calendar <ArrowRight size={16} />
          </Link>
        </motion.div>

        {/* Events grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-48 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {events.map((event, i) => (
              <EventCard key={event.id} event={event} delay={i * 0.1} />
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-10 p-6 sm:p-8 glass-card text-center"
        >
          <p className="text-brand-muted text-sm mb-2">Want to be part of the next big event?</p>
          <h3 className="text-white text-xl font-bold font-display mb-4">Your Event Could Be Here</h3>
          <Link to="/equipment" className="btn-primary">
            <Zap size={16} />
            Book Equipment Now
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
