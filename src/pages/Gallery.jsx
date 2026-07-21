import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ZoomIn } from 'lucide-react'
import { getGalleryItems } from '../firebase/firestore'
import { EVENT_CATEGORIES } from '../utils/constants'

const DEMO_GALLERY = [
  { id:'g1', title:'Wedding CO2 Blast Entry',   category:'wedding',   emoji:'💍', color:'#EC4899', span:'col-span-2 row-span-2' },
  { id:'g2', title:'DJ Night Crowd',             category:'dj',        emoji:'🎧', color:'#7C3AED', span:'' },
  { id:'g3', title:'Stage Lighting Setup',       category:'concert',   emoji:'💡', color:'#F59E0B', span:'' },
  { id:'g4', title:'College Fest Entry',         category:'college',   emoji:'🎓', color:'#06B6D4', span:'row-span-2' },
  { id:'g5', title:'Corporate Launch Smoke',     category:'corporate', emoji:'🏢', color:'#10B981', span:'' },
  { id:'g6', title:'Wedding Reception Lighting', category:'wedding',   emoji:'✨', color:'#8B5CF6', span:'' },
  { id:'g7', title:'New Year DJ Party',          category:'dj',        emoji:'🎊', color:'#F43F5E', span:'col-span-2' },
  { id:'g8', title:'Fog Machine Atmosphere',     category:'concert',   emoji:'🌫️', color:'#64748B', span:'' },
  { id:'g9', title:'Balloon Blast Wedding',      category:'wedding',   emoji:'🎈', color:'#EC4899', span:'' },
  { id:'g10',title:'Tech Fest Laser Show',       category:'college',   emoji:'⚡', color:'#6366F1', span:'col-span-2 row-span-2' },
  { id:'g11',title:'Mirror Photo Booth',         category:'corporate', emoji:'🪞', color:'#14B8A6', span:'' },
  { id:'g12',title:'Concert Drone Show',         category:'concert',   emoji:'🚁', color:'#F59E0B', span:'' },
]

export default function Gallery() {
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [category, setCategory] = useState('all')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    getGalleryItems()
      .then(d => setItems(d.length ? d : DEMO_GALLERY))
      .catch(() => setItems(DEMO_GALLERY))
      .finally(() => setLoading(false))
  }, [])

  const filtered = category === 'all' ? items : items.filter(i => i.category === category)

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4">

        {/* Header */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="mb-8">
          <span className="badge-pink mb-3 inline-block">Portfolio</span>
          <h1 className="section-title mb-2">Our <span className="text-gradient-gp">Gallery</span></h1>
          <p className="section-subtitle">Every frame tells a story. Every moment, legendary.</p>
        </motion.div>

        {/* Category filter */}
        <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar pb-1">
          {EVENT_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                category === cat.id
                  ? 'bg-brand-violet text-white shadow-glow-v'
                  : 'bg-brand-surface border border-brand-border text-brand-muted hover:text-white'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* Masonry grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-[160px]">
            {[...Array(8)].map((_,i) => <div key={i} className="skeleton rounded-2xl"/>)}
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-[160px]"
          >
            <AnimatePresence>
              {filtered.map((item, i) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity:0, scale:0.92 }}
                  animate={{ opacity:1, scale:1 }}
                  exit={{ opacity:0, scale:0.92 }}
                  transition={{ duration:0.35, delay: i * 0.04 }}
                  className={`relative rounded-2xl overflow-hidden cursor-pointer group ${item.span || ''}`}
                  onClick={() => setSelected(item)}
                >
                  {/* Real uploaded photo when there is one; the coloured/emoji
                      tile is only a fallback for seeded demo entries. */}
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title || 'Varahi Events'}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <>
                      <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
                        style={{ background:`linear-gradient(135deg, ${item.color || '#8B1A2C'}35 0%, ${item.color || '#8B1A2C'}12 100%)`, border:`1px solid ${item.color || '#8B1A2C'}25` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-[70px] opacity-20 select-none">
                        {item.emoji || '🎪'}
                      </div>
                    </>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <ZoomIn size={28} className="text-white" />
                  </div>

                  {/* Title */}
                  <div className="absolute bottom-0 left-0 right-0 p-3"
                    style={{ background:`linear-gradient(to top, ${item.color || '#0D0508'}CC, transparent)` }}>
                    <p className="text-white text-xs font-semibold leading-tight">{item.title}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            exit={{ opacity:0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale:0.85, opacity:0 }}
              animate={{ scale:1, opacity:1 }}
              exit={{ scale:0.85, opacity:0 }}
              transition={{ type:'spring', damping:25, stiffness:300 }}
              className="relative max-w-lg w-full glass-card p-8 text-center"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 p-2 rounded-xl border border-brand-border text-brand-muted hover:text-white"
              >
                <X size={18}/>
              </button>
              {selected.imageUrl ? (
                <img src={selected.imageUrl} alt={selected.title || 'Varahi Events'}
                  className="w-full max-h-[65vh] object-contain rounded-xl mb-4"
                  style={{ background: '#0D0508' }} />
              ) : (
                <div className="text-8xl mb-4">{selected.emoji || '🎪'}</div>
              )}
              <h3 className="text-white font-bold text-xl mb-2">{selected.title}</h3>
              <span className="badge-violet capitalize">{selected.category}</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
