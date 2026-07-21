import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, Phone, Zap, ArrowLeft } from 'lucide-react'
import { login, register, loginWithGoogle, resetPassword } from '../firebase/auth'
import { useAuth } from '../context/AuthContext'
import { resetAdminWantsPublic } from '../utils/adminView'
import toast from 'react-hot-toast'

export default function Login() {
  const { user, profile, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [mode,    setMode]    = useState('login')
  const [loading, setLoading] = useState(false)
  const [showPw,  setShowPw]  = useState(false)
  const [form,    setForm]    = useState({ name: '', email: '', phone: '', password: '' })

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  // Wait until the profile (and therefore the role) is loaded, then send
  // admins straight to the admin portal and everyone else to their dashboard.
  useEffect(() => {
    if (!user) return
    // Fresh login → default admins to the dashboard (clear any prior
    // "view public site" choice from an earlier session).
    resetAdminWantsPublic()

    if (profile) {
      navigate(isAdmin ? '/admin' : '/dashboard', { replace: true })
      return
    }
    // The profile document is written at the END of register(), so this
    // listener can win the race and find nothing. Previously that left the
    // user on a permanently blank page with no way out. Send them on anyway.
    const t = setTimeout(() => navigate('/dashboard', { replace: true }), 2500)
    return () => clearTimeout(t)
  }, [user, profile, isAdmin, navigate])

  // Signed in but still resolving — show a spinner, never a blank screen
  if (user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1A0810' }}>
      <div className="w-8 h-8 rounded-full animate-spin"
        style={{ border: '2px solid rgba(201,147,58,0.25)', borderTopColor: '#C9933A' }} />
    </div>
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
        toast.success('Welcome back!')
        // Redirect handled by the role-aware effect once the profile loads.
      } else if (mode === 'register') {
        if (form.password.length < 6) { toast.error('Password must be 6+ characters'); return }
        await register(form.name, form.email, form.password, form.phone)
        toast.success('Account created! Welcome to Varahi Events.')
        // Redirect handled by the role-aware effect once the profile loads.
      } else {
        await resetPassword(form.email)
        toast.success('Password reset link sent to your email.')
        setMode('login')
      }
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'Email already registered. Please login.',
        'auth/wrong-password':        'Incorrect password.',
        'auth/user-not-found':        'No account found with this email.',
        'auth/invalid-email':         'Please enter a valid email.',
        'auth/too-many-requests':     'Too many attempts. Try again later.',
        'auth/invalid-credential':    'Invalid email or password.',
      }
      toast.error(msgs[err.code] || err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    try {
      await loginWithGoogle()
      toast.success('Logged in with Google!')
      // Redirect handled by the role-aware effect once the profile loads.
    } catch {
      toast.error('Google sign-in failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#1A0810' }}>

      {/* Background orbs */}
      <div className="orb w-96 h-96 -top-20 -left-20"
        style={{ background: 'rgba(107,15,26,0.25)' }} />
      <div className="orb w-64 h-64 -bottom-10 -right-10"
        style={{ background: 'rgba(201,147,58,0.1)', animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10">

        {/* Back to home */}
        <Link to="/"
          className="inline-flex items-center gap-2 text-sm hover:text-white transition-colors mb-8"
          style={{ color: '#9C7A82' }}>
          <ArrowLeft size={16} /> Back to Home
        </Link>

        {/* Logo + heading */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <motion.img
              src="/varahi_events.jpg"
              alt="Varahi Events"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{
                width: 90,
                height: 90,
                borderRadius: '20px',
                objectFit: 'cover',
                boxShadow: '0 0 30px rgba(201,147,58,0.4), 0 0 60px rgba(139,26,44,0.2)',
              }}
            />
          </div>

          <h1 className="font-display font-bold text-2xl text-white mb-1">
            {mode === 'login'    ? 'Welcome Back'   :
             mode === 'register' ? 'Create Account' :
                                   'Reset Password'}
          </h1>
          <p className="text-sm" style={{ color: '#9C7A82' }}>
            {mode === 'login'    ? 'Sign in to your Varahi Events account'       :
             mode === 'register' ? 'Join Varahi Events and book your experience' :
                                   'Enter your email to receive a reset link'}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 sm:p-8"
          style={{
            background: 'rgba(26,8,16,0.9)',
            border: '1px solid rgba(61,30,40,0.8)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(201,147,58,0.06)',
          }}>

          {/* Google sign-in */}
          {mode !== 'reset' && (
            <>
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-white text-sm font-medium transition-all mb-5"
                style={{
                  background: 'rgba(13,5,8,0.8)',
                  border: '1px solid rgba(61,30,40,0.8)',
                }}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px" style={{ background: 'rgba(61,30,40,0.8)' }} />
                <span className="text-xs" style={{ color: '#9C7A82' }}>or continue with email</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(61,30,40,0.8)' }} />
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  key="name"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <label className="label-dark"><User size={11} className="inline mr-1" />Full Name</label>
                  <input
                    type="text"
                    className="input-dark"
                    placeholder="Your full name"
                    value={form.name}
                    onChange={set('name')}
                    required
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="label-dark"><Mail size={11} className="inline mr-1" />Email</label>
              <input
                type="email"
                className="input-dark"
                placeholder="your@email.com"
                value={form.email}
                onChange={set('email')}
                required
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="label-dark"><Phone size={11} className="inline mr-1" />Phone (optional)</label>
                <input
                  type="tel"
                  className="input-dark"
                  placeholder="+91 XXXXX XXXXX"
                  value={form.phone}
                  onChange={set('phone')}
                />
              </div>
            )}

            {mode !== 'reset' && (
              <div>
                <label className="label-dark"><Lock size={11} className="inline mr-1" />Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input-dark pr-10"
                    placeholder={mode === 'register' ? 'Min 6 characters' : 'Your password'}
                    value={form.password}
                    onChange={set('password')}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#9C7A82' }}
                    onClick={() => setShowPw(v => !v)}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="text-xs hover:underline"
                  style={{ color: '#E8B86D' }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3.5 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Zap size={16} />
                  {mode === 'login'    ? 'Sign In'         :
                   mode === 'register' ? 'Create Account'  :
                                         'Send Reset Link'}
                </>
              )}
            </button>
          </form>

          {/* Switch mode */}
          <div className="mt-5 text-center text-sm" style={{ color: '#9C7A82' }}>
            {mode === 'login' ? (
              <>Don't have an account?{' '}
                <button onClick={() => setMode('register')}
                  className="font-medium hover:underline" style={{ color: '#E8B86D' }}>
                  Create one
                </button>
              </>
            ) : mode === 'register' ? (
              <>Already have an account?{' '}
                <button onClick={() => setMode('login')}
                  className="font-medium hover:underline" style={{ color: '#E8B86D' }}>
                  Sign in
                </button>
              </>
            ) : (
              <>Remember your password?{' '}
                <button onClick={() => setMode('login')}
                  className="font-medium hover:underline" style={{ color: '#E8B86D' }}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}