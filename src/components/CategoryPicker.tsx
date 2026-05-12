import { useState } from 'react'
import type { Category } from '../types'

interface Props {
  categories: Category[]
  selectedId: string
  onSelect: (id: string) => void
  onClose: () => void
}

export default function CategoryPicker({ categories, selectedId, onSelect, onClose }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const incomeCategories = categories
    .filter(c => c.type === 'income' && !c.parent_category_id)
    .sort((a, b) => a.sort_order - b.sort_order)

  const givingParent = categories.find(c => c.type === 'giving' && !c.parent_category_id)
  const givingChildren = categories
    .filter(c => c.type === 'giving' && !!c.parent_category_id)
    .sort((a, b) => a.sort_order - b.sort_order)

  const savingsParent = categories.find(c => c.type === 'savings' && !c.parent_category_id)
  const savingsChildren = categories
    .filter(c => c.type === 'savings' && !!c.parent_category_id && c.name !== 'Investments')
    .sort((a, b) => a.sort_order - b.sort_order)

  const expenseParents = categories
    .filter(c => c.type === 'expense' && !c.parent_category_id)
    .sort((a, b) => a.sort_order - b.sort_order)

  function childrenOf(parentId: string) {
    return categories
      .filter(c => c.parent_category_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  function select(id: string) {
    onSelect(id)
    onClose()
  }

  const leafBtn = (cat: Category) => (
    <button
      key={cat.id}
      onClick={() => select(cat.id)}
      className={`w-full text-left px-6 py-3.5 text-base transition-colors min-h-[44px] ${
        selectedId === cat.id
          ? 'bg-indigo-600 text-white'
          : 'text-slate-200 active:bg-slate-700'
      }`}
    >
      {cat.name}
    </button>
  )

  const groupBtn = (cat: Category) => (
    <button
      key={cat.id}
      onClick={() => toggle(cat.id)}
      className="w-full text-left px-4 py-3.5 flex items-center justify-between text-slate-300 font-medium active:bg-slate-800 transition-colors min-h-[44px]"
    >
      <span>{cat.name}</span>
      <span className="text-slate-500 text-sm">{expanded.has(cat.id) ? '▲' : '▼'}</span>
    </button>
  )

  const sectionLabel = (text: string) => (
    <div className="px-4 pt-4 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-widest">
      {text}
    </div>
  )

  return (
    <>
      <div className="fixed inset-0 z-60 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-70 flex flex-col bg-slate-900 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px] md:max-h-[80vh] md:rounded-2xl md:border md:border-slate-700 md:shadow-2xl">

        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800 shrink-0">
          <h2 className="text-lg font-semibold text-white">Category</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
        </div>

        <div className="flex-1 overflow-y-auto pb-8">
          {sectionLabel('Income')}
          {incomeCategories.map(leafBtn)}

          {givingParent && (
            <>
              {sectionLabel('Giving')}
              {groupBtn(givingParent)}
              {expanded.has(givingParent.id) && givingChildren.map(leafBtn)}
            </>
          )}

          {savingsParent && (
            <>
              {sectionLabel('Savings')}
              {groupBtn(savingsParent)}
              {expanded.has(savingsParent.id) && savingsChildren.map(leafBtn)}
            </>
          )}

          {sectionLabel('Expenses')}
          {expenseParents.map(parent => (
            <div key={parent.id}>
              {groupBtn(parent)}
              {expanded.has(parent.id) && childrenOf(parent.id).map(leafBtn)}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
