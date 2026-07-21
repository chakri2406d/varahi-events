import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Star, CheckCircle2, XCircle, Trash2, MessageSquareQuote } from 'lucide-react'
import { getAllReviews, approveReview, deleteReview } from '../../firebase/firestore'
import { fmtFull } from '../../utils/dateUtils'
import toast from 'react-hot-toast'

const asDate = (v) => (v?.toDate ? v.toDate() : v)

const TABS = [
  { id: 'pending',  label: 'Pending'  },
  { id: 'approved', label: 'Approved' },
  { id: 'all',      label: 'All'      },
]

// Five gold-filled-up-to-rating stars, muted for the rest.
const Stars = ({ rating = 0 }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(n => (
      <Star key={n} size={14}
        style={{ color: n <= rating ? '#C9933A' : '#3D1E28' }}
        fill={n <= rating ? '#C9933A' : 'none'}
      />
    ))}
  </div>
)

export default function ReviewManagement() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('pending')
  const [busyId,  setBusyId]  = useState(null)

  const load = () => getAllReviews().then(setReviews).catch(()=>{}).finally(()=>setLoading(false))
  useEffect(() => { load() }, [])

  const pendingCount = reviews.filter(r => !r.approved).length

  const filtered = reviews.filter(r => {
    if (tab === 'pending')  return !r.approved
    if (tab === 'approved') return !!r.approved
    return true
  })

  const handleToggle = async (r) => {
    setBusyId(r.id)
    try {
      await approveReview(r.id, !r.approved)
      toast.success(r.approved ? 'Review unapproved' : 'Review approved — now visible on the website')
      load()
    } catch { toast.error('Failed to update') }
    finally { setBusyId(null) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this review permanently?')) return
    await deleteReview(id)
    toast.success('Deleted')
    load()
  }

  return (
    <div>
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white">
          Reviews {pendingCount > 0 && <span className="badge-gold ml-2 align-middle">{pendingCount} pending</span>}
        </h1>
        <p className="text-brand-muted text-sm">
          Only <span style={{ color: '#86efac' }}>approved</span> reviews appear publicly on the website — everything else stays hidden until you approve it.
        </p>
      </motion.div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab===t.id ? 'bg-brand-violet text-white' : 'bg-brand-surface border border-brand-border text-brand-muted hover:text-white'}`}>
            {t.label}{t.id === 'pending' && pendingCount > 0 ? ` · ${pendingCount}` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="skeleton h-28 rounded-xl"/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-10 flex flex-col items-center text-center gap-3">
          <MessageSquareQuote size={32} style={{ color: '#9C7A82' }}/>
          <p className="text-white font-semibold">No reviews here</p>
          <p className="text-brand-muted text-sm max-w-sm">
            {tab === 'pending' ? 'Nothing waiting on moderation right now.' : 'Nothing in this filter yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r, idx) => (
            <motion.div key={r.id} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: idx*0.03 }}
              className="glass-card p-4"
              style={!r.approved ? { borderLeft: '3px solid #C9933A', background: 'rgba(201,147,58,0.05)' } : undefined}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-semibold text-sm">{r.customerName || 'Anonymous'}</p>
                    <span className={r.approved ? 'badge-green' : 'badge-gold'} style={{ fontSize: '10px' }}>
                      {r.approved ? 'Approved · Public' : 'Pending'}
                    </span>
                  </div>
                  <div className="mt-1.5"><Stars rating={Number(r.rating) || 0}/></div>
                  {r.comment && <p className="text-brand-muted text-sm mt-2 whitespace-pre-wrap">{r.comment}</p>}
                  <div className="flex items-center gap-3 flex-wrap mt-2 text-[10px] text-brand-muted">
                    {r.eventType && <span>{r.eventType}</span>}
                    <span>{r.createdAt ? fmtFull(asDate(r.createdAt)) : '—'}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button onClick={()=>handleToggle(r)} disabled={busyId===r.id}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all text-xs ${
                      r.approved
                        ? 'border-brand-border text-brand-muted hover:text-white hover:border-amber-500/40'
                        : 'border-green-500/30 text-green-300 hover:bg-green-500/10'
                    }`}>
                    {r.approved ? <><XCircle size={12}/> Unapprove</> : <><CheckCircle2 size={12}/> Approve</>}
                  </button>
                  <button onClick={()=>handleDelete(r.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all text-xs">
                    <Trash2 size={12}/> Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
