import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useBudget(monthStr: string) {
  const [budgets, setBudgets] = useState<Map<string, number>>(new Map())
  const [spentMap, setSpentMap] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [year, month] = monthStr.split('-').map(Number)
      const lastDate = new Date(year, month, 0).getDate()
      const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDate).padStart(2, '0')}`

      const [{ data: bData, error: bErr }, { data: tData, error: tErr }] = await Promise.all([
        supabase.from('monthly_budgets').select('category_id, budgeted_amount').eq('month', monthStr),
        supabase.from('transactions').select('category_id, amount, categories(type)').gte('date', monthStr).lte('date', end),
      ])

      if (bErr) throw bErr
      if (tErr) throw tErr

      const newBudgets = new Map<string, number>()
      for (const b of (bData ?? []) as { category_id: string; budgeted_amount: number }[]) {
        newBudgets.set(b.category_id, Number(b.budgeted_amount))
      }
      setBudgets(newBudgets)

      const newSpent = new Map<string, number>()
      for (const tx of (tData ?? []) as unknown as { category_id: string; amount: number; categories: { type: string } | null }[]) {
        const type = tx.categories?.type
        const amt = Number(tx.amount)
        let contribution = 0
        if (type === 'income' && amt > 0) contribution = amt
        else if ((type === 'expense' || type === 'giving') && amt < 0) contribution = Math.abs(amt)
        else if (type === 'savings' && amt > 0) contribution = amt
        if (contribution > 0) newSpent.set(tx.category_id, (newSpent.get(tx.category_id) ?? 0) + contribution)
      }
      setSpentMap(newSpent)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budget')
    } finally {
      setLoading(false)
    }
  }, [monthStr])

  useEffect(() => { load() }, [load])

  return { budgets, spentMap, loading, error, refetch: load }
}
