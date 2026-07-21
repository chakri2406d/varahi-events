import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { BUSINESS_INFO } from '../utils/constants'

const FAQS = [
  {
    q: 'How do I book equipment or a full event setup?',
    a: `Browse our Equipment or Events pages, pick what you need, and submit a booking request through the site. You can also reach us directly on WhatsApp or call ${BUSINESS_INFO.phone} / ${BUSINESS_INFO.phone2} and we'll set it up for you.`,
  },
  {
    q: 'Is an advance payment required to confirm my booking?',
    a: 'Yes — a minimum advance of 40% of the total booking amount is required to lock in your date and equipment. The remaining balance is due before the event starts.',
  },
  {
    q: 'What payment methods do you accept?',
    a: `We accept UPI (${BUSINESS_INFO.upiId}) and cash. For UPI payments, just upload a screenshot of the transaction when prompted so we can verify it quickly.`,
  },
  {
    q: 'What happens after I submit a booking request?',
    a: 'Your request goes to our admin team for verification — we check equipment availability and confirm your payment. Once verified, your booking status changes to "Confirmed" and you\'ll be notified.',
  },
  {
    q: 'What are the Start/End QR codes I see in my dashboard?',
    a: 'Every confirmed booking gets a unique Start QR and End QR code in your customer dashboard. Our crew scans the Start QR when they begin setup/execution at your event, and the End QR once the event wraps up — this keeps an accurate, transparent timeline of service delivery.',
  },
  {
    q: 'What is your cancellation policy?',
    a: 'Cancellations made more than 48 hours before the event are free. Cancelling within 48 hours incurs a 50% charge on the advance paid. Cancellations within 24 hours of the event are non-refundable.',
  },
  {
    q: 'Do you handle delivery and transport of equipment?',
    a: 'Yes, transport is available as an add-on — our team delivers, sets up, and picks up the equipment after the event. You can select this while booking, or ask us to include it in your quote.',
  },
  {
    q: 'What add-ons can I choose from?',
    a: 'Along with your core equipment, you can add Transport, Generator (power backup), an Operator (trained staff on-site), Lighting Package, Smoke Machine, and Paper Setup (CO2 paper & confetti blasters) — pick whatever your event needs.',
  },
  {
    q: 'Is an operator included with the equipment rental?',
    a: 'A trained operator is not included by default with a plain equipment rental — it\'s available as an "Operator" add-on. Full-service event packages typically include our crew to run the equipment for you.',
  },
  {
    q: 'Who is responsible if the equipment gets damaged?',
    a: 'The client is responsible for the safe use of the equipment during the event. Any damage to Varahi Events property or machinery during your event will be charged to you, as outlined in our Terms & Conditions.',
  },
  {
    q: 'Which areas do you service?',
    a: `We are based in ${BUSINESS_INFO.city} and primarily serve events across Hyderabad and Telangana. For events outside this area, get in touch and we'll let you know if we can accommodate it (transport charges may apply).`,
  },
  {
    q: 'How do I get an invoice for my booking?',
    a: `Once your booking is confirmed, an invoice is generated automatically and available from your customer dashboard as a downloadable PDF. Need a copy sent separately? Email us at ${BUSINESS_INFO.email} or message us on WhatsApp.`,
  },
]

function FAQItem({ item, isOpen, onToggle }) {
  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 p-5 text-left"
      >
        <span className="text-white font-medium text-sm sm:text-base">{item.q}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="flex-shrink-0"
          style={{ color: '#C9933A' }}
        >
          <ChevronDown size={20} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <p className="px-5 pb-5 text-sm leading-relaxed" style={{ color: '#9C7A82' }}>
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0)

  const toggle = (i) => setOpenIndex((cur) => (cur === i ? -1 : i))

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <span className="badge-violet mb-3 inline-block">Help Center</span>
          <h1 className="section-title mb-2">Frequently Asked <span className="text-gradient-v">Questions</span></h1>
          <p className="section-subtitle">Everything you need to know about booking equipment and events with {BUSINESS_INFO.name}.</p>
        </motion.div>

        <div className="space-y-3">
          {FAQS.map((item, i) => (
            <motion.div
              key={item.q}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <FAQItem item={item} isOpen={openIndex === i} onToggle={() => toggle(i)} />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 mt-8 text-center"
        >
          <p className="text-white font-medium mb-1">Still have questions?</p>
          <p className="text-sm mb-4" style={{ color: '#9C7A82' }}>We're happy to help — reach out anytime.</p>
          <a
            href={`https://wa.me/${BUSINESS_INFO.whatsapp}?text=Hi! I have a question about booking equipment.`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Chat on WhatsApp
          </a>
        </motion.div>

      </div>
    </div>
  )
}
