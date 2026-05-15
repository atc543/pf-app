import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBudget } from '../hooks/useBudget'
import { useCategories } from '../hooks/useCategories'
import LoadingSpinner from '../components/LoadingSpinner'
import type { Category } from '../types'

type Filter = 'all' | 'fixed' | 'variable'

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
        className="w-24 bg-pf-bg border border-pf-gold text-pf-ink text-right rounded-lg px-2 py-1 text-sm focus:outline-none"
      />
    )
  }
  return (
    <button
      type="button"
      onClick={() => onStartEdit(catId)}
      className="min-w-[6rem] min-h-[44px] flex items-center justify-end text-sm hover:text-pf-gold transition-colors"
    >
      {budgeted === 0
        ? <span className="text-pf-ghost">—</span>
        : <span className="text-pf-ink amt">{fmt(budgeted)}</span>}
    </button>
  )
}

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
    <div className="border-b border-pf-line/60">
      <div className="flex items-center gap-2 px-4 min-h-[52px]">
        <span className="flex-1 text-sm text-pf-ink">{cat.name}</span>

        <div className="flex flex-col items-end md:hidden">
          <BudgetCell {...cellProps} />
          <div className="text-xs flex gap-2 pb-1.5">
            {spent > 0 && <span className="text-pf-ghost">Spent {fmt(spent)}</span>}
            {budgeted > 0 && (
              <span className={over ? 'text-pf-coral' : 'text-pf-ghost'}>
                Left {fmt(remaining)}
              </span>
            )}
          </div>
        </div>

        <div className="hidden md:flex items-center">
          <div className="w-28 flex justify-end"><BudgetCell {...cellProps} /></div>
          <div className="w-24 text-right text-sm px-2 text-pf-dim">
            {spent > 0 ? fmt(spent) : <span className="text-pf-ghost">—</span>}
          </div>
          <div className={`w-24 text-right text-sm px-2 ${budgeted > 0 ? (over ? 'text-pf-coral font-medium' : 'text-pf-dim') : 'text-pf-ghost'}`}>
            {budgeted > 0 ? fmt(remaining) : '—'}
          </div>
        </div>
      </div>

      {budgeted > 0 && (
        <div className="px-4 pb-2.5">
          <div className="h-[3px] bg-pf-line rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${over ? 'bg-pf-coral' : 'bg-pf-leaf'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function BudgetPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<{ catId: string; value: string } | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle')
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const ms = toMonthStr(year, month)
  const { budgets, spentMap, loading, error, refetch } = useBudget(ms)
  const { categories } = useCategories()

  function goToPrev() { const [y, m] = shiftMonth(year, month, -1); setYear(y); setMonth(m) }
  function goToNext() { const [y, m] = shiftMonth(year, month, 1); setYear(y); setMonth(m) }

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

      <div className="sticky top-0 z-10 bg-pf-bg/95 backdrop-blur-sm border-b border-pf-line px-4 py-3 flex items-center justify-between">
        <button
          onClick={goToPrev}
          className="text-pf-ghost hover:text-pf-ink p-2 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          <span className="text-xl font-light leading-none">‹</span>
        </button>
        <span className="text-pf-ink font-medium">{toMonthLabel(year, month)}</span>
        <button
          onClick={goToNext}
          className="text-pf-ghost hover:text-pf-ink p-2 rounded-lg transition-colors"
          aria-label="Next month"
        >
          <span className="text-xl font-light leading-none">›</span>
        </button>
      </div>

      <div className="px-4 pt-3 pb-2 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl overflow-hidden border border-pf-line">
          {(['all', 'fixed', 'variable'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                filter === f ? 'bg-pf-gold text-pf-bg' : 'bg-pf-card text-pf-ghost hover:text-pf-ink'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <button
            onClick={copyPrevMonth}
            className="text-sm text-pf-gold hover:text-pf-gold/80 transition-colors"
          >
            Copy from previous month
          </button>
          {saveState === 'saved' && <span className="text-xs text-pf-leaf">Saved</span>}
          {copyStatus && <span className="text-xs text-pf-dim">{copyStatus}</span>}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-40 text-center px-6">
          <p className="text-pf-coral mb-1">Failed to load budget</p>
          <p className="text-pf-ghost text-sm">{error}</p>
        </div>
      ) : budgets.size === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-center px-6">
          <p className="text-pf-dim mb-1">No budget set for this month</p>
          <p className="text-pf-ghost text-sm">Use "Copy from previous month" above to get started.</p>
        </div>
      ) : (
        <>
          <div className="hidden md:flex items-center px-4 py-2 border-b border-pf-line/60">
            <span className="flex-1 lbl">Category</span>
            <span className="w-28 text-right lbl">Budgeted</span>
            <span className="w-24 text-right px-2 lbl">Spent</span>
            <span className="w-24 text-right px-2 lbl">Remaining</span>
          </div>

          {visibleIncomeCategories.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-4 py-2.5 bg-pf-card/40 border-b border-pf-line">
                <span className="lbl">Income</span>
                <div className="flex gap-3 text-xs">
                  <span className="text-pf-ghost">Budget {fmt(incomeTotals.budgeted)}</span>
                  <span className="text-pf-leaf">Earned {fmt(incomeTotals.spent)}</span>
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
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-pf-card/40 border-b border-pf-line hover:bg-pf-card/70 transition-colors min-h-[44px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-pf-ghost text-xs">{isOpen ? '▼' : '▶'}</span>
                    <span className="lbl">{parent.name}</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-pf-ghost">{fmt(sub.budgeted)}</span>
                    <span className={subOver ? 'text-pf-coral' : 'text-pf-ghost'}>{fmt(sub.remaining)} left</span>
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

          <div className="mx-4 mt-5 rounded-[10px] border border-pf-line bg-pf-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-pf-dim">Total</span>
              <div className="flex gap-5">
                <div className="text-right">
                  <div className="lbl mb-0.5">Budgeted</div>
                  <div className="text-sm text-pf-ink amt">{fmt(grandTotals.budgeted)}</div>
                </div>
                <div className="text-right">
                  <div className="lbl mb-0.5">Spent</div>
                  <div className="text-sm text-pf-dim">{fmt(grandTotals.spent)}</div>
                </div>
                <div className="text-right">
                  <div className="lbl mb-0.5">Remaining</div>
                  <div className={`text-sm font-medium ${grandTotals.remaining < 0 ? 'text-pf-coral' : 'text-pf-leaf'}`}>
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
