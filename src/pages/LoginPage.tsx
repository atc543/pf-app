import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error } = await signIn(email, password)
    if (error) setError('Invalid email or password.')
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-pf-bg flex items-center justify-center px-6">
      <div className="w-full max-w-sm">

        <h1 className="font-display text-pf-ink text-4xl text-center tracking-tight mb-2">
          PF App
        </h1>
        <p className="text-pf-ghost text-xs text-center tracking-widest uppercase mb-10">Personal Finance</p>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label htmlFor="email" className="lbl block mb-2">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-pf-card border border-pf-line text-pf-ink rounded-xl px-4 py-3.5 text-sm placeholder:text-pf-ghost focus:outline-none focus:border-pf-gold transition"
            />
          </div>

          <div>
            <label htmlFor="password" className="lbl block mb-2">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-pf-card border border-pf-line text-pf-ink rounded-xl px-4 py-3.5 text-sm placeholder:text-pf-ghost focus:outline-none focus:border-pf-gold transition"
            />
          </div>

          {error && (
            <p className="text-pf-coral text-xs">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-pf-gold hover:bg-pf-gold/90 active:bg-pf-gold/80 disabled:opacity-50 text-pf-bg font-medium py-3.5 rounded-xl text-sm transition-colors mt-2"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

        </form>
      </div>
    </div>
  )
}
