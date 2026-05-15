import { useMemo, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { SpendingData } from '../../hooks/useDashboardSpending'

type Filter = 'all' | 'fixed' | 'variable'

const TT = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }
const AT = { fill: '#64748b', fontSize: 11 }
const GR = { stroke: '#1e293b' }

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
function fmtShort(s: string) {
  const [y, m] = s.split('-')
  return new Date(+y, +m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function RotTick(props: any) {
  const { x, y, payload } = props as { x: number; y: number; payload: { value: string } }
  if (!payload) return null
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={14} textAnchor="end" fill="#64748b" fontSize={10} transform="rotate(-45)">
        {fmtShort(payload.value)}
      </text>
    </g>
  )
}

function SecHead({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">{children}</div>
}

function ChartBox({ children, height }: { children: React.ReactNode; height: number }) {
  return (
    <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-3">
      <ResponsiveContainer width="100%" height={height}>{children as any}</ResponsiveContainer>
    </div>
  )
}

const TRACKED = ['Groceries', 'Dining Out', 'Misc', 'Gas', 'Gifts']
const MEDICAL = ['Doctor Visits', 'Medicine/Vitamins']

export default function SpendingTab({ data }: { data: SpendingData }) {
  const [filter, setFilter] = useState<Filter>('all')
  const { spendingTxs, incomeTxs, categories, budgets, threePaycheckMonths, months } = data

  const passes = (isFixed: boolean) =>
    filter === 'all' || (filter === 'fixed' ? isFixed : !isFixed)

  // Section 1: category totals filtered by toggle
  const catTotals = useMemo(() => {
    const m = new Map<string, { name: string; total: number }>()
    for (const tx of spendingTxs) {
      if (!passes(tx.isFixed)) continue
      if (!m.has(tx.categoryId)) m.set(tx.categoryId, { name: tx.categoryName, total: 0 })
      m.get(tx.categoryId)!.total += tx.amount
    }
    return Array.from(m.values()).filter(c => c.total > 0).sort((a, b) => b.total - a.total)
  }, [spendingTxs, filter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Section 2: fixed over/under budget (always shown)
  const fixedAnalysis = useMemo(() => {
    const fixedCats = categories.filter(c => c.is_fixed && (c.type === 'expense' || c.type === 'giving') && c.parent_category_id)
    return fixedCats.map(cat => {
      const total = spendingTxs.filter(tx => tx.categoryId === cat.id).reduce((s, tx) => s + tx.amount, 0)
      const avg = total / months.length
      const catBudgets = budgets.filter(b => b.category_id === cat.id).sort((a, b) => b.month.localeCompare(a.month))
      const budget = catBudgets[0]?.budgeted_amount ?? 0
      const variance = avg - budget
      const within5 = budget > 0 && Math.abs(variance / budget) <= 0.05
      const status = within5 ? 'on track' : variance > 0 ? 'over' : 'under'
      return { name: cat.name, avg, budget, variance, status, pct: budget > 0 ? Math.min(100, (avg / budget) * 100) : 0 }
    }).filter(x => x.avg > 0 || x.budget > 0).sort((a, b) => b.variance - a.variance)
  }, [categories, spendingTxs, budgets, months])

  // Sections 3 & 4: trend data
  const fixedTrend = useMemo(() => months.map(month => ({
    month, total: spendingTxs.filter(tx => tx.month === month && tx.isFixed).reduce((s, tx) => s + tx.amount, 0),
  })), [months, spendingTxs])

  const varTrend = useMemo(() => months.map(month => ({
    month, total: spendingTxs.filter(tx => tx.month === month && !tx.isFixed).reduce((s, tx) => s + tx.amount, 0),
  })), [months, spendingTxs])

  // Section 5: per-category mini charts
  const miniCharts = useMemo(() => {
    const latestBudget = (catId: string) =>
      budgets.filter(b => b.category_id === catId).sort((a, b) => b.month.localeCompare(a.month))[0]?.budgeted_amount ?? 0

    const result = TRACKED.map(name => {
      const cat = categories.find(c => c.name === name)
      if (!cat) return null
      const lb = latestBudget(cat.id)
      const monthly = months.map(month => ({
        month,
        actual: spendingTxs.filter(tx => tx.month === month && tx.categoryId === cat.id).reduce((s, tx) => s + tx.amount, 0),
        budget: budgets.find(b => b.month === month && b.category_id === cat.id)?.budgeted_amount ?? lb,
      }))
      return { name, monthly, latestBudget: lb }
    }).filter(Boolean) as { name: string; monthly: { month: string; actual: number; budget: number }[]; latestBudget: number }[]

    const medIds = MEDICAL.map(n => categories.find(c => c.name === n)?.id).filter(Boolean) as string[]
    const medLB = medIds.reduce((s, id) => s + latestBudget(id), 0)
    result.push({
      name: 'Medical',
      monthly: months.map(month => ({
        month,
        actual: spendingTxs.filter(tx => tx.month === month && medIds.includes(tx.categoryId)).reduce((s, tx) => s + tx.amount, 0),
        budget: medIds.reduce((s, id) => s + (budgets.find(b => b.month === month && b.category_id === id)?.budgeted_amount ?? latestBudget(id)), 0),
      })),
      latestBudget: medLB,
    })
    return result
  }, [categories, spendingTxs, budgets, months])

  // Section 6: income growth
  const incomeTrend = useMemo(() => months.map(month => ({
    month,
    actual: incomeTxs.filter(tx => tx.month === month).reduce((s, tx) => s + tx.amount, 0),
    budget: budgets.filter(b => b.month === month && categories.find(c => c.id === b.category_id)?.type === 'income').reduce((s, b) => s + b.budgeted_amount, 0),
    is3p: threePaycheckMonths.has(month),
  })), [months, incomeTxs, budgets, categories, threePaycheckMonths])

  const showFixed = filter !== 'variable'
  const showVariable = filter !== 'fixed'

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-4 pt-4 pb-1">
        <div className="text-base font-semibold text-white mb-0.5">Spending Analysis</div>
        <div className="text-xs text-slate-500">20 months of actuals · Sep 2024 – Apr 2026</div>
      </div>

      {/* Toggle */}
      <div className="px-4 py-3">
        <div className="flex rounded-xl overflow-hidden border border-slate-700 w-fit">
          {(['all', 'fixed', 'variable'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-5 py-2 text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Section 1: Category totals */}
      <div className="px-4 mb-6">
        <SecHead>20-Month Totals by Category</SecHead>
        <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-3">
          <ResponsiveContainer width="100%" height={Math.max(180, catTotals.length * 26)}>
            <BarChart layout="vertical" data={catTotals} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" {...GR} />
              <XAxis type="number" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={AT} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={112} tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={TT}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const v = Number(payload[0]?.value ?? 0)
                  return (
                    <div style={TT} className="p-3 text-xs">
                      <div className="text-slate-300 font-medium mb-1">{label}</div>
                      <div className="text-white">{fmt(v)}</div>
                      <div className="text-slate-400">Avg/mo: {fmt(v / 20)}</div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="total" fill="#d97706" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section 2: Fixed over/under budget (always shown) */}
      <div className="px-4 mb-6">
        <SecHead>Fixed Categories — Budget vs 20-Month Avg</SecHead>
        <div className="rounded-xl border border-slate-700/50 overflow-hidden">
          {fixedAnalysis.map(row => {
            const sc = row.status === 'over' ? 'text-red-400' : row.status === 'under' ? 'text-green-400' : 'text-slate-400'
            const bc = row.status === 'over' ? '#ef4444' : row.status === 'under' ? '#22c55e' : '#64748b'
            return (
              <div key={row.name} className="border-b border-slate-800 px-4 py-3 last:border-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-slate-200">{row.name}</span>
                  <div className="flex gap-3 text-xs items-center">
                    <span className="text-slate-500">{row.budget > 0 ? `Budget ${fmt(row.budget)}` : 'No budget'}</span>
                    <span className="text-slate-300">Avg {fmt(row.avg)}</span>
                    <span className={`font-medium ${sc}`}>
                      {row.budget > 0 ? (row.variance > 0 ? '+' : '') + fmt(row.variance) : '—'}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${row.pct}%`, backgroundColor: bc }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Section 3: Fixed spending trend */}
      {showFixed && (
        <div className="px-4 mb-6">
          <SecHead>Fixed Spending Trend</SecHead>
          <ChartBox height={200}>
            <LineChart data={fixedTrend} margin={{ top: 4, right: 8, bottom: 44, left: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" {...GR} />
              <XAxis dataKey="month" tick={RotTick} interval={1} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={v => `$${(v / 1000).toFixed(1)}k`} tick={AT} tickLine={false} axisLine={false} width={40} />
              <Tooltip contentStyle={TT} formatter={(v: any) => [fmt(Number(v)), 'Fixed spending']} labelFormatter={(l: any) => fmtShort(String(l))} />
              <Line type="monotone" dataKey="total" stroke="#7c3aed" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartBox>
        </div>
      )}

      {/* Section 4: Variable spending trend */}
      {showVariable && (
        <div className="px-4 mb-6">
          <SecHead>Variable Spending Trend</SecHead>
          <ChartBox height={200}>
            <LineChart data={varTrend} margin={{ top: 4, right: 8, bottom: 44, left: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" {...GR} />
              <XAxis dataKey="month" tick={RotTick} interval={1} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={v => `$${(v / 1000).toFixed(1)}k`} tick={AT} tickLine={false} axisLine={false} width={40} />
              <Tooltip contentStyle={TT} formatter={(v: any) => [fmt(Number(v)), 'Variable spending']} labelFormatter={(l: any) => fmtShort(String(l))} />
              <Line type="monotone" dataKey="total" stroke="#d97706" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartBox>
        </div>
      )}

      {/* Section 5: Per-category mini charts (variable only) */}
      {showVariable && (
        <div className="px-4 mb-6">
          <SecHead>Monthly by Category</SecHead>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {miniCharts.map(({ name, monthly, latestBudget: lb }) => (
              <div key={name} className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-3">
                <div className="text-xs font-medium text-slate-300 mb-2">
                  {name}{lb > 0 ? ` — ${fmt(lb)} budget` : ''}
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={monthly} margin={{ top: 4, right: 4, bottom: 38, left: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" {...GR} />
                    <XAxis dataKey="month" tick={RotTick} interval={2} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={34} />
                    <Tooltip
                      contentStyle={TT}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        const actual = Number(payload[0]?.value ?? 0)
                        const budget = (payload[0]?.payload as any)?.budget ?? 0
                        return (
                          <div style={TT} className="p-2.5 text-xs">
                            <div className="text-slate-400 mb-1">{fmtShort(String(label))}</div>
                            <div className="text-white">Actual: {fmt(actual)}</div>
                            {budget > 0 && <div className="text-slate-400">Budget: {fmt(budget)}</div>}
                            {budget > 0 && <div className={actual > budget ? 'text-red-400' : 'text-green-400'}>
                              {actual > budget ? `+${fmt(actual - budget)} over` : `${fmt(budget - actual)} under`}
                            </div>}
                          </div>
                        )
                      }}
                    />
                    {lb > 0 && <ReferenceLine y={lb} stroke="#64748b" strokeDasharray="4 2" strokeWidth={1} />}
                    <Bar dataKey="actual" radius={[2, 2, 0, 0]}>
                      {monthly.map((e, i) => (
                        <Cell key={i} fill={e.budget > 0 && e.actual > e.budget ? '#ef4444' : '#22c55e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 6: Income growth (always shown) */}
      <div className="px-4 mb-6">
        <SecHead>Income Growth</SecHead>
        <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-3">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={incomeTrend} margin={{ top: 4, right: 8, bottom: 44, left: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" {...GR} />
              <XAxis dataKey="month" tick={RotTick} interval={0} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={AT} tickLine={false} axisLine={false} width={44} />
              <Tooltip
                contentStyle={TT}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const actual = Number(payload.find((p: any) => p.dataKey === 'actual')?.value ?? 0)
                  const budget = Number(payload.find((p: any) => p.dataKey === 'budget')?.value ?? 0)
                  return (
                    <div style={TT} className="p-2.5 text-xs">
                      <div className="text-slate-400 mb-1">{fmtShort(String(label))}</div>
                      <div className="text-white">Actual: {fmt(actual)}</div>
                      <div className="text-slate-400">Budget: {fmt(budget)}</div>
                      {budget > 0 && <div className={actual >= budget ? 'text-green-400' : 'text-red-400'}>
                        {actual >= budget ? `+${fmt(actual - budget)}` : `-${fmt(budget - actual)}`} vs budget
                      </div>}
                    </div>
                  )
                }}
              />
              <Bar dataKey="actual" name="Actual" radius={[3, 3, 0, 0]}>
                {incomeTrend.map((e, i) => (
                  <Cell key={i} fill={e.is3p ? '#f59e0b' : '#2563eb'} />
                ))}
              </Bar>
              <Bar dataKey="budget" name="Budget" fill="#334155" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 justify-center text-xs text-slate-500 mt-1">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />Normal income</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />3-paycheck ★</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-700 inline-block" />Budget</span>
          </div>
        </div>
      </div>
    </div>
  )
}
