import type { RecommendationsData, RecCategory } from '../../hooks/useDashboardRecommendations'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function StatusBadge({ status }: { status: RecCategory['status'] }) {
  const cls =
    status === 'Over' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
    status === 'Under' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
    'bg-slate-700/50 text-slate-400 border border-slate-600/30'
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>
}

function RecTable({ title, rows }: { title: string; rows: RecCategory[] }) {
  if (rows.length === 0) return null
  return (
    <div className="rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-800/50 border-b border-slate-700/50">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{title}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: 480 }}>
          <thead>
            <tr className="border-b border-slate-800">
              {['Category', 'Current Budget', 'Avg Actual', 'Suggested', 'Status'].map((h, i) => (
                <th key={h} className={`py-2 text-xs text-slate-500 font-medium ${i === 0 ? 'text-left px-4' : 'text-right px-3'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-b border-slate-800/50">
                <td className="px-4 py-2 text-xs text-slate-200">{row.name}</td>
                <td className="text-right px-3 py-2 text-xs text-slate-400">
                  {row.currentBudget != null ? fmt(row.currentBudget) : '—'}
                </td>
                <td className="text-right px-3 py-2 text-xs text-slate-300">{fmt(row.avgActual)}</td>
                <td className="text-right px-3 py-2 text-xs font-medium text-white">{fmt(row.suggested)}</td>
                <td className="text-right px-3 py-2">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KpiCard({ label, value, accent, sub }: { label: string; value: string; accent?: string; sub?: string }) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex-1 min-w-0">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-lg font-semibold ${accent ?? 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5 leading-snug">{sub}</div>}
    </div>
  )
}

export default function RecommendationsTab({ data }: { data: RecommendationsData }) {
  const { fixed, variable, currentTotal, suggestedTotal, medianIncome } = data
  const gap = medianIncome - suggestedTotal
  const suggestedAccent = suggestedTotal > currentTotal ? 'text-amber-400' : 'text-green-400'

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 pb-2">
        <div className="text-base font-semibold text-white mb-0.5">Budget Recommendations</div>
        <div className="text-xs text-slate-500">
          Suggested = avg monthly spend rounded to nearest $25 · Compared to current budget ±$25 threshold
        </div>
      </div>

      {/* KPI cards */}
      <div className="px-4 pb-4">
        <div className="flex gap-3 flex-wrap sm:flex-nowrap">
          <KpiCard label="Current Total Budget" value={fmt(currentTotal)} />
          <KpiCard
            label="Suggested Total Budget"
            value={fmt(suggestedTotal)}
            accent={suggestedAccent}
            sub={suggestedTotal > currentTotal ? `+${fmt(suggestedTotal - currentTotal)} vs current` : suggestedTotal < currentTotal ? `-${fmt(currentTotal - suggestedTotal)} vs current` : 'Same as current'}
          />
          <KpiCard
            label="Gap vs Median Income"
            value={fmt(gap)}
            accent={gap >= 0 ? 'text-green-400' : 'text-red-400'}
            sub={`Median income: ${fmt(medianIncome)}`}
          />
        </div>
      </div>

      {/* Tables */}
      <div className="px-4 flex flex-col gap-4">
        <RecTable title="Fixed Expenses" rows={fixed} />
        <RecTable title="Variable Expenses" rows={variable} />
      </div>
    </div>
  )
}
