import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { doc, updateDoc } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import { User, Phone, Mail, Save, ShieldCheck, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { db, auth } from '../firebase/config'

const PHONE_RE = /^[+\d][\d\s-]{8,}$/

export default function Profile() {
  const { user, profile } = useAuth()
  const [form,   setForm]   = useState({ name: '', phone: '', email: '' })
  const [saving, setSaving] = useState(false)

  // Sync local form state once the profile doc arrives (it's null on first render
  // while AuthContext is still fetching it from Firestore).
  useEffect(() => {
    if (profile) {
      setForm({ name: profile.name || '', phone: profile.phone || '', email: profile.email || '' })
    }
  }, [profile])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return

    const name  = form.name.trim()
    const phone = form.phone.trim()

    if (!name) {
      toast.error('Please enter your name')
      return
    }
    if (phone && !PHONE_RE.test(phone)) {
      toast.error('Please enter a valid phone number')
      return
    }

    setSaving(true)
    try {
      // Never include `role` here — Firestore security rules reject any
      // update to the user doc that touches role, even to the same value.
      await updateDoc(doc(db, 'users', user.uid), { name, phone })

      // Best-effort: keep the navbar's displayName in sync, but don't let a
      // failure here block the Firestore save which already succeeded.
      try {
        await updateProfile(auth.currentUser, { displayName: name })
      } catch {
        // ignore — display name is cosmetic
      }

      toast.success('Profile updated!')
    } catch (err) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const memberSince = profile?.createdAt?.toDate?.()
    ? profile.createdAt.toDate().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-3xl mx-auto px-4">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <span className="badge-violet mb-3 inline-block">Account Settings</span>
          <h1 className="section-title mb-2">My <span className="text-gradient-v">Profile</span></h1>
          <p className="section-subtitle">Keep your contact details up to date.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 sm:p-8 mb-6"
        >
          {!profile ? (
            <div className="space-y-4">
              <div className="skeleton h-4 w-32" />
              <div className="grid grid-cols-2 gap-4">
                <div className="skeleton h-11" />
                <div className="skeleton h-11" />
              </div>
              <div className="skeleton h-11" />
              <div className="skeleton h-11 w-40" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-white font-semibold text-lg mb-5">Personal Details</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-dark">
                    <User size={12} className="inline -mt-0.5 mr-1" /> Full Name
                  </label>
                  <input
                    type="text"
                    className="input-dark"
                    placeholder="Full name"
                    value={form.name}
                    onChange={set('name')}
                    required
                  />
                </div>
                <div>
                  <label className="label-dark">
                    <Phone size={12} className="inline -mt-0.5 mr-1" /> Phone
                  </label>
                  <input
                    type="tel"
                    className="input-dark"
                    placeholder="+91 XXXXX XXXXX"
                    value={form.phone}
                    onChange={set('phone')}
                  />
                </div>
              </div>

              <div>
                <label className="label-dark">
                  <Mail size={12} className="inline -mt-0.5 mr-1" /> Email
                </label>
                <input
                  type="email"
                  className="input-dark opacity-60 cursor-not-allowed"
                  value={form.email}
                  disabled
                  readOnly
                />
                <p className="text-brand-muted text-xs mt-1.5">
                  Email changes require a separate verification flow and aren't editable here.
                </p>
              </div>

              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 sm:p-8"
        >
          <h3 className="text-white font-semibold text-lg mb-4">Account</h3>
          {!profile ? (
            <div className="skeleton h-4 w-48" />
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-brand-muted text-sm">
                Member since {memberSince || '—'}
              </p>
              {profile.role === 'admin' && (
                <span className="badge-gold">
                  <ShieldCheck size={12} /> Admin
                </span>
              )}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  )
}
