import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
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

// Home + Login load eagerly (the two most common entry points).
import Home       from './pages/Home'
import Login      from './pages/Login'
import NotFound   from './pages/NotFound'
import InstallPrompt from './components/layout/InstallPrompt'

// Everything else is code-split so a first-time visitor doesn't download the
// entire admin portal, PDF and QR libraries just to see the home page.
const Events        = lazy(() => import('./pages/Events'))
const Equipment     = lazy(() => import('./pages/Equipment'))
const Calendar      = lazy(() => import('./pages/Calendar'))
const Gallery       = lazy(() => import('./pages/Gallery'))
const Contact       = lazy(() => import('./pages/Contact'))
const Dashboard     = lazy(() => import('./pages/Dashboard'))
const BookingDetail = lazy(() => import('./pages/BookingDetail'))
const Profile       = lazy(() => import('./pages/Profile'))
const FAQ           = lazy(() => import('./pages/FAQ'))
const Terms         = lazy(() => import('./pages/Terms'))
const Privacy       = lazy(() => import('./pages/Privacy'))
const AdminPortal   = lazy(() => import('./pages/AdminPortal'))

// Lightweight placeholder while a route chunk downloads
function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1A0810' }}>
      <div className="w-8 h-8 rounded-full animate-spin"
        style={{ border: '2px solid rgba(201,147,58,0.25)', borderTopColor: '#C9933A' }} />
    </div>
  )
}

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
    <InstallPrompt />
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* Public */}
      <Route path="/"          element={<HomeEntry />} />
      <Route path="/events"    element={<PublicLayout><Events /></PublicLayout>} />
      <Route path="/equipment" element={<PublicLayout><Equipment /></PublicLayout>} />
      <Route path="/calendar"  element={<PublicLayout><Calendar /></PublicLayout>} />
      <Route path="/gallery"   element={<PublicLayout><Gallery /></PublicLayout>} />
      <Route path="/contact"   element={<PublicLayout><Contact /></PublicLayout>} />
      <Route path="/faq"       element={<PublicLayout><FAQ /></PublicLayout>} />
      <Route path="/terms"     element={<PublicLayout><Terms /></PublicLayout>} />
      <Route path="/privacy"   element={<PublicLayout><Privacy /></PublicLayout>} />
      <Route path="/login"     element={<Login />} />

      {/* Protected */}
      <Route path="/dashboard" element={<Protected><PublicLayout><Dashboard /></PublicLayout></Protected>} />
      <Route path="/booking/:id" element={<Protected><PublicLayout><BookingDetail /></PublicLayout></Protected>} />
      <Route path="/profile"   element={<Protected><PublicLayout><Profile /></PublicLayout></Protected>} />

      {/* Admin */}
      <Route path="/admin/*"   element={<AdminRoute><AdminPortal /></AdminRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
    </>
  )
}
