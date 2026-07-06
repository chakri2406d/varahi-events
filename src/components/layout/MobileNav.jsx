import { NavLink } from 'react-router-dom'
import { Home, Calendar, Zap, ImageIcon, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const ITEMS = [
  { to: '/',          icon: Home,      label: 'Home'    },
  { to: '/events',    icon: Zap,       label: 'Events'  },
  { to: '/equipment', icon: Calendar,  label: 'Book'    },
  { to: '/gallery',   icon: ImageIcon, label: 'Gallery' },
  { to: '/dashboard', icon: User,      label: 'Me'      },
]

export default function MobileNav() {
  const { user } = useAuth()

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t safe-bottom"
      style={{
        background: 'rgba(34,13,21,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'rgba(46,26,32,0.9)',
      }}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to === '/dashboard' && !user ? '/login' : to}
            end={to === '/'}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[52px]"
            style={({ isActive }) => ({
              color: isActive ? '#C9933A' : '#9C7A82',
            })}
          >
            {({ isActive }) => (
              <>
                <div
                  className="p-1.5 rounded-lg transition-all duration-200"
                  style={isActive ? {
                    background: 'rgba(201,147,58,0.15)',
                    boxShadow: '0 0 10px rgba(201,147,58,0.2)',
                  } : {}}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}