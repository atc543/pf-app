import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  BASE_SCHED,
  CAROLINE_BASE_PAYCHECK,
  carolineAmt,
  estMonthly,
  type BudgetCat,
  type ForecastData,
  type ScenarioInputs,
} from '../../hooks/useDashboardForecast'

// ── Constants ──────────────────────────────────────────────────────

const PHASE_COLORS: Record<string, string> = {
  pre: '#4d8fd1',
  school: '#4caf7d',
  trans: '#888888',
  summer: '#e05252',
}

const PHASE_LABELS: Record<string, string> = {
  pre: 'Pre', school: 'School', trans: 'Trans', summer: 'Summer',
}

const LEGEND_ITEMS = [
  { color: '#4d8fd1', label: 'Both working' },
  { color: '#4caf7d', label: 'School + GI Bill' },
  { color: '#888888', label: 'Transition' },
  { color: '#e05252', label: 'Summer gap' },
  { color: '#8b6de8', label: '3-paycheck' },
  { color: '#3aacaa', label: 'Internship' },
]

// ── Formatters ─────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function fmtK(v: number): string {
  return `$${(v / 1000).toFixed(0)}k`
}

// ── Shared sub-components ──────────────────────────────────────────

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-lg font-semibold ${accent ?? 'text-white'}`}>{value}</div>
    </div>
  )
}

function PhasePill({ phase }: { phase: string }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white mr-1.5 shrink-0"
      style={{ backgroundColor: PHASE_COLORS[phase] ?? '#888' }}
    >
      {PHASE_LABELS[phase] ?? phase}
    </span>
  )
}

function MonthSelect({
  label,
  value,
  onChange,
  noNone = false,
}: {
  label?: string
  value: number
  onChange: (idx: number) => void
  noNone?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label && <span className="text-sm text-slate-400 shrink-0">{label}</span>}
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="bg-slate-700 border border-slate-600 text-white rounded-lg px-2 py-1.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {!noNone && <option value={-1}>— None —</option>}
        {BASE_SCHED.map((row, i) => (
          <option key={i} value={i}>{row.m}</option>
        ))}
      </select>
    </span>
  )
}

function NumInput({
  value,
  onChange,
  step,
  placeholder,
  className = '',
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  placeholder?: string
  className?: string
}) {
  return (
    <input
      type="number"
      value={value || ''}
      placeholder={placeholder ?? '0'}
      onChange={e => onChange(Number(e.target.value) || 0)}
      step={step}
      className={`bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 ${className}`}
    />
  )
}

function RotTick(props: { x?: number; y?: number; payload?: { value: string } }) {
  const { x = 0, y = 0, payload } = props
  if (!payload) return null
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="end" fill="#64748b" fontSize={9} transform="rotate(-45)">
        {payload.value}
      </text>
    </g>
  )
}

// ── Category amount row ────────────────────────────────────────────

function CatRow({
  cat,
  value,
  onChange,
}: {
  cat: BudgetCat
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-400 truncate">{cat.name}</span>
      <input
        type="number"
        value={value || ''}
        placeholder="0"
        onChange={e => onChange(Number(e.target.value) || 0)}
        step={10}
        className="w-24 shrink-0 text-right bg-slate-700 border border-slate-600 text-white rounded-lg px-2 py-1.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────

interface ForecastRow {
  m: string
  gi_f: number
  luke: number
  phase: string
  pl: string
  idx: number
  caroline: number
  giBill: number
  internship: number
  total: number
  is3pay: boolean
}

export default function ForecastTab({ data }: { data: ForecastData }) {
  const { threePay, fixedLeaves, varLeaves } = data

  // ── Scenario state ─────────────────────────────────────────────
  const [carolineSalary, setCarolineSalary] = useState(125000)
  const [raisePct, setRaisePct] = useState(0)
  const [raiseIdx, setRaiseIdx] = useState(-1)
  const [njSalary, setNjSalary] = useState(0)
  const [njIdx, setNjIdx] = useState(-1)
  const [giRate, setGiRate] = useState(3132)
  const [intAmt, setIntAmt] = useState(0)
  const [intStart, setIntStart] = useState(-1)
  const [intEnd, setIntEnd] = useState(-1)
  const [apply3p, setApply3p] = useState(true)

  const sc: ScenarioInputs = useMemo(() => ({
    carolineSalary, raisePct, raiseIdx, njSalary, njIdx, giRate, intAmt, intStart, intEnd, apply3p,
  }), [carolineSalary, raisePct, raiseIdx, njSalary, njIdx, giRate, intAmt, intStart, intEnd, apply3p])

  // ── Forecast rows ──────────────────────────────────────────────
  const forecastRows = useMemo((): ForecastRow[] =>
    BASE_SCHED.map((row, idx) => {
      const caroline = carolineAmt(idx, sc, threePay)
      const giBill = Math.round(row.gi_f * sc.giRate)
      const luke = row.luke
      const internship =
        sc.intAmt > 0 && sc.intStart >= 0 && sc.intEnd >= 0 && idx >= sc.intStart && idx <= sc.intEnd
          ? sc.intAmt
          : 0
      const total = caroline + giBill + luke + internship
      const is3pay =
        sc.apply3p &&
        threePay.has(idx) &&
        !(sc.njSalary > 0 && sc.njIdx >= 0 && idx >= sc.njIdx)
      return { ...row, idx, caroline, giBill, luke, internship, total, is3pay }
    }),
  [sc, threePay])

  // ── Chart data ─────────────────────────────────────────────────
  const chartData = useMemo(() =>
    forecastRows.map(row => ({
      name: row.m,
      value: row.total,
      fill: row.internship > 0
        ? '#3aacaa'
        : row.is3pay
          ? '#8b6de8'
          : (PHASE_COLORS[row.phase] ?? '#888888'),
    })),
  [forecastRows])

  // ── Budget planner state ───────────────────────────────────────
  const [plannerIdx, setPlannerIdx] = useState(1)
  const [fixedAmts, setFixedAmts] = useState<Record<string, number>>({})
  const [varAmts, setVarAmts] = useState<Record<string, number>>({})
  const [oneOffs, setOneOffs] = useState<Array<{ desc: string; amt: number }>>(
    Array.from({ length: 5 }, () => ({ desc: '', amt: 0 }))
  )

  useEffect(() => {
    setFixedAmts(Object.fromEntries(fixedLeaves.map(c => [c.id, c.defaultAmt])))
    setVarAmts(Object.fromEntries(varLeaves.map(c => [c.id, c.defaultAmt])))
  }, [fixedLeaves, varLeaves])

  const resetDefaults = () => {
    setFixedAmts(Object.fromEntries(fixedLeaves.map(c => [c.id, c.defaultAmt])))
    setVarAmts(Object.fromEntries(varLeaves.map(c => [c.id, c.defaultAmt])))
    setOneOffs(Array.from({ length: 5 }, () => ({ desc: '', amt: 0 })))
  }

  // ── Planner summary ────────────────────────────────────────────
  const plannerRow = forecastRows[plannerIdx]
  const totalFixed = fixedLeaves.reduce((s, c) => s + (Number(fixedAmts[c.id]) || 0), 0)
  const totalVar = varLeaves.reduce((s, c) => s + (Number(varAmts[c.id]) || 0), 0)
  const totalOneOff = oneOffs.reduce((s, o) => s + (Number(o.amt) || 0), 0)
  const totalSpending = totalFixed + totalVar + totalOneOff
  const surplus = plannerRow.total - totalSpending

  // ── Display helpers ────────────────────────────────────────────
  const twoPayMonthly = Math.round(CAROLINE_BASE_PAYCHECK * 2)
  const threePayMonthly = Math.round(CAROLINE_BASE_PAYCHECK * 3)
  const raisedPaycheck = raisePct > 0 ? Math.round(CAROLINE_BASE_PAYCHECK * (1 + raisePct / 100)) : 0

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="pb-8">

      {/* ── Section 1: Scenario builder ── */}
      <div className="mx-4 mt-4 mb-5 rounded-xl border border-slate-700/50 bg-slate-800/30 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/50">
          <span className="text-sm font-semibold text-white">Scenario builder</span>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* 1. Caroline salary */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Caroline gross salary ($)</label>
            <input
              type="number"
              value={carolineSalary}
              onChange={e => setCarolineSalary(Number(e.target.value) || 0)}
              step={1000}
              className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-500">
              Actual {fmt(twoPayMonthly)}/mo (2-pay) · {fmt(threePayMonthly)}/mo (3-pay)
            </span>
          </div>

          {/* 2. Annual raise */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Annual raise (%)</label>
            <div className="flex items-center gap-2 flex-wrap">
              <NumInput
                value={raisePct}
                onChange={setRaisePct}
                step={0.1}
                placeholder="0"
                className="w-[80px]"
              />
              <MonthSelect label="starting" value={raiseIdx} onChange={setRaiseIdx} />
            </div>
            {raisePct > 0 && raiseIdx >= 0 && (
              <span className="text-xs text-green-400">
                → ~{fmt(raisedPaycheck * 2)}/mo from {BASE_SCHED[raiseIdx].m}
              </span>
            )}
          </div>

          {/* 3. New job salary */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">New job salary — overrides above ($)</label>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="number"
                value={njSalary || ''}
                placeholder="e.g. 140000"
                onChange={e => setNjSalary(Number(e.target.value) || 0)}
                step={1000}
                className="flex-1 min-w-[110px] bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <MonthSelect label="from" value={njIdx} onChange={setNjIdx} />
            </div>
            {njSalary > 0 && njIdx >= 0 && (
              <span className="text-xs text-blue-400">
                → flat {fmt(estMonthly(njSalary))}/mo from {BASE_SCHED[njIdx].m} (avg incl. 3-pay)
              </span>
            )}
          </div>

          {/* 4. GI Bill rate */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">GI Bill monthly rate ($)</label>
            <input
              type="number"
              value={giRate}
              onChange={e => setGiRate(Number(e.target.value) || 0)}
              step={50}
              className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-500">E-5 w/ dependents · prorated for partial months</span>
          </div>

          {/* 5. Internship income */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Internship income ($/mo)</label>
            <div className="flex items-center gap-2 flex-wrap">
              <NumInput
                value={intAmt}
                onChange={setIntAmt}
                step={500}
                placeholder="0"
                className="w-[90px]"
              />
              <MonthSelect label="from" value={intStart} onChange={setIntStart} />
              <MonthSelect label="to" value={intEnd} onChange={setIntEnd} />
            </div>
          </div>

          {/* 6. 3-paycheck toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">3-paycheck months</label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={apply3p}
                onChange={e => setApply3p(e.target.checked)}
                className="mt-0.5 accent-indigo-500 w-4 h-4 shrink-0"
              />
              <span className="text-sm text-slate-300">Apply (Jul 2026, Jan 2027, Jul 2027, Dec 2027)</span>
            </label>
            <span className="text-xs text-slate-500 leading-snug">
              Applies to Caroline's current employer pay cycle only. New job salary uses flat monthly average.
            </span>
          </div>

        </div>
      </div>

      {/* ── Section 2: Forecast table ── */}
      <div className="mx-4 mb-5">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Income Forecast</div>
        <div className="rounded-xl border border-slate-700/50 overflow-hidden">
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full" style={{ minWidth: 700 }}>
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-800/50">
                  <th className="text-left pl-4 pr-2 py-2.5 text-xs font-semibold text-slate-400">Month</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-400">Caroline</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-400">GI Bill</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-400">Luke</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-400">Internship</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-400">Total Income</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400">Phase</th>
                </tr>
              </thead>
              <tbody>
                {forecastRows.map(row => {
                  const njActive = sc.njSalary > 0 && sc.njIdx >= 0 && row.idx >= sc.njIdx
                  const raiseActive = sc.raisePct > 0 && sc.raiseIdx >= 0 && row.idx >= sc.raiseIdx && !njActive
                  const isSummer = row.phase === 'summer'

                  return (
                    <tr
                      key={row.m}
                      className="border-b border-slate-800/50"
                      style={isSummer ? { backgroundColor: 'rgba(224, 82, 82, 0.07)' } : undefined}
                    >
                      <td className="pl-4 pr-2 py-2 text-xs text-slate-300 whitespace-nowrap">{row.m}</td>

                      <td className="text-right px-3 py-2 text-xs text-white whitespace-nowrap">
                        {fmt(row.caroline)}
                        {njActive && (
                          <span className="ml-1 inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            new job
                          </span>
                        )}
                        {raiseActive && (
                          <span className="ml-1 inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                            +{sc.raisePct}%
                          </span>
                        )}
                        {row.is3pay && (
                          <span className="ml-1 inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            3-pay
                          </span>
                        )}
                      </td>

                      <td className="text-right px-3 py-2 text-xs whitespace-nowrap">
                        {row.giBill > 0
                          ? <span className="text-white">{fmt(row.giBill)}</span>
                          : <span className="text-slate-600">—</span>}
                      </td>

                      <td className="text-right px-3 py-2 text-xs whitespace-nowrap">
                        {row.luke > 0
                          ? <span className="text-white">{fmt(row.luke)}</span>
                          : <span className="text-slate-600">—</span>}
                      </td>

                      <td className="text-right px-3 py-2 text-xs whitespace-nowrap">
                        {row.internship > 0
                          ? <span className="text-white">{fmt(row.internship)}</span>
                          : <span className="text-slate-600">—</span>}
                      </td>

                      <td className="text-right px-3 py-2 text-xs font-semibold text-white whitespace-nowrap">
                        {fmt(row.total)}
                      </td>

                      <td className="px-3 py-2 text-xs">
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <PhasePill phase={row.phase} />
                          <span className="text-slate-500">{row.pl}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Section 3: Income bar chart ── */}
      <div className="mx-4 mb-5">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Monthly Total Income</div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-3">
          {LEGEND_ITEMS.map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-3">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 55 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={RotTick as any} interval={0} />
              <YAxis tickFormatter={fmtK} tick={{ fill: '#64748b', fontSize: 11 }} width={40} />
              <Tooltip
                formatter={(v: unknown) => [`$${Number(v).toLocaleString()}`, ''] as [string, string]}
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Section 4: Budget planner ── */}
      <div className="mx-4 mb-4 rounded-xl border border-slate-700/50 bg-slate-800/30 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-white">Future month budget planner</span>
          <button
            onClick={resetDefaults}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors shrink-0"
          >
            Reset to defaults
          </button>
        </div>

        {/* Month selector + income summary */}
        <div className="px-4 pt-4 pb-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm text-slate-400 shrink-0">Month:</label>
            <MonthSelect value={plannerIdx} onChange={setPlannerIdx} noNone />
          </div>

          <div className="mt-3 flex flex-col gap-1">
            <div className="text-sm text-slate-300">
              <span>Projected income: </span>
              <span className="font-semibold text-white">{fmt(plannerRow.total)}</span>
              {(() => {
                const parts = [
                  plannerRow.caroline > 0 && `Caroline ${fmt(plannerRow.caroline)}`,
                  plannerRow.giBill > 0 && `GI Bill ${fmt(plannerRow.giBill)}`,
                  plannerRow.luke > 0 && `Luke ${fmt(plannerRow.luke)}`,
                  plannerRow.internship > 0 && `Internship ${fmt(plannerRow.internship)}`,
                ].filter(Boolean)
                return parts.length > 0 ? (
                  <span className="text-slate-500 ml-1">({parts.join(' · ')})</span>
                ) : null
              })()}
            </div>
            <div className="text-sm">
              <span className="text-slate-400">10% giving target: </span>
              <span className="text-green-400 font-medium">{fmt(Math.round(plannerRow.total * 0.1))}</span>
            </div>
          </div>
        </div>

        {/* Expense inputs */}
        <div className="px-4 pt-4 pb-2 grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Fixed */}
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Fixed Expenses</div>
            <div className="space-y-2">
              {fixedLeaves.map(cat => (
                <CatRow
                  key={cat.id}
                  cat={cat}
                  value={Number(fixedAmts[cat.id]) ?? cat.defaultAmt}
                  onChange={v => setFixedAmts(p => ({ ...p, [cat.id]: v }))}
                />
              ))}
            </div>
          </div>

          {/* Variable */}
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Variable Expenses</div>
            <div className="space-y-2">
              {varLeaves.map(cat => (
                <CatRow
                  key={cat.id}
                  cat={cat}
                  value={Number(varAmts[cat.id]) ?? cat.defaultAmt}
                  onChange={v => setVarAmts(p => ({ ...p, [cat.id]: v }))}
                />
              ))}
            </div>
          </div>
        </div>

        {/* One-off expenses */}
        <div className="px-4 pt-2 pb-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Anticipated one-off expenses
          </div>
          <div className="space-y-2">
            {oneOffs.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={o.desc}
                  onChange={e => setOneOffs(prev => prev.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))}
                  placeholder="Description"
                  className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-600 min-w-0"
                />
                <input
                  type="number"
                  value={o.amt || ''}
                  onChange={e => setOneOffs(prev => prev.map((x, j) => j === i ? { ...x, amt: Number(e.target.value) || 0 } : x))}
                  placeholder="0"
                  step={50}
                  className="w-24 shrink-0 text-right bg-slate-700 border border-slate-600 text-white rounded-lg px-2 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* KPI summary cards */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <KpiCard label="Total Income" value={fmt(plannerRow.total)} />
            <KpiCard label="Total Spending" value={fmt(totalSpending)} />
            <KpiCard
              label="Surplus / Deficit"
              value={fmt(surplus)}
              accent={surplus >= 0 ? 'text-green-400' : 'text-red-400'}
            />
          </div>
        </div>
      </div>

    </div>
  )
}
