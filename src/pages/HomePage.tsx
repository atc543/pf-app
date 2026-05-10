import { useAuth } from '../contexts/AuthContext'

export default function HomePage() {
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen bg-slate-900 relative flex flex-col items-center justify-center">
      <button
        onClick={signOut}
        className="absolute top-4 right-4 text-sm text-slate-400 hover:text-white transition-colors"
      >
        Sign out
      </button>
      <h1 className="text-5xl font-bold text-white tracking-tight mb-3">PF App</h1>
      <p className="text-slate-400 text-lg">Coming soon</p>
    </div>
  )
}
