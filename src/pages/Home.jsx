import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import LoadingScreen from '../components/layout/LoadingScreen'
import Hero        from '../components/home/Hero'
import Stats       from '../components/home/Stats'
import Works       from '../components/home/Works'
import FutureEvents from '../components/home/FutureEvents'
import CallToAction from '../components/home/CallToAction'

export default function Home() {
  const [loading, setLoading] = useState(true)

  // Show loading screen only on first visit per session
  useEffect(() => {
    const visited = sessionStorage.getItem('ve_visited')
    if (visited) { setLoading(false); return }
    sessionStorage.setItem('ve_visited', '1')
  }, [])

  if (loading) return <LoadingScreen onComplete={() => setLoading(false)} />

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="page-enter"
    >
      <Hero />
      <Stats />
      <Works />
      <FutureEvents />
      <CallToAction />
    </motion.div>
  )
}
