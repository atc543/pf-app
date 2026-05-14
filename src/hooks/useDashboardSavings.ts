import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { InvestmentAccount, InvestmentAccountSnapshot, NetWorthSnapshot, SavingsBucket } from '../types'

export interface BucketHistoryPoint {
  month: string
  [bucketName: string]: number | string
}

export interface SavingsData {
  buckets: SavingsBucket[]
  investmentAccounts: InvestmentAccount[]
  investmentSnapshots: InvestmentAccountSnapshot[]
  netWorthSnapshots: NetWorthSnapshot[]
  bucketHistory: BucketHistoryPoint[]
  totalSavings: number
  totalInvestments: number
  totalNetWorth: number
  loading: boolean
}

export function useDashboardSavings(): SavingsData {
  const [data, setData] = useState<SavingsData>({
    buckets: [],
    investmentAccounts: [],
    investmentSnapshots: [],
    netWorthSnapshots: [],
    bucketHistory: [],
    totalSavings: 0,
    totalInvestments: 0,
    totalNetWorth: 0,
    loading: true,
  })

  const load = useCallback(async () => {
    const [
      { data: bucketsData },
      { data: invAccountsData },
      { data: invSnapshotsData },
      { data: nwData },
      { data: savingsTxData },
    ] = await Promise.all([
      supabase.from('savings_buckets').select('*').eq('active', true).order('sort_order'),
      supabase.from('investment_accounts').select('*').eq('active', true).order('sort_order'),
      supabase.from('investment_account_snapshots').select('*').order('month'),
      supabase.from('net_worth_snapshots').select('*').order('month'),
      supabase
        .from('transactions')
        .select('date, amount, savings_bucket_id')
        .not('savings_bucket_id', 'is', null)
        .gte('date', '2024-09-01')
        .lte('date', '2026-04-30')
        .order('date'),
    ])

    const buckets = (bucketsData ?? []) as SavingsBucket[]
    const investmentAccounts = (invAccountsData ?? []) as InvestmentAccount[]
    const investmentSnapshots = (invSnapshotsData ?? []) as InvestmentAccountSnapshot[]
    const netWorthSnapshots = (nwData ?? []) as NetWorthSnapshot[]

    // Build monthly net savings by bucket from transactions
    // Structure: monthBucketNet[month][bucketId] = net delta
    const monthBucketNet = new Map<string, Map<string, number>>()
    for (const tx of (savingsTxData ?? []) as { date: string; amount: number; savings_bucket_id: string }[]) {
      const month = tx.date.substring(0, 7) + '-01'
      if (!monthBucketNet.has(month)) monthBucketNet.set(month, new Map())
      const bmap = monthBucketNet.get(month)!
      const bid = tx.savings_bucket_id
      bmap.set(bid, (bmap.get(bid) ?? 0) + Number(tx.amount))
    }

    // Walk backwards from current_balance (Apr 2026) to build history
    // currentBalance[bucketId] = current value (Apr 2026)
    const currentBalance = new Map<string, number>()
    for (const b of buckets) {
      currentBalance.set(b.id, Number(b.current_balance))
    }

    // Collect all months from Sep 2024 to Apr 2026, sorted descending for walk-back
    const allMonths: string[] = []
    let d = new Date(2024, 8, 1) // Sep 2024
    const end = new Date(2026, 3, 1) // Apr 2026
    while (d <= end) {
      allMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    }

    // Walk backwards: balance at end of month M = balance at end of M+1 minus net transactions in M+1
    const balanceAtEndOf = new Map<string, Map<string, number>>()
    // Start: end of Apr 2026 = current_balance
    const latestMonth = allMonths[allMonths.length - 1]
    balanceAtEndOf.set(latestMonth, new Map(currentBalance))

    for (let i = allMonths.length - 2; i >= 0; i--) {
      const thisMonth = allMonths[i]
      const nextMonth = allMonths[i + 1]
      const prevBals = balanceAtEndOf.get(nextMonth)!
      const thisMonthNet = monthBucketNet.get(nextMonth) ?? new Map()
      const thisBals = new Map<string, number>()
      for (const b of buckets) {
        const prevBal = prevBals.get(b.id) ?? 0
        const delta = thisMonthNet.get(b.id) ?? 0
        thisBals.set(b.id, prevBal - delta)
      }
      balanceAtEndOf.set(thisMonth, thisBals)
    }

    // Build chart-friendly array
    const bucketHistory: BucketHistoryPoint[] = allMonths.map(month => {
      const bals = balanceAtEndOf.get(month)!
      const point: BucketHistoryPoint = { month }
      for (const b of buckets) {
        point[b.name] = Math.max(0, bals.get(b.id) ?? 0)
      }
      return point
    })

    const totalSavings = buckets.reduce((s, b) => s + Number(b.current_balance), 0)

    // Total investments = sum of latest snapshot per account
    const latestByAccount = new Map<string, number>()
    for (const snap of investmentSnapshots) {
      latestByAccount.set(snap.account_id, Number(snap.balance))
    }
    const totalInvestments = Array.from(latestByAccount.values()).reduce((s, v) => s + v, 0)

    const latestNW = netWorthSnapshots.length > 0
      ? Number(netWorthSnapshots[netWorthSnapshots.length - 1].total_net_worth)
      : 0

    setData({
      buckets,
      investmentAccounts,
      investmentSnapshots,
      netWorthSnapshots,
      bucketHistory,
      totalSavings,
      totalInvestments,
      totalNetWorth: latestNW,
      loading: false,
    })
  }, [])

  useEffect(() => { load() }, [load])

  return data
}
