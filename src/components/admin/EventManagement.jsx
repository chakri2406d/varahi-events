import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarCheck, Plus, Trash2, Pencil, X, MapPin, Tag, AlertTriangle } from 'lucide-react'
import { getAllEvents, addPublicEvent, updatePublicEvent, deletePublicEvent } from '../../firebase/firestore'
import toast from 'react-hot-toast'

const CATEGORIES = ['wedding', 'dj', 'concert', 'college', 'corporate']
const CAT_COLORS  = { wedding:'#EC4899', dj:'#7C3AED', concert:'#F59E0B', college:'#06B6D4', corporate:'#10B981' }
const EMPTY = { name:'', date:'', location:'', category:'wedding', public: true }

export default function EventManagement() {
  const [events,     setEvents]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [form,       setForm]       = useState(EMPTY)
  const [saving,     setSaving]     = useState(false)
  const [editingId,  setEditingId]  = useState(null) // null = add mode, else event id being edited
  const [editingBookingId, setEditingBookingId] = useState(null) // bookingId of the event being edited, if any

  const load = () => {
    setLoading(true)
    // getAllEvents (not getPublicEvents) so events hidden from the public
    // calendar are still visible and manageable here.
    getAllEvents().then(setEvents).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleEdit = (ev) => {
    setEditingId(ev.id)
    setEditingBookingId(ev.bookingId || null)
    setForm({
      name:     ev.name || '',
      date:     ev.date || '',
      location: ev.location || '',
      category: ev.category || 'wedding',
      public:   ev.public !== false,
    })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingBookingId(null)
    setForm(EMPTY)
  }

  const handleSubmit = async () => {
    if (!form.name || !form.date || !form.location) {
      toast.error('Please fill in all fields'); return
    }
    setSaving(true)
    try {
      if (editingId) {
        await updatePublicEvent(editingId, { ...form })
        toast.success('Event updated')
      } else {
        await addPublicEvent({ ...form })
        toast.success('Event added — now visible on calendar!')
      }
      setEditingId(null)
      setEditingBookingId(null)
      setForm(EMPTY)
      load()
    } catch { toast.error(editingId ? 'Failed to update event' : 'Failed to add event') }
    finally  { setSaving(false) }
  }

  const handleDelete = async (id) => {
    const ev = events.find(e => e.id === id)
    // Events created automatically when a booking is confirmed are what block
    // that date publicly — deleting one frees up a date a customer has paid for.
    const msg = ev?.bookingId
      ? 'This date is blocked because of a CONFIRMED BOOKING. Removing it will show the date as available again, even though the booking still stands. Remove anyway?'
      : 'Remove this event from the calendar?'
    if (!confirm(msg)) return
    try {
      await deletePublicEvent(id)
      toast.success('Event removed')
      // If the deleted event was open in the edit form, reset it — it no longer exists.
      if (editingId === id) handleCancelEdit()
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

      {/* Add / Edit form */}
      <div className="glass-card p-5 mb-6">
        <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          {editingId
            ? <><Pencil size={15} className="text-amber-400"/> Edit Event</>
            : <><Plus size={15} className="text-amber-400"/> Add New Event / Block a Date</>
          }
        </h2>

        {editingId && editingBookingId && (
          <div className="p-3 rounded-xl mb-4 flex items-start gap-2"
            style={{ background:'rgba(201,147,58,0.1)', border:'1px solid rgba(201,147,58,0.3)' }}>
            <AlertTriangle size={14} style={{ color:'#E8B86D' }} className="flex-shrink-0 mt-0.5"/>
            <p className="text-xs" style={{ color:'#E8B86D' }}>
              This block is tied to a confirmed booking. Its date should match the booking's event date —
              changing it here does not move the booking itself.
            </p>
          </div>
        )}

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

        <div className="flex items-center gap-3">
          <button onClick={handleSubmit} disabled={saving} className="btn-gold text-sm py-2 px-5">
            {saving
              ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"/>
              : editingId
                ? <><Pencil size={14}/> Update Event</>
                : <><Plus size={14}/> Add to Calendar</>
            }
          </button>
          {editingId && (
            <button onClick={handleCancelEdit} disabled={saving} className="btn-secondary text-sm py-2 px-5">
              <X size={14}/> Cancel
            </button>
          )}
        </div>
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
              {e.public === false && (
                <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background:'rgba(156,122,130,0.15)', color:'#9C7A82', border:'1px solid rgba(156,122,130,0.3)' }}>
                  hidden
                </span>
              )}
              {e.bookingId && (
                <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background:'rgba(201,147,58,0.15)', color:'#E8B86D', border:'1px solid rgba(201,147,58,0.3)' }}>
                  booking
                </span>
              )}
              <button onClick={() => handleEdit(e)}
                className="p-1.5 rounded-lg text-brand-muted hover:text-amber-400 hover:bg-amber-500/10 transition-all flex-shrink-0">
                <Pencil size={14}/>
              </button>
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