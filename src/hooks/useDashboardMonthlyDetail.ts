import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface DetailTx {
  date: string
  month: string
  amount: number // signed
  categoryId: string
  categoryName: string
  categoryType: string
  isFixed: boolean
  parentCategoryId: string | null
}

export interface DetailCat {
  id: string
  name: string
  type: string
  is_fixed: boolean
  parent_category_id: string | null
  active: boolean
}

export interface DetailBudget {
  month: string
  category_id: string
  budgeted_amount: number
}

export interface MonthlyDetailData {
  transactions: DetailTx[]
  categories: DetailCat[]
  budgets: DetailBudget[]
  threePaycheckMonths: Set<string>
  loading: boolean
  error: string | null
}

type RawTx = {
  date: string
  amount: string | number
  category_id: string
  categories: { name: string; type: string; is_fixed: boolean; parent_category_id: string | null } | null
}

export function useDashboardMonthlyDetail(): MonthlyDetailData {
  const [data, setData] = useState<MonthlyDetailData>({
    transactions: [], categories: [], budgets: [], threePaycheckMonths: new Set(), loading: true, error: null,
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

    const transactions: DetailTx[] = []
    for (const tx of (txData ?? []) as unknown as RawTx[]) {
      const cat = tx.categories
      if (!cat) continue
      transactions.push({
        date: tx.date, month: tx.date.substring(0, 7) + '-01',
        amount: Number(tx.amount), categoryId: tx.category_id,
        categoryName: cat.name, categoryType: cat.type,
        isFixed: Boolean(cat.is_fixed), parentCategoryId: cat.parent_category_id,
      })
    }

    setData({
      transactions,
      categories: (catData ?? []) as DetailCat[],
      budgets: (budgetData ?? []).map((b: any) => ({
        month: b.month, category_id: b.category_id, budgeted_amount: Number(b.budgeted_amount),
      })),
      threePaycheckMonths: new Set((tpmData ?? []).map((r: { month: string }) => r.month)),
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
