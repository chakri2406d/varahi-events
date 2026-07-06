import { motion } from 'framer-motion'

export default function LoadingScreen({ progress = 0 }) {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #1A0508 0%, #0D0305 50%, #1A0A00 100%)' }}>

      {/* Outer glow ring */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 180, height: 180, background: 'radial-gradient(circle, rgba(201,147,58,0.15) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative mb-8"
      >
        <img
          src="/varahi_events.jpg"
          alt="Varahi Events"
          style={{
            width: 100,
            height: 100,
            borderRadius: '20px',
            objectFit: 'cover',
            boxShadow: '0 0 40px rgba(201,147,58,0.5), 0 0 80px rgba(139,26,44,0.3)',
          }}
        />
      </motion.div>

      {/* Brand name */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-center mb-10"
      >
        <p className="font-display font-bold text-2xl tracking-widest mb-1"
          style={{ background: 'linear-gradient(135deg, #C9933A, #F0D9A8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          VARAHI EVENTS
        </p>
        <p className="text-xs tracking-[0.4em] uppercase" style={{ color: '#9C7A82' }}>
          Premium Event Managament
        </p>
      </motion.div>

      {/* Progress bar */}
      <div className="w-48 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(46,26,32,0.8)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #8B1A2C, #C9933A, #F0D9A8)' }}
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Percentage */}
      <motion.p
        className="mt-3 text-xs font-mono"
        style={{ color: '#9C7A82' }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {progress}%
      </motion.p>
    </div>
  )
}