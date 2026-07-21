import { useState } from 'react'
import { motion } from 'framer-motion'
import { Database, Download, Loader2, CheckCircle2, XCircle, Info, Table } from 'lucide-react'
import {
  getAllBookings, getMachines, getAllEvents, getExpenses,
  getGalleryItems, getCrew, getInquiries, getAllReviews,
} from '../../firebase/firestore'
import { downloadCsv } from '../../utils/exportCsv'
import toast from 'react-hot-toast'

// Everything the backup pulls in. label = shown to the admin, fetch = the
// exact firestore.js export that returns that collection's rows.
const COLLECTIONS = [
  { key: 'bookings',  label: 'Bookings',  fetch: getAllBookings },
  { key: 'machines',  label: 'Equipment', fetch: getMachines },
  { key: 'events',    label: 'Events',    fetch: getAllEvents },
  { key: 'expenses',  label: 'Expenses',  fetch: getExpenses },
  { key: 'gallery',   label: 'Gallery',   fetch: getGalleryItems },
  { key: 'crew',      label: 'Crew',      fetch: getCrew },
  { key: 'inquiries', label: 'Inquiries', fetch: getInquiries },
  { key: 'reviews',   label: 'Reviews',   fetch: getAllReviews },
]

// Only the flat, tabular collections make sense as a single CSV.
const CSV_COLLECTIONS = COLLECTIONS.filter(c =>
  ['bookings', 'expenses', 'inquiries', 'reviews', 'crew', 'machines'].includes(c.key))

const todayStr = () => new Date().toISOString().slice(0, 10)

// Firestore Timestamps expose .toDate() but don't survive JSON.stringify in
// any useful form (they'd serialize as {seconds, nanoseconds}). Convert them
// to ISO strings recursively. seen guards against accidental circular refs.
function sanitize(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return value

  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      try { return value.toDate().toISOString() } catch { return null }
    }
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value.toISOString()
    }
    if (seen.has(value)) return '[circular]'
    seen.add(value)

    if (Array.isArray(value)) return value.map(v => sanitize(v, seen))

    const out = {}
    Object.keys(value).forEach(k => { out[k] = sanitize(value[k], seen) })
    return out
  }

  return value
}

export default function DataBackup() {
  const [backing,  setBacking]  = useState(false)
  const [progress, setProgress] = useState(null) // { done, total, current }
  const [summary,  setSummary]  = useState(null) // { counts, failed }
  const [csvKey,   setCsvKey]   = useState(null) // which per-collection CSV is exporting

  const handleBackup = async () => {
    setBacking(true)
    setSummary(null)
    const data   = {}
    const counts = {}
    const failed = []

    // Sequential, not Promise.all, so the progress line means something and
    // one slow/failing collection doesn't hide behind the others.
    for (let i = 0; i < COLLECTIONS.length; i++) {
      const { key, label, fetch } = COLLECTIONS[i]
      setProgress({ done: i, total: COLLECTIONS.length, current: label })
      try {
        const rows = await fetch()
        data[key]   = sanitize(rows)
        counts[key] = Array.isArray(rows) ? rows.length : 0
      } catch (err) {
        console.error(`Backup: failed to fetch ${label}`, err)
        failed.push(label)
        data[key]   = []
        counts[key] = 0
      }
    }
    setProgress({ done: COLLECTIONS.length, total: COLLECTIONS.length, current: null })

    try {
      const payload = { exportedAt: new Date().toISOString(), data }
      const json = JSON.stringify(payload, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `varahi-backup-${todayStr()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setSummary({ counts, failed })
      if (failed.length) {
        toast.error(`Backup downloaded, but these failed: ${failed.join(', ')}`)
      } else {
        toast.success('Full backup downloaded')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to build the backup file')
    } finally {
      setBacking(false)
      setProgress(null)
    }
  }

  const handleCsvExport = async (item) => {
    setCsvKey(item.key)
    try {
      const rows = await item.fetch()
      if (!Array.isArray(rows) || rows.length === 0) {
        toast.error(`No ${item.label.toLowerCase()} to export`)
        return
      }
      downloadCsv(`Varahi-${item.label}-${todayStr()}.csv`, rows)
      toast.success(`${item.label} exported`)
    } catch (err) {
      console.error(err)
      toast.error(`Failed to export ${item.label}`)
    } finally {
      setCsvKey(null)
    }
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white">Data Backup</h1>
        <p className="text-sm" style={{ color: '#9C7A82' }}>There's no backup today — export everything, right now</p>
      </motion.div>

      {/* Full JSON backup */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(201,147,58,0.1)' }}>
            <Database size={22} style={{ color: '#C9933A' }} />
          </div>
          <div className="flex-1 min-w-[220px]">
            <h2 className="text-white font-semibold mb-1">Full backup (JSON)</h2>
            <p className="text-sm mb-4" style={{ color: '#9C7A82' }}>
              Downloads every collection — bookings, equipment, events, expenses, gallery, crew,
              inquiries and reviews — as one JSON file you can store safely.
            </p>
            <button
              onClick={handleBackup}
              disabled={backing}
              className="btn-primary text-sm py-2.5 px-5 flex items-center gap-2"
              style={{ opacity: backing ? 0.7 : 1 }}
            >
              {backing
                ? <><Loader2 size={15} className="animate-spin" /> Backing up…</>
                : <><Download size={15} /> Download full backup (JSON)</>}
            </button>

            {progress && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: '#9C7A82' }}>
                  <span>{progress.current ? `Fetching ${progress.current}…` : 'Building file…'}</span>
                  <span>{progress.done}/{progress.total}</span>
                </div>
                <div className="relative h-2 rounded-full overflow-hidden" style={{ background: '#1A0810' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(progress.done / progress.total) * 100}%` }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: 'linear-gradient(to right, #8B1A2C, #C9933A)' }}
                  />
                </div>
              </div>
            )}

            {summary && (
              <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(61,30,40,0.8)' }}>
                <p className="text-xs uppercase tracking-wider mb-3" style={{ color: '#9C7A82' }}>Backup summary</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {COLLECTIONS.map(c => {
                    const ok = !summary.failed.includes(c.label)
                    return (
                      <div key={c.key} className="flex items-center gap-2 px-2.5 py-2 rounded-xl"
                        style={{ background: 'rgba(13,5,8,0.8)', border: '1px solid rgba(61,30,40,0.8)' }}>
                        {ok
                          ? <CheckCircle2 size={13} style={{ color: '#86efac' }} />
                          : <XCircle size={13} style={{ color: '#fca5a5' }} />}
                        <div className="min-w-0">
                          <p className="text-white text-xs font-medium truncate">{c.label}</p>
                          <p className="text-[10px]" style={{ color: ok ? '#9C7A82' : '#fca5a5' }}>
                            {ok ? `${summary.counts[c.key] ?? 0} records` : 'failed'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Per-collection CSV exports */}
      <div className="glass-card p-6 mb-6">
        <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
          <Table size={16} style={{ color: '#E8B86D' }} /> Export individual collections (CSV)
        </h2>
        <p className="text-sm mb-4" style={{ color: '#9C7A82' }}>
          Handy for opening a single table in Excel or Google Sheets.
        </p>
        <div className="flex flex-wrap gap-2">
          {CSV_COLLECTIONS.map(c => (
            <button
              key={c.key}
              onClick={() => handleCsvExport(c)}
              disabled={csvKey === c.key}
              className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
              style={{ opacity: csvKey === c.key ? 0.7 : 1 }}
            >
              {csvKey === c.key ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="glass-card p-5 flex items-start gap-3">
        <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#9C7A82' }} />
        <p className="text-xs leading-relaxed" style={{ color: '#9C7A82' }}>
          This backup runs entirely in your browser — no server involved, your data goes straight
          from Firestore to a file on your device. We recommend downloading a full backup at
          least once a month and keeping a copy somewhere safe (a shared drive, email to yourself,
          etc). A failed collection during backup won't stop the rest — check the summary above
          after each run.
        </p>
      </div>
    </div>
  )
}
