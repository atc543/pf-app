import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { OverviewData } from '../../hooks/useDashboardOverview'

const CHART_TOOLTIP = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }
const AXIS_TICK = { fill: '#64748b', fontSize: 11 }
const GRID = { stroke: '#1e293b' }

function fmt(n: number, decimals = 0) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: decimals }).format(n)
}

function fmtPct(n: number) {
  return `${(n * 100).toFixed(1)}%`
}

function fmtMonthShort(monthStr: string) {
  const [y, m] = monthStr.split('-')
  return new Date(+y, +m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

// ── Stat card ────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string
  sub?: string
  accent?: 'green' | 'amber' | 'indigo' | 'default'
}

function StatCard({ label, value, sub, accent = 'default' }: StatCardProps) {
  const valueColor = accent === 'green' ? 'text-green-400' : accent === 'amber' ? 'text-amber-400' : accent === 'indigo' ? 'text-indigo-400' : 'text-white'
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="text-xs text-slate-500 mb-1.5">{label}</div>
      <div className={`text-lg font-semibold ${valueColor}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}

// ── Giving calculator ────────────────────────────────────────────

const GIVING_PCTS = [5, 7, 10, 12, 15, 20]

function GivingCalculator({ medianMonthlyIncome, avgGiving }: { medianMonthlyIncome: number; avgGiving: number }) {
  const [monthlyIncome, setMonthlyIncome] = useState(Math.round(medianMonthlyIncome))
  const annualIncome = monthlyIncome * 12
  const annualGiving = avgGiving * 12

  // Find row closest to actual avg giving
  const closestPct = GIVING_PCTS.reduce((best, pct) => {
    const target = annualIncome * pct / 100
    const diff = Math.abs(target - annualGiving)
    const bestDiff = Math.abs(annualIncome * best / 100 - annualGiving)
    return diff < bestDiff ? pct : best
  }, GIVING_PCTS[0])

  return (
    <div className="mx-4 mb-6 rounded-xl border border-slate-700/50 bg-slate-800/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/50">
        <div className="text-sm font-semibold text-slate-300 mb-3">Giving Calculator</div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-500 whitespace-nowrap">Monthly income</label>
          <div className="relative flex-1 max-w-[160px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              type="number"
              value={monthlyIncome}
              onChange={e => setMonthlyIncome(Number(e.target.value) || 0)}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="text-xs text-slate-500">{fmt(annualIncome)}/yr</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">%</th>
              <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium">Annual</th>
              <th className="text-right px-3 py-2 text-xs text-slate-500 font-medium">Monthly</th>
              <th className="text-right px-4 py-2 text-xs text-slate-500 font-medium">/Paycheck</th>
            </tr>
          </thead>
          <tbody>
            {GIVING_PCTS.map(pct => {
              const annual = annualIncome * pct / 100
              const monthly = annual / 12
              const perPaycheck = annual / 24
              const isClosest = pct === closestPct
              const inRange = annual >= 7000 && annual <= 15000
              return (
                <tr
                  key={pct}
                  className={`border-b border-slate-800/60 ${isClosest ? 'bg-indigo-900/30' : inRange ? 'bg-slate-800/20' : ''}`}
                >
                  <td className="px-4 py-2.5">
                    <span className={`font-medium ${isClosest ? 'text-indigo-300' : inRange ? 'text-slate-300' : 'text-slate-500'}`}>
                      {pct}%{isClosest ? ' ←' : ''}
                    </span>
                  </td>
                  <td className={`text-right px-3 py-2.5 ${inRange ? 'text-amber-400 font-medium' : 'text-slate-400'}`}>{fmt(annual)}</td>
                  <td className="text-right px-3 py-2.5 text-slate-400">{fmt(monthly)}</td>
                  <td className="text-right px-4 py-2.5 text-slate-400">{fmt(perPaycheck)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 text-xs text-slate-600">
        Amber = $7k–$15k annual range · ← = closest to your avg ({fmt(annualGiving)}/yr)
      </div>
    </div>
  )
}

// ── Custom XAxis tick with star for 3-paycheck months ────────────

function MonthTick(props: any) {
  const { x, y, payload, threePaycheckMonths } = props as {
    x: number; y: number; payload: { value: string }; threePaycheckMonths: Set<string>
  }
  if (!payload) return null
  const is3 = threePaycheckMonths?.has(payload.value)
  const label = fmtMonthShort(payload.value)
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={14} textAnchor="end" fill={is3 ? '#f59e0b' : '#64748b'} fontSize={10} transform="rotate(-45)">
        {is3 ? `★ ${label}` : label}
      </text>
    </g>
  )
}

// ── OverviewTab ──────────────────────────────────────────────────

export default function OverviewTab({ data }: { data: OverviewData }) {
  const {
    monthlyTotals,
    threePaycheckMonths,
    medianNormalIncome,
    medianThreePaycheckIncome,
    medianSpending,
    medianSavingsRate,
    avgGiving,
    netWorthSnapshots,
  } = data

  const medianNet = medianNormalIncome - medianSpending - medianNormalIncome * medianSavingsRate
  const latestNW = netWorthSnapshots.length > 0
    ? netWorthSnapshots[netWorthSnapshots.length - 1].net_worth
    : 0

  const nwChartData = netWorthSnapshots.map(s => ({
    month: s.month,
    netWorth: Number(s.net_worth),
  }))

  return (
    <div className="pb-4">
      {/* Stat cards */}
      <div className="px-4 pt-4 pb-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Median Monthly</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Normal Income" value={fmt(medianNormalIncome)} accent="green" />
          <StatCard label="3-Paycheck Income" value={fmt(medianThreePaycheckIncome)} accent="amber" sub="★ months" />
          <StatCard label="Spending" value={fmt(medianSpending)} />
          <StatCard label="Avg Giving" value={fmt(avgGiving)} sub={`${(avgGiving / (medianNormalIncome || 1) * 100).toFixed(1)}% of income`} />
          <StatCard label="Savings Rate" value={fmtPct(medianSavingsRate)} accent="indigo" />
          <StatCard label="Monthly Net" value={fmt(medianNet)} accent={medianNet >= 0 ? 'green' : 'default'} />
          <StatCard label="Latest Net Worth" value={fmt(latestNW)} accent="indigo" />
          <StatCard label="Avg Giving/yr" value={fmt(avgGiving * 12)} sub={`${fmt(avgGiving * 12 / 24)}/paycheck`} />
        </div>
      </div>

      {/* Monthly income chart */}
      <div className="px-4 mb-6">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Monthly Income</div>
        <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-3">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyTotals} margin={{ top: 4, right: 8, bottom: 40, left: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" {...GRID} />
              <XAxis
                dataKey="month"
                tick={(props) => <MonthTick {...props} threePaycheckMonths={threePaycheckMonths} />}
                interval={0}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP}
                formatter={(v: any) => [fmt(Number(v)), 'Income']}
                labelFormatter={(l: any) => fmtMonthShort(String(l))}
                cursor={{ fill: '#334155', opacity: 0.4 }}
              />
              <Bar dataKey="income" radius={[3, 3, 0, 0]}>
                {monthlyTotals.map((entry, i) => (
                  <Cell key={i} fill={threePaycheckMonths.has(entry.month) ? '#f59e0b' : '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 justify-center text-xs text-slate-500 mt-1">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" />Normal</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />3-paycheck ★</span>
          </div>
        </div>
      </div>

      {/* Net worth chart */}
      {nwChartData.length > 0 && (
        <div className="px-4 mb-6">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Net Worth</div>
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-3">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={nwChartData} margin={{ top: 4, right: 8, bottom: 40, left: 0 }}>
                <defs>
                  <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" {...GRID} />
                <XAxis
                  dataKey="month"
                  tick={(props) => <MonthTick {...props} threePaycheckMonths={new Set()} />}
                  interval={1}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP}
                  formatter={(v: any) => [fmt(Number(v)), 'Net Worth']}
                  labelFormatter={(l: any) => fmtMonthShort(String(l))}
                />
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#nwGradient)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Giving calculator */}
      <div className="px-4 mb-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Giving Calculator</div>
      </div>
      <GivingCalculator medianMonthlyIncome={medianNormalIncome} avgGiving={avgGiving} />
    </div>
  )
}
