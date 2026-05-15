import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCategories } from '../hooks/useCategories'
import { useSavingsBuckets } from '../hooks/useSavingsBuckets'
import type { Transaction } from '../types'
import TransactionForm from './TransactionForm'

// ── Icons ──────────────────────────────────────────────────────

function ListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="0.5" fill="currentColor"/>
      <circle cx="3" cy="12" r="0.5" fill="currentColor"/><circle cx="3" cy="18" r="0.5" fill="currentColor"/>
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  )
}

function BudgetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

// ── Layout ─────────────────────────────────────────────────────

export default function Layout() {
  const { signOut } = useAuth()
  const { categories } = useCategories()
  const { buckets } = useSavingsBuckets()

  const [formOpen, setFormOpen] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showMenu) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu])

  function openNew() { setEditTx(null); setFormOpen(true) }
  function openEdit(tx: Transaction) { setEditTx(tx); setFormOpen(true) }
  function closeForm() { setFormOpen(false); setEditTx(null) }

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `flex-1 flex flex-col items-center justify-center gap-1 transition-colors text-xs ${
      isActive ? 'text-pf-gold' : 'text-pf-ghost hover:text-pf-dim'
    }`

  return (
    <div className="flex flex-col min-h-screen bg-pf-bg">

      {/* Top bar */}
      <header
        className="fixed top-0 inset-x-0 z-20 bg-pf-bg/95 border-b border-pf-line backdrop-blur-sm"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="h-14 flex items-center justify-between px-6">
          <span className="font-display text-pf-ink text-xl tracking-tight">PF App</span>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(v => !v)}
              className="text-pf-ghost hover:text-pf-dim p-2 rounded-lg transition-colors"
              aria-label="Settings"
            >
              <GearIcon />
            </button>
            {showMenu && (
              <div className="absolute top-full right-0 mt-1 bg-pf-card border border-pf-line rounded-xl shadow-2xl min-w-[130px] overflow-hidden z-30">
                <button
                  onClick={() => { signOut(); setShowMenu(false) }}
                  className="w-full text-left px-4 py-3 text-pf-dim hover:text-pf-ink hover:bg-pf-line/40 text-sm transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop: 'calc(3.5rem + env(safe-area-inset-top))',
          paddingBottom: 'calc(4rem + env(safe-area-inset-bottom) + 5rem)',
        }}
      >
        <Outlet context={{ openEdit }} />
      </main>

      {/* FAB — square, amber */}
      <button
        onClick={openNew}
        className="fixed right-5 z-20 w-13 h-13 bg-pf-gold hover:bg-pf-gold/90 active:bg-pf-gold/80 flex items-center justify-center shadow-lg transition-colors"
        style={{
          bottom: 'calc(4rem + env(safe-area-inset-bottom) + 1rem)',
          borderRadius: '12px',
          width: '52px',
          height: '52px',
        }}
        aria-label="Add transaction"
      >
        <span className="text-pf-bg text-2xl font-light leading-none" style={{ marginTop: '-1px' }}>+</span>
      </button>

      {/* Tab bar — thin border only, no background pill */}
      <nav
        className="fixed bottom-0 inset-x-0 z-20 bg-pf-bg border-t border-pf-line"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-16 max-w-2xl mx-auto">
          <NavLink to="/transactions" className={tabClass}>
            <ListIcon />
            <span>Transactions</span>
          </NavLink>
          <NavLink to="/budget" className={tabClass}>
            <BudgetIcon />
            <span>Budget</span>
          </NavLink>
          <NavLink to="/dashboard" className={tabClass}>
            <GridIcon />
            <span>Dashboard</span>
          </NavLink>
        </div>
      </nav>

      {/* Transaction form */}
      {formOpen && (
        <TransactionForm
          transaction={editTx}
          categories={categories}
          buckets={buckets}
          onClose={closeForm}
          onSaved={closeForm}
        />
      )}
    </div>
  )
}
