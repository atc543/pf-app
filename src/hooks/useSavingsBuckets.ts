import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { SavingsBucket } from '../types'

export function useSavingsBuckets() {
  const [buckets, setBuckets] = useState<SavingsBucket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('savings_buckets')
      .select('*')
      .eq('active', true)
      .order('sort_order')
      .then(({ data }) => {
        setBuckets(data ?? [])
        setLoading(false)
      })
  }, [])

  return { buckets, loading }
}
