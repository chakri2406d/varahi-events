import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ZoomIn, Play } from 'lucide-react'
import { getGalleryItems } from '../firebase/firestore'
import { EVENT_CATEGORIES } from '../utils/constants'

// Seeded only when the real gallery is empty (brand-new site). These render
// through the exact same uniform-tile system as real photos/videos — no
// special-cased demo layout — so there's nothing to "migrate" once real
// items are added.
const DEMO_GALLERY = [
  { id: 'g1',  title: 'Wedding CO2 Blast Entry',   category: 'wedding',   emoji: '💍', color: '#EC4899' },
  { id: 'g2',  title: 'DJ Night Crowd',             category: 'dj',        emoji: '🎧', color: '#7C3AED' },
  { id: 'g3',  title: 'Stage Lighting Setup',       category: 'concert',   emoji: '💡', color: '#F59E0B' },
  { id: 'g4',  title: 'College Fest Entry',         category: 'college',   emoji: '🎓', color: '#06B6D4' },
  { id: 'g5',  title: 'Corporate Launch Smoke',     category: 'corporate', emoji: '🏢', color: '#10B981' },
  { id: 'g6',  title: 'Wedding Reception Lighting', category: 'wedding',   emoji: '✨', color: '#8B5CF6' },
  { id: 'g7',  title: 'New Year DJ Party',          category: 'dj',        emoji: '🎊', color: '#F43F5E' },
  { id: 'g8',  title: 'Fog Machine Atmosphere',     category: 'concert',   emoji: '🌫️', color: '#64748B' },
  { id: 'g9',  title: 'Balloon Blast Wedding',      category: 'wedding',   emoji: '🎈', color: '#EC4899' },
  { id: 'g10', title: 'Tech Fest Laser Show',       category: 'college',   emoji: '⚡', color: '#6366F1' },
  { id: 'g11', title: 'Mirror Photo Booth',         category: 'corporate', emoji: '🪞', color: '#14B8A6' },
  { id: 'g12', title: 'Concert Drone Show',         category: 'concert',   emoji: '🚁', color: '#F59E0B' },
]

const categoryLabel = (id) => EVENT_CATEGORIES.find(c => c.id === id)?.label || id || '—'

// A small static overlay used on any video tile that has preview art
// (YouTube thumbnail or a file's first frame) so it visually reads as
// playable without needing per-provider markup.
function PlayOverlay() {
  return (
    <>
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-black/50 border border-white/30 flex items-center justify-center">
          <Play size={20} className="text-white ml-0.5" fill="white" />
        </div>
      </div>
      <span className="badge-pink absolute top-2 right-2 text-[9px] px-2 py-0.5">Video</span>
    </>
  )
}

// Renders the media layer that fills a tile's aspect box. Kept as one
// function so every branch is guaranteed to fill absolute inset-0 —
// nothing here can change the tile's own size.
function TileMedia({ item }) {
  const kind = item.kind || 'image' // legacy/demo docs predate `kind`

  if (kind === 'video') {
    if (item.provider === 'youtube' && item.thumbnail) {
      return (
        <>
          <img
            src={item.thumbnail}
            alt={item.title || 'Video'}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <PlayOverlay />
        </>
      )
    }

    if (item.provider === 'file' && item.videoUrl) {
      return (
        <>
          {/* muted+playsInline lets the browser paint the first frame as a
              free "poster" once metadata loads — no separate thumbnail needed */}
          <video
            src={item.videoUrl}
            preload="metadata"
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <PlayOverlay />
        </>
      )
    }

    // Instagram (no thumbnail available) or any other video without preview art
    return (
      <>
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(139,26,44,0.5) 0%, rgba(201,147,58,0.22) 100%)' }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center">
          <Play size={36} className="text-white/90" fill="currentColor" />
          <span className="text-white/80 text-[11px] font-medium line-clamp-2">{item.title}</span>
        </div>
      </>
    )
  }

  // image (or legacy doc with no `kind`)
  if (item.imageUrl) {
    return (
      <img
        src={item.imageUrl}
        alt={item.title || 'Varahi Events'}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    )
  }

  // Demo-only fallback: coloured/emoji tile when there's no real media at all
  return (
    <>
      <div
        className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
        style={{
          background: `linear-gradient(135deg, ${item.color || '#8B1A2C'}35 0%, ${item.color || '#8B1A2C'}12 100%)`,
          border: `1px solid ${item.color || '#8B1A2C'}25`,
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-[70px] opacity-20 select-none">
        {item.emoji || '🎪'}
      </div>
    </>
  )
}

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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
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

        {/* Uniform grid — EVERY tile shares the same fixed aspect ratio via
            aspect-[4/3]. This (not the old masonry col/row spans) is what
            keeps the layout stable: each tile reserves its exact box before
            any image/video even loads, so adding a new item only appends a
            tile at the end instead of resizing or reflowing existing ones. */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => <div key={i} className="skeleton aspect-[4/3] rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-10 text-center text-brand-muted">Nothing in this category yet</div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
          >
            <AnimatePresence>
              {filtered.map((item, i) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.3, delay: Math.min(i, 12) * 0.03 }}
                  className="relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer group"
                  onClick={() => setSelected(item)}
                >
                  <TileMedia item={item} />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <ZoomIn size={28} className="text-white" />
                  </div>

                  {/* Title caption */}
                  <div className="absolute bottom-0 left-0 right-0 p-3"
                    style={{ background: 'linear-gradient(to top, rgba(13,5,8,0.85), transparent)' }}>
                    <p className="text-white text-xs font-semibold leading-tight truncate">{item.title || 'Untitled'}</p>
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative max-w-2xl w-full glass-card p-6 sm:p-8 text-center"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-xl border border-brand-border text-brand-muted hover:text-white bg-black/40"
              >
                <X size={18} />
              </button>

              {(() => {
                const kind = selected.kind || 'image'

                // YouTube / Instagram — responsive embedded iframe
                if (kind === 'video' && (selected.provider === 'youtube' || selected.provider === 'instagram') && selected.embedUrl) {
                  return (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-4" style={{ background: '#0D0508' }}>
                      <iframe
                        src={selected.embedUrl}
                        title={selected.title || 'Video'}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        frameBorder="0"
                      />
                    </div>
                  )
                }

                // Uploaded file video — plays directly from Storage
                if (kind === 'video' && selected.provider === 'file' && selected.videoUrl) {
                  return (
                    <video
                      src={selected.videoUrl}
                      controls
                      autoPlay
                      playsInline
                      className="w-full max-h-[65vh] rounded-xl mb-4 bg-black"
                    />
                  )
                }

                // Photo
                if (selected.imageUrl) {
                  return (
                    <img
                      src={selected.imageUrl}
                      alt={selected.title || 'Varahi Events'}
                      className="w-full max-h-[65vh] object-contain rounded-xl mb-4"
                      style={{ background: '#0D0508' }}
                    />
                  )
                }

                // Demo/legacy fallback with no media at all
                return <div className="text-8xl mb-4">{selected.emoji || '🎪'}</div>
              })()}

              <h3 className="text-white font-bold text-xl mb-2">{selected.title}</h3>
              <span className="badge-pink capitalize">{categoryLabel(selected.category)}</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
