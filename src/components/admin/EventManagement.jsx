import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarCheck, Plus, Trash2, MapPin, Tag } from 'lucide-react'
import { getPublicEvents, addPublicEvent, deletePublicEvent } from '../../firebase/firestore'
import toast from 'react-hot-toast'

const CATEGORIES = ['wedding', 'dj', 'concert', 'college', 'corporate']
const CAT_COLORS  = { wedding:'#EC4899', dj:'#7C3AED', concert:'#F59E0B', college:'#06B6D4', corporate:'#10B981' }
const EMPTY = { name:'', date:'', location:'', category:'wedding', public: true }

export default function EventManagement() {
  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState(EMPTY)
  const [saving,  setSaving]  = useState(false)

  const load = () => {
    setLoading(true)
    getPublicEvents().then(setEvents).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!form.name || !form.date || !form.location) {
      toast.error('Please fill in all fields'); return
    }
    setSaving(true)
    try {
      await addPublicEvent({ ...form })
      toast.success('Event added — now visible on calendar!')
      setForm(EMPTY)
      load()
    } catch { toast.error('Failed to add event') }
    finally  { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this event from the calendar?')) return
    try {
      await deletePublicEvent(id)
      toast.success('Event removed')
      load()
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div>
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <CalendarCheck size={20} style={{ color: '#C9933A' }}/>
          <h1 className="font-display font-bold text-2xl text-white">Event Calendar</h1>
        </div>
        <p className="text-brand-muted text-sm">
          Add events here to <strong className="text-amber-400">block dates on the public calendar</strong>.
          Customers will see these dates as booked.
        </p>
      </motion.div>

      {/* Add form */}
      <div className="glass-card p-5 mb-6">
        <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <Plus size={15} className="text-amber-400"/> Add New Event / Block a Date
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label-dark">Event Name *</label>
            <input
              className="input-dark"
              placeholder="e.g. Sharma Wedding"
              value={form.name}
              onChange={e => setForm(f => ({...f, name: e.target.value}))}
            />
          </div>
          <div>
            <label className="label-dark">Event Date *</label>
            <input
              type="date"
              className="input-dark"
              value={form.date}
              onChange={e => setForm(f => ({...f, date: e.target.value}))}
            />
          </div>
          <div>
            <label className="label-dark"><MapPin size={11} className="inline mr-1"/>Location *</label>
            <input
              className="input-dark"
              placeholder="e.g. Hyderabad, Telangana"
              value={form.location}
              onChange={e => setForm(f => ({...f, location: e.target.value}))}
            />
          </div>
          <div>
            <label className="label-dark"><Tag size={11} className="inline mr-1"/>Category</label>
            <select
              className="input-dark"
              value={form.category}
              onChange={e => setForm(f => ({...f, category: e.target.value}))}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c} className="bg-brand-surface capitalize">{c}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={form.public}
            onChange={e => setForm(f => ({...f, public: e.target.checked}))}
            className="w-4 h-4 accent-amber-500"
          />
          <span className="text-brand-muted text-xs">Show on public calendar (visible to customers)</span>
        </label>

        <button onClick={handleAdd} disabled={saving} className="btn-gold text-sm py-2 px-5">
          {saving
            ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"/>
            : <><Plus size={14}/> Add to Calendar</>
          }
        </button>
      </div>

      {/* Events list */}
      <h2 className="text-white font-semibold text-sm mb-3">All Calendar Events ({events.length})</h2>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="skeleton h-16 rounded-xl"/>)}</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-brand-muted text-sm">
          No events yet. Add one above to block dates on the calendar.
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((e, i) => (
            <motion.div key={e.id} initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.05 }}
              className="glass-card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                style={{ background: CAT_COLORS[e.category]||'#7C3AED' }}>
                {new Date(e.date).getDate() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{e.name}</p>
                <p className="text-brand-muted text-xs">{e.date} · {e.location}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full capitalize flex-shrink-0"
                style={{ background:`${CAT_COLORS[e.category]||'#7C3AED'}20`, color:CAT_COLORS[e.category]||'#7C3AED', border:`1px solid ${CAT_COLORS[e.category]||'#7C3AED'}30` }}>
                {e.category}
              </span>
              <button onClick={() => handleDelete(e.id)}
                className="p-1.5 rounded-lg text-brand-muted hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0">
                <Trash2 size={14}/>
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}