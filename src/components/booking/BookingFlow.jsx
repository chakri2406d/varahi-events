import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Calendar, MapPin, FileText, Zap, CheckCircle, Phone, Clock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { createBooking, getDateAvailability } from '../../firebase/firestore'
import { ADDONS } from '../../utils/constants'
import { generateBookingId } from '../../utils/dateUtils'
import PaymentSection from './PaymentSection'
import toast from 'react-hot-toast'

const STEPS = ['Details', 'Add-ons', 'Request', 'Payment']

export default function BookingFlow({ selectedMachines, onBack, initialDate }) {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [step,        setStep]        = useState(0)
  const [requesting,  setRequesting]  = useState(false)
  const [bookingId,   setBookingId]   = useState(null)
  const [form, setForm] = useState({
    eventDate:     initialDate || '',
    eventEndDate:  '',
    eventTime:     '',
    setupTime:     '',
    eventLocation: '',
    customerPhone: '',
    notes:         '',
    addons:        [],
  })

  const machines = Object.values(selectedMachines)

  // ── Live quote ────────────────────────────────────────────────────────────
  // Only machines with a rate can be priced; anything without one is quoted by
  // the admin later, so we flag the estimate as partial.
  const priced      = machines.filter(m => m.rate != null && m.rate !== '')
  const quoteTotal  = priced.reduce((s, m) => s + Number(m.rate) * Number(m.qty || 1), 0)
  const hasUnpriced = priced.length !== machines.length

  // ── Date availability ─────────────────────────────────────────────────────
  const [availability, setAvailability] = useState(null)
  const [checkingDate, setCheckingDate] = useState(false)

  useEffect(() => {
    if (!form.eventDate) { setAvailability(null); return }
    let cancelled = false
    setCheckingDate(true)
    getDateAvailability(form.eventDate)
      .then(rows => {
        if (cancelled) return
        const byId = new Map(rows.map(r => [r.id, r]))
        // Which of the customer's picks can't be met on this date?
        const short = machines
          .map(m => {
            const info = byId.get(m.id)
            if (!info) return null
            const want = Number(m.qty || 1)
            return want > info.free ? { name: m.name, want, free: info.free } : null
          })
          .filter(Boolean)
        setAvailability(short)
      })
      .catch(() => { if (!cancelled) setAvailability(null) })
      .finally(() => { if (!cancelled) setCheckingDate(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.eventDate])

  // ── Step 0: Event details ──────────────────────────────────────────────────
  const renderDetails = () => (
    <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <h3 className="text-white font-semibold text-lg mb-5">Event Details</h3>

      {/* Selected machines summary */}
      <div className="mb-5 p-4 rounded-xl bg-brand-bg border border-brand-border">
        <p className="text-xs text-brand-muted uppercase tracking-wider mb-3">Selected Equipment</p>
        {machines.map(m => (
          <div key={m.id} className="flex items-center justify-between py-1.5">
            <span className="text-white text-sm">{m.name}</span>
            <div className="flex items-center gap-2">
              <span className="badge-violet text-xs">×{m.qty}</span>
              <span className="text-xs" style={{ color:'#C9933A', minWidth:70, textAlign:'right' }}>
                {m.rate != null && m.rate !== ''
                  ? `₹${(Number(m.rate) * Number(m.qty || 1)).toLocaleString('en-IN')}`
                  : 'On request'}
              </span>
            </div>
          </div>
        ))}

        {/* Estimated total */}
        <div className="mt-3 pt-3 flex items-center justify-between"
          style={{ borderTop:'1px solid rgba(61,30,40,0.8)' }}>
          <span className="text-sm font-semibold text-white">Estimated Total</span>
          <span className="font-bold" style={{ color:'#E8B86D' }}>
            ₹{quoteTotal.toLocaleString('en-IN')}
          </span>
        </div>
        <p className="text-[11px] mt-1" style={{ color:'#9C7A82' }}>
          {hasUnpriced
            ? 'Some items are priced on request — we\'ll confirm the final amount.'
            : 'Indicative estimate. We\'ll confirm the final amount before payment.'}
        </p>
      </div>

      {/* Availability warning for the chosen date */}
      {form.eventDate && availability?.length > 0 && (
        <div className="mb-4 p-3 rounded-xl"
          style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.3)' }}>
          <p className="text-xs font-semibold mb-1" style={{ color:'#fca5a5' }}>
            Limited availability on this date
          </p>
          {availability.map(a => (
            <p key={a.name} className="text-[11px]" style={{ color:'#fca5a5' }}>
              {a.name}: you asked for {a.want}, only {a.free} free
            </p>
          ))}
          <p className="text-[11px] mt-1" style={{ color:'#9C7A82' }}>
            You can still send the request — we'll confirm or suggest another date.
          </p>
        </div>
      )}
      {checkingDate && (
        <p className="text-[11px] mb-3" style={{ color:'#9C7A82' }}>Checking availability…</p>
      )}

      {/* Date */}
      <div className="mb-4">
        <label className="label-dark"><Calendar size={12} className="inline mr-1" />Event Date</label>
        <input
          type="date"
          className="input-dark"
          min={new Date().toISOString().split('T')[0]}
          value={form.eventDate}
          onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))}
        />
      </div>

      {/* Location */}
      <div className="mb-4">
        <label className="label-dark"><MapPin size={12} className="inline mr-1" />Event Location</label>
        <input
          type="text"
          className="input-dark"
          placeholder="e.g. Hyderabad, Banquet Hall Name"
          value={form.eventLocation}
          onChange={e => setForm(f => ({ ...f, eventLocation: e.target.value }))}
        />
      </div>

      {/* Optional end date for multi-day events (e.g. a 3-day wedding) */}
      <div className="mb-4">
        <label className="label-dark">
          <Calendar size={12} className="inline mr-1" />End Date (for multi-day events)
        </label>
        <input
          type="date"
          className="input-dark"
          min={form.eventDate || undefined}
          value={form.eventEndDate}
          onChange={e => setForm(f => ({ ...f, eventEndDate: e.target.value }))}
        />
        <p className="text-xs mt-1" style={{ color: '#9C7A82' }}>
          Leave blank for a single-day event. Equipment is reserved for every day in the range.
        </p>
      </div>

      {/* Event + setup time — critical for scheduling crew and transport */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="label-dark"><Clock size={12} className="inline mr-1" />Event Start Time</label>
          <input
            type="time"
            className="input-dark"
            value={form.eventTime}
            onChange={e => setForm(f => ({ ...f, eventTime: e.target.value }))}
          />
        </div>
        <div>
          <label className="label-dark"><Clock size={12} className="inline mr-1" />Setup By</label>
          <input
            type="time"
            className="input-dark"
            value={form.setupTime}
            onChange={e => setForm(f => ({ ...f, setupTime: e.target.value }))}
          />
          <p className="text-xs mt-1" style={{ color: '#9C7A82' }}>Optional</p>
        </div>
      </div>

      {/* Contact phone */}
      <div className="mb-4">
        <label className="label-dark"><Phone size={12} className="inline mr-1" />Contact Number</label>
        <input
          type="tel"
          className="input-dark"
          placeholder="e.g. +91 98765 43210"
          value={form.customerPhone}
          onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
        />
        <p className="text-xs mt-1" style={{ color: '#9C7A82' }}>
          We'll call you on this number to confirm setup details.
        </p>
      </div>

      {/* Notes */}
      <div className="mb-5">
        <label className="label-dark"><FileText size={12} className="inline mr-1" />Additional Notes</label>
        <textarea
          className="input-dark resize-none"
          rows={3}
          placeholder="Any special requirements, timing, access details..."
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
        />
      </div>

      <button
        onClick={() => {
          if (!form.eventDate)     return toast.error('Please select an event date')
          if (!form.eventTime)     return toast.error('Please select the event start time')
          if (form.eventEndDate && form.eventEndDate < form.eventDate)
            return toast.error('End date cannot be before the start date')
          if (!form.eventLocation) return toast.error('Please enter event location')
          if (!/^[+\d][\d\s-]{8,}$/.test(form.customerPhone.trim()))
            return toast.error('Please enter a valid contact number')
          setStep(1)
        }}
        className="btn-primary w-full justify-center"
      >
        Continue to Add-ons →
      </button>
    </motion.div>
  )

  // ── Step 1: Add-ons ────────────────────────────────────────────────────────
  const renderAddons = () => (
    <motion.div key="addons" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <h3 className="text-white font-semibold text-lg mb-2">Select Add-ons</h3>
      <p className="text-brand-muted text-sm mb-5">Optional services to enhance your event setup</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {ADDONS.map(addon => {
          const active = form.addons.includes(addon.id)
          return (
            <button
              key={addon.id}
              onClick={() => setForm(f => ({
                ...f,
                addons: active
                  ? f.addons.filter(a => a !== addon.id)
                  : [...f.addons, addon.id],
              }))}
              className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                active
                  ? 'border-brand-violet/60 bg-brand-violet/15 shadow-glow-v'
                  : 'border-brand-border bg-brand-bg hover:border-brand-violet/30'
              }`}
            >
              <div className="text-2xl mb-2">{addon.icon}</div>
              <p className={`font-semibold text-sm ${active ? 'text-white' : 'text-brand-muted'}`}>{addon.label}</p>
              <p className="text-brand-muted text-xs mt-0.5">{addon.desc}</p>
              {active && <CheckCircle size={14} className="text-brand-violet mt-2" />}
            </button>
          )
        })}
      </div>

      <div className="flex gap-3">
        <button onClick={() => setStep(0)} className="btn-secondary flex-1 justify-center">← Back</button>
        <button onClick={() => setStep(2)} className="btn-primary flex-1 justify-center">Request Booking →</button>
      </div>
    </motion.div>
  )

  // ── Step 2: Requesting animation ──────────────────────────────────────────
  const handleRequest = async () => {
    if (!user) { toast.error('Please login first'); return }
    setRequesting(true)

    try {
      // Simulate 2.5s cinematic loading
      await new Promise(r => setTimeout(r, 2500))

      const bid = generateBookingId()
      const id  = await createBooking({
        bookingId:     bid,
        userId:        user.uid,
        customerName:  user.displayName || '',
        customerEmail: user.email || '',
        customerPhone: form.customerPhone.trim(),
        machines:      machines.map(m => ({
          id:    m.id,
          name:  m.name,
          qty:   m.qty,
          // Snapshot the rate so a later price change doesn't rewrite history
          price: m.rate != null && m.rate !== '' ? Number(m.rate) : null,
        })),
        estimatedTotal: quoteTotal || null,
        addons:        form.addons,
        eventDate:     form.eventDate,
        // Only store an end date when it's genuinely multi-day
        eventEndDate:  form.eventEndDate && form.eventEndDate > form.eventDate ? form.eventEndDate : '',
        eventTime:     form.eventTime,
        setupTime:     form.setupTime,
        eventLocation: form.eventLocation,
        notes:         form.notes,
        totalAmount:   null, // set by admin
        paymentVerified: false,
      })

      setBookingId(id)
      setStep(3)
    } catch (err) {
      toast.error('Failed to create booking. Try again.')
      setRequesting(false)
    }
  }

  const renderRequesting = () => (
    <motion.div
      key="requesting"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-8"
    >
      {!requesting ? (
        <>
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-brand-violet/20 border border-brand-violet/30 flex items-center justify-center">
            <Zap size={32} className="text-brand-violet" />
          </div>
          <h3 className="text-white font-bold text-xl mb-2">Almost There!</h3>
          <p className="text-brand-muted text-sm mb-2">
            <strong className="text-white">{form.eventDate}</strong> · {form.eventLocation}
          </p>
          <p className="text-brand-muted text-xs mb-6 max-w-xs mx-auto">
            Clicking below will temporarily hold this slot for 30 minutes while you complete payment.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-secondary flex-1 justify-center">← Back</button>
            <button onClick={handleRequest}    className="btn-primary  flex-1 justify-center">
              <Zap size={16} />
              Request Slot
            </button>
          </div>
        </>
      ) : (
        <div className="py-4">
          {/* Cinematic requesting animation */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-brand-violet/30"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-2 rounded-full border-2 border-brand-pink/40"
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="w-10 h-10 border-2 border-brand-violet border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          </div>

          <motion.p
            className="text-white font-semibold text-lg mb-1"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Requesting Slot Availability…
          </motion.p>
          <p className="text-brand-muted text-sm">Checking dates · Holding your slot · Processing</p>

          {/* Animated dots */}
          <div className="flex justify-center gap-2 mt-4">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-brand-violet"
                animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.25 }}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )

  return (
    <div>
      {/* Step indicator */}
      {step < 3 && (
        <div className="flex items-center gap-2 mb-6">
          {STEPS.slice(0, 3).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                i < step  ? 'bg-brand-violet text-white' :
                i === step ? 'bg-brand-violet/30 border border-brand-violet text-brand-violetL' :
                'bg-brand-bg border border-brand-border text-brand-muted'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium ${i === step ? 'text-white' : 'text-brand-muted'}`}>{s}</span>
              {i < STEPS.length - 2 && <div className="flex-1 h-px bg-brand-border" />}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 0 && renderDetails()}
        {step === 1 && renderAddons()}
        {step === 2 && renderRequesting()}
        {step === 3 && <PaymentSection key="payment" bookingId={bookingId} />}
      </AnimatePresence>
    </div>
  )
}
