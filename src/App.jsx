import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import { adminWantsPublic, setAdminWantsPublic } from './utils/adminView'

// Scrolls to top of page on every route change
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}
import LoadingScreen from './components/layout/LoadingScreen'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import MobileNav from './components/layout/MobileNav'

// Pages
import Home       from './pages/Home'
import Events     from './pages/Events'
import Equipment  from './pages/Equipment'
import Calendar   from './pages/Calendar'
import Gallery    from './pages/Gallery'
import Contact    from './pages/Contact'
import Login      from './pages/Login'
import Dashboard  from './pages/Dashboard'
import AdminPortal from './pages/AdminPortal'
import NotFound   from './pages/NotFound'

// ── Protected Route ──────────────────────────────────────────────────────────
function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-brand-bg flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-violet border-t-transparent rounded-full animate-spin" /></div>
  if (!user)   return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth()
  if (loading)    return null
  if (!user)      return <Navigate to="/login" replace />
  if (!isAdmin)   return <Navigate to="/" replace />
  return children
}

// ── Pages that show Navbar + Footer ─────────────────────────────────────────
function PublicLayout({ children }) {
  const { isAdmin } = useAuth()
  // Once an admin is actually viewing a public page, remember that so the
  // "/" route doesn't keep bouncing them back to the dashboard.
  useEffect(() => {
    if (isAdmin) setAdminWantsPublic()
  }, [isAdmin])
  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <MobileNav />
    </>
  )
}

// Admins land on the dashboard by default. The public home page is still
// reachable — they just have to opt in (via the "View Website" link, which
// sets the flag), otherwise "/" redirects them to /admin.
function HomeEntry() {
  const { isAdmin } = useAuth()
  if (isAdmin && !adminWantsPublic()) return <Navigate to="/admin" replace />
  return <PublicLayout><Home /></PublicLayout>
}

export default function App() {
  const { loading } = useAuth()
  if (loading) return <LoadingScreen />

  return (
    <>
    <ScrollToTop />
    <Routes>
      {/* Public */}
      <Route path="/"          element={<HomeEntry />} />
      <Route path="/events"    element={<PublicLayout><Events /></PublicLayout>} />
      <Route path="/equipment" element={<PublicLayout><Equipment /></PublicLayout>} />
      <Route path="/calendar"  element={<PublicLayout><Calendar /></PublicLayout>} />
      <Route path="/gallery"   element={<PublicLayout><Gallery /></PublicLayout>} />
      <Route path="/contact"   element={<PublicLayout><Contact /></PublicLayout>} />
      <Route path="/login"     element={<Login />} />

      {/* Protected */}
      <Route path="/dashboard" element={<Protected><PublicLayout><Dashboard /></PublicLayout></Protected>} />

      {/* Admin */}
      <Route path="/admin/*"   element={<AdminRoute><AdminPortal /></AdminRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  )
}
