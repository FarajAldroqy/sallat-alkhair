export type PaymentMethod = 'نقداً' | 'تحويل مصرفي' | 'بطاقة'

export interface Transaction {
  id: number
  client_name: string
  type: 'DEPOSIT' | 'WITHDRAWAL'
  amount_cents: number
  payment_method?: PaymentMethod | string
  status?: 'COMPLETED' | 'PENDING' | 'FAILED' | 'PROCESSING'
  is_pinned?: number
  is_archived?: number
  created_at: string
}

export interface TransactionCreate {
  client_name: string
  type: 'DEPOSIT' | 'WITHDRAWAL'
  amount_cents: number
  payment_method: PaymentMethod | string
  status?: 'COMPLETED' | 'PENDING' | 'FAILED' | 'PROCESSING'
}

export interface Stats {
  total_balance_cents: number
  total_deposits_cents: number
  total_withdrawals_cents: number
  active_accounts: number
  deposit_count: number
  withdrawal_count: number
}

export interface PaginatedTransactions {
  data: Transaction[]
  total: number
  page: number
  pageSize: number
}

export interface GetTransactionsParams {
  page?: number
  pageSize?: number
  search?: string
  type?: 'DEPOSIT' | 'WITHDRAWAL' | 'ALL'
}

export interface ChartDataPoint {
  date: string
  dateLabel: string
  deposits: number
  withdrawals: number
  deposits_cents: number
  withdrawals_cents: number
}

export interface GetChartDataParams {
  timeframe: '7d' | '30d' | '3m'
}
