import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { NetWorthSnapshot } from '../types'

interface MonthlyTotals {
  month: string // YYYY-MM-01
  income: number
  spending: number
  savings: number
  giving: number
  net: number
}

export interface OverviewData {
  monthlyTotals: MonthlyTotals[]
  threePaycheckMonths: Set<string>
  medianNormalIncome: number
  medianThreePaycheckIncome: number
  medianSpending: number
  medianSavingsRate: number
  avgGiving: number
  netWorthSnapshots: NetWorthSnapshot[]
  loading: boolean
  error: string | null
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function useDashboardOverview(): OverviewData {
  const [data, setData] = useState<OverviewData>({
    monthlyTotals: [],
    threePaycheckMonths: new Set(),
    medianNormalIncome: 0,
    medianThreePaycheckIncome: 0,
    medianSpending: 0,
    medianSavingsRate: 0,
    avgGiving: 0,
    netWorthSnapshots: [],
    loading: true,
    error: null,
  })

  const load = useCallback(async () => {
    try {
    const [
      { data: txData },
      { data: tpmData },
      { data: nwData },
    ] = await Promise.all([
      supabase
        .from('transactions')
        .select('date, amount, categories(type)')
        .gte('date', '2024-09-01')
        .lte('date', '2026-04-30')
        .order('date'),
      supabase.from('three_paycheck_months').select('month'),
      supabase.from('net_worth_snapshots').select('*').order('month'),
    ])

    const threePaycheckMonths = new Set<string>(
      (tpmData ?? []).map((r: { month: string }) => r.month)
    )

    // Aggregate transactions by month
    const monthMap = new Map<string, { income: number; spending: number; savings: number; giving: number }>()

    for (const tx of (txData ?? []) as unknown as { date: string; amount: number; categories: { type: string } | null }[]) {
      const month = tx.date.substring(0, 7) + '-01'
      if (!monthMap.has(month)) monthMap.set(month, { income: 0, spending: 0, savings: 0, giving: 0 })
      const m = monthMap.get(month)!
      const type = tx.categories?.type
      const amt = Number(tx.amount)

      if (type === 'income' && amt > 0) m.income += amt
      else if (type === 'expense' && amt < 0) m.spending += Math.abs(amt)
      else if (type === 'giving' && amt < 0) m.giving += Math.abs(amt)
      else if (type === 'savings' && amt > 0) m.savings += amt
    }

    const monthlyTotals: MonthlyTotals[] = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        income: v.income,
        spending: v.spending,
        savings: v.savings,
        giving: v.giving,
        net: v.income - v.spending - v.savings - v.giving,
      }))

    const normalMonthTotals = monthlyTotals.filter(m => !threePaycheckMonths.has(m.month))
    const threeMonthTotals = monthlyTotals.filter(m => threePaycheckMonths.has(m.month))

    const medianNormalIncome = median(normalMonthTotals.map(m => m.income))
    const medianThreePaycheckIncome = median(threeMonthTotals.map(m => m.income))
    const medianSpending = median(monthlyTotals.map(m => m.spending))

    const savingsRates = monthlyTotals
      .filter(m => m.income > 0)
      .map(m => (m.savings + m.giving) / m.income)
    const medianSavingsRate = median(savingsRates)

    const avgGiving = monthlyTotals.length > 0
      ? monthlyTotals.reduce((s, m) => s + m.giving, 0) / monthlyTotals.length
      : 0

    setData({
      monthlyTotals,
      threePaycheckMonths,
      medianNormalIncome,
      medianThreePaycheckIncome,
      medianSpending,
      medianSavingsRate,
      avgGiving,
      netWorthSnapshots: (nwData ?? []) as NetWorthSnapshot[],
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
