import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Info, Save } from 'lucide-react'
import { getMachines, updateMachine } from '../../firebase/firestore'
import toast from 'react-hot-toast'

// Formats a rate the same way customers see it on the Equipment page / quote.
const previewRate = (val) => {
  if (val === null || val === undefined || val === '') return 'Price on request'
  const n = Number(val)
  if (isNaN(n)) return 'Price on request'
  return `₹${n.toLocaleString('en-IN')} / unit`
}

export default function PricingManagement() {
  const [machines, setMachines] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [rates,    setRates]    = useState({})   // id -> string shown in the input
  const [saving,   setSaving]   = useState(false)

  const load = () => {
    setLoading(true)
    getMachines()
      .then(data => {
        setMachines(data)
        const r = {}
        // '' (empty string) means "no rate set yet" / price on request — never 0
        data.forEach(m => { r[m.id] = m.rate === null || m.rate === undefined ? '' : String(m.rate) })
        setRates(r)
      })
      .catch(() => toast.error('Failed to load machines'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const setRate = (id, val) => setRates(prev => ({ ...prev, [id]: val }))

  // Rows whose rate input differs from what's stored in Firestore right now.
  const dirtyIds = useMemo(() => {
    return machines
      .filter(m => {
        const original = m.rate === null || m.rate === undefined ? '' : String(m.rate)
        return (rates[m.id] ?? '') !== original
      })
      .map(m => m.id)
  }, [machines, rates])

  const handleSaveAll = async () => {
    if (!dirtyIds.length) return

    // Validate every dirty row before writing anything.
    for (const id of dirtyIds) {
      const raw = rates[id]
      if (raw === '') continue // clearing to "price on request" is always valid
      const n = Number(raw)
      if (isNaN(n) || n < 0) {
        const m = machines.find(mm => mm.id === id)
        toast.error(`${m?.name || 'A machine'} has an invalid rate`)
        return
      }
    }

    setSaving(true)
    try {
      await Promise.all(dirtyIds.map(id => {
        const raw = rates[id]
        // Number('') is 0, so an explicitly-cleared field must be sent as null
        // ("price on request"), never as a silent 0.
        const rate = raw === '' ? null : Number(raw)
        return updateMachine(id, { rate })
      }))
      toast.success(`Updated ${dirtyIds.length} machine${dirtyIds.length > 1 ? 's' : ''}`)
      load()
    } catch {
      toast.error('Failed to save some changes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="font-display font-bold text-2xl text-white">Pricing Management</span>
        </div>
        <p className="text-sm" style={{ color:'#9C7A82' }}>
          Bulk-edit machine rates. This is the real customer-facing price.
        </p>
      </motion.div>

      {/* Explanatory note */}
      <div className="p-4 rounded-xl mb-6 flex items-start gap-3"
        style={{ background:'rgba(201,147,58,0.1)', border:'1px solid rgba(201,147,58,0.3)' }}>
        <Info size={16} style={{ color:'#C9933A' }} className="flex-shrink-0 mt-0.5"/>
        <div>
          <p className="text-sm font-semibold" style={{ color:'#E8B86D' }}>This rate is what customers see</p>
          <p className="text-xs mt-0.5" style={{ color:'#9C7A82' }}>
            The rate below is shown per unit on the Equipment page and is exactly what the booking quote is
            calculated from (rate × quantity). Clear a rate to show "Price on request" instead of a number.
            Transport, operator and generator charges aren't tracked per machine yet — quote those manually
            when you confirm a booking.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="skeleton h-16 rounded-xl"/>)}</div>
      ) : (
        <>
          <div className="glass-card overflow-hidden mb-4">
            <div className="hidden sm:grid grid-cols-[1fr_180px_180px] gap-3 px-5 py-3 text-xs uppercase tracking-wider"
              style={{ color:'#9C7A82', borderBottom:'1px solid rgba(61,30,40,0.8)' }}>
              <span>Machine</span>
              <span>Rate (₹ / unit)</span>
              <span>Customer sees</span>
            </div>
            <div>
              {machines.map((m, i) => {
                const isDirty = dirtyIds.includes(m.id)
                return (
                  <motion.div key={m.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.03 }}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_180px_180px] gap-3 px-5 py-4 items-center"
                    style={{ borderBottom: i < machines.length - 1 ? '1px solid rgba(61,30,40,0.8)' : 'none' }}>
                    <div className="flex items-center gap-3">
                      <div className="text-xl">{m.emoji || '🎪'}</div>
                      <span className="text-white font-medium text-sm">{m.name}</span>
                      {isDirty && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background:'rgba(201,147,58,0.15)', color:'#E8B86D', border:'1px solid rgba(201,147,58,0.3)' }}>
                          unsaved
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color:'#9C7A82' }}>₹</span>
                      <input
                        type="number"
                        min={0}
                        className="input-dark pl-6"
                        placeholder="Price on request"
                        value={rates[m.id] ?? ''}
                        onChange={e => setRate(m.id, e.target.value)}
                      />
                    </div>
                    <span className="text-sm"
                      style={{ color: (rates[m.id] ?? '') === '' ? '#9C7A82' : '#86efac' }}>
                      {previewRate(rates[m.id])}
                    </span>
                  </motion.div>
                )
              })}
              {machines.length === 0 && (
                <div className="text-center py-12 text-sm" style={{ color:'#9C7A82' }}>
                  No machines yet. Add one from Equipment Management first.
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveAll}
              disabled={saving || !dirtyIds.length}
              className="btn-gold text-sm py-2 px-5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving
                ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"/>
                : <><Save size={14}/> Save changes</>
              }
            </button>
            {dirtyIds.length > 0 && (
              <span className="text-xs" style={{ color:'#E8B86D' }}>
                {dirtyIds.length} unsaved change{dirtyIds.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
