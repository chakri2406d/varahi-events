import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Inbox, Phone, MessageCircle, Mail, Calendar, CheckCircle2, RotateCcw, Trash2, Download } from 'lucide-react'
import { getInquiries, markInquiryHandled, deleteInquiry } from '../../firebase/firestore'
import { fmtFull } from '../../utils/dateUtils'
import { downloadCsv } from '../../utils/exportCsv'
import toast from 'react-hot-toast'

// Firestore Timestamp -> JS Date, but pass plain dates/strings through untouched
const asDate = (v) => (v?.toDate ? v.toDate() : v)

// Builds a wa.me link from any phone string. Indian 10-digit numbers need the
// country code prefixed or WhatsApp won't resolve the chat.
const waLink = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return null
  const withCode = digits.length === 10 ? `91${digits}` : digits
  return `https://wa.me/${withCode}`
}

const TABS = [
  { id: 'new',     label: 'New'     },
  { id: 'handled', label: 'Handled' },
  { id: 'all',     label: 'All'     },
]

export default function InquiryManagement() {
  const [inquiries, setInquiries] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('new')
  const [busyId,    setBusyId]    = useState(null)

  const load = () => getInquiries().then(setInquiries).catch(()=>{}).finally(()=>setLoading(false))
  useEffect(() => { load() }, [])

  const newCount = inquiries.filter(i => !i.handled).length

  const filtered = inquiries.filter(i => {
    if (tab === 'new')     return !i.handled
    if (tab === 'handled') return !!i.handled
    return true
  })

  const handleToggle = async (i) => {
    setBusyId(i.id)
    try {
      await markInquiryHandled(i.id, !i.handled)
      toast.success(i.handled ? 'Reopened' : 'Marked handled')
      load()
    } catch { toast.error('Failed to update') }
    finally { setBusyId(null) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this inquiry?')) return
    await deleteInquiry(id)
    toast.success('Deleted')
    load()
  }

  const handleExport = () => {
    const rows = inquiries.map(i => ({
      Date:       asDate(i.createdAt),
      Name:       i.name || '',
      Phone:      i.phone || '',
      Email:      i.email || '',
      'Event Type': i.eventType || '',
      'Event Date': i.eventDate || '',
      Message:    i.message || '',
      Handled:    i.handled ? 'Yes' : 'No',
    }))
    downloadCsv('Varahi-Inquiries.csv', rows)
    toast.success('CSV exported')
  }

  return (
    <div>
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
        className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">
            Inquiries {newCount > 0 && <span className="badge-gold ml-2 align-middle">{newCount} new</span>}
          </h1>
          <p className="text-brand-muted text-sm">Contact-form leads from the website</p>
        </div>
        <button onClick={handleExport} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
          <Download size={15}/> Export CSV
        </button>
      </motion.div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab===t.id ? 'bg-brand-violet text-white' : 'bg-brand-surface border border-brand-border text-brand-muted hover:text-white'}`}>
            {t.label}{t.id === 'new' && newCount > 0 ? ` · ${newCount}` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="skeleton h-28 rounded-xl"/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-10 flex flex-col items-center text-center gap-3">
          <Inbox size={32} style={{ color: '#9C7A82' }}/>
          <p className="text-white font-semibold">No inquiries here</p>
          <p className="text-brand-muted text-sm max-w-sm">
            {tab === 'new' ? 'All caught up — no new leads waiting.' : 'Nothing in this filter yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((i, idx) => {
            const wa = waLink(i.phone)
            return (
              <motion.div key={i.id} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: idx*0.03 }}
                className="glass-card p-4"
                style={!i.handled ? { borderLeft: '3px solid #C9933A', background: 'rgba(201,147,58,0.05)' } : undefined}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold text-sm">{i.name || 'Unknown'}</p>
                      <span className={i.handled ? 'badge-green' : 'badge-gold'} style={{ fontSize: '10px' }}>
                        {i.handled ? 'Handled' : 'New'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap mt-1 text-xs text-brand-muted">
                      {i.phone && <span className="flex items-center gap-1"><Phone size={11}/> {i.phone}</span>}
                      {i.email && <span className="flex items-center gap-1"><Mail size={11}/> {i.email}</span>}
                      {(i.eventType || i.eventDate) && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11}/> {i.eventType || 'Event'}{i.eventDate ? ` · ${i.eventDate}` : ''}
                        </span>
                      )}
                    </div>
                    {i.message && (
                      <p className="text-brand-muted text-sm mt-2 whitespace-pre-wrap">{i.message}</p>
                    )}
                    <p className="text-brand-muted text-[10px] mt-2">
                      {i.createdAt ? fmtFull(asDate(i.createdAt)) : '—'}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {i.phone && (
                      <a href={`tel:${i.phone}`}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-brand-border text-brand-muted hover:text-white hover:border-amber-500/40 transition-all text-xs">
                        <Phone size={12}/> Call
                      </a>
                    )}
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-green-500/30 text-green-300 hover:bg-green-500/10 transition-all text-xs">
                        <MessageCircle size={12}/> WhatsApp
                      </a>
                    )}
                    <button onClick={()=>handleToggle(i)} disabled={busyId===i.id}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-brand-border text-brand-muted hover:text-white hover:border-amber-500/40 transition-all text-xs">
                      {i.handled ? <><RotateCcw size={12}/> Reopen</> : <><CheckCircle2 size={12}/> Mark handled</>}
                    </button>
                    <button onClick={()=>handleDelete(i.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all text-xs">
                      <Trash2 size={12}/> Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
