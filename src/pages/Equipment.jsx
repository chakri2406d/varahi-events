import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, X, Zap, Filter } from 'lucide-react'
import { getMachines } from '../firebase/firestore'
import { useAuth } from '../context/AuthContext'
import EquipmentCard from '../components/booking/EquipmentCard'
import BookingFlow   from '../components/booking/BookingFlow'

// Demo machines (used when Firebase is empty)
const DEMO_MACHINES = [
  { id: 'd1', name: 'CO2 Paper Blaster', description: 'High-pressure CO₂ blast with coloured paper confetti. Perfect for wedding entries and DJ nights.', status: 'available', totalQty: 4, availableQty: 3, emoji: '💨', addons: ['Transport','Operator','Paper setup'], specs: { Power: '220V', 'Blast Range': '8 metres', 'Setup Time': '15 mins' } },
  { id: 'd2', name: 'Stage Lighting Rig', description: 'Full LED moving-head and wash lighting rig for concerts and indoor stage setups.', status: 'available', totalQty: 2, availableQty: 2, emoji: '💡', addons: ['Transport','Operator','Full setup'], specs: { Type: 'LED Moving Head', Coverage: '12×8m stage' } },
  { id: 'd3', name: 'Fog Machine',        description: 'Atmospheric ground fog for dance floors and dramatic entrances.',                            status: 'available', totalQty: 3, availableQty: 3, emoji: '🌫️', addons: ['Transport','Fluid refill'] },
  { id: 'd4', name: 'DJ Setup (Full)',    description: 'Professional DJ console, speakers, subwoofers and monitor setup.',                         status: 'available', totalQty: 1, availableQty: 1, emoji: '🎧', addons: ['Transport','Operator','Generator'] },
  { id: 'd5', name: 'Generator (15KVA)', description: '15 KVA diesel generator for outdoor events with no power supply.',                          status: 'available', totalQty: 2, availableQty: 1, emoji: '⚡', addons: ['Transport','Diesel','Operator'] },
  { id: 'd6', name: 'Smoke Cannon',      description: 'High-output smoke cannon for dramatic stage entries and crowd moments.',                    status: 'available', totalQty: 2, availableQty: 2, emoji: '🎆', addons: ['Transport','Fluid'] },
  { id: 'd7', name: 'Drone Light Show',  description: 'Indoor LED drone choreography for weddings and luxury events. Min 20 drones.',             status: 'reserved', totalQty: 1, availableQty: 0, emoji: '🚁', addons: ['Pilot','Permit'] },
  { id: 'd8', name: 'Mirror Photo Booth',description: 'Interactive LED mirror booth with prints, GIFs and social sharing.',                       status: 'available', totalQty: 1, availableQty: 1, emoji: '🪞', addons: ['Transport','Operator','Prints'] },
]

export default function Equipment() {
  const { user }    = useAuth()
  const navigate    = useNavigate()

  const [machines,  setMachines]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState({})
  const [showFlow,  setShowFlow]  = useState(false)
  const [filter,    setFilter]    = useState('all')

  useEffect(() => {
    getMachines()
      .then(data => setMachines(data.length ? data : DEMO_MACHINES))
      .catch(() => setMachines(DEMO_MACHINES))
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

  const filtered = filter === 'available'
    ? machines.filter(m => m.status === 'available')
    : machines

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

        {/* Filter + Cart */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
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
                  <BookingFlow selectedMachines={selected} onBack={() => setShowFlow(false)} />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
