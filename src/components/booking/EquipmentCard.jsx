import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Minus, Check, Info, Star } from 'lucide-react'
import { MACHINE_STATUS, MACHINE_STATUS_COLORS } from '../../utils/constants'

const STATUS_LABELS = {
  available:   'Available',
  reserved:    'Reserved',
  in_event:    'In Event',
  maintenance: 'Maintenance',
}

export default function EquipmentCard({ machine, selected, qty, onSelect, onQtyChange }) {
  const [showInfo, setShowInfo] = useState(false)
  // Use ?? not || so a genuine availableQty of 0 (sold out) isn't treated as
  // "not set" and silently replaced by totalQty.
  const stock  = machine.availableQty ?? machine.totalQty ?? 0
  const total  = machine.totalQty ?? stock
  const maxQty = Math.max(1, stock)
  const available = machine.status === MACHINE_STATUS.AVAILABLE && stock > 0

  const handleToggle = () => {
    if (!available) return
    onSelect(machine, !selected)
  }

  return (
    <motion.div
      whileHover={{ y: available ? -6 : 0, scale: available ? 1.01 : 1 }}
      transition={{ duration: 0.25 }}
      className="relative overflow-hidden cursor-pointer rounded-2xl transition-all duration-300"
      style={{
        background: selected
          ? 'linear-gradient(135deg, rgba(26,8,16,0.95) 0%, rgba(42,16,24,0.95) 100%)'
          : 'rgba(26,8,16,0.9)',
        border: selected
          ? '1px solid rgba(201,147,58,0.6)'
          : '1px solid rgba(61,30,40,0.8)',
        boxShadow: selected
          ? '0 0 30px rgba(201,147,58,0.25), 0 0 60px rgba(139,26,44,0.15), inset 0 1px 0 rgba(201,147,58,0.15)'
          : '0 4px 20px rgba(0,0,0,0.4)',
        opacity: !available ? 0.55 : 1,
        cursor: !available ? 'not-allowed' : 'pointer',
      }}
      onClick={handleToggle}
    >
      {/* Gold shimmer top line when selected */}
      {selected && (
        <div className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: 'linear-gradient(90deg, transparent, #C9933A, #F0D9A8, #C9933A, transparent)' }} />
      )}

      {/* Image / Visual area */}
      <div className="relative h-44 overflow-hidden flex items-center justify-center"
        style={{ background: selected ? 'rgba(107,15,26,0.2)' : 'rgba(13,5,8,0.6)' }}>

        {machine.imageUrl ? (
          <img src={machine.imageUrl} alt={machine.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <motion.div
            className="text-6xl select-none"
            animate={selected ? { scale: [1, 1.15, 1] } : { scale: 1 }}
            transition={{ duration: 0.4 }}
            style={{ opacity: selected ? 0.9 : 0.5 }}
          >
            {machine.emoji || '🎪'}
          </motion.div>
        )}

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <span className={MACHINE_STATUS_COLORS[machine.status] || 'badge-gold'}>
            <span className={`w-1.5 h-1.5 rounded-full ${available ? 'bg-green-400' : 'bg-red-400'}`} />
            {STATUS_LABELS[machine.status] || 'Available'}
          </span>
        </div>

        {/* Selected overlay — gold celebration */}
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'rgba(107,15,26,0.3)' }}
          >
            {/* Outer glow ring */}
            <motion.div
              className="absolute rounded-full"
              style={{ width: 80, height: 80, background: 'radial-gradient(circle, rgba(201,147,58,0.3) 0%, transparent 70%)' }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
            {/* Check circle */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-12 h-12 rounded-full flex items-center justify-center relative z-10"
              style={{
                background: 'linear-gradient(135deg, #8B1A2C, #C9933A)',
                boxShadow: '0 0 20px rgba(201,147,58,0.5)',
              }}
            >
              <Check size={22} className="text-white" strokeWidth={3} />
            </motion.div>
          </motion.div>
        )}

        {/* Info button */}
        <button
          onClick={e => { e.stopPropagation(); setShowInfo(v => !v) }}
          className="absolute top-3 right-3 p-1.5 rounded-lg transition-colors"
          style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.7)' }}
        >
          <Info size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-base" style={{ color: selected ? '#F0D9A8' : '#F5EDE8' }}>
            {machine.name}
          </h3>
          {selected && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-0.5 ml-2 flex-shrink-0"
            >
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Star size={10} style={{ color: '#C9933A', fill: '#C9933A' }} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        <p className="text-xs mb-3 line-clamp-2" style={{ color: '#9C7A82' }}>{machine.description}</p>

        {/* Availability bar */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(61,30,40,0.6)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{
                background: selected
                  ? 'linear-gradient(90deg, #8B1A2C, #C9933A)'
                  : 'linear-gradient(90deg, #6B0F1A, #8B1A2C)',
                width: `${total ? (stock / total) * 100 : 0}%`
              }}
              animate={{ width: `${total ? (stock / total) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs whitespace-nowrap" style={{ color: '#9C7A82' }}>
            {stock}/{total} available
          </span>
        </div>

        {/* Add-on tags */}
        {machine.addons && machine.addons.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {machine.addons.slice(0, 3).map(a => (
              <span key={a} className="px-2 py-0.5 rounded-md text-[10px]"
                style={{
                  background: selected ? 'rgba(201,147,58,0.1)' : 'rgba(13,5,8,0.6)',
                  border: `1px solid ${selected ? 'rgba(201,147,58,0.25)' : 'rgba(61,30,40,0.6)'}`,
                  color: selected ? '#E8B86D' : '#9C7A82',
                }}>
                {a}
              </span>
            ))}
          </div>
        )}

        {/* Selected label */}
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 px-3 py-1.5 rounded-lg text-xs font-semibold text-center"
            style={{
              background: 'rgba(201,147,58,0.1)',
              border: '1px solid rgba(201,147,58,0.3)',
              color: '#E8B86D',
            }}
          >
            ✨ Added to your event
          </motion.div>
        )}

        {/* Quantity selector */}
        {selected && available && (
          <div
            className="flex items-center justify-between pt-3 border-t"
            style={{ borderColor: 'rgba(201,147,58,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <span className="text-sm" style={{ color: '#9C7A82' }}>Quantity</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => qty > 1 && onQtyChange(machine.id, qty - 1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{ background: 'rgba(13,5,8,0.8)', border: '1px solid rgba(61,30,40,0.8)', color: '#9C7A82' }}
              >
                <Minus size={14} />
              </button>
              <span className="font-bold text-sm w-5 text-center" style={{ color: '#F0D9A8' }}>{qty}</span>
              <button
                onClick={() => qty < maxQty && onQtyChange(machine.id, qty + 1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{
                  background: 'rgba(201,147,58,0.15)',
                  border: '1px solid rgba(201,147,58,0.35)',
                  color: '#E8B86D',
                }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Info panel */}
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 pt-3 text-xs space-y-1"
            style={{ borderTop: '1px solid rgba(61,30,40,0.6)' }}
            onClick={e => e.stopPropagation()}
          >
            {machine.specs && Object.entries(machine.specs).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span style={{ color: '#9C7A82' }} className="capitalize">{k}</span>
                <span style={{ color: '#F5EDE8' }}>{v}</span>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}