import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface SpendingTx {
  date: string
  month: string
  amount: number // ABS value — always positive
  categoryId: string
  categoryName: string
  categoryType: string
  isFixed: boolean
  parentCategoryId: string | null
}

export interface SpendingCat {
  id: string
  name: string
  type: string
  is_fixed: boolean
  parent_category_id: string | null
  active: boolean
}

export interface SpendingBudget {
  month: string
  category_id: string
  budgeted_amount: number
}

export interface SpendingData {
  spendingTxs: SpendingTx[]
  incomeTxs: { month: string; amount: number; categoryId: string }[]
  categories: SpendingCat[]
  budgets: SpendingBudget[]
  threePaycheckMonths: Set<string>
  months: string[]
  loading: boolean
  error: string | null
}

function buildMonths(): string[] {
  const out: string[] = []
  let d = new Date(2024, 8, 1)
  const end = new Date(2026, 3, 1)
  while (d <= end) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  }
  return out
}

const ALL_MONTHS = buildMonths()

type RawTx = {
  date: string
  amount: string | number
  category_id: string
  categories: { name: string; type: string; is_fixed: boolean; parent_category_id: string | null } | null
}

export function useDashboardSpending(): SpendingData {
  const [data, setData] = useState<SpendingData>({
    spendingTxs: [], incomeTxs: [], categories: [], budgets: [],
    threePaycheckMonths: new Set(), months: ALL_MONTHS, loading: true, error: null,
  })

  const load = useCallback(async () => {
    try {
    const [{ data: txData }, { data: catData }, { data: budgetData }, { data: tpmData }] = await Promise.all([
      supabase
        .from('transactions')
        .select('date, amount, category_id, categories(name, type, is_fixed, parent_category_id)')
        .gte('date', '2024-09-01').lte('date', '2026-04-30').order('date'),
      supabase.from('categories').select('id, name, type, is_fixed, parent_category_id, active').eq('active', true),
      supabase.from('monthly_budgets').select('month, category_id, budgeted_amount'),
      supabase.from('three_paycheck_months').select('month'),
    ])

    const spendingTxs: SpendingTx[] = []
    const incomeTxs: { month: string; amount: number; categoryId: string }[] = []

    for (const tx of (txData ?? []) as unknown as RawTx[]) {
      const cat = tx.categories
      if (!cat) continue
      const month = tx.date.substring(0, 7) + '-01'
      const amt = Number(tx.amount)
      if (cat.type === 'income' && amt > 0) {
        incomeTxs.push({ month, amount: amt, categoryId: tx.category_id })
      } else if ((cat.type === 'expense' || cat.type === 'giving') && amt < 0) {
        spendingTxs.push({
          date: tx.date, month, amount: Math.abs(amt),
          categoryId: tx.category_id, categoryName: cat.name,
          categoryType: cat.type, isFixed: Boolean(cat.is_fixed),
          parentCategoryId: cat.parent_category_id,
        })
      }
    }

    setData({
      spendingTxs,
      incomeTxs,
      categories: (catData ?? []) as SpendingCat[],
      budgets: (budgetData ?? []).map((b: any) => ({
        month: b.month, category_id: b.category_id, budgeted_amount: Number(b.budgeted_amount),
      })),
      threePaycheckMonths: new Set((tpmData ?? []).map((r: { month: string }) => r.month)),
      months: ALL_MONTHS,
      loading: false,
      error: null,
    })
    } catch (err) {
      setData(prev => ({ ...prev, loading: false, error: err instanceof Error ? err.message : 'Failed to load' }))
    }
  }, [])

  useEffect(() => { load() }, [load])
  return data
}
