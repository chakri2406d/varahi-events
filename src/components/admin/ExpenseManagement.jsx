import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, IndianRupee } from 'lucide-react'
import { addExpense, getExpenses, deleteExpense } from '../../firebase/firestore'
import { EXPENSE_CATEGORIES } from '../../utils/constants'
import { fmt } from '../../utils/dateUtils'
import toast from 'react-hot-toast'

const EMPTY = { category:'fuel', description:'', amount:'', date: new Date().toISOString().split('T')[0] }

export default function ExpenseManagement() {
  const [expenses, setExpenses] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)
  const [filter,   setFilter]   = useState('all')

  const load = () => getExpenses().then(setExpenses).catch(()=>{}).finally(()=>setLoading(false))
  useEffect(() => { load() }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.amount || !form.description) { toast.error('Fill all fields'); return }
    setSaving(true)
    try {
      await addExpense({ ...form, amount: Number(form.amount) })
      toast.success('Expense added')
      setForm(EMPTY)
      load()
    } catch { toast.error('Failed to add expense') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return
    await deleteExpense(id)
    toast.success('Deleted')
    load()
  }

  const filtered = filter === 'all' ? expenses : expenses.filter(e => e.category === filter)
  const total    = filtered.reduce((s, e) => s + (Number(e.amount) || 0), 0)

  return (
    <div>
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white">Expenses</h1>
        <p className="text-brand-muted text-sm">Track all operational costs</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add expense form */}
        <div className="lg:col-span-1">
          <div className="glass-card p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Plus size={16} className="text-brand-violet"/> Add Expense
            </h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="label-dark">Category</label>
                <select className="input-dark" value={form.category} onChange={set('category')}>
                  {EXPENSE_CATEGORIES.map(c => <option key={c.id} value={c.id} className="bg-brand-surface">{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label-dark">Description</label>
                <input className="input-dark" value={form.description} onChange={set('description')} placeholder="e.g. Fuel for Hyderabad trip" required/>
              </div>
              <div>
                <label className="label-dark">Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted text-sm">₹</span>
                  <input type="number" className="input-dark pl-7" value={form.amount} onChange={set('amount')} placeholder="500" min={1} required/>
                </div>
              </div>
              <div>
                <label className="label-dark">Date</label>
                <input type="date" className="input-dark" value={form.date} onChange={set('date')}/>
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full justify-center text-sm">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><IndianRupee size={14}/> Add Expense</>}
              </button>
            </form>
          </div>

          {/* Category totals */}
          <div className="glass-card p-5 mt-4">
            <h3 className="text-white font-semibold mb-3 text-sm">By Category</h3>
            {EXPENSE_CATEGORIES.map(cat => {
              const catTotal = expenses.filter(e=>e.category===cat.id).reduce((s,e)=>s+(Number(e.amount)||0),0)
              if (!catTotal) return null
              return (
                <div key={cat.id} className="flex items-center justify-between py-1.5 border-b border-brand-border last:border-0">
                  <span className={`text-sm ${cat.color}`}>{cat.label}</span>
                  <span className="text-white text-sm font-semibold">₹{catTotal.toLocaleString()}</span>
                </div>
              )
            })}
            <div className="flex items-center justify-between pt-3 mt-1">
              <span className="text-brand-muted text-sm font-semibold">Total</span>
              <span className="text-red-400 font-bold">₹{expenses.reduce((s,e)=>s+(Number(e.amount)||0),0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Expense list */}
        <div className="lg:col-span-2">
          {/* Filter */}
          <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
            <button onClick={()=>setFilter('all')} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter==='all'?'bg-brand-violet text-white':'bg-brand-surface border border-brand-border text-brand-muted'}`}>
              All · ₹{total.toLocaleString()}
            </button>
            {EXPENSE_CATEGORIES.map(cat => (
              <button key={cat.id} onClick={()=>setFilter(cat.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter===cat.id?'bg-brand-violet text-white':'bg-brand-surface border border-brand-border text-brand-muted hover:text-white'}`}>
                {cat.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="skeleton h-14 rounded-xl"/>)}</div>
          ) : filtered.length === 0 ? (
            <div className="glass-card p-10 text-center text-brand-muted">No expenses in this category</div>
          ) : (
            <div className="space-y-2">
              {filtered.map((exp, i) => {
                const cat = EXPENSE_CATEGORIES.find(c=>c.id===exp.category)
                return (
                  <motion.div key={exp.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.04 }}
                    className="glass-card px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{exp.description}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className={`text-xs ${cat?.color||'text-brand-muted'}`}>{cat?.label||exp.category}</span>
                        <span className="text-brand-muted text-xs">{exp.date ? fmt(exp.date) : '—'}</span>
                      </div>
                    </div>
                    <span className="text-red-400 font-bold text-sm flex-shrink-0">-₹{Number(exp.amount).toLocaleString()}</span>
                    <button onClick={()=>handleDelete(exp.id)}
                      className="p-1.5 rounded-lg border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 transition-all flex-shrink-0">
                      <Trash2 size={13}/>
                    </button>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
