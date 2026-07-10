import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Zap, Phone } from 'lucide-react'
import { BUSINESS_INFO } from '../../utils/constants'

export default function CallToAction() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.3 })

  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/20 via-brand-surface to-brand-pink/10" />
      <div className="absolute inset-0 bg-hero-glow opacity-50" />

      {/* Decorative orbs */}
      <div className="orb w-64 h-64 bg-brand-violet/25 top-0 left-1/4" />
      <div className="orb w-48 h-48 bg-brand-pink/20 bottom-0 right-1/4" style={{ animationDelay: '1.5s' }} />

      <div className="relative max-w-4xl mx-auto px-4 text-center">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="badge-violet mb-5 inline-block">Ready to Create Magic?</span>

          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
            Let's Make Your Event
            <br />
            <span className="text-gradient-vp">Unforgettable</span>
          </h2>

          <p className="text-brand-muted text-base sm:text-lg mb-8 max-w-xl mx-auto">
            From CO₂ blasts to full-stage production — Varahi Events has everything to transform your event into an experience people will talk about for years.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/equipment" className="btn-primary text-base px-8 py-4 w-full sm:w-auto justify-center">
              <Zap size={18} />
              Book Equipment Now
            </Link>
            <a
              href={`tel:${BUSINESS_INFO.phone.replace(/\s/g,'')}`}
              className="btn-secondary text-base px-8 py-4 w-full sm:w-auto justify-center"
            >
              <Phone size={18} />
              Call Us Now
            </a>
          </div>

          {/* WhatsApp CTA */}
          <div className="mt-6">
            <a
              href={`https://wa.me/${BUSINESS_INFO.whatsapp}?text=Hi! I want to book equipment for my event.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-green-400 text-sm font-medium hover:text-green-300 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Chat on WhatsApp
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
