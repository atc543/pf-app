import { useState } from 'react'
import { useDashboardOverview } from '../hooks/useDashboardOverview'
import { useDashboardSavings } from '../hooks/useDashboardSavings'
import OverviewTab from '../components/dashboard/OverviewTab'
import SavingsTab from '../components/dashboard/SavingsTab'
import BudgetPage from './BudgetPage'

type Tab = 'overview' | 'savings' | 'budget' | 'coming1' | 'coming2' | 'coming3' | 'coming4'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'savings', label: 'Savings' },
  { id: 'budget', label: 'Budget' },
  { id: 'coming1', label: 'Spending' },
  { id: 'coming2', label: 'Income' },
  { id: 'coming3', label: 'Giving' },
  { id: 'coming4', label: 'Trends' },
]

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-600">
      <div className="text-4xl mb-3">🔜</div>
      <div className="font-medium">{label}</div>
      <div className="text-sm mt-1">Coming soon</div>
    </div>
  )
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const overviewData = useDashboardOverview()
  const savingsData = useDashboardSavings()

  return (
    <div className="max-w-2xl mx-auto">
      {/* Tab nav */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="flex overflow-x-auto scrollbar-hide px-2 gap-1 py-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        overviewData.loading
          ? <div className="flex items-center justify-center h-40"><span className="text-slate-600">Loading…</span></div>
          : <OverviewTab data={overviewData} />
      )}
      {activeTab === 'savings' && (
        savingsData.loading
          ? <div className="flex items-center justify-center h-40"><span className="text-slate-600">Loading…</span></div>
          : <SavingsTab data={savingsData} />
      )}
      {activeTab === 'budget' && <BudgetPage />}
      {activeTab === 'coming1' && <Placeholder label="Spending" />}
      {activeTab === 'coming2' && <Placeholder label="Income" />}
      {activeTab === 'coming3' && <Placeholder label="Giving" />}
      {activeTab === 'coming4' && <Placeholder label="Trends" />}
    </div>
  )
}
