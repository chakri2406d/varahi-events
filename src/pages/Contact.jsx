import { useState } from 'react'
import { motion } from 'framer-motion'
import { Phone, Mail, MapPin, MessageCircle, Send, Instagram } from 'lucide-react'
import { BUSINESS_INFO } from '../utils/constants'
import toast from 'react-hot-toast'

export default function Contact() {
  const [form, setForm] = useState({ name:'', phone:'', email:'', message:'', eventDate:'', eventType:'' })
  const [sent, setSent] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    // WhatsApp redirect with pre-filled message
    const msg = encodeURIComponent(
      `Hi Varahi Events! 🎪\n\nName: ${form.name}\nPhone: ${form.phone}\nEvent Date: ${form.eventDate}\nEvent Type: ${form.eventType}\n\nMessage: ${form.message}`
    )
    window.open(`https://wa.me/${BUSINESS_INFO.whatsapp}?text=${msg}`, '_blank')
    setSent(true)
    toast.success('Redirecting to WhatsApp!')
  }

  const INFO = [
    { icon: Phone,     label:'Call Us',    value: BUSINESS_INFO.phone,     href:`tel:${BUSINESS_INFO.phone.replace(/\s/g,'')}`,  color:'text-green-400' },
    { icon: Phone,     label:'Call Us',    value: BUSINESS_INFO.phone2,    href:`tel:${BUSINESS_INFO.phone2.replace(/\s/g,'')}`, color:'text-green-400' },
    { icon: Mail,      label:'Email',      value: BUSINESS_INFO.email,     href:`mailto:${BUSINESS_INFO.email}`, color:'text-blue-400' },
    { icon: MapPin,    label:'Location',   value: BUSINESS_INFO.city,      href:null,                            color:'text-brand-violet' },
    { icon: Instagram, label:'Instagram',  value:'@varahievents',           href:'https://instagram.com',         color:'text-brand-pink' },
  ]

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4">

        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="mb-10">
          <span className="badge-violet mb-3 inline-block">Get in Touch</span>
          <h1 className="section-title mb-2">Contact <span className="text-gradient-v">Us</span></h1>
          <p className="section-subtitle">Ready to create something unforgettable? Let's talk.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact info */}
          <div>
            <div className="space-y-4 mb-8">
              {INFO.map(({ icon:Icon, label, value, href, color }, i) => (
                <motion.div
                  key={label + i}
                  initial={{ opacity:0, x:-20 }}
                  animate={{ opacity:1, x:0 }}
                  transition={{ delay: i*0.1 }}
                >
                  {href ? (
                    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                      className="glass-card p-4 flex items-center gap-4 hover:border-brand-violet/40 transition-all">
                      <div className={`w-10 h-10 rounded-xl bg-brand-bg border border-brand-border flex items-center justify-center ${color}`}>
                        <Icon size={18}/>
                      </div>
                      <div>
                        <p className="text-brand-muted text-xs">{label}</p>
                        <p className="text-white font-medium text-sm">{value}</p>
                      </div>
                    </a>
                  ) : (
                    <div className="glass-card p-4 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl bg-brand-bg border border-brand-border flex items-center justify-center ${color}`}>
                        <Icon size={18}/>
                      </div>
                      <div>
                        <p className="text-brand-muted text-xs">{label}</p>
                        <p className="text-white font-medium text-sm">{value}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* WhatsApp CTA */}
            <motion.a
              initial={{ opacity:0, y:20 }}
              animate={{ opacity:1, y:0 }}
              transition={{ delay:0.5 }}
              href={`https://wa.me/${BUSINESS_INFO.whatsapp}?text=Hi! I want to book equipment for my event.`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl text-white font-semibold text-base transition-all hover:scale-[1.02]"
              style={{ background:'linear-gradient(135deg, #25D366, #128C7E)' }}
            >
              <MessageCircle size={22} className="fill-white"/>
              Chat on WhatsApp
            </motion.a>
          </div>

          {/* Contact form */}
          <motion.div
            initial={{ opacity:0, x:20 }}
            animate={{ opacity:1, x:0 }}
            transition={{ delay:0.2 }}
            className="glass-card p-6 sm:p-8"
          >
            {sent ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-white font-bold text-xl mb-2">Message Sent!</h3>
                <p className="text-brand-muted text-sm">We've received your inquiry via WhatsApp. We'll get back to you shortly!</p>
                <button onClick={()=>setSent(false)} className="btn-secondary mt-4 mx-auto">Send Another</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-white font-semibold text-lg mb-5">Send an Inquiry</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-dark">Your Name</label>
                    <input type="text" className="input-dark" placeholder="Full name" value={form.name} onChange={set('name')} required/>
                  </div>
                  <div>
                    <label className="label-dark">Phone</label>
                    <input type="tel" className="input-dark" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={set('phone')} required/>
                  </div>
                </div>

                <div>
                  <label className="label-dark">Email</label>
                  <input type="email" className="input-dark" placeholder="your@email.com" value={form.email} onChange={set('email')}/>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-dark">Event Date</label>
                    <input type="date" className="input-dark" value={form.eventDate} onChange={set('eventDate')} min={new Date().toISOString().split('T')[0]}/>
                  </div>
                  <div>
                    <label className="label-dark">Event Type</label>
                    <select className="input-dark" value={form.eventType} onChange={set('eventType')}>
                      <option value="">Select…</option>
                      <option>Wedding</option>
                      <option>DJ Night</option>
                      <option>Concert</option>
                      <option>College Fest</option>
                      <option>Corporate</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label-dark">Message</label>
                  <textarea className="input-dark resize-none" rows={4} placeholder="Tell us about your event, requirements, expected attendance…" value={form.message} onChange={set('message')}/>
                </div>

                <button type="submit" className="btn-primary w-full justify-center py-3.5">
                  <Send size={16}/> Send via WhatsApp
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
