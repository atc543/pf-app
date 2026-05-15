import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Transaction } from '../types'

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const { data, error: sbErr } = await supabase
        .from('transactions')
        .select('*, categories(*)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (sbErr) throw sbErr
      setTransactions((data as unknown as Transaction[]) ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    }
  }, [])

  useEffect(() => {
    load().then(() => setLoading(false))

    const channel = supabase
      .channel('transactions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [load])

  return { transactions, loading, error, refetch: load }
}
