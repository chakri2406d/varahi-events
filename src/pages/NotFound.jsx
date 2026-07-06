import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Zap } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="orb w-96 h-96 bg-brand-violet/15 top-0 left-0 -translate-x-1/2"/>
      <div className="orb w-64 h-64 bg-brand-pink/10 bottom-0 right-0 translate-x-1/2"/>

      <motion.div
        initial={{ opacity:0, y:30 }}
        animate={{ opacity:1, y:0 }}
        transition={{ duration:0.7, ease:[0.22,1,0.36,1] }}
        className="text-center relative z-10 max-w-md"
      >
        <motion.div
          className="font-display font-bold text-[120px] sm:text-[160px] leading-none text-gradient-v select-none"
          animate={{ y:[0,-10,0] }}
          transition={{ duration:4, repeat:Infinity, ease:'easeInOut' }}
        >
          404
        </motion.div>

        <h2 className="font-display font-bold text-2xl text-white mb-3">Page Not Found</h2>
        <p className="text-brand-muted text-base mb-8">
          Looks like this event already happened — or never existed. Let's get you back on stage.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/" className="btn-primary">
            <Home size={16}/> Go Home
          </Link>
          <Link to="/equipment" className="btn-secondary">
            <Zap size={16}/> Book Equipment
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
