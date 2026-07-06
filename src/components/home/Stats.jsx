import { useInView } from 'react-intersection-observer'
import CountUp from 'react-countup'
import { motion } from 'framer-motion'

const STATS = [
  { num: 500, suffix: '+',  label: 'Total Events',     icon: '🎪', color: 'from-rose-900 to-red-800' },
  { num: 400, suffix: '+',  label: 'Happy Clients',    icon: '😊', color: 'from-yellow-800 to-amber-700' },
  { num: 50,  suffix: 'K+', label: 'Audience Reached', icon: '🎤', color: 'from-pink-900 to-rose-800' },
]

function StatCard({ num, suffix, label, icon, color, delay }) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.3 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card p-6 text-center group cursor-default"
    >
      {/* Icon with gradient bg */}
      <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>

      {/* Counter */}
      <div className="font-display font-bold text-3xl sm:text-4xl text-white mb-1">
        {inView ? (
          <CountUp end={num} duration={2.5} suffix={suffix} enableScrollSpy={false} />
        ) : (
          <span>0{suffix}</span>
        )}
      </div>

      <p className="text-brand-muted text-sm font-medium">{label}</p>

      {/* Bottom glow on hover */}
      <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-px bg-gradient-to-r ${color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
    </motion.div>
  )
}

export default function Stats() {
  const [titleRef, titleInView] = useInView({ triggerOnce: true, threshold: 0.3 })

  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-radial from-brand-violet/8 via-transparent to-transparent"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(124,58,237,0.08) 0%, transparent 70%)' }}
      />

      <div className="max-w-7xl mx-auto px-4">
        {/* Title */}
        <motion.div
          ref={titleRef}
          initial={{ opacity: 0, y: 20 }}
          animate={titleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <span className="badge-violet mb-4 inline-block">Our Impact</span>
          <h2 className="section-title">
            Numbers That
            <span className="text-gradient-v"> Speak</span>
          </h2>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4 sm:gap-6">
          {STATS.map((stat, i) => (
            <StatCard key={stat.label} {...stat} delay={i * 0.12} />
          ))}
        </div>
      </div>
    </section>
  )
}
