import { useOutletContext } from 'react-router-dom'
import { useTransactions } from '../hooks/useTransactions'
import LoadingSpinner from '../components/LoadingSpinner'
import type { Transaction } from '../types'

interface LayoutContext {
  openEdit: (tx: Transaction) => void
}

function fmt(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(amount))
}

function amountDisplay(tx: Transaction): { text: string; color: string } {
  const type = tx.categories?.type
  const amt = Number(tx.amount)
  if (type === 'income') return { text: `+${fmt(amt)}`, color: 'text-green-400' }
  if (type === 'savings' && amt > 0) return { text: `+${fmt(amt)}`, color: 'text-indigo-400' }
  return { text: `-${fmt(amt)}`, color: 'text-red-400' }
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface MonthGroup {
  key: string
  label: string
  income: number
  spent: number
  transactions: Transaction[]
}

function groupByMonth(transactions: Transaction[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>()
  for (const tx of transactions) {
    const key = tx.date.substring(0, 7)
    if (!map.has(key)) {
      const label = new Date(tx.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      map.set(key, { key, label, income: 0, spent: 0, transactions: [] })
    }
    const g = map.get(key)!
    g.transactions.push(tx)
    const type = tx.categories?.type
    const amt = Number(tx.amount)
    if (type === 'income') g.income += amt
    else if (type === 'expense' || type === 'giving') g.spent += Math.abs(amt)
  }
  return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key))
}

export default function TransactionsPage() {
  const { openEdit } = useOutletContext<LayoutContext>()
  const { transactions, loading, error } = useTransactions()

  if (loading) return <LoadingSpinner />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-6">
        <p className="text-red-400 mb-1">Failed to load transactions</p>
        <p className="text-slate-600 text-sm">{error}</p>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-6">
        <p className="text-slate-400 text-lg mb-1">No transactions yet</p>
        <p className="text-slate-600 text-sm">Tap + to add your first one.</p>
      </div>
    )
  }

  const groups = groupByMonth(transactions)

  return (
    <div className="max-w-2xl mx-auto">
      {groups.map(group => (
        <div key={group.key}>
          {/* Month header */}
          <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
            <span className="text-white font-semibold text-sm">{group.label}</span>
            <div className="flex gap-3 text-xs">
              <span className="text-green-400">+{fmt(group.income)}</span>
              <span className="text-red-400">-{fmt(group.spent)}</span>
            </div>
          </div>

          {/* Rows */}
          {group.transactions.map(tx => {
            const { text, color } = amountDisplay(tx)
            return (
              <button
                key={tx.id}
                onClick={() => openEdit(tx)}
                className="w-full px-4 py-3.5 flex items-center gap-3 border-b border-slate-800/60 hover:bg-slate-800/40 active:bg-slate-800 transition-colors text-left"
              >
                <div className="shrink-0 text-slate-500 text-xs w-10">{fmtDate(tx.date)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{tx.payee}</div>
                  <div className="text-slate-500 text-xs truncate">{tx.categories?.name}</div>
                </div>
                <div className={`shrink-0 text-sm font-medium ${color}`}>{text}</div>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
