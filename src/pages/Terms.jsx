import { motion } from 'framer-motion'
import { Phone, Mail, MapPin } from 'lucide-react'
import { BUSINESS_INFO } from '../utils/constants'

const SECTIONS = [
  {
    title: 'Booking Confirmation',
    body: [
      'All bookings are confirmed only after we receive the booking amount agreed upon at the time of quotation — a minimum advance of 40% of the total booking value.',
      'Final confirmation of your date, equipment, and services will always be communicated to you in writing, via email, WhatsApp, or a signed agreement, once your advance payment has been verified by our team.',
      'Until this confirmation is sent, your requested date and equipment are not guaranteed and may be allotted to another client.',
    ],
  },
  {
    title: 'Payment Terms',
    body: [
      'Full payment must be completed before the event starts. We accept payment via UPI or cash; for UPI payments, a screenshot of the transaction should be shared so we can verify and record it against your booking.',
      'Any delay in completing the balance payment may result in postponement or cancellation of services without prior notice, and Varahi Events will not be liable for any resulting inconvenience or losses to the client.',
      'Invoices are generated once a booking is confirmed and can be downloaded from your customer dashboard.',
    ],
  },
  {
    title: 'Changes to Event Plan',
    body: [
      'Any changes to the event setup, theme, equipment, or scope of services must be communicated to us at least 5 days before the event date.',
      'We will do our best to accommodate last-minute changes, but additional costs may apply, and availability of extra equipment or crew is not guaranteed on short notice.',
    ],
  },
  {
    title: 'Responsibilities & Liabilities',
    body: [
      'Varahi Events is not responsible for delays, disruptions, or cancellations caused by factors beyond our reasonable control, including but not limited to natural disasters, strikes, power outages, or government restrictions.',
      'The client is responsible for providing the necessary permissions, venue access, electricity/power points, and safety arrangements required for our equipment and crew to operate safely at the venue.',
      'Any damage caused to Varahi Events equipment, machinery, or property during the event — whether by the client, their guests, or venue staff — will be assessed and charged to the client.',
    ],
  },
  {
    title: 'Media & Promotion',
    body: [
      'Varahi Events reserves the right to capture photographs and videos during the event for use in our portfolio, website, and social media promotion.',
      'If you would prefer that your event not be used for promotional purposes, please let us know in writing before the event and we will honour that request.',
    ],
  },
  {
    title: 'Acceptance',
    body: [
      'By confirming a booking with Varahi Events — whether through our website, WhatsApp, or in person — the client acknowledges that they have read and agree to the Terms & Conditions on this page, which are also printed on every invoice we issue.',
    ],
  },
]

export default function Terms() {
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <span className="badge-violet mb-3 inline-block">Legal</span>
          <h1 className="section-title mb-2">Terms & <span className="text-gradient-v">Conditions</span></h1>
          <p className="section-subtitle">Please read these terms carefully before booking equipment or services with us.</p>
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
              <h2 className="text-white font-semibold text-lg mb-3 flex items-center gap-2">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: 'rgba(201,147,58,0.12)', border: '1px solid rgba(201,147,58,0.3)', color: '#E8B86D' }}
                >
                  {i + 1}
                </span>
                {section.title}
              </h2>
              <div className="space-y-2.5 pl-9">
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
          <h3 className="text-white font-semibold mb-4">Questions about these Terms?</h3>
          <div className="space-y-3">
            <p className="flex items-center gap-3 text-sm" style={{ color: '#9C7A82' }}>
              <Phone size={15} style={{ color: '#C9933A', flexShrink: 0 }} />
              {BUSINESS_INFO.phone} / {BUSINESS_INFO.phone2}
            </p>
            <p className="flex items-center gap-3 text-sm" style={{ color: '#9C7A82' }}>
              <Mail size={15} style={{ color: '#C9933A', flexShrink: 0 }} />
              {BUSINESS_INFO.email}
            </p>
            <p className="flex items-center gap-3 text-sm" style={{ color: '#9C7A82' }}>
              <MapPin size={15} style={{ color: '#C9933A', flexShrink: 0 }} />
              {BUSINESS_INFO.city}
            </p>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
