import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import TransactionsPage from './pages/TransactionsPage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return <div className="min-h-screen bg-slate-900" />
  if (!session) return <LoginPage />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/transactions" replace />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/transactions" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
