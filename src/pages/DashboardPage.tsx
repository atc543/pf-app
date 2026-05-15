import { lazy, Suspense, useState } from 'react'
import { useDashboardOverview } from '../hooks/useDashboardOverview'
import { useDashboardSavings } from '../hooks/useDashboardSavings'
import { useDashboardSpending } from '../hooks/useDashboardSpending'
import { useDashboardMonthlyDetail } from '../hooks/useDashboardMonthlyDetail'
import { useDashboardRecommendations } from '../hooks/useDashboardRecommendations'
import { useDashboardForecast } from '../hooks/useDashboardForecast'
import OverviewTab from '../components/dashboard/OverviewTab'
import LoadingSpinner from '../components/LoadingSpinner'

const SavingsTab = lazy(() => import('../components/dashboard/SavingsTab'))
const SpendingTab = lazy(() => import('../components/dashboard/SpendingTab'))
const MonthlyDetailTab = lazy(() => import('../components/dashboard/MonthlyDetailTab'))
const RecommendationsTab = lazy(() => import('../components/dashboard/RecommendationsTab'))
const ForecastTab = lazy(() => import('../components/dashboard/ForecastTab'))

type Tab = 'overview' | 'savings' | 'spending' | 'monthlyDetail' | 'recommendations' | 'forecast'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'savings', label: 'Savings' },
  { id: 'spending', label: 'Spending' },
  { id: 'monthlyDetail', label: 'Monthly Detail' },
  { id: 'recommendations', label: 'Recommendations' },
  { id: 'forecast', label: 'Forecast' },
]

function TabError({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-center px-6">
      <p className="text-red-400 mb-1">Failed to load</p>
      <p className="text-slate-600 text-sm">{message}</p>
    </div>
  )
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const overviewData = useDashboardOverview()
  const savingsData = useDashboardSavings()
  const spendingData = useDashboardSpending()
  const monthlyDetailData = useDashboardMonthlyDetail()
  const recommendationsData = useDashboardRecommendations()
  const forecastData = useDashboardForecast()

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
        overviewData.loading ? <LoadingSpinner />
        : overviewData.error ? <TabError message={overviewData.error} />
        : <OverviewTab data={overviewData} />
      )}

      {activeTab === 'savings' && (
        <Suspense fallback={<LoadingSpinner />}>
          {savingsData.loading ? <LoadingSpinner />
          : savingsData.error ? <TabError message={savingsData.error} />
          : <SavingsTab data={savingsData} />}
        </Suspense>
      )}

      {activeTab === 'spending' && (
        <Suspense fallback={<LoadingSpinner />}>
          {spendingData.loading ? <LoadingSpinner />
          : spendingData.error ? <TabError message={spendingData.error} />
          : <SpendingTab data={spendingData} />}
        </Suspense>
      )}

      {activeTab === 'monthlyDetail' && (
        <Suspense fallback={<LoadingSpinner />}>
          {monthlyDetailData.loading ? <LoadingSpinner />
          : monthlyDetailData.error ? <TabError message={monthlyDetailData.error} />
          : <MonthlyDetailTab data={monthlyDetailData} />}
        </Suspense>
      )}

      {activeTab === 'recommendations' && (
        <Suspense fallback={<LoadingSpinner />}>
          {recommendationsData.loading ? <LoadingSpinner />
          : recommendationsData.error ? <TabError message={recommendationsData.error} />
          : <RecommendationsTab data={recommendationsData} />}
        </Suspense>
      )}

      {activeTab === 'forecast' && (
        <Suspense fallback={<LoadingSpinner />}>
          {forecastData.loading ? <LoadingSpinner />
          : forecastData.error ? <TabError message={forecastData.error} />
          : <ForecastTab data={forecastData} />}
        </Suspense>
      )}
    </div>
  )
}
