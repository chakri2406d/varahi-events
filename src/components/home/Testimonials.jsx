import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Star } from 'lucide-react'
import { getApprovedReviews } from '../../firebase/firestore'

function ReviewCard({ review, delay }) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.2 })
  const rating = Math.max(0, Math.min(5, Number(review.rating) || 0))

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card p-6 flex flex-col gap-4"
    >
      {/* Star rating — filled gold for earned stars, dim outline for the rest */}
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={16}
            className={i < rating ? 'text-brand-gold fill-brand-gold' : 'text-brand-border'}
          />
        ))}
      </div>

      <p className="text-brand-muted text-sm leading-relaxed flex-1">"{review.comment}"</p>

      <div className="pt-3 border-t border-brand-border flex items-center justify-between gap-3">
        <p className="text-white font-semibold text-sm">{review.customerName}</p>
        {review.eventType && (
          <span className="text-[10px] px-2 py-0.5 rounded-full capitalize text-brand-goldL bg-brand-gold/10 border border-brand-gold/25 flex-shrink-0">
            {review.eventType}
          </span>
        )}
      </div>
    </motion.div>
  )
}

export default function Testimonials() {
  const [reviews, setReviews] = useState([])
  const [loaded, setLoaded]   = useState(false)
  const [titleRef, titleInView] = useInView({ triggerOnce: true, threshold: 0.3 })

  useEffect(() => {
    getApprovedReviews()
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setLoaded(true))
  }, [])

  // Never show an empty section or fake placeholders — while still loading,
  // or once loaded with zero approved reviews, this section simply isn't there.
  if (!loaded || reviews.length === 0) return null

  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          ref={titleRef}
          initial={{ opacity: 0, y: 20 }}
          animate={titleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <span className="badge-gold mb-4 inline-block">Client Love</span>
          <h2 className="section-title">
            What Our Clients
            <span className="text-gradient-v"> Say</span>
          </h2>
          <p className="section-subtitle mt-3 max-w-xl mx-auto">
            Real feedback from real events we've helped bring to life.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {reviews.map((review, i) => (
            <ReviewCard key={review.id} review={review} delay={i * 0.08} />
          ))}
        </div>
      </div>
    </section>
  )
}
