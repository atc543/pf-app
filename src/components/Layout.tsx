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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="0.5" fill="currentColor"/>
      <circle cx="3" cy="12" r="0.5" fill="currentColor"/><circle cx="3" cy="18" r="0.5" fill="currentColor"/>
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

  function openNew() {
    setEditTx(null)
    setFormOpen(true)
  }

  function openEdit(tx: Transaction) {
    setEditTx(tx)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditTx(null)
  }

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
      isActive ? 'text-indigo-400' : 'text-slate-500'
    }`

  return (
    <div className="flex flex-col min-h-screen bg-slate-900">

      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-20 h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4">
        <span className="text-white font-bold text-lg tracking-tight">PF App</span>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(v => !v)}
            className="text-slate-400 hover:text-white p-2 rounded-lg transition-colors"
            aria-label="Settings"
          >
            <GearIcon />
          </button>
          {showMenu && (
            <div className="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl min-w-[130px] overflow-hidden z-30">
              <button
                onClick={() => { signOut(); setShowMenu(false) }}
                className="w-full text-left px-4 py-3 text-slate-200 hover:bg-slate-700 text-sm transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Page content — scrollable, padded for top bar + tab bar */}
      <main
        className="flex-1 overflow-y-auto pt-14"
        style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom) + 5rem)' }}
      >
        <Outlet context={{ openEdit }} />
      </main>

      {/* FAB */}
      <button
        onClick={openNew}
        className="fixed right-5 z-20 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-full flex items-center justify-center shadow-xl transition-colors"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) + 1rem)' }}
        aria-label="Add transaction"
      >
        <span className="text-white text-3xl font-light leading-none">+</span>
      </button>

      {/* Tab bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-20 bg-slate-900 border-t border-slate-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-16 max-w-2xl mx-auto">
          <NavLink to="/transactions" className={tabClass}>
            <ListIcon />
            <span className="text-xs">Transactions</span>
          </NavLink>
          <NavLink to="/dashboard" className={tabClass}>
            <GridIcon />
            <span className="text-xs">Dashboard</span>
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
