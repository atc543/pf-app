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
  if (type === 'income') return { text: `+${fmt(amt)}`, color: 'text-pf-gold' }
  if (type === 'savings' && amt > 0) return { text: `+${fmt(amt)}`, color: 'text-pf-leaf' }
  return { text: `−${fmt(amt)}`, color: 'text-pf-coral' }
}

function dotColor(tx: Transaction): string {
  const type = tx.categories?.type
  const amt = Number(tx.amount)
  if (type === 'income') return '#c8a96e'          // gold — earned income
  if (type === 'savings' && amt > 0) return '#6aab8a' // leaf — savings contribution
  return '#2e2a25'                                  // border — expense / withdrawal
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
        <p className="text-pf-coral mb-1">Failed to load transactions</p>
        <p className="text-pf-ghost text-sm">{error}</p>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-6">
        <p className="text-pf-dim mb-1">No transactions yet</p>
        <p className="text-pf-ghost text-sm">Tap + to add your first one.</p>
      </div>
    )
  }

  const groups = groupByMonth(transactions)

  return (
    <div className="max-w-2xl mx-auto">
      {groups.map(group => (
        <div key={group.key}>
          {/* Month header */}
          <div className="sticky top-0 bg-pf-bg/95 backdrop-blur-sm px-6 py-2.5 border-b border-pf-line flex items-center justify-between">
            <span className="text-pf-ink text-sm font-medium">{group.label}</span>
            <div className="flex gap-3 text-xs">
              <span className="text-pf-gold amt">+{fmt(group.income)}</span>
              <span className="text-pf-coral amt">−{fmt(group.spent)}</span>
            </div>
          </div>

          {/* Rows */}
          {group.transactions.map(tx => {
            const { text, color } = amountDisplay(tx)
            return (
              <button
                key={tx.id}
                onClick={() => openEdit(tx)}
                className="w-full px-6 py-3.5 flex items-center gap-3 border-b border-pf-line/60 hover:bg-pf-card/60 active:bg-pf-card transition-colors text-left"
              >
                {/* Colored dot */}
                <div
                  className="shrink-0 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: dotColor(tx) }}
                />
                <div className="shrink-0 text-pf-ghost text-xs w-9">{fmtDate(tx.date)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-pf-ink text-sm truncate">{tx.payee}</div>
                  <div className="text-pf-ghost text-xs truncate">{tx.categories?.name}</div>
                </div>
                <div className={`shrink-0 text-sm font-medium amt ${color}`}>{text}</div>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
