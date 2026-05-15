import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface RecCategory {
  id: string
  name: string
  type: string
  is_fixed: boolean
  parent_category_id: string | null
  currentBudget: number | null
  avgActual: number
  suggested: number
  status: 'Over' | 'Under' | 'On track'
}

export interface RecommendationsData {
  fixed: RecCategory[]
  variable: RecCategory[]
  currentTotal: number
  suggestedTotal: number
  medianIncome: number
  loading: boolean
  error: string | null
}

function median(vals: number[]): number {
  if (vals.length === 0) return 0
  const sorted = [...vals].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

type RawTx = {
  date: string
  amount: string | number
  category_id: string
  categories: { type: string } | null
}

type RawCat = {
  id: string
  name: string
  type: string
  is_fixed: boolean
  parent_category_id: string | null
}

type RawBudget = {
  month: string
  category_id: string
  budgeted_amount: string | number
}

export function useDashboardRecommendations(): RecommendationsData {
  const [data, setData] = useState<RecommendationsData>({
    fixed: [], variable: [], currentTotal: 0, suggestedTotal: 0, medianIncome: 0, loading: true, error: null,
  })

  const load = useCallback(async () => {
    try {
    const [{ data: catData }, { data: budgetData }, { data: txData }, { data: tpmData }] = await Promise.all([
      supabase.from('categories').select('id, name, type, is_fixed, parent_category_id'),
      supabase.from('monthly_budgets').select('month, category_id, budgeted_amount'),
      supabase
        .from('transactions')
        .select('date, amount, category_id, categories(type)')
        .gte('date', '2024-09-01').lte('date', '2026-04-30'),
      supabase.from('three_paycheck_months').select('month'),
    ])

    const cats = (catData ?? []) as RawCat[]
    const budgets = (budgetData ?? []) as RawBudget[]
    const txs = (txData ?? []) as unknown as RawTx[]
    const tpmSet = new Set((tpmData ?? []).map((r: { month: string }) => r.month))

    // Leaf detection
    const parentIds = new Set(cats.map(c => c.parent_category_id).filter(Boolean) as string[])
    const leaves = cats.filter(c => !parentIds.has(c.id))

    // Authoritative months from monthly_budgets
    const authMonths = [...new Set(budgets.map(b => b.month))].sort()
    const numMonths = authMonths.length || 20

    // Per-category: most recent budget
    const budgetsByCategory = new Map<string, { month: string; amount: number }[]>()
    for (const b of budgets) {
      const amt = Number(b.budgeted_amount)
      if (!budgetsByCategory.has(b.category_id)) budgetsByCategory.set(b.category_id, [])
      budgetsByCategory.get(b.category_id)!.push({ month: b.month, amount: amt })
    }

    // Per-category: total spend from expense/giving transactions (amount < 0)
    const spendByCategory = new Map<string, number>()
    const incomeByMonth = new Map<string, number>()
    for (const tx of txs) {
      const cat = tx.categories
      if (!cat) continue
      const amt = Number(tx.amount)
      const month = tx.date.substring(0, 7) + '-01'
      if (cat.type === 'income' && amt > 0) {
        incomeByMonth.set(month, (incomeByMonth.get(month) ?? 0) + amt)
      } else if ((cat.type === 'expense' || cat.type === 'giving') && amt < 0) {
        spendByCategory.set(tx.category_id, (spendByCategory.get(tx.category_id) ?? 0) + Math.abs(amt))
      }
    }

    // Median income excluding 3-paycheck months
    const normalIncomes = [...incomeByMonth.entries()]
      .filter(([m]) => !tpmSet.has(m))
      .map(([, v]) => v)
    const medianIncome = median(normalIncomes)

    function buildRec(cat: RawCat): RecCategory {
      const catBudgets = (budgetsByCategory.get(cat.id) ?? [])
        .filter(b => b.amount > 0)
        .sort((a, b) => b.month.localeCompare(a.month))
      const currentBudget = catBudgets.length > 0 ? catBudgets[0].amount : null
      const totalSpend = spendByCategory.get(cat.id) ?? 0
      const avgActual = totalSpend / numMonths
      const suggested = Math.round(avgActual / 25) * 25

      let status: RecCategory['status'] = 'On track'
      if (currentBudget !== null) {
        if (suggested > currentBudget + 25) status = 'Over'
        else if (suggested < currentBudget - 25) status = 'Under'
      }

      return { ...cat, currentBudget, avgActual, suggested, status }
    }

    const fixedLeaves = leaves
      .filter(c => c.is_fixed && (c.type === 'expense' || c.type === 'giving'))
      .map(buildRec)
      .sort((a, b) => b.avgActual - a.avgActual)

    const varLeaves = leaves
      .filter(c => !c.is_fixed && c.type === 'expense')
      .map(buildRec)
      .sort((a, b) => b.avgActual - a.avgActual)

    const allRecs = [...fixedLeaves, ...varLeaves]
    const currentTotal = allRecs.reduce((s, r) => s + (r.currentBudget ?? 0), 0)
    const suggestedTotal = allRecs.reduce((s, r) => s + r.suggested, 0)

    setData({ fixed: fixedLeaves, variable: varLeaves, currentTotal, suggestedTotal, medianIncome, loading: false, error: null })
    } catch (err) {
      setData(prev => ({ ...prev, loading: false, error: err instanceof Error ? err.message : 'Failed to load' }))
    }
  }, [])

  useEffect(() => { load() }, [load])
  return data
}
