import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X } from 'lucide-react'

const DISMISS_KEY = 'varahi_install_dismissed'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const alreadyDismissed = typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === 'true'
  const isStandalone = typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches

  const shouldShow = !!deferredPrompt && !dismissed && !alreadyDismissed && !isStandalone

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    try {
      await deferredPrompt.userChoice
    } catch {
      // no-op — user may have dismissed the native prompt
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true')
    setDismissed(true)
  }

  if (!shouldShow) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed left-4 right-4 bottom-20 lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-sm z-50"
      >
        <div
          className="glass-card p-4 flex items-center gap-3"
          style={{ background: 'rgba(13,5,8,0.95)', border: '1px solid rgba(201,147,58,0.35)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(201,147,58,0.12)', border: '1px solid rgba(201,147,58,0.3)' }}
          >
            <Download size={18} style={{ color: '#C9933A' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium leading-tight">Install Varahi Events</p>
            <p className="text-xs mt-0.5" style={{ color: '#9C7A82' }}>Add the app to your home screen for quick access.</p>
          </div>
          <button
            onClick={handleInstall}
            className="btn-gold px-3 py-2 text-xs flex-shrink-0"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="flex-shrink-0 p-1 rounded-lg transition-colors"
            style={{ color: '#9C7A82' }}
          >
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
