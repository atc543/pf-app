import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Transaction } from '../types'

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*, categories(*)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    setTransactions((data as unknown as Transaction[]) ?? [])
  }, [])

  useEffect(() => {
    load().then(() => setLoading(false))

    const channel = supabase
      .channel('transactions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [load])

  return { transactions, loading, refetch: load }
}
