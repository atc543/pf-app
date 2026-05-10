import { useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return <div className="min-h-screen bg-slate-900" />
  if (!session) return <LoginPage />
  return <HomePage />
}
