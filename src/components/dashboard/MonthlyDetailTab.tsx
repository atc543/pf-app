import { useState } from 'react'
import type { MonthlyDetailData, DetailCat } from '../../hooks/useDashboardMonthlyDetail'

const MIN_MONTH = '2024-09-01'
const MAX_MONTH = '2026-04-01'

function shiftMonth(s: string, delta: number): string {
  const [y, m] = s.split('-')
  const d = new Date(+y, +m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function monthLabel(s: string) {
  const [y, m] = s.split('-')
  return new Date(+y, +m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// ── Summary card ─────────────────────────────────────────────────

function Card({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-lg font-semibold ${accent ?? 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5 leading-snug">{sub}</div>}
    </div>
  )
}

// ── Expense table ─────────────────────────────────────────────────

type TableRow = { name: string; budget: number | null; actual: number | null }

function ExpTable({ title, rows, income }: { title: string; rows: TableRow[]; income: number }) {
  const totalB = rows.reduce((s, r) => s + (r.budget ?? 0), 0)
  const totalA = rows.reduce((s, r) => s + (r.actual ?? 0), 0)
  const totalV = totalB - totalA
  const totalPct = income > 0 ? Math.round(totalA / income * 100) : null

  return (
    <div className="rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-800/50 border-b border-slate-700/50">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{title}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              {['Category', 'Budget', 'Actual', 'Var', '%Inc'].map((h, i) => (
                <th key={h} className={`py-2 text-xs text-slate-500 font-medium ${i === 0 ? 'text-left px-4' : 'text-right px-3'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const variance = row.budget != null && row.actual != null ? row.budget - row.actual : null
              const pct = row.actual != null && row.actual > 0 && income > 0 ? Math.round(row.actual / income * 100) : null
              const vc = variance == null ? 'text-slate-600' : variance >= 0 ? 'text-green-400' : 'text-red-400'
              return (
                <tr key={row.name} className="border-b border-slate-800/50">
                  <td className="px-4 py-2 text-xs text-slate-200">{row.name}</td>
                  <td className="text-right px-3 py-2 text-xs text-slate-400">{row.budget != null ? fmt(row.budget) : '—'}</td>
                  <td className="text-right px-3 py-2 text-xs text-slate-300">{row.actual != null && row.actual > 0 ? fmt(row.actual) : '—'}</td>
                  <td className={`text-right px-3 py-2 text-xs font-medium ${vc}`}>
                    {variance != null ? (variance >= 0 ? '+' : '') + fmt(variance) : '—'}
                  </td>
                  <td className="text-right px-3 py-2 text-xs text-slate-500">{pct != null ? `${pct}%` : '—'}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-800/30 border-t border-slate-700/50">
              <td className="px-4 py-2.5 text-xs font-semibold text-slate-300">Total</td>
              <td className="text-right px-3 py-2.5 text-xs font-semibold text-slate-300">{fmt(totalB)}</td>
              <td className="text-right px-3 py-2.5 text-xs font-semibold text-slate-300">{fmt(totalA)}</td>
              <td className={`text-right px-3 py-2.5 text-xs font-semibold ${totalV >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(totalV >= 0 ? '+' : '') + fmt(totalV)}
              </td>
              <td className="text-right px-3 py-2.5 text-xs font-semibold text-slate-400">
                {totalPct != null ? `${totalPct}%` : '—'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ── MonthlyDetailTab ──────────────────────────────────────────────

export default function MonthlyDetailTab({ data }: { data: MonthlyDetailData }) {
  const [month, setMonth] = useState(MAX_MONTH)
  const { transactions, categories, budgets, threePaycheckMonths } = data

  const is3p = threePaycheckMonths.has(month)
  const canPrev = month > MIN_MONTH
  const canNext = month < MAX_MONTH

  const monthTxs = transactions.filter(tx => tx.month === month)

  const income = monthTxs.filter(tx => tx.categoryType === 'income' && tx.amount > 0).reduce((s, tx) => s + Number(tx.amount), 0)
  const expTxs = monthTxs.filter(tx => tx.categoryType === 'expense' || tx.categoryType === 'giving')
  const totalSpend = expTxs.reduce((s, tx) => s + Math.abs(Number(tx.amount)), 0)
  const fixedSpend = expTxs.filter(tx => tx.isFixed).reduce((s, tx) => s + Math.abs(Number(tx.amount)), 0)
  const varSpend = expTxs.filter(tx => !tx.isFixed).reduce((s, tx) => s + Math.abs(Number(tx.amount)), 0)
  const surplus = income - totalSpend
  const givingActual = monthTxs.filter(tx => tx.categoryType === 'giving').reduce((s, tx) => s + Math.abs(Number(tx.amount)), 0)
  const givingTarget = income * 0.10
  const givingDiff = givingActual - givingTarget

  const leafCats = categories.filter(c => c.active && c.parent_category_id)
  const fixedCats = leafCats.filter(c => c.is_fixed && c.type === 'expense').sort((a, b) => a.name.localeCompare(b.name))
  const varCats = leafCats.filter(c => (!c.is_fixed && c.type === 'expense') || c.type === 'giving').sort((a, b) => a.name.localeCompare(b.name))

  function buildRows(cats: DetailCat[]): TableRow[] {
    return cats.map(cat => {
      const catTxs = monthTxs.filter(tx => tx.categoryId === cat.id)
      const actual = catTxs.length > 0 ? catTxs.reduce((s, tx) => s + Math.abs(Number(tx.amount)), 0) : null
      const budgetRow = budgets.find(b => b.month === month && b.category_id === cat.id)
      return {
        name: cat.name,
        budget: budgetRow ? Number(budgetRow.budgeted_amount) : null,
        actual,
      }
    })
  }

  const givingSub = (() => {
    const d = Math.abs(givingDiff)
    if (d < 1) return `${fmt(givingActual)} given · on target`
    return `${fmt(givingActual)} given · ${fmt(d)} ${givingDiff >= 0 ? 'over' : 'short'}`
  })()

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="text-base font-semibold text-white mb-0.5">Monthly Detail</div>
        <div className="text-xs text-slate-500">Select a month · ★ = 3-paycheck month · Income shown as-is</div>
      </div>

      {/* Month navigator */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <button onClick={() => canPrev && setMonth(shiftMonth(month, -1))} disabled={!canPrev}
          className="text-slate-400 hover:text-white disabled:opacity-30 p-2 rounded-lg transition-colors">
          <span className="text-xl font-light leading-none">‹</span>
        </button>
        <span className="text-white font-semibold text-sm">
          {monthLabel(month)}{is3p ? ' ★' : ''}
        </span>
        <button onClick={() => canNext && setMonth(shiftMonth(month, 1))} disabled={!canNext}
          className="text-slate-400 hover:text-white disabled:opacity-30 p-2 rounded-lg transition-colors">
          <span className="text-xl font-light leading-none">›</span>
        </button>
      </div>

      {/* Summary cards */}
      <div className="px-4 pt-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <Card label="Income" value={fmt(income)} accent="text-green-400" />
          <Card
            label="Total Spending"
            value={fmt(totalSpend)}
            sub={`Fixed: ${fmt(fixedSpend)} · Variable: ${fmt(varSpend)}`}
          />
          <Card
            label="Surplus / Deficit"
            value={fmt(surplus)}
            accent={surplus >= 0 ? 'text-green-400' : 'text-red-400'}
            sub={is3p ? 'Includes 3rd paycheck' : undefined}
          />
          <Card
            label="10% Giving Target"
            value={fmt(givingTarget)}
            sub={givingSub}
          />
        </div>
      </div>

      {/* Expense tables */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExpTable title="Fixed Expenses" rows={buildRows(fixedCats)} income={income} />
          <ExpTable title="Variable Expenses & Giving" rows={buildRows(varCats)} income={income} />
        </div>
      </div>
    </div>
  )
}
