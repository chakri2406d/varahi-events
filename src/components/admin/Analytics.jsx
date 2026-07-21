import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, DollarSign, Users, CalendarCheck, Package, PackageX, Repeat, Sparkles, Download } from 'lucide-react'
import { getAllBookings, getMachines, paymentBreakdown } from '../../firebase/firestore'
import { ADDONS } from '../../utils/constants'
import { MONTHS } from '../../utils/dateUtils'
import { downloadCsv } from '../../utils/exportCsv'
import toast from 'react-hot-toast'

// Only these statuses represent money the business has actually earned —
// a "requested" or "cancelled" booking never happened, revenue-wise.
const EARNING_STATUSES = ['confirmed', 'completed']

// Groups a booking to a single customer even for walk-ins that have no
// account — phone first (most stable id we ever collect), then email, then name.
const customerKey = (b) => {
  const phone = String(b?.customerPhone || '').trim()
  if (phone) return `p:${phone}`
  const email = String(b?.customerEmail || '').trim().toLowerCase()
  if (email) return `e:${email}`
  const name = String(b?.customerName || '').trim().toLowerCase()
  if (name) return `n:${name}`
  return 'unknown'
}

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`

export default function Analytics() {
  const [bookings, setBookings] = useState([])
  const [machines, setMachines] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([getAllBookings(), getMachines()])
      .then(([b, m]) => { setBookings(b || []); setMachines(m || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const earningBookings = bookings.filter(b => EARNING_STATUSES.includes(b?.status))

  // ── Headline numbers ────────────────────────────────────────────────────
  const totalCollected = earningBookings.reduce((s, b) => s + paymentBreakdown(b).total, 0)
  const avgBookingValue = earningBookings.length > 0 ? totalCollected / earningBookings.length : 0

  const customerMap = new Map() // key -> { name, bookingCount, collected }
  bookings.forEach(b => {
    const key = customerKey(b)
    const prev = customerMap.get(key) || {
      key,
      name: b?.customerName || b?.customerPhone || b?.customerEmail || 'Unknown',
      bookingCount: 0,
      collected: 0,
    }
    prev.bookingCount += 1
    if (EARNING_STATUSES.includes(b?.status)) prev.collected += paymentBreakdown(b).total
    customerMap.set(key, prev)
  })
  const uniqueCustomers = customerMap.size

  // ── a) Equipment revenue attribution ────────────────────────────────────
  // Split each booking's collected amount across its machines, proportional
  // to (price × qty) when prices exist, otherwise evenly by qty.
  const equipmentMap = new Map() // key -> { id, name, revenue, timesBooked, unitsSent }
  earningBookings.forEach(b => {
    const list = Array.isArray(b?.machines) ? b.machines : []
    if (!list.length) return
    const collected = paymentBreakdown(b).total
    if (collected <= 0) return

    const hasPrices = list.some(m => m?.price != null && m.price !== '')
    const weights = list.map(m => {
      const qty = Number(m?.qty) || 1
      return hasPrices ? (Number(m?.price) || 0) * qty : qty
    })
    const totalWeight = weights.reduce((s, w) => s + w, 0)

    list.forEach((m, i) => {
      const key = m?.id || m?.name || `unknown-${i}`
      const share = totalWeight > 0 ? weights[i] / totalWeight : 1 / list.length
      const qty = Number(m?.qty) || 1
      const prev = equipmentMap.get(key) || { id: key, name: m?.name || 'Unnamed equipment', revenue: 0, timesBooked: 0, unitsSent: 0 }
      prev.revenue += collected * share
      prev.timesBooked += 1
      prev.unitsSent += qty
      equipmentMap.set(key, prev)
    })
  })
  const equipmentRanking = [...equipmentMap.values()].sort((a, b) => b.revenue - a.revenue)
  const maxEquipRevenue = Math.max(...equipmentRanking.map(e => e.revenue), 1)

  // ── b) Equipment never booked ───────────────────────────────────────────
  // Uses ALL bookings (any status) so a machine that's ever been requested
  // doesn't get flagged as dead stock just because it never earned money.
  const usedKeys = new Set()
  bookings.forEach(b => {
    ;(Array.isArray(b?.machines) ? b.machines : []).forEach(m => {
      if (m?.id) usedKeys.add(m.id)
      if (m?.name) usedKeys.add(m.name)
    })
  })
  const neverBooked = machines.filter(m => !usedKeys.has(m.id) && !usedKeys.has(m.name))

  // ── c) Top customers + d) repeat rate ───────────────────────────────────
  const customerList = [...customerMap.values()]
  const topCustomers = [...customerList].sort((a, b) => b.collected - a.collected).slice(0, 10)
  const maxCustomerCollected = Math.max(...topCustomers.map(c => c.collected), 1)
  const repeatCustomers = customerList.filter(c => c.bookingCount > 1).length
  const repeatRate = customerList.length > 0 ? Math.round((repeatCustomers / customerList.length) * 100) : 0

  // ── e) Popular add-ons ───────────────────────────────────────────────────
  const addonCounts = new Map()
  bookings.forEach(b => {
    ;(Array.isArray(b?.addons) ? b.addons : []).forEach(id => {
      addonCounts.set(id, (addonCounts.get(id) || 0) + 1)
    })
  })
  const addonRanking = [...addonCounts.entries()]
    .map(([id, count]) => {
      const meta = ADDONS.find(a => a.id === id)
      return { id, label: meta?.label || id, icon: meta?.icon || '➕', count }
    })
    .sort((a, b) => b.count - a.count)
  const maxAddonCount = Math.max(...addonRanking.map(a => a.count), 1)

  // ── f) Busiest months ────────────────────────────────────────────────────
  const monthCounts = new Map()
  bookings.forEach(b => {
    if (!b?.eventDate) return
    const d = new Date(b.eventDate)
    if (isNaN(d.getTime())) return
    const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
    monthCounts.set(label, (monthCounts.get(label) || 0) + 1)
  })
  const busiestMonths = [...monthCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
  const maxMonthCount = Math.max(...busiestMonths.map(m => m.count), 1)

  const hasAnyBookings = bookings.length > 0

  const handleExport = () => {
    if (!equipmentRanking.length) { toast.error('No equipment revenue to export yet'); return }
    const rows = equipmentRanking.map(e => ({
      Equipment:    e.name,
      Revenue:      Math.round(e.revenue),
      TimesBooked:  e.timesBooked,
      UnitsSentOut: e.unitsSent,
    }))
    const dateStr = new Date().toISOString().slice(0, 10)
    downloadCsv(`Varahi-Equipment-Revenue-${dateStr}.csv`, rows)
    toast.success('CSV exported')
  }

  const StatCard = ({ label, value, icon: Icon, color, bg }) => (
    <div className="glass-card p-5">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
        <Icon size={18} style={{ color }} />
      </div>
      <p className="font-display font-bold text-2xl" style={{ color }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: '#9C7A82' }}>{label}</p>
    </div>
  )

  const RankBar = ({ pct }) => (
    <div className="relative h-2 rounded-full overflow-hidden mt-1.5" style={{ background: '#1A0810' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7 }}
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: 'linear-gradient(to right, #8B1A2C, #C9933A)' }}
      />
    </div>
  )

  const EmptyState = ({ text = 'No booking data yet' }) => (
    <div className="py-10 text-center text-sm" style={{ color: '#9C7A82' }}>{text}</div>
  )

  if (loading) return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
      </div>
      <div className="skeleton h-64 rounded-2xl mb-6" />
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  )

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Analytics</h1>
          <p className="text-sm" style={{ color: '#9C7A82' }}>Which parts of the business actually make money</p>
        </div>
        <button onClick={handleExport} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
          <Download size={15} /> Export CSV
        </button>
      </motion.div>

      {!hasAnyBookings ? (
        <div className="glass-card p-10 text-center">
          <Sparkles size={28} className="mx-auto mb-3" style={{ color: '#C9933A' }} />
          <p className="text-white font-semibold mb-1">No booking data yet</p>
          <p className="text-sm" style={{ color: '#9C7A82' }}>
            Analytics will appear here once bookings start coming in.
          </p>
        </div>
      ) : (
        <>
          {/* Headline cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <StatCard label="Total Collected"  value={inr(totalCollected)}      icon={DollarSign}   color="#86efac" bg="rgba(34,197,94,0.1)" />
            <StatCard label="Avg Booking Value" value={inr(avgBookingValue)}    icon={TrendingUp}   color="#C9933A" bg="rgba(201,147,58,0.1)" />
            <StatCard label="Total Bookings"    value={bookings.length}         icon={CalendarCheck} color="#93c5fd" bg="rgba(59,130,246,0.1)" />
            <StatCard label="Unique Customers"  value={uniqueCustomers}         icon={Users}        color="#E8B86D" bg="rgba(201,147,58,0.08)" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* a) Top equipment by revenue */}
            <div className="glass-card p-5 sm:p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Package size={16} style={{ color: '#C9933A' }} /> Top Equipment by Revenue
              </h3>
              {equipmentRanking.length === 0 ? <EmptyState text="No earning bookings with equipment yet" /> : (
                <div className="space-y-4">
                  {equipmentRanking.map((e, i) => (
                    <div key={e.id}>
                      <div className="flex items-center justify-between text-sm mb-0.5">
                        <span className="text-white font-medium truncate">{i + 1}. {e.name}</span>
                        <span className="font-semibold" style={{ color: '#C9933A' }}>{inr(e.revenue)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]" style={{ color: '#9C7A82' }}>
                        <span>Booked {e.timesBooked}× · {e.unitsSent} units sent out</span>
                      </div>
                      <RankBar pct={(e.revenue / maxEquipRevenue) * 100} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* b) Equipment never booked */}
            <div className="glass-card p-5 sm:p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <PackageX size={16} style={{ color: '#fca5a5' }} /> Equipment Never Booked
              </h3>
              {machines.length === 0 ? <EmptyState text="No equipment added yet" /> :
               neverBooked.length === 0 ? <EmptyState text="Every machine has been booked at least once 🎉" /> : (
                <div className="space-y-2">
                  {neverBooked.map(m => (
                    <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-xl"
                      style={{ background: 'rgba(139,26,44,0.08)', border: '1px solid rgba(61,30,40,0.8)' }}>
                      <span className="text-white text-sm">{m.name || 'Unnamed'}</span>
                      <span className="text-[11px]" style={{ color: '#fca5a5' }}>Dead stock</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* c) Top customers */}
            <div className="glass-card p-5 sm:p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Users size={16} style={{ color: '#93c5fd' }} /> Top Customers
              </h3>
              {topCustomers.length === 0 ? <EmptyState /> : (
                <div className="space-y-4">
                  {topCustomers.map((c, i) => (
                    <div key={c.key}>
                      <div className="flex items-center justify-between text-sm mb-0.5">
                        <span className="text-white font-medium truncate">{i + 1}. {c.name}</span>
                        <span className="font-semibold" style={{ color: '#86efac' }}>{inr(c.collected)}</span>
                      </div>
                      <div className="text-[11px]" style={{ color: '#9C7A82' }}>{c.bookingCount} booking{c.bookingCount === 1 ? '' : 's'}</div>
                      <RankBar pct={(c.collected / maxCustomerCollected) * 100} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* d) Repeat customer rate */}
            <div className="glass-card p-5 sm:p-6 flex flex-col items-center justify-center text-center">
              <Repeat size={22} className="mb-3" style={{ color: '#C9933A' }} />
              <p className="font-display font-bold text-4xl text-white mb-1">{repeatRate}%</p>
              <p className="text-sm mb-4" style={{ color: '#9C7A82' }}>Repeat customer rate</p>
              <p className="text-xs" style={{ color: '#9C7A82' }}>
                {repeatCustomers} of {customerList.length} customer{customerList.length === 1 ? '' : 's'} booked more than once
              </p>
            </div>

            {/* e) Most popular add-ons */}
            <div className="glass-card p-5 sm:p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Sparkles size={16} style={{ color: '#E8B86D' }} /> Most Popular Add-ons
              </h3>
              {addonRanking.length === 0 ? <EmptyState text="No add-ons booked yet" /> : (
                <div className="space-y-3">
                  {addonRanking.map(a => (
                    <div key={a.id}>
                      <div className="flex items-center justify-between text-sm mb-0.5">
                        <span className="text-white">{a.icon} {a.label}</span>
                        <span className="font-semibold" style={{ color: '#E8B86D' }}>{a.count}×</span>
                      </div>
                      <RankBar pct={(a.count / maxAddonCount) * 100} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* f) Busiest months */}
            <div className="glass-card p-5 sm:p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <CalendarCheck size={16} style={{ color: '#93c5fd' }} /> Busiest Months
              </h3>
              {busiestMonths.length === 0 ? <EmptyState text="No events with a valid date yet" /> : (
                <div className="space-y-3">
                  {busiestMonths.map(m => (
                    <div key={m.label}>
                      <div className="flex items-center justify-between text-sm mb-0.5">
                        <span className="text-white">{m.label}</span>
                        <span className="font-semibold" style={{ color: '#93c5fd' }}>{m.count} event{m.count === 1 ? '' : 's'}</span>
                      </div>
                      <RankBar pct={(m.count / maxMonthCount) * 100} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
