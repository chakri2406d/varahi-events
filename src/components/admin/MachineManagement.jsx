import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Edit3, Save, X } from 'lucide-react'
import { getMachines, addMachine, updateMachine, deleteMachine } from '../../firebase/firestore'
import { MACHINE_STATUS, MACHINE_STATUS_COLORS } from '../../utils/constants'
import toast from 'react-hot-toast'

const EMPTY = { name:'', description:'', status:'available', totalQty:1, availableQty:1, emoji:'🎪', addons:'' }

export default function MachineManagement() {
  const [machines, setMachines] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)

  const load = () => getMachines().then(setMachines).catch(()=>{}).finally(()=>setLoading(false))
  useEffect(() => { load() }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.name) { toast.error('Name is required'); return }
    const totalQty     = Number(form.totalQty)
    const availableQty = Number(form.availableQty)
    if (!Number.isFinite(totalQty) || totalQty < 0) {
      toast.error('Total quantity must be 0 or more'); return
    }
    if (!Number.isFinite(availableQty) || availableQty < 0) {
      toast.error('Available quantity must be 0 or more'); return
    }
    if (availableQty > totalQty) {
      toast.error('Available quantity cannot be more than total quantity'); return
    }
    setSaving(true)
    try {
      const data = {
        ...form,
        totalQty,
        availableQty,
        addons: typeof form.addons === 'string' ? form.addons.split(',').map(s=>s.trim()).filter(Boolean) : form.addons,
      }
      if (editing) { await updateMachine(editing, data); toast.success('Machine updated') }
      else         { await addMachine(data);             toast.success('Machine added') }
      setShowForm(false)
      setEditing(null)
      setForm(EMPTY)
      load()
    } catch { toast.error('Save failed') }
    finally   { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this machine?')) return
    await deleteMachine(id)
    toast.success('Deleted')
    load()
  }

  const handleEdit = (m) => {
    setForm({ ...m, addons: Array.isArray(m.addons) ? m.addons.join(', ') : m.addons || '' })
    setEditing(m.id)
    setShowForm(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Equipment</h1>
          <p className="text-brand-muted text-sm">{machines.length} machines in inventory</p>
        </div>
        <button onClick={()=>{ setShowForm(true); setEditing(null); setForm(EMPTY) }} className="btn-primary text-sm">
          <Plus size={15}/> Add Machine
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} className="glass-card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">{editing ? 'Edit Machine' : 'Add Machine'}</h3>
            <button onClick={()=>setShowForm(false)} className="text-brand-muted hover:text-white"><X size={16}/></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-dark">Name *</label>
              <input className="input-dark" value={form.name} onChange={set('name')} placeholder="e.g. CO2 Paper Blaster"/>
            </div>
            <div>
              <label className="label-dark">Emoji Icon</label>
              <input className="input-dark" value={form.emoji} onChange={set('emoji')} placeholder="🎪"/>
            </div>
            <div className="sm:col-span-2">
              <label className="label-dark">Description</label>
              <textarea className="input-dark resize-none" rows={2} value={form.description} onChange={set('description')} placeholder="What does this machine do?"/>
            </div>
            <div>
              <label className="label-dark">Status</label>
              <select className="input-dark" value={form.status} onChange={set('status')}>
                {Object.entries(MACHINE_STATUS).map(([,v])=><option key={v} value={v} className="bg-brand-surface capitalize">{v}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-dark">Total Qty</label>
                <input type="number" className="input-dark" min={1} value={form.totalQty} onChange={set('totalQty')}/>
              </div>
              <div>
                <label className="label-dark">Available</label>
                <input type="number" className="input-dark" min={0} value={form.availableQty} onChange={set('availableQty')}/>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="label-dark">Add-ons (comma separated)</label>
              <input className="input-dark" value={form.addons} onChange={set('addons')} placeholder="Transport, Operator, Full Setup"/>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={()=>setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Save size={14}/> Save</>}
            </button>
          </div>
        </motion.div>
      )}

      {/* Machine list */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_,i)=><div key={i} className="skeleton h-48 rounded-2xl"/>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {machines.map((m,i)=>(
            <motion.div key={m.id} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.06 }}
              className="glass-card p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{m.emoji||'🎪'}</div>
                  <div>
                    <p className="text-white font-semibold text-sm">{m.name}</p>
                    <span className={`${MACHINE_STATUS_COLORS[m.status]||'badge-green'} text-[10px]`}>{m.status}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={()=>handleEdit(m)} className="p-1.5 rounded-lg border border-brand-border text-brand-muted hover:text-white hover:border-brand-violet/40 transition-all"><Edit3 size={13}/></button>
                  <button onClick={()=>handleDelete(m.id)} className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={13}/></button>
                </div>
              </div>
              <p className="text-brand-muted text-xs line-clamp-2 mb-3">{m.description}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-brand-muted">Qty: <span className="text-white font-bold">{m.availableQty||0}/{m.totalQty||0}</span></span>
                {m.addons?.length > 0 && <span className="text-brand-muted">{m.addons.length} add-ons</span>}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
