import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, LogOut, ChevronDown, LayoutDashboard, Shield } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { logout } from '../../firebase/auth'
import toast from 'react-hot-toast'

const NAV_LINKS = [
  { to: '/',          label: 'Home'      },
  { to: '/events',    label: 'Events'    },
  { to: '/equipment', label: 'Equipment' },
  { to: '/calendar',  label: 'Calendar'  },
  { to: '/gallery',   label: 'Gallery'   },
  { to: '/contact',   label: 'Contact'   },
]

function LogoMark({ size = 36 }) {
  return (
    <img
      src="/varahi_events.jpg"
      alt="Varahi Events"
      style={{
        width: size,
        height: size,
        borderRadius: '10px',
        objectFit: 'cover',
        boxShadow: '0 0 14px rgba(201,147,58,0.35)',
        flexShrink: 0,
      }}
    />
  )
}

const activeStyle = {
  background: 'rgba(201,147,58,0.1)',
  borderColor: 'rgba(201,147,58,0.3)',
  color: '#E8B86D',
}

export default function Navbar() {
  const { user, isAdmin } = useAuth()
  const navigate          = useNavigate()
  const location          = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const userDropRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMenuOpen(false); setUserOpen(false) }, [location.pathname])

  useEffect(() => {
    const handler = (e) => {
      if (userDropRef.current && !userDropRef.current.contains(e.target)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out')
    navigate('/')
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-glass border-b border-brand-border py-2' : 'py-4 bg-transparent'
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <LogoMark size={36} />
            <div className="hidden sm:block">
              <p className="font-display font-bold text-base leading-none tracking-wider"
                style={{ background: 'linear-gradient(135deg, #C9933A, #F0D9A8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                VARAHI
              </p>
              <p className="text-[10px] tracking-[0.3em] uppercase leading-none mt-0.5" style={{ color: '#9C7A82' }}>
                Events
              </p>
            </div>
          </Link>

          {/* Desktop nav links */}
          <ul className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                      isActive ? '' : 'border-transparent text-brand-muted hover:text-white hover:bg-white/5'
                    }`
                  }
                  style={({ isActive }) => isActive ? activeStyle : {}}
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Right side */}
          <div className="flex items-center gap-3">

            {/* Admin badge */}
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all hover:bg-amber-500/25"
              >
                <Shield size={12} />
                Admin
              </Link>
            )}

            {user ? (
              <div className="relative" ref={userDropRef}>
                <button
                  onClick={() => setUserOpen(v => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-surface border border-brand-border text-sm transition-all"
                  style={{ color: '#F5EDE8' }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: 'rgba(139,26,44,0.7)', border: '1px solid rgba(201,147,58,0.35)' }}
                  >
                    {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:block max-w-[100px] truncate">
                    {user.displayName?.split(' ')[0] || 'User'}
                  </span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${userOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {userOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-glass border border-brand-border shadow-card overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-brand-border">
                        <p className="text-white text-sm font-semibold truncate">{user.displayName}</p>
                        <p className="text-brand-muted text-xs truncate">{user.email}</p>
                      </div>
                      <div className="py-1">
                        <Link
                          to="/dashboard"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-brand-muted hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <LayoutDashboard size={15} /> My Dashboard
                        </Link>
                        {isAdmin && (
                          <Link
                            to="/admin"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-amber-300 hover:bg-amber-500/10 transition-colors"
                          >
                            <Shield size={15} /> Admin Portal
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut size={15} /> Log Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/login" className="btn-primary text-sm py-2 px-5">
                Login
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="lg:hidden p-2 rounded-xl border border-brand-border text-brand-muted hover:text-white transition-all"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>

        {/* Mobile dropdown menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden overflow-hidden border-t border-brand-border bg-glass"
            >
              <div className="px-4 py-4 space-y-1">
                {NAV_LINKS.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `block px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                        isActive ? '' : 'border-transparent text-brand-muted hover:text-white hover:bg-white/5'
                      }`
                    }
                    style={({ isActive }) => isActive ? activeStyle : {}}
                  >
                    {label}
                  </NavLink>
                ))}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-amber-300 bg-amber-500/10 border border-amber-500/20"
                  >
                    <Shield size={14} /> Admin Portal
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Spacer */}
      <div className="h-16 sm:h-20" />
    </>
  )
}