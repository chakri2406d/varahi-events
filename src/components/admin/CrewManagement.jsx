import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Plus, Trash2, Edit3, Save, X, Phone } from 'lucide-react'
import { getCrew, addCrew, updateCrew, deleteCrew } from '../../firebase/firestore'
import toast from 'react-hot-toast'

const ROLES = ['Operator', 'Driver', 'Technician', 'Helper', 'Supervisor']

const EMPTY = { name: '', phone: '', role: ROLES[0], active: true }

export default function CrewManagement() {
  const [crew,     setCrew]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)

  const load = () => getCrew().then(setCrew).catch(()=>{}).finally(()=>setLoading(false))
  useEffect(() => { load() }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const data = {
        name:   form.name.trim(),
        phone:  form.phone?.trim() || '',
        role:   form.role,
        active: !!form.active,
      }
      if (editing) { await updateCrew(editing, data); toast.success('Crew member updated') }
      else         { await addCrew(data);             toast.success('Crew member added') }
      setShowForm(false)
      setEditing(null)
      setForm(EMPTY)
      load()
    } catch { toast.error('Save failed') }
    finally   { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this crew member?')) return
    await deleteCrew(id)
    toast.success('Deleted')
    load()
  }

  const handleEdit = (c) => {
    setForm({ name: c.name || '', phone: c.phone || '', role: c.role || ROLES[0], active: c.active !== false })
    setEditing(c.id)
    setShowForm(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Crew</h1>
          <p className="text-brand-muted text-sm">{crew.length} staff / operators</p>
        </div>
        <button onClick={()=>{ setShowForm(true); setEditing(null); setForm(EMPTY) }} className="btn-primary text-sm">
          <Plus size={15}/> Add Crew
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} className="glass-card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">{editing ? 'Edit Crew Member' : 'Add Crew Member'}</h3>
            <button onClick={()=>setShowForm(false)} className="text-brand-muted hover:text-white"><X size={16}/></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-dark">Name *</label>
              <input className="input-dark" value={form.name} onChange={set('name')} placeholder="e.g. Ramesh Kumar"/>
            </div>
            <div>
              <label className="label-dark">Phone</label>
              <input className="input-dark" value={form.phone} onChange={set('phone')} placeholder="e.g. 9876543210"/>
            </div>
            <div>
              <label className="label-dark">Role</label>
              <select className="input-dark" value={form.role} onChange={set('role')}>
                {ROLES.map(r => <option key={r} value={r} className="bg-brand-surface">{r}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer select-none pb-3">
                <input
                  type="checkbox"
                  checked={!!form.active}
                  onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                  className="w-4 h-4 rounded accent-amber-500"
                />
                <span className="text-sm text-white">Active</span>
              </label>
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

      {/* Crew list */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_,i)=><div key={i} className="skeleton h-40 rounded-2xl"/>)}
        </div>
      ) : crew.length === 0 ? (
        <div className="glass-card p-10 flex flex-col items-center text-center gap-3">
          <Users size={32} style={{ color: '#9C7A82' }}/>
          <p className="text-white font-semibold">No crew members yet</p>
          <p className="text-brand-muted text-sm max-w-sm">
            Add your operators, drivers, technicians and helpers here so you can assign them to bookings.
          </p>
          <button onClick={()=>{ setShowForm(true); setEditing(null); setForm(EMPTY) }} className="btn-primary text-sm mt-2">
            <Plus size={15}/> Add Crew
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {crew.map((c,i)=>(
            <motion.div key={c.id} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.06 }}
              className="glass-card p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'rgba(201,147,58,0.15)', border: '1px solid rgba(201,147,58,0.3)', color: '#E8B86D' }}
                  >
                    {c.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{c.name}</p>
                    <span className={c.active !== false ? 'badge-green' : 'badge-red'} style={{ fontSize: '10px' }}>
                      {c.active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={()=>handleEdit(c)} className="p-1.5 rounded-lg border border-brand-border text-brand-muted hover:text-white hover:border-brand-violet/40 transition-all"><Edit3 size={13}/></button>
                  <button onClick={()=>handleDelete(c.id)} className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={13}/></button>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-brand-muted">{c.role || 'Operator'}</span>
                {c.phone ? (
                  <a
                    href={`tel:${c.phone}`}
                    className="flex items-center gap-1 hover:underline"
                    style={{ color: '#C9933A' }}
                  >
                    <Phone size={12}/> {c.phone}
                  </a>
                ) : (
                  <span className="text-brand-muted">No phone</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
