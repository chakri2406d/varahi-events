import { Link } from 'react-router-dom'
import { Instagram, Phone, Mail, MapPin, Heart } from 'lucide-react'
import { BUSINESS_INFO } from '../../utils/constants'

export default function Footer() {
  return (
    <footer className="border-t border-brand-border mt-20 pb-20 lg:pb-0" style={{ background: '#1A0810' }}>

      <div className="h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(201,147,58,0.4), transparent)' }} />

      <div className="max-w-7xl mx-auto px-4 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img src="/varahi_events.jpg" alt="Varahi Events"
                style={{ width:40, height:40, borderRadius:'10px', objectFit:'cover', boxShadow:'0 0 14px rgba(201,147,58,0.35)' }} />
              <div>
                <p className="font-display font-bold text-lg leading-none tracking-wider"
                  style={{ background:'linear-gradient(135deg,#C9933A,#F0D9A8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                  VARAHI
                </p>
                <p className="text-[10px] tracking-[0.3em] uppercase" style={{ color:'#9C7A82' }}>Events</p>
              </div>
            </div>

            <p className="text-sm leading-relaxed mb-5" style={{ color:'#9C7A82' }}>
              Premium event production company crafting unforgettable experiences across Telangana & Andhra Pradesh.
            </p>

            <a href="https://instagram.com/varahi_events__" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background:'rgba(232,113,138,0.1)', border:'1px solid rgba(232,113,138,0.3)', color:'#F4A0B0' }}>
              <Instagram size={16} />
              @varahi_events__
            </a>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2.5">
              {[
                { to:'/',          label:'Home'      },
                { to:'/events',    label:'Events'    },
                { to:'/equipment', label:'Equipment' },
                { to:'/gallery',   label:'Gallery'   },
                { to:'/calendar',  label:'Calendar'  },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-sm hover:text-white transition-colors flex items-center gap-2"
                    style={{ color:'#9C7A82' }}>
                    <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background:'rgba(201,147,58,0.5)' }} />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Services</h4>
            <ul className="space-y-2.5">
              {['CO2 Paper Blasters','DJ Setups','Wedding Lighting','Concert Production','Corporate Events','College Fests'].map(s => (
                <li key={s} className="text-sm flex items-center gap-2" style={{ color:'#9C7A82' }}>
                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background:'rgba(232,113,138,0.5)' }} />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm" style={{ color:'#9C7A82' }}>
                <Phone size={15} style={{ color:'#C9933A', flexShrink:0 }} />
                <span>{BUSINESS_INFO.phone}<br />{BUSINESS_INFO.phone2}</span>
              </li>
              <li className="flex items-center gap-3 text-sm" style={{ color:'#9C7A82' }}>
                <Mail size={15} style={{ color:'#C9933A', flexShrink:0 }} />
                {BUSINESS_INFO.email}
              </li>
              <li className="flex items-start gap-3 text-sm" style={{ color:'#9C7A82' }}>
                <MapPin size={15} style={{ color:'#C9933A', flexShrink:0, marginTop:2 }} />
                {BUSINESS_INFO.city}
              </li>
            </ul>

            <div className="mt-5 p-3 rounded-xl border border-brand-border" style={{ background:'#0D0508' }}>
              <p className="text-xs mb-1 font-medium" style={{ color:'#9C7A82' }}>UPI Payment</p>
              <p className="text-sm font-mono font-medium" style={{ color:'#C9933A' }}>{BUSINESS_INFO.upiId}</p>
            </div>
          </div>

        </div>

        <div className="divider my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs" style={{ color:'#9C7A82' }}>
            © {new Date().getFullYear()} Varahi Events. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {[
              { to:'/faq',     label:'FAQ'     },
              { to:'/terms',   label:'Terms'   },
              { to:'/privacy', label:'Privacy' },
            ].map(({ to, label }) => (
              <Link key={to} to={to} className="text-xs hover:text-white transition-colors" style={{ color:'#9C7A82' }}>
                {label}
              </Link>
            ))}
          </div>
          <p className="text-xs flex items-center gap-1" style={{ color:'#9C7A82' }}>
            Made with <Heart size={11} style={{ color:'#E8718A', fill:'#E8718A', margin:'0 2px' }} /> in Hyderabad
          </p>
        </div>
      </div>
    </footer>
  )
}