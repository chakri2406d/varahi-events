import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useState, lazy, Suspense } from 'react'
import { LayoutDashboard, CalendarCheck, Package, DollarSign, TrendingUp, LogOut, Menu, Shield, ReceiptText, CalendarDays, Globe, ScanLine, Users, CalendarClock, Inbox, Star, Image, PieChart, Database } from 'lucide-react'
import { logout } from '../firebase/auth'
import { useAuth } from '../context/AuthContext'
import { setAdminWantsPublic } from '../utils/adminView'
import toast from 'react-hot-toast'

import AdminDashboard      from '../components/admin/AdminDashboard'
import BookingManagement   from '../components/admin/BookingManagement'
// Lazy-loaded so the camera library (html5-qrcode) only loads on the Scan page,
// and the rest of the admin portal works even before it's installed.
const QrScanner = lazy(() => import('../components/admin/QrScanner'))
import MachineManagement   from '../components/admin/MachineManagement'
import CrewManagement      from '../components/admin/CrewManagement'
import PricingManagement   from '../components/admin/PricingManagement'
import ExpenseManagement   from '../components/admin/ExpenseManagement'
import PnLDashboard        from '../components/admin/PnLDashboard'
import EventManagement     from '../components/admin/EventManagement'
import TodayView           from '../components/admin/TodayView'
import InquiryManagement   from '../components/admin/InquiryManagement'
import ReviewManagement    from '../components/admin/ReviewManagement'
import GalleryManagement   from '../components/admin/GalleryManagement'
import Analytics           from '../components/admin/Analytics'
import DataBackup          from '../components/admin/DataBackup'

const NAV = [
  { to:'/admin/today',     icon:CalendarClock,   label:'Today'               },
  { to:'/admin',          icon:LayoutDashboard, label:'Dashboard', end:true },
  { to:'/admin/scan',     icon:ScanLine,        label:'Scan QR'             },
  { to:'/admin/bookings', icon:CalendarCheck,   label:'Bookings'            },
  { to:'/admin/events',   icon:CalendarDays,    label:'Events'              },
  { to:'/admin/machines', icon:Package,         label:'Equipment'           },
  { to:'/admin/crew',     icon:Users,           label:'Crew'                },
  { to:'/admin/pricing',  icon:ReceiptText,     label:'Pricing'             },
  { to:'/admin/expenses', icon:DollarSign,      label:'Expenses'            },
  { to:'/admin/pnl',      icon:TrendingUp,      label:'P & L'               },
  { to:'/admin/analytics',icon:PieChart,        label:'Analytics'           },
  { to:'/admin/inquiries',icon:Inbox,           label:'Inquiries'           },
  { to:'/admin/reviews',  icon:Star,            label:'Reviews'             },
  { to:'/admin/gallery',  icon:Image,           label:'Gallery'             },
  { to:'/admin/backup',   icon:Database,        label:'Backup'              },
]

export default function AdminPortal() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out')
    navigate('/')
  }

  const handleViewSite = () => {
    setAdminWantsPublic()   // remember the admin opted into the public site
    setSidebarOpen(false)
    navigate('/')
  }

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-brand-surface border-r border-brand-border w-64">
      {/* Logo */}
      <div className="p-5 border-b border-brand-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="/varahi_events.jpg"
            alt="Varahi Events"
            className="w-9 h-9 rounded-xl object-cover"
            style={{ boxShadow: '0 0 12px rgba(201,147,58,0.3)' }}
          />
          <div>
            <p className="font-display font-bold text-white text-sm">ADMIN</p>
            <p className="text-brand-muted text-[10px]">Varahi Events</p>
          </div>
        </div>
      </div>

      {/* Nav — must scroll on its own. Without min-h-0 + overflow-y-auto the
          15 links grow past the viewport and shove the logout button (below)
          off the bottom of the screen, making it unreachable. */}
      <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
        {NAV.map(({ to, icon:Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                  : 'text-brand-muted hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon size={16}/>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + logout — pinned to the bottom, never scrolled away */}
      <div className="p-3 border-t border-brand-border flex-shrink-0">
        <button
          onClick={handleViewSite}
          className="flex items-center gap-2 w-full px-3 py-2 mb-1 rounded-xl text-brand-muted text-sm hover:text-white hover:bg-white/5 transition-colors"
        >
          <Globe size={14}/> View Website
        </button>
        <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
          <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-300">
            {user?.displayName?.charAt(0) || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.displayName || 'Admin'}</p>
            <p className="text-brand-muted text-[10px] truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-red-400 text-sm hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={14}/> Logout
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-brand-bg overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar/>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}/>
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-50 flex">
            <Sidebar/>
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-brand-border bg-brand-surface">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl border border-brand-border text-brand-muted">
            <Menu size={18}/>
          </button>
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-amber-400"/>
            <span className="text-white font-bold text-sm font-display">Admin Portal</span>
          </div>
          {/* Logout reachable directly on mobile, without opening the menu */}
          <button
            onClick={handleLogout}
            aria-label="Log out"
            className="p-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={16}/>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Routes>
            <Route index           element={<AdminDashboard/>}    />
            <Route path="today"     element={<TodayView/>}         />
            <Route path="scan"     element={<Suspense fallback={<div className="p-6 text-brand-muted text-sm">Loading scanner…</div>}><QrScanner/></Suspense>} />
            <Route path="bookings" element={<BookingManagement/>} />
            <Route path="events"   element={<EventManagement/>}   />
            <Route path="machines" element={<MachineManagement/>} />
            <Route path="crew"     element={<CrewManagement/>}    />
            <Route path="pricing"  element={<PricingManagement/>} />
            <Route path="expenses" element={<ExpenseManagement/>} />
            <Route path="pnl"      element={<PnLDashboard/>}      />
            <Route path="analytics" element={<Analytics/>}        />
            <Route path="inquiries" element={<InquiryManagement/>} />
            <Route path="reviews"   element={<ReviewManagement/>}  />
            <Route path="gallery"   element={<GalleryManagement/>} />
            <Route path="backup"    element={<DataBackup/>}        />
          </Routes>
        </main>
      </div>
    </div>
  )
}
