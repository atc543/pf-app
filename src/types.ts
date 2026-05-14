export interface Category {
  id: string
  name: string
  type: 'income' | 'expense' | 'savings' | 'giving'
  parent_category_id: string | null
  sort_order: number
  is_fixed: boolean
  active: boolean
}

export interface Transaction {
  id: string
  date: string
  payee: string
  amount: number
  category_id: string
  savings_bucket_id: string | null
  notes: string | null
  entered_by: string | null
  created_at: string
  categories: Category | null
}

export interface SavingsBucket {
  id: string
  name: string
  current_balance: number
  target_balance: number | null
  sort_order: number
  active: boolean
  updated_at: string
}

export interface MonthlyBudget {
  id: string
  month: string
  category_id: string
  budgeted_amount: number
  created_at: string
}

export interface ThreePaycheckMonth {
  id: string
  month: string
}

export interface InvestmentAccount {
  id: string
  name: string
  sort_order: number
  active: boolean
}

export interface InvestmentAccountSnapshot {
  id: string
  month: string
  account_id: string
  balance: number
  created_at: string
}

export interface NetWorthSnapshot {
  id: string
  month: string
  total_net_worth: number
  created_at: string
}
