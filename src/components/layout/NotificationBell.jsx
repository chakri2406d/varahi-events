import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { listenUserNotifications, markNotificationRead, markAllNotificationsRead } from '../../firebase/firestore'

// Free, self-hosted notifications — reads the `notifications` collection the
// admin screens write to when a booking status changes. No paid service.
export default function NotificationBell() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [open,  setOpen]  = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!user) { setItems([]); return }
    const unsub = listenUserNotifications(user.uid, setItems)
    return unsub
  }, [user])

  // Close when clicking outside the panel
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  if (!user) return null

  const unread = items.filter(n => !n.read).length

  const handleOpen = () => setOpen(v => !v)

  const handleReadAll = async () => {
    try { await markAllNotificationsRead(user.uid) } catch { /* non-critical */ }
  }

  const timeAgo = (ts) => {
    const ms = ts?.seconds ? ts.seconds * 1000 : null
    if (!ms) return ''
    const mins = Math.floor((Date.now() - ms) / 60000)
    if (mins < 1)  return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24)  return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative p-2 rounded-xl transition-colors"
        style={{ color: '#9C7A82' }}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
            style={{ background: '#8B1A2C', color: '#fff', border: '1px solid #1A0810' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="absolute right-0 mt-2 w-80 max-w-[85vw] rounded-2xl overflow-hidden z-50"
            style={{
              background: '#1A0810',
              border: '1px solid rgba(61,30,40,0.9)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid rgba(61,30,40,0.8)' }}
            >
              <span className="text-white text-sm font-semibold">Notifications</span>
              {unread > 0 && (
                <button
                  onClick={handleReadAll}
                  className="text-xs flex items-center gap-1 hover:underline"
                  style={{ color: '#E8B86D' }}
                >
                  <Check size={12} /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-center text-xs py-8" style={{ color: '#9C7A82' }}>
                  No notifications yet
                </p>
              ) : (
                items.map(n => (
                  <button
                    key={n.id}
                    onClick={() => { if (!n.read) markNotificationRead(n.id).catch(() => {}) }}
                    className="w-full text-left px-4 py-3 transition-colors"
                    style={{
                      borderBottom: '1px solid rgba(61,30,40,0.5)',
                      background: n.read ? 'transparent' : 'rgba(201,147,58,0.06)',
                    }}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && (
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                          style={{ background: '#C9933A' }} />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{n.title}</p>
                        {n.body && (
                          <p className="text-xs mt-0.5" style={{ color: '#9C7A82' }}>{n.body}</p>
                        )}
                        <p className="text-[10px] mt-1" style={{ color: '#6b5158' }}>
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
