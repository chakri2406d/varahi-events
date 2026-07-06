import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Save, Eye, EyeOff } from 'lucide-react'
import { getMachines, updateMachine } from '../../firebase/firestore'
import toast from 'react-hot-toast'

export default function PricingManagement() {
  const [machines, setMachines] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [prices,   setPrices]   = useState({})
  const [saving,   setSaving]   = useState({})
  const [showPrices, setShowPrices] = useState(true)

  useEffect(() => {
    getMachines()
      .then(data => {
        setMachines(data)
        const p = {}
        data.forEach(m => {
          p[m.id] = {
            basePrice:     m.basePrice     || '',
            pricePerDay:   m.pricePerDay   || '',
            transportFee:  m.transportFee  || '',
            operatorFee:   m.operatorFee   || '',
            generatorFee:  m.generatorFee  || '',
          }
        })
        setPrices(p)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const setPrice = (id, key, val) => {
    setPrices(prev => ({ ...prev, [id]: { ...prev[id], [key]: val } }))
  }

  const handleSave = async (machine) => {
    setSaving(prev => ({ ...prev, [machine.id]: true }))
    try {
      const p = prices[machine.id] || {}
      await updateMachine(machine.id, {
        basePrice:    Number(p.basePrice)    || 0,
        pricePerDay:  Number(p.pricePerDay)  || 0,
        transportFee: Number(p.transportFee) || 0,
        operatorFee:  Number(p.operatorFee)  || 0,
        generatorFee: Number(p.generatorFee) || 0,
      })
      toast.success(`Pricing updated for ${machine.name}`)
    } catch { toast.error('Failed to save') }
    finally { setSaving(prev => ({ ...prev, [machine.id]: false })) }
  }

  return (
    <div>
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Lock size={20} className="text-amber-400"/>
          <h1 className="font-display font-bold text-2xl text-white">Pricing Management</h1>
        </div>
        <p className="text-brand-muted text-sm">Prices are <strong className="text-amber-400">never shown to customers</strong>. Admin-only view.</p>
      </motion.div>

      {/* Privacy notice */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-6 flex items-start gap-3">
        <Lock size={16} className="text-amber-400 flex-shrink-0 mt-0.5"/>
        <div>
          <p className="text-amber-300 text-sm font-semibold">Confidential Pricing</p>
          <p className="text-amber-300/70 text-xs mt-0.5">These prices are stored in Firestore and only visible to admin users. Customers will always see "Price on request" or a custom quote you set per booking.</p>
        </div>
        <button onClick={()=>setShowPrices(v=>!v)} className="ml-auto p-1.5 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-all flex-shrink-0">
          {showPrices ? <EyeOff size={16}/> : <Eye size={16}/>}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(4)].map((_,i)=><div key={i} className="skeleton h-48 rounded-2xl"/>)}</div>
      ) : (
        <div className="space-y-4">
          {machines.map((m,i)=>(
            <motion.div key={m.id} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.07 }}
              className="glass-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-2xl">{m.emoji||'🎪'}</div>
                <h3 className="text-white font-semibold">{m.name}</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {[
                  { key:'basePrice',    label:'Base Price (₹)',       placeholder:'5000' },
                  { key:'pricePerDay',  label:'Per Day Rate (₹)',     placeholder:'3000' },
                  { key:'transportFee', label:'Transport Fee (₹)',    placeholder:'1000' },
                  { key:'operatorFee',  label:'Operator Fee (₹)',     placeholder:'800'  },
                  { key:'generatorFee', label:'Generator Fee (₹)',    placeholder:'500'  },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="label-dark">{label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted text-xs">₹</span>
                      <input
                        type={showPrices ? 'number' : 'password'}
                        className="input-dark pl-6"
                        placeholder={placeholder}
                        value={prices[m.id]?.[key] || ''}
                        onChange={e => setPrice(m.id, key, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleSave(m)}
                disabled={saving[m.id]}
                className="btn-gold text-sm py-2 px-4"
              >
                {saving[m.id]
                  ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"/>
                  : <><Save size={14}/> Save Pricing</>
                }
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
