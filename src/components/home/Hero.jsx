import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronDown, Zap, Calendar } from 'lucide-react'

// Cinematic scene descriptors shown as overlays
const SCENES = [
  { text: 'CO₂ Paper Blasts', sub: 'Stage Production' },
  { text: 'Wedding Entries', sub: 'Luxury Experiences' },
  { text: 'DJ Crowd Moments', sub: 'Unforgettable Nights' },
  { text: 'Concert Atmosphere', sub: 'Live Energy' },
  { text: 'Emotional Memories', sub: 'Forever Captured' },
]

// Color gradients cycling through scenes
const SCENE_COLORS = [
  'from-violet-900/80 via-purple-900/40',
  'from-rose-900/70 via-pink-900/40',
  'from-blue-900/80 via-indigo-900/40',
  'from-emerald-900/70 via-teal-900/30',
  'from-amber-900/70 via-orange-900/30',
]

export default function Hero() {
  const [scene, setScene] = useState(0)
  const intervalRef = useRef(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setScene(s => (s + 1) % SCENES.length)
    }, 3200)
    return () => clearInterval(intervalRef.current)
  }, [])

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">

      {/* ── CINEMATIC BACKGROUND ── */}
      <div className="absolute inset-0 bg-brand-bg">
        {/* Dynamic gradient that changes with scene */}
        <motion.div
          key={scene}
          className={`absolute inset-0 bg-gradient-to-br ${SCENE_COLORS[scene]} to-transparent`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
        />

        {/* Static radial glow */}
        <div className="absolute inset-0 bg-gradient-radial from-brand-violet/20 via-transparent to-transparent" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(124,58,237,0.25) 0%, transparent 70%)' }} />

        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width:  Math.random() * 3 + 1 + 'px',
              height: Math.random() * 3 + 1 + 'px',
              left:   Math.random() * 100 + '%',
              top:    Math.random() * 100 + '%',
              background: i % 3 === 0 ? '#8B1A2C' : i % 3 === 1 ? '#C9933A' : '#E8718A',
            }}
            animate={{
              y:       [0, -(30 + Math.random() * 50), 0],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              delay:    Math.random() * 3,
              repeat:   Infinity,
              ease:     'easeInOut',
            }}
          />
        ))}

        {/* Glow orbs */}
        <div className="orb w-[500px] h-[500px] -top-32 -left-32" style={{ background: 'rgba(107,15,26,0.2)' }} />
        <div className="orb w-[400px] h-[400px] -bottom-20 -right-20" style={{ background: 'rgba(201,147,58,0.08)', animationDelay: '2s' }} />
        <div className="orb w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ background: 'rgba(139,26,44,0.15)', animationDelay: '1s' }} />
      </div>

      {/* ── SCENE INDICATOR ROW (label left, dots right) ── */}
      <div className="absolute top-20 left-0 right-0 z-10 flex items-center justify-between px-4 sm:px-8">
        <motion.div
          key={`label-${scene}`}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-brand-pink animate-pulse flex-shrink-0" />
          <span className="text-brand-muted text-[10px] sm:text-xs tracking-[0.18em] uppercase whitespace-nowrap">
            {SCENES[scene].sub}
          </span>
        </motion.div>

        <div className="flex items-center gap-1.5">
          {SCENES.map((_, i) => (
            <button
              key={i}
              onClick={() => setScene(i)}
              className={`transition-all duration-300 rounded-full ${
                i === scene ? 'w-5 h-1.5 bg-brand-violet' : 'w-1.5 h-1.5 bg-brand-muted/40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto pt-16 sm:pt-0">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-brand-goldL text-[11px] sm:text-sm font-medium mb-5 sm:mb-6"
          style={{ background: 'rgba(201,147,58,0.12)', border: '1px solid rgba(201,147,58,0.3)' }}
        >
          <Zap size={14} className="text-brand-gold" />
          Premium Event Production · Andhra Pradesh
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-none mb-4"
        >
          Turning Events
          <br />
          <span className="text-gradient-vp">Into Experiences</span>
        </motion.h1>

        {/* Subheadline — scene cycling */}
        <motion.div className="h-12 flex items-center justify-center mb-8 overflow-hidden">
          <motion.p
            key={scene}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="text-brand-muted text-base sm:text-lg font-medium"
          >
            ✦ {SCENES[scene].text} ✦
          </motion.p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link to="/equipment" className="btn-primary text-base px-8 py-3.5 w-full sm:w-auto justify-center">
            <Zap size={18} />
            Book Your Event
          </Link>
          <Link to="/events" className="btn-secondary text-base px-8 py-3.5 w-full sm:w-auto justify-center">
            <Calendar size={18} />
            View Upcoming Events
          </Link>
        </motion.div>

        {/* Trust stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="mt-12 flex items-center justify-center gap-6 sm:gap-10"
        >
          {[
            { num: '500+', label: 'Events' },
            { num: '10+', label: 'Cities' },
            { num: '50k+', label: 'Audience' },
          ].map(({ num, label }) => (
            <div key={label} className="text-center">
              <p className="font-display font-bold text-xl sm:text-2xl text-white">{num}</p>
              <p className="text-brand-muted text-xs sm:text-sm">{label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── SCROLL CUE ── */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="flex flex-col items-center gap-1 text-brand-muted">
          <span className="text-[10px] tracking-widest uppercase">Scroll</span>
          <ChevronDown size={16} />
        </div>
      </motion.div>

      {/* ── BOTTOM GRADIENT FADE ── */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-brand-bg to-transparent" />
    </section>
  )
}
