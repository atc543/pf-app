import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBudget } from '../hooks/useBudget'
import { useCategories } from '../hooks/useCategories'
import type { Category } from '../types'

type Filter = 'all' | 'fixed' | 'variable'

// ── Pure helpers ────────────────────────────────────────────────

function toMonthStr(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

function toMonthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function shiftMonth(year: number, month: number, delta: number): [number, number] {
  const d = new Date(year, month - 1 + delta, 1)
  return [d.getFullYear(), d.getMonth() + 1]
}

// ── BudgetCell ──────────────────────────────────────────────────

interface BudgetCellProps {
  catId: string
  budgeted: number
  editing: { catId: string; value: string } | null
  onStartEdit: (catId: string) => void
  onChange: (value: string) => void
  onCommit: () => void
  onCancel: () => void
}

function BudgetCell({ catId, budgeted, editing, onStartEdit, onChange, onCommit, onCancel }: BudgetCellProps) {
  const active = editing?.catId === catId
  if (active) {
    return (
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="1"
        value={editing!.value}
        onChange={e => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); onCommit() }
          if (e.key === 'Escape') onCancel()
        }}
        autoFocus
        className="w-24 bg-slate-600 border border-indigo-500 text-white text-right rounded-lg px-2 py-1 text-sm focus:outline-none"
      />
    )
  }
  return (
    <button
      type="button"
      onClick={() => onStartEdit(catId)}
      className="min-w-[6rem] min-h-[44px] flex items-center justify-end text-sm hover:text-indigo-300 transition-colors"
    >
      {budgeted === 0
        ? <span className="text-slate-700">—</span>
        : <span className="text-white">{fmt(budgeted)}</span>}
    </button>
  )
}

// ── CategoryRow ─────────────────────────────────────────────────

interface CatRowProps {
  cat: Category
  budgeted: number
  spent: number
  editing: { catId: string; value: string } | null
  onStartEdit: (catId: string) => void
  onChange: (value: string) => void
  onCommit: () => void
  onCancel: () => void
}

function CategoryRow({ cat, budgeted, spent, editing, onStartEdit, onChange, onCommit, onCancel }: CatRowProps) {
  const remaining = budgeted - spent
  const over = budgeted > 0 && remaining < 0
  const pct = budgeted > 0 ? Math.min(100, (spent / budgeted) * 100) : 0
  const cellProps = { catId: cat.id, budgeted, editing, onStartEdit, onChange, onCommit, onCancel }

  return (
    <div className="border-b border-slate-800/60">
      <div className="flex items-center gap-2 px-4 min-h-[52px]">
        <span className="flex-1 text-sm text-slate-200">{cat.name}</span>

        {/* Mobile: budgeted (editable) + spent/remaining as small text */}
        <div className="flex flex-col items-end md:hidden">
          <BudgetCell {...cellProps} />
          <div className="text-xs flex gap-2 pb-1.5">
            {spent > 0 && <span className="text-slate-500">Spent {fmt(spent)}</span>}
            {budgeted > 0 && (
              <span className={over ? 'text-red-400' : 'text-slate-500'}>
                Left {fmt(remaining)}
              </span>
            )}
          </div>
        </div>

        {/* Desktop: three labeled columns */}
        <div className="hidden md:flex items-center">
          <div className="w-28 flex justify-end"><BudgetCell {...cellProps} /></div>
          <div className="w-24 text-right text-sm px-2 text-slate-400">
            {spent > 0 ? fmt(spent) : <span className="text-slate-700">—</span>}
          </div>
          <div className={`w-24 text-right text-sm px-2 ${budgeted > 0 ? (over ? 'text-red-400 font-medium' : 'text-slate-300') : 'text-slate-700'}`}>
            {budgeted > 0 ? fmt(remaining) : '—'}
          </div>
        </div>
      </div>

      {budgeted > 0 && (
        <div className="px-4 pb-2.5">
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${over ? 'bg-red-500' : 'bg-indigo-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── DashboardPage ───────────────────────────────────────────────

export default function DashboardPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<{ catId: string; value: string } | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle')
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const ms = toMonthStr(year, month)
  const { budgets, spentMap, loading, refetch } = useBudget(ms)
  const { categories } = useCategories()

  // Navigation
  function goToPrev() { const [y, m] = shiftMonth(year, month, -1); setYear(y); setMonth(m) }
  function goToNext() { const [y, m] = shiftMonth(year, month, 1); setYear(y); setMonth(m) }

  // Category groupings
  const incomeCategories = categories
    .filter(c => c.type === 'income' && !c.parent_category_id)
    .sort((a, b) => a.sort_order - b.sort_order)

  const parentGroups = categories
    .filter(c => !c.parent_category_id && c.type !== 'income')
    .sort((a, b) => a.sort_order - b.sort_order)

  function childrenOf(parentId: string) {
    return categories
      .filter(c => c.parent_category_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  function passesFilter(cat: Category) {
    if (filter === 'fixed') return cat.is_fixed
    if (filter === 'variable') return !cat.is_fixed
    return true
  }

  function subtotals(cats: Category[]) {
    const budgeted = cats.reduce((s, c) => s + (budgets.get(c.id) ?? 0), 0)
    const spent = cats.reduce((s, c) => s + (spentMap.get(c.id) ?? 0), 0)
    return { budgeted, spent, remaining: budgeted - spent }
  }

  function toggleGroup(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Inline edit handlers
  function startEdit(catId: string) {
    const current = budgets.get(catId) ?? 0
    setEditing({ catId, value: current === 0 ? '' : String(current) })
    setSaveState('idle')
  }

  function cancelEdit() { setEditing(null) }

  async function commitEdit() {
    if (!editing) return
    const { catId, value } = editing
    const amt = parseFloat(value)
    if (isNaN(amt) || amt < 0) { cancelEdit(); return }
    setEditing(null)
    await supabase
      .from('monthly_budgets')
      .upsert({ month: ms, category_id: catId, budgeted_amount: amt }, { onConflict: 'month,category_id' })
    setSaveState('saved')
    await refetch()
    setTimeout(() => setSaveState('idle'), 2000)
  }

  // Copy from previous month
  async function copyPrevMonth() {
    const [py, pm] = shiftMonth(year, month, -1)
    const priorMs = toMonthStr(py, pm)
    const priorLabel = toMonthLabel(py, pm)

    const { data: prior } = await supabase
      .from('monthly_budgets')
      .select('category_id, budgeted_amount')
      .eq('month', priorMs)

    if (!prior?.length) {
      setCopyStatus(`No budget found for ${priorLabel}`)
      setTimeout(() => setCopyStatus(null), 3000)
      return
    }

    const toInsert = (prior as { category_id: string; budgeted_amount: number }[])
      .filter(b => !budgets.has(b.category_id))

    if (toInsert.length === 0) {
      setCopyStatus('All categories already have a budget this month')
      setTimeout(() => setCopyStatus(null), 3000)
      return
    }

    await supabase
      .from('monthly_budgets')
      .upsert(
        toInsert.map(b => ({ month: ms, category_id: b.category_id, budgeted_amount: b.budgeted_amount })),
        { onConflict: 'month,category_id', ignoreDuplicates: true }
      )
    await refetch()
    setCopyStatus(`Copied ${toInsert.length} budgets from ${priorLabel}`)
    setTimeout(() => setCopyStatus(null), 4000)
  }

  // Totals
  const nonIncomeLeaves = categories.filter(c => c.type !== 'income' && !!c.parent_category_id)
  const grandTotals = subtotals(nonIncomeLeaves)
  const incomeTotals = subtotals(incomeCategories)

  const editProps = {
    editing,
    onStartEdit: startEdit,
    onChange: (v: string) => setEditing(prev => prev ? { ...prev, value: v } : null),
    onCommit: commitEdit,
    onCancel: cancelEdit,
  }

  const visibleIncomeCategories = incomeCategories.filter(passesFilter)

  return (
    <div className="max-w-2xl mx-auto pb-8">

      {/* Month navigation */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={goToPrev}
          className="text-slate-400 hover:text-white p-2 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          <span className="text-xl font-light leading-none">‹</span>
        </button>
        <span className="text-white font-semibold">{toMonthLabel(year, month)}</span>
        <button
          onClick={goToNext}
          className="text-slate-400 hover:text-white p-2 rounded-lg transition-colors"
          aria-label="Next month"
        >
          <span className="text-xl font-light leading-none">›</span>
        </button>
      </div>

      {/* Controls: filter + copy */}
      <div className="px-4 pt-3 pb-2 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl overflow-hidden border border-slate-700">
          {(['all', 'fixed', 'variable'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                filter === f ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <button
            onClick={copyPrevMonth}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Copy from previous month
          </button>
          {saveState === 'saved' && <span className="text-xs text-green-400">Saved</span>}
          {copyStatus && <span className="text-xs text-slate-400">{copyStatus}</span>}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <span className="text-slate-600">Loading…</span>
        </div>
      ) : (
        <>
          {/* Desktop column headers */}
          <div className="hidden md:flex items-center px-4 py-2 border-b border-slate-800/60 text-xs text-slate-500 uppercase tracking-wider">
            <span className="flex-1">Category</span>
            <span className="w-28 text-right">Budgeted</span>
            <span className="w-24 text-right px-2">Spent</span>
            <span className="w-24 text-right px-2">Remaining</span>
          </div>

          {/* Income section */}
          {visibleIncomeCategories.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/40 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Income</span>
                <div className="flex gap-3 text-xs">
                  <span className="text-slate-500">Budget {fmt(incomeTotals.budgeted)}</span>
                  <span className="text-green-400">Earned {fmt(incomeTotals.spent)}</span>
                </div>
              </div>
              {visibleIncomeCategories.map(cat => (
                <CategoryRow
                  key={cat.id}
                  cat={cat}
                  budgeted={budgets.get(cat.id) ?? 0}
                  spent={spentMap.get(cat.id) ?? 0}
                  {...editProps}
                />
              ))}
            </div>
          )}

          {/* Expense / Savings / Giving groups */}
          {parentGroups.map(parent => {
            const allChildren = childrenOf(parent.id)
            const visibleChildren = allChildren.filter(passesFilter)
            if (visibleChildren.length === 0) return null
            const isOpen = !collapsed.has(parent.id)
            const sub = subtotals(allChildren)
            const subOver = sub.budgeted > 0 && sub.remaining < 0

            return (
              <div key={parent.id}>
                <button
                  type="button"
                  onClick={() => toggleGroup(parent.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-800/40 border-b border-slate-800 hover:bg-slate-800/70 transition-colors min-h-[44px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 text-xs">{isOpen ? '▼' : '▶'}</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{parent.name}</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-slate-500">{fmt(sub.budgeted)}</span>
                    <span className={subOver ? 'text-red-400' : 'text-slate-500'}>{fmt(sub.remaining)} left</span>
                  </div>
                </button>
                {isOpen && visibleChildren.map(cat => (
                  <CategoryRow
                    key={cat.id}
                    cat={cat}
                    budgeted={budgets.get(cat.id) ?? 0}
                    spent={spentMap.get(cat.id) ?? 0}
                    {...editProps}
                  />
                ))}
              </div>
            )
          })}

          {/* Grand totals */}
          <div className="mx-4 mt-5 rounded-xl border border-slate-700 bg-slate-800/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-300">Total</span>
              <div className="flex gap-5">
                <div className="text-right">
                  <div className="text-xs text-slate-500 mb-0.5">Budgeted</div>
                  <div className="text-sm font-medium text-white">{fmt(grandTotals.budgeted)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 mb-0.5">Spent</div>
                  <div className="text-sm text-slate-300">{fmt(grandTotals.spent)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 mb-0.5">Remaining</div>
                  <div className={`text-sm font-medium ${grandTotals.remaining < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {fmt(grandTotals.remaining)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
