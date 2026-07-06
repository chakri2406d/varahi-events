import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { EVENT_CATEGORIES } from '../../utils/constants'

// Mock gallery items — replace with real Firebase data
const GALLERY_ITEMS = [
  { id: 1, cat: 'wedding',   title: 'Grand Wedding Entry',         loc: 'Vijayawada', span: 'col-span-2 row-span-2', color: '#7C3AED', emoji: '💍' },
  { id: 2, cat: 'dj',        title: 'DJ Night — XYZ Club',         loc: 'Hyderabad',  span: '',                      color: '#EC4899', emoji: '🎧' },
  { id: 3, cat: 'concert',   title: 'Open-Air Concert',            loc: 'Guntur',     span: '',                      color: '#F59E0B', emoji: '🎤' },
  { id: 4, cat: 'college',   title: 'Annual College Fest',         loc: 'Vijayawada', span: 'row-span-2',            color: '#06B6D4', emoji: '🎓' },
  { id: 5, cat: 'corporate', title: 'Corporate Launch Event',      loc: 'Amaravati',  span: '',                      color: '#10B981', emoji: '🏢' },
  { id: 6, cat: 'wedding',   title: 'CO₂ Blast Wedding Night',     loc: 'Rajahmundry',span: '',                      color: '#8B5CF6', emoji: '💨' },
  { id: 7, cat: 'dj',        title: 'New Year DJ Bash',            loc: 'Hyderabad',  span: 'col-span-2',            color: '#F43F5E', emoji: '🎊' },
  { id: 8, cat: 'concert',   title: 'Folk Concert',                loc: 'Nellore',    span: '',                      color: '#F59E0B', emoji: '🎵' },
  { id: 9, cat: 'college',   title: 'Tech Fest Stage Setup',       loc: 'Vijayawada', span: '',                      color: '#6366F1', emoji: '⚡' },
]

function WorkCard({ item, delay }) {
  const [hovered, setHovered] = useState(false)
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.2 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`relative rounded-2xl overflow-hidden cursor-pointer group ${item.span}`}
      style={{ minHeight: '180px' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Color background (placeholder for actual images) */}
      <div
        className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
        style={{
          background: `linear-gradient(135deg, ${item.color}40 0%, ${item.color}15 100%)`,
          borderColor: `${item.color}30`,
          border: '1px solid',
        }}
      />

      {/* Big emoji visual */}
      <div className="absolute inset-0 flex items-center justify-center text-[80px] opacity-20 select-none">
        {item.emoji}
      </div>

      {/* Gradient overlay on hover */}
      <motion.div
        className="absolute inset-0"
        style={{ background: `linear-gradient(to top, ${item.color}CC 0%, transparent 60%)` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: hovered ? 1 : 0.4 }}
        transition={{ duration: 0.3 }}
      />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <motion.div
          initial={{ y: 10, opacity: 0.6 }}
          animate={{ y: hovered ? 0 : 8, opacity: hovered ? 1 : 0.7 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-white font-semibold text-sm sm:text-base leading-tight">{item.title}</p>
          <p className="text-white/70 text-xs mt-0.5">📍 {item.loc}</p>
        </motion.div>
      </div>

      {/* Category pill top-right */}
      <div className="absolute top-3 right-3">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
          style={{ background: `${item.color}80`, backdropFilter: 'blur(8px)' }}>
          {item.cat}
        </span>
      </div>
    </motion.div>
  )
}

export default function Works() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [titleRef, titleInView] = useInView({ triggerOnce: true })

  const filtered = activeCategory === 'all'
    ? GALLERY_ITEMS
    : GALLERY_ITEMS.filter(i => i.cat === activeCategory)

  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          ref={titleRef}
          initial={{ opacity: 0, y: 20 }}
          animate={titleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-10"
        >
          <span className="badge-pink mb-4 inline-block">Our Works</span>
          <h2 className="section-title">
            Events We've
            <span className="text-gradient-gp"> Created</span>
          </h2>
          <p className="section-subtitle mt-3 max-w-xl mx-auto">
            Every event tells a story. Here are some of our best chapters.
          </p>
        </motion.div>

        {/* Category filter */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-8 justify-start sm:justify-center">
          {EVENT_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeCategory === cat.id
                  ? 'bg-brand-violet text-white shadow-glow-v'
                  : 'bg-brand-surface border border-brand-border text-brand-muted hover:text-white hover:border-brand-violet/40'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Masonry grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 auto-rows-[180px]"
          >
            {filtered.map((item, i) => (
              <WorkCard key={item.id} item={item} delay={i * 0.06} />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <a href="/gallery" className="btn-secondary">
            View Full Gallery →
          </a>
        </motion.div>
      </div>
    </section>
  )
}
