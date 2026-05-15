import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export const BASE_SCHED = [
  {m:'Apr 2026', gi_f:0,      luke:4912, phase:'pre',    pl:'Both working'},
  {m:'May 2026', gi_f:0,      luke:4912, phase:'pre',    pl:'Both working'},
  {m:'Jun 2026', gi_f:0,      luke:4912, phase:'pre',    pl:'Both working'},
  {m:'Jul 2026', gi_f:0,      luke:2456, phase:'trans',  pl:'Luke last day Jul 10'},
  {m:'Aug 2026', gi_f:0.7228, luke:0,    phase:'school', pl:'Opening Term Aug 10'},
  {m:'Sep 2026', gi_f:1.0,    luke:0,    phase:'school', pl:'Year 1 Fall'},
  {m:'Oct 2026', gi_f:1.0,    luke:0,    phase:'school', pl:'Year 1 Fall'},
  {m:'Nov 2026', gi_f:1.0,    luke:0,    phase:'school', pl:'Year 1 Fall'},
  {m:'Dec 2026', gi_f:0.5257, luke:0,    phase:'trans',  pl:'Finals end Dec 16'},
  {m:'Jan 2027', gi_f:0.6242, luke:0,    phase:'trans',  pl:'Spring starts Jan 13'},
  {m:'Feb 2027', gi_f:0.9199, luke:0,    phase:'school', pl:'Year 1 Spring'},
  {m:'Mar 2027', gi_f:1.0,    luke:0,    phase:'school', pl:'Year 1 Spring'},
  {m:'Apr 2027', gi_f:1.0,    luke:0,    phase:'school', pl:'Year 1 Spring'},
  {m:'May 2027', gi_f:0.3943, luke:0,    phase:'trans',  pl:'Finals end May 12'},
  {m:'Jun 2027', gi_f:0,      luke:0,    phase:'summer', pl:'Summer — no GI Bill'},
  {m:'Jul 2027', gi_f:0,      luke:0,    phase:'summer', pl:'Summer — no GI Bill'},
  {m:'Aug 2027', gi_f:0.2300, luke:0,    phase:'school', pl:'Year 2 starts Aug 25'},
  {m:'Sep 2027', gi_f:1.0,    luke:0,    phase:'school', pl:'Year 2 Fall'},
  {m:'Oct 2027', gi_f:1.0,    luke:0,    phase:'school', pl:'Year 2 Fall'},
  {m:'Nov 2027', gi_f:1.0,    luke:0,    phase:'school', pl:'Year 2 Fall'},
  {m:'Dec 2027', gi_f:0.4928, luke:0,    phase:'trans',  pl:'Finals end Dec 15'},
  {m:'Jan 2028', gi_f:0.6571, luke:0,    phase:'trans',  pl:'Spring starts Jan 12'},
  {m:'Feb 2028', gi_f:0.9528, luke:0,    phase:'school', pl:'Year 2 Spring'},
  {m:'Mar 2028', gi_f:1.0,    luke:0,    phase:'school', pl:'Year 2 Spring'},
  {m:'Apr 2028', gi_f:1.0,    luke:0,    phase:'school', pl:'Year 2 Spring'},
  {m:'May 2028', gi_f:0.3285, luke:0,    phase:'trans',  pl:'Finals end May 10'},
]

export const CAROLINE_BASE_PAYCHECK = 2957.66 // Verified actual take-home per paycheck as of Apr 2026

export interface ScenarioInputs {
  carolineSalary: number
  raisePct: number
  raiseIdx: number
  njSalary: number
  njIdx: number
  giRate: number
  intAmt: number
  intStart: number
  intEnd: number
  apply3p: boolean
}

export function netRate(salary: number): number {
  return Math.max(0.50, 0.6074 - Math.max(0, salary - 125000) * 0.00000096)
}

export function estPaycheck(salary: number): number {
  return Math.round(salary * netRate(salary) / 26)
}

export function estMonthly(salary: number): number {
  return Math.round(salary * netRate(salary) / 12)
}

export function carolineAmt(idx: number, sc: ScenarioInputs, threePay: Set<number>): number {
  if (sc.njSalary > 0 && sc.njIdx >= 0 && idx >= sc.njIdx) {
    return estMonthly(sc.njSalary)
  }
  const raiseActive = sc.raisePct > 0 && sc.raiseIdx >= 0 && idx >= sc.raiseIdx
  const chk = raiseActive
    ? Math.round(CAROLINE_BASE_PAYCHECK * (1 + sc.raisePct / 100))
    : Math.round(CAROLINE_BASE_PAYCHECK)
  const is3p = sc.apply3p && threePay.has(idx) && !(sc.njSalary > 0 && sc.njIdx >= 0 && idx >= sc.njIdx)
  return is3p ? chk * 3 : chk * 2
}

export interface BudgetCat {
  id: string
  name: string
  defaultAmt: number
}

export interface ForecastData {
  threePay: Set<number>
  fixedLeaves: BudgetCat[]
  varLeaves: BudgetCat[]
  loading: boolean
}

function dateToLabel(dateStr: string): string {
  const [yr, mo] = dateStr.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(mo, 10) - 1]} ${yr}`
}

type RawCat = {
  id: string
  name: string
  type: string
  is_fixed: boolean
  parent_category_id: string | null
}

type RawBudget = {
  category_id: string
  budgeted_amount: string | number
}

export function useDashboardForecast(): ForecastData {
  const [data, setData] = useState<ForecastData>({
    threePay: new Set(),
    fixedLeaves: [],
    varLeaves: [],
    loading: true,
  })

  const load = useCallback(async () => {
    const [{ data: tpmData }, { data: catData }, { data: budgetData }] = await Promise.all([
      supabase.from('three_paycheck_months').select('month').gte('month', '2026-04-01'),
      supabase.from('categories').select('id, name, type, is_fixed, parent_category_id'),
      supabase.from('monthly_budgets').select('category_id, budgeted_amount').eq('month', '2026-04-01'),
    ])

    // Build THREE_PAY_IDX from DB rows dynamically
    const labelToIdx = new Map(BASE_SCHED.map((r, i) => [r.m, i]))
    const threePay = new Set<number>()
    for (const row of (tpmData ?? []) as { month: string }[]) {
      const label = dateToLabel(row.month)
      const idx = labelToIdx.get(label)
      if (idx !== undefined) threePay.add(idx)
    }

    const cats = (catData ?? []) as RawCat[]
    const budgets = (budgetData ?? []) as RawBudget[]

    const budgetMap = new Map<string, number>()
    for (const b of budgets) {
      budgetMap.set(b.category_id, Number(b.budgeted_amount))
    }

    const parentIds = new Set(cats.map(c => c.parent_category_id).filter(Boolean) as string[])
    const leaves = cats.filter(c => !parentIds.has(c.id))

    const givingKeywords = ['giving', 'charity', 'tithe']

    const fixedLeaves: BudgetCat[] = leaves
      .filter(c => c.is_fixed && (c.type === 'expense' || c.type === 'giving'))
      .map(c => ({ id: c.id, name: c.name, defaultAmt: Number(budgetMap.get(c.id) ?? 0) }))
      .filter(c => c.defaultAmt > 0)
      .sort((a, b) => b.defaultAmt - a.defaultAmt)

    const varLeaves: BudgetCat[] = leaves
      .filter(c => !c.is_fixed && c.type === 'expense' && !givingKeywords.some(g => c.name.toLowerCase().includes(g)))
      .map(c => ({ id: c.id, name: c.name, defaultAmt: Number(budgetMap.get(c.id) ?? 0) }))
      .filter(c => c.defaultAmt > 0)
      .sort((a, b) => b.defaultAmt - a.defaultAmt)

    setData({ threePay, fixedLeaves, varLeaves, loading: false })
  }, [])

  useEffect(() => { load() }, [load])
  return data
}
