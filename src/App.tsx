import { Component, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'
import LoginPage from './pages/LoginPage'
import TransactionsPage from './pages/TransactionsPage'
import DashboardPage from './pages/DashboardPage'
import BudgetPage from './pages/BudgetPage'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-pf-bg flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="font-display text-pf-dim text-2xl">Something went wrong</div>
          <p className="text-pf-ghost text-sm">Reload the page to try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-5 py-2 bg-pf-gold hover:bg-pf-gold/90 text-pf-bg rounded-xl text-sm transition-colors"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return <LoadingSpinner fullPage />
  if (!session) return <LoginPage />

  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/transactions" replace />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="budget" element={<BudgetPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/transactions" replace />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
