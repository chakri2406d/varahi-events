import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Image as ImageIcon, Link as LinkIcon, UploadCloud, Plus, Trash2,
  Info, Play, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { getGalleryItems, addGalleryItem, deleteGalleryItem } from '../../firebase/firestore'
import { compressImage, uploadGalleryVideo, deleteStorageFile } from '../../firebase/storage'
import { parseVideoUrl } from '../../utils/media'
import { EVENT_CATEGORIES } from '../../utils/constants'
import toast from 'react-hot-toast'

const CATEGORIES = EVENT_CATEGORIES.filter(c => c.id !== 'all')

const EMPTY_FORM = { title: '', category: CATEGORIES[0]?.id || 'wedding' }

// One form, three modes — the admin always fills the same Title/Category
// fields, only the media input underneath changes.
const MODES = [
  { id: 'image',      label: 'Photo',        icon: ImageIcon },
  { id: 'video-link', label: 'Video link',   icon: LinkIcon },
  { id: 'video-file', label: 'Upload video', icon: UploadCloud },
]

export default function GalleryManagement() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [mode,    setMode]    = useState('image')
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [saving,  setSaving]  = useState(false)

  // Photo mode
  const [imageFile, setImageFile] = useState(null)

  // Video link mode — parsed live so the admin gets instant feedback
  const [videoUrl, setVideoUrl] = useState('')
  const parsedVideo = useMemo(() => parseVideoUrl(videoUrl), [videoUrl])

  // Upload video mode
  const [videoFile, setVideoFile] = useState(null)
  const [progress,  setProgress]  = useState(0)
  const [uploading, setUploading] = useState(false)

  const load = () => getGalleryItems().then(setItems).catch(() => {}).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const resetMediaInputs = () => {
    setImageFile(null)
    setVideoUrl('')
    setVideoFile(null)
    setProgress(0)
  }

  const switchMode = (m) => {
    setMode(m)
    resetMediaInputs()
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.title?.trim()) { toast.error('Title is required'); return }

    if (mode === 'image') {
      if (!imageFile) { toast.error('Choose a photo to upload'); return }
      setSaving(true)
      try {
        const imageUrl = await compressImage(imageFile)
        await addGalleryItem({ kind: 'image', title: form.title.trim(), category: form.category, imageUrl })
        toast.success('Photo added')
        setForm(EMPTY_FORM)
        resetMediaInputs()
        load()
      } catch (err) {
        toast.error(err?.message || 'Failed to add photo')
      } finally {
        setSaving(false)
      }
      return
    }

    if (mode === 'video-link') {
      // Reject unknown/empty links here even though the button itself doesn't
      // disable — a clearer inline error beats a silently-ignored click.
      if (!parsedVideo || parsedVideo.provider === 'unknown') {
        toast.error('Paste a valid YouTube, Instagram, or direct video link')
        return
      }
      setSaving(true)
      try {
        await addGalleryItem({
          kind:      'video',
          title:     form.title.trim(),
          category:  form.category,
          provider:  parsedVideo.provider,
          // Firestore rejects `undefined` — normalise missing fields to null
          embedUrl:  parsedVideo.embedUrl || null,
          videoUrl:  parsedVideo.videoUrl || null,
          thumbnail: parsedVideo.thumbnail || null,
        })
        toast.success('Video added')
        setForm(EMPTY_FORM)
        resetMediaInputs()
        load()
      } catch (err) {
        toast.error(err?.message || 'Failed to add video')
      } finally {
        setSaving(false)
      }
      return
    }

    if (mode === 'video-file') {
      if (!videoFile) { toast.error('Choose a video file to upload'); return }
      setSaving(true)
      setUploading(true)
      setProgress(0)
      try {
        const { url, path } = await uploadGalleryVideo(videoFile, setProgress)
        await addGalleryItem({
          kind: 'video', title: form.title.trim(), category: form.category,
          provider: 'file', videoUrl: url, storagePath: path, thumbnail: null,
        })
        toast.success('Video uploaded')
        setForm(EMPTY_FORM)
        resetMediaInputs()
        load()
      } catch (err) {
        // uploadGalleryVideo() already tailors this message for the
        // Storage-not-enabled case, so just surface it as-is.
        toast.error(err?.message || 'Failed to upload video')
      } finally {
        setSaving(false)
        setUploading(false)
      }
    }
  }

  const handleDelete = async (item) => {
    if (!confirm('Delete this item?')) return
    try {
      // Clean up the Storage file BEFORE removing the Firestore doc, so we
      // never orphan an uploaded video if the doc delete fails first.
      if (item.storagePath) await deleteStorageFile(item.storagePath)
      await deleteGalleryItem(item.id)
      toast.success('Deleted')
      load()
    } catch (err) {
      toast.error(err?.message || 'Failed to delete')
    }
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white">Gallery</h1>
        <p className="text-brand-muted text-sm">Photos and videos shown on the public gallery</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add form */}
        <div className="lg:col-span-1">
          <div className="glass-card p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Plus size={16} className="text-brand-violet" /> Add to Gallery
            </h3>

            {/* Mode switch */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl mb-4"
              style={{ background: 'rgba(13,5,8,0.8)', border: '1px solid rgba(61,30,40,0.8)' }}>
              {MODES.map(m => {
                const Icon = m.icon
                const active = mode === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => switchMode(m.id)}
                    className={`flex flex-col items-center gap-1 py-2 rounded-lg text-[11px] font-medium transition-all ${active ? 'text-white' : 'text-brand-muted hover:text-white'}`}
                    style={active ? { background: 'linear-gradient(135deg, #6B0F1A, #8B1A2C)' } : undefined}
                  >
                    <Icon size={15} />
                    {m.label}
                  </button>
                )
              })}
            </div>

            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="label-dark">Title</label>
                <input className="input-dark" value={form.title} onChange={set('title')} placeholder="e.g. Grand Wedding Setup" />
              </div>
              <div>
                <label className="label-dark">Category</label>
                <select className="input-dark" value={form.category} onChange={set('category')}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id} className="bg-brand-surface">{c.label}</option>)}
                </select>
              </div>

              {mode === 'image' && (
                <div>
                  <label className="label-dark">Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setImageFile(e.target.files?.[0] || null)}
                    className="input-dark file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-amber-500/15 file:text-amber-300"
                  />
                </div>
              )}

              {mode === 'video-link' && (
                <div>
                  <label className="label-dark">Video URL</label>
                  <input
                    className="input-dark"
                    value={videoUrl}
                    onChange={e => setVideoUrl(e.target.value)}
                    placeholder="YouTube, Instagram, or direct .mp4 link"
                  />
                  {videoUrl.trim() && parsedVideo && (
                    parsedVideo.provider === 'unknown' ? (
                      <p className="flex items-center gap-1.5 text-[11px] mt-1.5" style={{ color: '#fca5a5' }}>
                        <AlertCircle size={12} /> Paste a YouTube, Instagram, or direct video link
                      </p>
                    ) : (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: '#86efac' }}>
                          <CheckCircle2 size={12} /> Detected: {parsedVideo.provider}
                        </span>
                        {parsedVideo.thumbnail && (
                          <img src={parsedVideo.thumbnail} alt="preview" className="w-14 h-9 object-cover rounded-md border border-brand-border" />
                        )}
                      </div>
                    )
                  )}
                </div>
              )}

              {mode === 'video-file' && (
                <div>
                  <label className="label-dark">Video file</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={e => setVideoFile(e.target.files?.[0] || null)}
                    className="input-dark file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-amber-500/15 file:text-amber-300"
                  />
                  {uploading && (
                    <div className="w-full h-2 rounded-full overflow-hidden mt-2" style={{ background: 'rgba(61,30,40,0.8)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-200"
                        style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#C9933A,#E8B86D)' }}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-start gap-2 text-[11px]" style={{ color: '#9C7A82' }}>
                <Info size={13} className="flex-shrink-0 mt-0.5" />
                <span>
                  Photos are compressed automatically to fit the free database.
                  Videos over 50MB won't upload — add them as a YouTube/Instagram link instead.
                  If upload fails, enable Firebase Storage in the console, or just paste a link.
                </span>
              </div>

              <button type="submit" disabled={saving} className="btn-primary w-full justify-center text-sm">
                {saving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Plus size={14} /> Add to Gallery</>}
              </button>
            </form>
          </div>
        </div>

        {/* Existing items */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-32 rounded-xl" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="glass-card p-10 flex flex-col items-center text-center gap-3">
              <ImageIcon size={32} style={{ color: '#9C7A82' }} />
              <p className="text-white font-semibold">Nothing in the gallery yet</p>
              <p className="text-brand-muted text-sm max-w-sm">Add your first photo or video using the form on the left.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {items.map((it, i) => {
                const cat  = CATEGORIES.find(c => c.id === it.category)
                // Older/demo docs predate the `kind` field but always have an
                // imageUrl, so a missing kind safely means "image".
                const kind = it.kind || 'image'
                return (
                  <motion.div key={it.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="glass-card overflow-hidden group relative">

                    {kind === 'image' ? (
                      it.imageUrl ? (
                        <img src={it.imageUrl} alt={it.title || 'Gallery photo'} className="w-full h-32 object-cover" />
                      ) : (
                        <div className="w-full h-32 flex items-center justify-center" style={{ background: '#220D15' }}>
                          <ImageIcon size={20} style={{ color: '#9C7A82' }} />
                        </div>
                      )
                    ) : it.provider === 'youtube' && it.thumbnail ? (
                      <div className="relative w-full h-32">
                        <img src={it.thumbnail} alt={it.title || 'Video'} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                          <div className="w-9 h-9 rounded-full bg-black/50 border border-white/30 flex items-center justify-center">
                            <Play size={16} className="text-white ml-0.5" fill="white" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-32 flex flex-col items-center justify-center gap-1.5"
                        style={{ background: 'linear-gradient(135deg, rgba(139,26,44,0.35), rgba(201,147,58,0.12))' }}>
                        <Play size={20} style={{ color: '#E8B86D' }} />
                        <span className="badge-pink text-[9px] px-2 py-0.5">Video</span>
                      </div>
                    )}

                    <div className="p-2.5">
                      <p className="text-white text-xs font-medium truncate">{it.title || 'Untitled'}</p>
                      <p className="text-[10px]" style={{ color: '#9C7A82' }}>{cat?.label || it.category || '—'}</p>
                    </div>
                    <button onClick={() => handleDelete(it)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 size={13} />
                    </button>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
