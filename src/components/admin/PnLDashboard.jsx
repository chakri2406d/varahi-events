import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Wallet, Smartphone, Download } from 'lucide-react'
import { getRecentBookings, getRecentExpenses, paymentBreakdown } from '../../firebase/firestore'
import { MONTHS } from '../../utils/dateUtils'
import { downloadCsv } from '../../utils/exportCsv'
import toast from 'react-hot-toast'

export default function PnLDashboard() {
  const [bookings,  setBookings]  = useState([])
  const [expenses,  setExpenses]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [period,    setPeriod]    = useState('monthly') // monthly | yearly

  useEffect(() => {
    // Only the window this chart actually shows (plus a month of slack for
    // backdated expenses) — not the entire history of the business.
    Promise.all([getRecentBookings(7), getRecentExpenses(7)])
      .then(([b, e]) => { setBookings(b); setExpenses(e) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Compute monthly data for last 6 months
  const monthly = [...Array(6)].map((_, i) => {
    const d    = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const yr   = d.getFullYear()
    const mo   = d.getMonth()
    const label = `${MONTHS[mo]} ${yr}`

    // Revenue = money actually collected (cash + online) on confirmed/completed bookings
    const monthBookings = bookings.filter(b => {
      const bd = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
      return bd.getMonth()===mo && bd.getFullYear()===yr && ['confirmed','completed'].includes(b.status)
    })
    let cashRev = 0, onlineRev = 0
    monthBookings.forEach(b => {
      const pb = paymentBreakdown(b)
      cashRev   += pb.cash
      onlineRev += pb.online
    })
    const rev = cashRev + onlineRev   // revenue = cash + online collected

    const exp = expenses
      .filter(e => {
        // Bucket by the date the admin actually chose for the expense, so a
        // backdated receipt lands in its real month — fall back to createdAt.
        const chosen = e.date ? new Date(e.date) : null
        const ed = chosen && !isNaN(chosen.getTime())
          ? chosen
          : (e.createdAt?.toDate ? e.createdAt.toDate() : new Date(e.createdAt))
        if (!ed || isNaN(ed.getTime())) return false
        return ed.getMonth()===mo && ed.getFullYear()===yr
      })
      .reduce((s,e) => s + (Number(e.amount)||0), 0)

    return { label, rev, cashRev, onlineRev, exp, profit: rev - exp }
  })

  const totalRev     = monthly.reduce((s,m) => s + m.rev, 0)
  const totalCash    = monthly.reduce((s,m) => s + m.cashRev, 0)
  const totalOnline  = monthly.reduce((s,m) => s + m.onlineRev, 0)
  const totalExp     = monthly.reduce((s,m) => s + m.exp, 0)
  const totalProfit  = totalRev - totalExp
  const profitMargin = totalRev > 0 ? Math.round((totalProfit / totalRev) * 100) : 0

  const maxVal = Math.max(...monthly.map(m => Math.max(m.rev, m.exp)), 1)

  // Export the monthly breakdown shown in the chart below as a CSV Excel can open directly
  const handleExport = () => {
    const rows = monthly.map(m => ({
      Month: m.label,
      Revenue: m.rev,
      Cash: m.cashRev,
      Online: m.onlineRev,
      Expenses: m.exp,
      Profit: m.profit,
    }))
    const year = new Date().getFullYear()
    downloadCsv(`Varahi-PnL-${year}.csv`, rows)
    toast.success('CSV exported')
  }

  const StatCard = ({ label, value, icon:Icon, color, bg, sign='' }) => (
    <div className="glass-card p-5">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        <Icon size={18} className={color}/>
      </div>
      <p className={`font-display font-bold text-2xl ${color}`}>{sign}₹{Math.abs(value).toLocaleString()}</p>
      <p className="text-brand-muted text-xs mt-1">{label}</p>
    </div>
  )

  if (loading) return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[...Array(4)].map((_,i)=><div key={i} className="skeleton h-28 rounded-2xl"/>)}
      </div>
      <div className="skeleton h-64 rounded-2xl"/>
    </div>
  )

  return (
    <div>
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
        className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">P & L Dashboard</h1>
          <p className="text-brand-muted text-sm">Revenue vs expenses — last 6 months</p>
        </div>
        <button onClick={handleExport}
          className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
          <Download size={15} /> Export CSV
        </button>
      </motion.div>

      {/* Revenue split cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
        <StatCard label="Cash Collected"   value={totalCash}   icon={Wallet}     color="text-green-400" bg="bg-green-500/10"/>
        <StatCard label="Online Collected" value={totalOnline} icon={Smartphone} color="text-blue-400"  bg="bg-blue-500/10"/>
        <StatCard label="Total Revenue"    value={totalRev}    icon={TrendingUp} color="text-brand-gold" bg="bg-amber-500/10"/>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Total Revenue" value={totalRev}     icon={TrendingUp}   color="text-green-400"  bg="bg-green-500/10"/>
        <StatCard label="Total Expenses" value={totalExp}   icon={TrendingDown}  color="text-red-400"    bg="bg-red-500/10"/>
        <StatCard label="Net Profit" value={totalProfit}     icon={DollarSign}   color={totalProfit>=0?"text-brand-gold":"text-red-400"} bg={totalProfit>=0?"bg-amber-500/10":"bg-red-500/10"} sign={totalProfit>=0?"+":"-"}/>
        <div className="glass-card p-5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
            <BarChart3 size={18} className="text-blue-400"/>
          </div>
          <p className={`font-display font-bold text-2xl ${profitMargin>=0?'text-blue-400':'text-red-400'}`}>{profitMargin}%</p>
          <p className="text-brand-muted text-xs mt-1">Profit Margin</p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="glass-card p-5 sm:p-6">
        <h3 className="text-white font-semibold mb-6">Monthly Breakdown</h3>
        <div className="space-y-4">
          {monthly.map((m, i) => (
            <motion.div key={m.label} initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.08 }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-brand-muted text-xs font-medium w-20 flex-shrink-0">{m.label}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-green-400">+₹{m.rev.toLocaleString()}</span>
                  <span className="text-red-400">-₹{m.exp.toLocaleString()}</span>
                  <span className={`font-bold ${m.profit>=0?'text-brand-gold':'text-red-400'}`}>
                    {m.profit>=0?'+':'-'}₹{Math.abs(m.profit).toLocaleString()}
                  </span>
                </div>
              </div>
              {m.rev > 0 && (
                <div className="flex justify-end gap-3 text-[10px] mb-1" style={{ color:'#9C7A82' }}>
                  <span>💵 Cash ₹{m.cashRev.toLocaleString()}</span>
                  <span>📲 Online ₹{m.onlineRev.toLocaleString()}</span>
                </div>
              )}
              {/* Revenue bar */}
              <div className="relative h-2.5 bg-brand-bg rounded-full overflow-hidden mb-1">
                <motion.div
                  initial={{ width:0 }}
                  animate={{ width:`${(m.rev/maxVal)*100}%` }}
                  transition={{ duration:0.8, delay: i*0.08 }}
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                />
              </div>
              {/* Expense bar */}
              <div className="relative h-2.5 bg-brand-bg rounded-full overflow-hidden">
                <motion.div
                  initial={{ width:0 }}
                  animate={{ width:`${(m.exp/maxVal)*100}%` }}
                  transition={{ duration:0.8, delay: i*0.08+0.1 }}
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-red-500 to-rose-400"
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mt-6 pt-4 border-t border-brand-border">
          <div className="flex items-center gap-2"><div className="w-3 h-2 rounded-full bg-green-400"/><span className="text-brand-muted text-xs">Revenue</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-2 rounded-full bg-red-400"/><span className="text-brand-muted text-xs">Expenses</span></div>
        </div>
      </div>
    </div>
  )
}
