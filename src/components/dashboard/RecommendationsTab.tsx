import type { RecommendationsData, RecCategory } from '../../hooks/useDashboardRecommendations'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function StatusBadge({ status }: { status: RecCategory['status'] }) {
  const cls =
    status === 'Over' ? 'bg-pf-coral/15 text-pf-coral border border-pf-coral/30' :
    status === 'Under' ? 'bg-pf-leaf/15 text-pf-leaf border border-pf-leaf/30' :
    'bg-pf-card text-pf-ghost border border-pf-line'
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>
}

function RecTable({ title, rows }: { title: string; rows: RecCategory[] }) {
  if (rows.length === 0) return null
  return (
    <div className="rounded-[10px] border border-pf-line overflow-hidden">
      <div className="px-4 py-2.5 bg-pf-card border-b border-pf-line">
        <span className="lbl">{title}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: 480 }}>
          <thead>
            <tr className="border-b border-pf-line">
              {['Category', 'Current Budget', 'Avg Actual', 'Suggested', 'Status'].map((h, i) => (
                <th key={h} className={`py-2 text-xs text-pf-ghost font-medium ${i === 0 ? 'text-left px-4' : 'text-right px-3'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-b border-pf-line/50">
                <td className="px-4 py-2 text-xs text-pf-ink">{row.name}</td>
                <td className="text-right px-3 py-2 text-xs text-pf-dim">
                  {row.currentBudget != null ? fmt(row.currentBudget) : '—'}
                </td>
                <td className="text-right px-3 py-2 text-xs text-pf-dim">{fmt(row.avgActual)}</td>
                <td className="text-right px-3 py-2 text-xs font-medium text-pf-ink">{fmt(row.suggested)}</td>
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
    <div className="bg-pf-card rounded-[10px] p-4 border border-pf-line flex-1 min-w-0">
      <div className="lbl mb-1">{label}</div>
      <div className={`text-lg amt ${accent ?? 'text-pf-ink'}`}>{value}</div>
      {sub && <div className="text-xs text-pf-ghost mt-0.5 leading-snug">{sub}</div>}
    </div>
  )
}

export default function RecommendationsTab({ data }: { data: RecommendationsData }) {
  const { fixed, variable, currentTotal, suggestedTotal, medianIncome } = data
  const gap = medianIncome - suggestedTotal
  const suggestedAccent = suggestedTotal > currentTotal ? 'text-pf-gold' : 'text-pf-leaf'

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 pb-2">
        <div className="text-base text-pf-ink mb-0.5">Budget Recommendations</div>
        <div className="text-xs text-pf-ghost">
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
            accent={gap >= 0 ? 'text-pf-leaf' : 'text-pf-coral'}
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
