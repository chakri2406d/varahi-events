import { motion } from 'framer-motion'
import { Phone, Mail } from 'lucide-react'
import { BUSINESS_INFO } from '../utils/constants'

const SECTIONS = [
  {
    title: 'What information we collect',
    body: [
      'When you book equipment or an event with us, we collect the details you provide directly: your name, email address, phone number, event date and location, and any message or requirements you share.',
      'For payments made via UPI, we ask you to upload a screenshot of the transaction along with a payment reference, so we can verify that the payment went through.',
    ],
  },
  {
    title: 'Why we collect it',
    body: [
      'We use this information solely to process and fulfil your booking — to confirm availability, coordinate delivery and crew, generate your invoice, and contact you about your event.',
      'We do not use your information for anything beyond running your booking and, where relevant, following up with you about future events.',
    ],
  },
  {
    title: 'Where your data is stored',
    body: [
      'Your booking and account data is stored securely using Google Firebase (Firestore database and Firebase Authentication), a cloud platform operated by Google.',
      'Payment screenshots you upload are stored only to verify that a payment was made against your booking — they are kept as a record of the transaction, not shared or used for any other purpose.',
    ],
  },
  {
    title: 'We do not sell your data',
    body: [
      'Varahi Events does not sell, rent, or trade your personal information to any third party. Your details are used internally by our team to manage your booking.',
    ],
  },
  {
    title: 'Photos & videos at events',
    body: [
      'As noted in our Terms & Conditions, we may take photographs and videos at your event for use in our portfolio, website, and social media promotion.',
      'If you\'d prefer your event isn\'t used this way, simply let us know in writing before the event and we will honour that request.',
    ],
  },
  {
    title: 'Cookies & local storage',
    body: [
      'Our website uses your browser\'s local storage only to keep you signed in (your authentication session) so you don\'t have to log in again on every visit. We do not use tracking or advertising cookies.',
    ],
  },
  {
    title: 'Requesting deletion of your data',
    body: [
      `You can request that we delete your personal information at any time by emailing us at ${BUSINESS_INFO.email} or messaging us on WhatsApp at ${BUSINESS_INFO.phone}. We'll action your request as soon as we reasonably can, keeping in mind any records we may need to retain for completed bookings or invoicing.`,
    ],
  },
]

export default function Privacy() {
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <span className="badge-violet mb-3 inline-block">Legal</span>
          <h1 className="section-title mb-2">Privacy <span className="text-gradient-v">Policy</span></h1>
          <p className="section-subtitle">A plain-English explanation of what data we collect and how we use it.</p>
          <p className="text-xs mt-3" style={{ color: '#9C7A82' }}>Last updated: 21 July 2026</p>
        </motion.div>

        <div className="space-y-4">
          {SECTIONS.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-6"
            >
              <h2 className="text-white font-semibold text-lg mb-3">{section.title}</h2>
              <div className="space-y-2.5">
                {section.body.map((p, j) => (
                  <p key={j} className="text-sm leading-relaxed" style={{ color: '#9C7A82' }}>{p}</p>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6 mt-8"
        >
          <h3 className="text-white font-semibold mb-4">Contact us about your data</h3>
          <div className="space-y-3">
            <p className="flex items-center gap-3 text-sm" style={{ color: '#9C7A82' }}>
              <Phone size={15} style={{ color: '#C9933A', flexShrink: 0 }} />
              {BUSINESS_INFO.phone} / {BUSINESS_INFO.phone2}
            </p>
            <p className="flex items-center gap-3 text-sm" style={{ color: '#9C7A82' }}>
              <Mail size={15} style={{ color: '#C9933A', flexShrink: 0 }} />
              {BUSINESS_INFO.email}
            </p>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
