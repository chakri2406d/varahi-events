import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Image as ImageIcon, Plus, Trash2, UploadCloud, Info } from 'lucide-react'
import { getGalleryItems, addGalleryItem, deleteGalleryItem } from '../../firebase/firestore'
import { EVENT_CATEGORIES } from '../../utils/constants'
import toast from 'react-hot-toast'

// Gallery photos live as base64 strings inside the Firestore doc, so they must
// stay comfortably under Firestore's 1MB-per-document limit.
const MAX_BASE64_LENGTH = 900_000

const CATEGORIES = EVENT_CATEGORIES.filter(c => c.id !== 'all')

const EMPTY = { title: '', category: CATEGORIES[0]?.id || 'wedding' }

// Draw `img` onto a canvas capped at `maxSize` on the longest side and
// return a base64 JPEG at the given quality.
const drawToBase64 = (img, maxSize, quality) => {
  const canvas = document.createElement('canvas')
  let { width, height } = img

  if (width > maxSize || height > maxSize) {
    if (width > height) { height = (height / width) * maxSize; width = maxSize }
    else                { width  = (width / height) * maxSize; height = maxSize }
  }

  canvas.width  = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, width, height)

  return canvas.toDataURL('image/jpeg', quality)
}

// Compress a File down to a base64 JPEG that fits Firestore's doc-size limit,
// stepping the size/quality down until it fits (or giving up with an error).
const compressImage = (file) => new Promise((resolve, reject) => {
  if (!file) { reject(new Error('No file selected')); return }

  const img = new Image()
  const url = URL.createObjectURL(file)

  img.onload = () => {
    const attempts = [
      { maxSize: 1000, quality: 0.7 },
      { maxSize: 1000, quality: 0.6 },
      { maxSize: 1000, quality: 0.5 },
      { maxSize: 800,  quality: 0.5 },
      { maxSize: 800,  quality: 0.4 },
      { maxSize: 640,  quality: 0.4 },
      { maxSize: 640,  quality: 0.3 },
      { maxSize: 480,  quality: 0.3 },
    ]

    let base64 = null
    for (const { maxSize, quality } of attempts) {
      base64 = drawToBase64(img, maxSize, quality)
      if (base64.length <= MAX_BASE64_LENGTH) break
    }

    URL.revokeObjectURL(url)

    if (!base64 || base64.length > MAX_BASE64_LENGTH) {
      reject(new Error('This image is too large even after compression. Please try a smaller photo.'))
      return
    }
    resolve(base64)
  }
  img.onerror = () => {
    URL.revokeObjectURL(url)
    reject(new Error('Could not read this image file'))
  }
  img.src = url
})

export default function GalleryManagement() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState(EMPTY)
  const [file,    setFile]    = useState(null)
  const [saving,  setSaving]  = useState(false)

  const load = () => getGalleryItems().then(setItems).catch(()=>{}).finally(()=>setLoading(false))
  useEffect(() => { load() }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.title?.trim()) { toast.error('Title is required'); return }
    if (!file) { toast.error('Choose a photo to upload'); return }

    setSaving(true)
    try {
      const imageUrl = await compressImage(file)
      await addGalleryItem({ title: form.title.trim(), category: form.category, imageUrl })
      toast.success('Photo added')
      setForm(EMPTY)
      setFile(null)
      load()
    } catch (err) {
      toast.error(err?.message || 'Failed to add photo')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this photo?')) return
    await deleteGalleryItem(id)
    toast.success('Deleted')
    load()
  }

  return (
    <div>
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white">Gallery</h1>
        <p className="text-brand-muted text-sm">Photos shown on the homepage and public gallery</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add photo form */}
        <div className="lg:col-span-1">
          <div className="glass-card p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Plus size={16} className="text-brand-violet"/> Add Photo
            </h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="label-dark">Title</label>
                <input className="input-dark" value={form.title} onChange={set('title')} placeholder="e.g. Grand Wedding Setup"/>
              </div>
              <div>
                <label className="label-dark">Category</label>
                <select className="input-dark" value={form.category} onChange={set('category')}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id} className="bg-brand-surface">{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label-dark">Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="input-dark file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-amber-500/15 file:text-amber-300"
                />
              </div>
              <div className="flex items-start gap-2 text-[11px] text-brand-muted">
                <Info size={13} className="flex-shrink-0 mt-0.5"/>
                <span>Images are compressed automatically to fit the database, so uploads may lose some quality — this keeps the gallery free to run.</span>
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full justify-center text-sm">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><UploadCloud size={14}/> Add Photo</>}
              </button>
            </form>
          </div>
        </div>

        {/* Existing photos */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[...Array(6)].map((_,i)=><div key={i} className="skeleton h-32 rounded-xl"/>)}
            </div>
          ) : items.length === 0 ? (
            <div className="glass-card p-10 flex flex-col items-center text-center gap-3">
              <ImageIcon size={32} style={{ color: '#9C7A82' }}/>
              <p className="text-white font-semibold">No photos yet</p>
              <p className="text-brand-muted text-sm max-w-sm">Add your first event photo using the form on the left.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {items.map((it, i) => {
                const cat = CATEGORIES.find(c => c.id === it.category)
                return (
                  <motion.div key={it.id} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.04 }}
                    className="glass-card overflow-hidden group relative">
                    {it.imageUrl ? (
                      <img src={it.imageUrl} alt={it.title || 'Gallery photo'} className="w-full h-32 object-cover"/>
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center bg-brand-surface">
                        <ImageIcon size={20} style={{ color: '#9C7A82' }}/>
                      </div>
                    )}
                    <div className="p-2.5">
                      <p className="text-white text-xs font-medium truncate">{it.title || 'Untitled'}</p>
                      <p className="text-brand-muted text-[10px]">{cat?.label || it.category || '—'}</p>
                    </div>
                    <button onClick={()=>handleDelete(it.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 size={13}/>
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
