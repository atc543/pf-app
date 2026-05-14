import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type { SavingsData } from '../../hooks/useDashboardSavings'

const CHART_TOOLTIP = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }
const AXIS_TICK = { fill: '#64748b', fontSize: 11 }
const GRID = { stroke: '#1e293b' }

const BUCKET_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#38bdf8', '#ec4899', '#a78bfa']
const ACCOUNT_COLORS = ['#38bdf8', '#818cf8', '#34d399']

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function fmtMonthShort(monthStr: string) {
  const [y, m] = monthStr.split('-')
  return new Date(+y, +m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

// ── Bucket card ──────────────────────────────────────────────────

function BucketCard({ name, balance, target, color }: { name: string; balance: number; target: number | null; color: string }) {
  const pct = target ? Math.min(100, (balance / target) * 100) : null
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-start justify-between mb-2">
        <div className="text-sm font-medium text-slate-200">{name}</div>
        <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: color }} />
      </div>
      <div className="text-xl font-semibold text-white mb-1">{fmt(balance)}</div>
      {target && (
        <>
          <div className="text-xs text-slate-500 mb-2">of {fmt(target)} goal</div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
          </div>
        </>
      )}
    </div>
  )
}

// ── Summary stat ─────────────────────────────────────────────────

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-center">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-lg font-semibold text-white">{value}</div>
    </div>
  )
}

// ── SavingsTab ───────────────────────────────────────────────────

export default function SavingsTab({ data }: { data: SavingsData }) {
  const {
    buckets,
    investmentAccounts,
    investmentSnapshots,
    netWorthSnapshots,
    bucketHistory,
    totalSavings,
    totalInvestments,
    totalNetWorth,
  } = data

  // Build investment chart data: one entry per month with each account as a key
  const invByMonth = new Map<string, Record<string, number>>()
  for (const snap of investmentSnapshots) {
    if (!invByMonth.has(snap.month)) invByMonth.set(snap.month, {})
    const acct = investmentAccounts.find(a => a.id === snap.account_id)
    if (acct) invByMonth.get(snap.month)![acct.name] = Number(snap.balance_after)
  }
  const invChartData = Array.from(invByMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, vals]) => ({ month, ...vals }))

  // Net worth chart
  const nwChartData = netWorthSnapshots.map(s => ({
    month: s.month,
    netWorth: Number(s.net_worth),
  }))

  // Monthly net savings chart from bucket history (sum of all buckets per month)
  const monthlySavingsBar = bucketHistory.map(row => {
    const total = buckets.reduce((s, b) => {
      const v = row[b.name]
      return s + (typeof v === 'number' ? v : 0)
    }, 0)
    return { month: row.month, total }
  })

  const tickStyle = (props: any) => {
    const { x, y, payload } = props as { x: number; y: number; payload: { value: string } }
    if (!payload) return null
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={14} textAnchor="end" fill="#64748b" fontSize={10} transform="rotate(-45)">
          {fmtMonthShort(payload.value)}
        </text>
      </g>
    )
  }

  return (
    <div className="pb-4">
      {/* Summary stats */}
      <div className="px-4 pt-4 pb-3">
        <div className="grid grid-cols-3 gap-3">
          <SummaryStat label="Savings Buckets" value={fmt(totalSavings)} />
          <SummaryStat label="Investments" value={fmt(totalInvestments)} />
          <SummaryStat label="Net Worth" value={fmt(totalNetWorth)} />
        </div>
      </div>

      {/* Bucket cards */}
      <div className="px-4 mb-6">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Savings Buckets</div>
        <div className="grid grid-cols-2 gap-3">
          {buckets.map((b, i) => (
            <BucketCard
              key={b.id}
              name={b.name}
              balance={Number(b.current_balance)}
              target={b.target_balance ? Number(b.target_balance) : null}
              color={BUCKET_COLORS[i % BUCKET_COLORS.length]}
            />
          ))}
        </div>
      </div>

      {/* Bucket history stacked area */}
      {bucketHistory.length > 0 && (
        <div className="px-4 mb-6">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Bucket Balance History</div>
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-3">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={bucketHistory} margin={{ top: 4, right: 8, bottom: 44, left: 0 }}>
                <defs>
                  {buckets.map((b, i) => (
                    <linearGradient key={b.id} id={`bg${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BUCKET_COLORS[i % BUCKET_COLORS.length]} stopOpacity={0.5} />
                      <stop offset="95%" stopColor={BUCKET_COLORS[i % BUCKET_COLORS.length]} stopOpacity={0.1} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" {...GRID} />
                <XAxis dataKey="month" tick={tickStyle} interval={1} tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP}
                  formatter={(v: any, name: any) => [fmt(Number(v)), String(name)]}
                  labelFormatter={(l: any) => fmtMonthShort(String(l))}
                />
                <Legend
                  iconType="square"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 }}
                />
                {buckets.map((b, i) => (
                  <Area
                    key={b.id}
                    type="monotone"
                    dataKey={b.name}
                    stackId="1"
                    stroke={BUCKET_COLORS[i % BUCKET_COLORS.length]}
                    fill={`url(#bg${i})`}
                    strokeWidth={1.5}
                    dot={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Investment accounts chart */}
      {invChartData.length > 0 && (
        <div className="px-4 mb-6">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Investment Accounts</div>
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-3">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={invChartData} margin={{ top: 4, right: 8, bottom: 44, left: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" {...GRID} />
                <XAxis dataKey="month" tick={tickStyle} interval={1} tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP}
                  formatter={(v: any, name: any) => [fmt(Number(v)), String(name)]}
                  labelFormatter={(l: any) => fmtMonthShort(String(l))}
                />
                <Legend
                  iconType="square"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 }}
                />
                {investmentAccounts.map((acct, i) => (
                  <Line
                    key={acct.id}
                    type="monotone"
                    dataKey={acct.name}
                    stroke={ACCOUNT_COLORS[i % ACCOUNT_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Net worth trend */}
      {nwChartData.length > 0 && (
        <div className="px-4 mb-6">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Net Worth Trend</div>
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-3">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={nwChartData} margin={{ top: 4, right: 8, bottom: 44, left: 0 }}>
                <defs>
                  <linearGradient id="nwGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" {...GRID} />
                <XAxis dataKey="month" tick={tickStyle} interval={1} tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP}
                  formatter={(v: any) => [fmt(Number(v)), 'Net Worth']}
                  labelFormatter={(l: any) => fmtMonthShort(String(l))}
                />
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#nwGrad2)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Monthly savings total bar chart */}
      {monthlySavingsBar.length > 0 && (
        <div className="px-4 mb-6">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Total Savings Balance by Month</div>
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-3">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlySavingsBar} margin={{ top: 4, right: 8, bottom: 44, left: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" {...GRID} />
                <XAxis dataKey="month" tick={tickStyle} interval={1} tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP}
                  formatter={(v: any) => [fmt(Number(v)), 'Savings']}
                  labelFormatter={(l: any) => fmtMonthShort(String(l))}
                  cursor={{ fill: '#334155', opacity: 0.4 }}
                />
                <Bar dataKey="total" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
