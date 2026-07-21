import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { ShoppingCart, X, Zap, Filter, Search } from 'lucide-react'
import { getMachines } from '../firebase/firestore'
import { useAuth } from '../context/AuthContext'
import EquipmentCard from '../components/booking/EquipmentCard'
import BookingFlow   from '../components/booking/BookingFlow'

export default function Equipment() {
  const { user }    = useAuth()
  const navigate    = useNavigate()
  // A date tapped on the Calendar page arrives here and pre-fills the booking
  const location    = useLocation()
  const presetDate  = location.state?.eventDate || ''

  const [machines,  setMachines]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState({})
  const [showFlow,  setShowFlow]  = useState(false)
  const [filter,    setFilter]    = useState('all')
  const [search,    setSearch]    = useState('')
  const [sortBy,    setSortBy]    = useState('name')

  useEffect(() => {
    // Only ever show REAL inventory. Showing placeholder machines here would let
    // customers book (and pay for) equipment that doesn't exist.
    getMachines()
      .then(data => setMachines(data))
      .catch(() => setMachines([]))
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = (machine, isSelected) => {
    setSelected(prev => {
      const next = { ...prev }
      if (isSelected) next[machine.id] = { ...machine, qty: 1 }
      else delete next[machine.id]
      return next
    })
  }

  const handleQtyChange = (id, qty) => {
    setSelected(prev => ({ ...prev, [id]: { ...prev[id], qty } }))
  }

  const selectedCount = Object.keys(selected).length

  const byStatus = filter === 'available'
    ? machines.filter(m => m.status === 'available')
    : machines

  const q = search.trim().toLowerCase()
  const bySearch = q
    ? byStatus.filter(m =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q)
      )
    : byStatus

  // `rate` is optional — null/undefined means "price on request". Those must
  // always sort last, never as 0 (which would wrongly make them "cheapest").
  const filtered = [...bySearch].sort((a, b) => {
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '')
    const aHas = a.rate != null
    const bHas = b.rate != null
    if (!aHas && !bHas) return 0
    if (!aHas) return 1
    if (!bHas) return -1
    return sortBy === 'price-asc' ? a.rate - b.rate : b.rate - a.rate
  })

  const noResultsFromFilters = machines.length > 0 && filtered.length === 0

  const handleProceed = () => {
    if (!user)          { navigate('/login'); return }
    if (!selectedCount) return
    setShowFlow(true)
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <span className="badge-violet mb-3 inline-block">Book Equipment</span>
          <h1 className="section-title mb-2">
            Choose Your
            <span className="text-gradient-v"> Equipment</span>
          </h1>
          <p className="section-subtitle">Select machines, add-ons, and request your slot.</p>
        </motion.div>

        {/* Filter + Search + Sort + Cart */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-brand-muted" />
              {['all', 'available'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                    filter === f
                      ? 'bg-brand-violet text-white'
                      : 'bg-brand-surface border border-brand-border text-brand-muted hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'All Equipment' : 'Available Only'}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-56">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input
                type="text"
                className="input-dark pl-9"
                placeholder="Search equipment…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <select
              className="input-dark w-full sm:w-auto"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="name">Name (A-Z)</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>

          {/* Cart CTA */}
          {selectedCount > 0 && (
            <motion.button
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={handleProceed}
              className="btn-primary flex-shrink-0"
            >
              <ShoppingCart size={16} />
              Proceed with {selectedCount} item{selectedCount > 1 ? 's' : ''}
            </motion.button>
          )}
        </div>

        {/* Equipment grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-72 rounded-2xl" />)}
          </div>
        ) : noResultsFromFilters ? (
          <div className="glass-card p-10 text-center">
            <p className="text-white font-semibold mb-1">No equipment matches your search</p>
            <p className="text-brand-muted text-sm">
              Try a different keyword or clear the filters to see everything we offer.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <p className="text-white font-semibold mb-1">No equipment available right now</p>
            <p className="text-brand-muted text-sm">
              Our inventory is being updated. Please check back shortly or contact us
              on WhatsApp and we'll help you directly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((machine, i) => (
              <motion.div
                key={machine.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <EquipmentCard
                  machine={machine}
                  selected={!!selected[machine.id]}
                  qty={selected[machine.id]?.qty || 1}
                  onSelect={handleSelect}
                  onQtyChange={handleQtyChange}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Sticky mobile cart bar */}
        <AnimatePresence>
          {selectedCount > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-16 lg:bottom-6 left-4 right-4 z-40 lg:max-w-sm lg:mx-auto"
            >
              <div className="glass-card p-4 flex items-center justify-between gap-4 border border-brand-violet/40 shadow-glow-v">
                <div>
                  <p className="text-white font-semibold text-sm">{selectedCount} item{selectedCount > 1 ? 's' : ''} selected</p>
                  <p className="text-brand-muted text-xs">Tap to proceed with booking</p>
                </div>
                <button onClick={handleProceed} className="btn-primary text-sm py-2.5">
                  <Zap size={15} />
                  Book Now
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Booking flow drawer */}
      <AnimatePresence>
        {showFlow && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFlow(false)}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl bg-brand-surface border-t border-brand-border"
              style={{ maxHeight: '92vh' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              {/* Header — pinned, never scrolls away */}
              <div className="flex-shrink-0 pt-4 pb-3 px-5 flex items-center justify-between border-b border-brand-border bg-brand-surface rounded-t-3xl">
                <h2 className="text-white font-bold font-display text-lg">Book Your Event</h2>
                <button onClick={() => setShowFlow(false)} className="p-2 rounded-xl border border-brand-border text-brand-muted hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Body — this part scrolls, header stays pinned */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="p-5 pb-28">
                  <BookingFlow selectedMachines={selected} onBack={() => setShowFlow(false)}
                    initialDate={presetDate} />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
