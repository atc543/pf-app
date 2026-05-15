import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type { SavingsData } from '../../hooks/useDashboardSavings'

const CHART_TOOLTIP = { backgroundColor: '#211e1a', border: '1px solid #2e2a25', borderRadius: 8 }
const AXIS_TICK = { fill: '#5a5550', fontSize: 11 }
const GRID = { stroke: '#2e2a25' }

const BUCKET_COLORS = ['#c8a96e', '#6aab8a', '#6a8fc0', '#c06b6b', '#8a8278', '#f0ebe4']
const ACCOUNT_COLORS = ['#6a8fc0', '#c8a96e', '#6aab8a']

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
    <div className="bg-pf-card rounded-[10px] p-4 border border-pf-line">
      <div className="flex items-start justify-between mb-2">
        <div className="text-sm font-medium text-pf-ink">{name}</div>
        <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: color }} />
      </div>
      <div className="text-xl text-pf-ink amt mb-1">{fmt(balance)}</div>
      {target && (
        <>
          <div className="text-xs text-pf-ghost mb-2">of {fmt(target)} goal</div>
          <div className="h-[3px] bg-pf-line rounded-full overflow-hidden">
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
    <div className="bg-pf-card rounded-[10px] p-4 border border-pf-line text-center">
      <div className="lbl mb-1">{label}</div>
      <div className="text-lg text-pf-ink amt">{value}</div>
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

  const uniqueAccountIds = [...new Set(investmentSnapshots.map(s => s.account_id))]
  const accountLabelById = new Map<string, string>()
  for (const id of uniqueAccountIds) {
    const acct = investmentAccounts.find(a => a.id === id)
    accountLabelById.set(id, acct?.name ?? `Acct-${id.slice(0, 6)}`)
  }

  const invByMonth = new Map<string, Record<string, number>>()
  for (const snap of investmentSnapshots) {
    if (!invByMonth.has(snap.month)) invByMonth.set(snap.month, {})
    invByMonth.get(snap.month)![snap.account_id] = Number(snap.balance_after)
  }
  const invChartData = Array.from(invByMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, vals]) => ({ month, ...vals }))

  console.log('[SavingsTab] investmentSnapshots:', investmentSnapshots.slice(0, 3))
  console.log('[SavingsTab] invChartData sample:', invChartData.slice(0, 3))
  console.log('[SavingsTab] uniqueAccountIds:', uniqueAccountIds)
  console.log('[SavingsTab] accountLabelById:', Object.fromEntries(accountLabelById))

  const nwChartData = netWorthSnapshots.map(s => ({
    month: s.month,
    netWorth: Number(s.net_worth),
  }))

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
        <text x={0} y={0} dy={14} textAnchor="end" fill="#5a5550" fontSize={10} transform="rotate(-45)">
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
        <div className="lbl mb-3">Savings Buckets</div>
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
          <div className="lbl mb-3">Bucket Balance History</div>
          <div className="bg-pf-card rounded-[10px] border border-pf-line p-3">
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
                  wrapperStyle={{ fontSize: 11, color: '#5a5550', paddingTop: 8 }}
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
          <div className="lbl mb-3">Investment Accounts</div>
          <div className="bg-pf-card rounded-[10px] border border-pf-line p-3">
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
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP}
                  formatter={(v: any, name: any) => [fmt(Number(v)), String(name)]}
                  labelFormatter={(l: any) => fmtMonthShort(String(l))}
                />
                <Legend
                  iconType="square"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: '#5a5550', paddingTop: 8 }}
                />
                {uniqueAccountIds.map((id, i) => (
                  <Line
                    key={id}
                    type="monotone"
                    dataKey={id}
                    name={accountLabelById.get(id)}
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
          <div className="lbl mb-3">Net Worth Trend</div>
          <div className="bg-pf-card rounded-[10px] border border-pf-line p-3">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={nwChartData} margin={{ top: 4, right: 8, bottom: 44, left: 0 }}>
                <defs>
                  <linearGradient id="nwGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6aab8a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6aab8a" stopOpacity={0} />
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
                  stroke="#6aab8a"
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
          <div className="lbl mb-3">Total Savings Balance by Month</div>
          <div className="bg-pf-card rounded-[10px] border border-pf-line p-3">
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
                  cursor={{ fill: '#2e2a25', opacity: 0.6 }}
                />
                <Bar dataKey="total" fill="#c8a96e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
