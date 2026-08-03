import type { PaginatedTransactions, TransactionCreate, Transaction, Stats, GetTransactionsParams, ChartDataPoint, GetChartDataParams } from './index'

declare global {
  interface Window {
    electronAPI?: {
      getTransactions: (p: GetTransactionsParams) => Promise<PaginatedTransactions>
      createTransaction: (p: TransactionCreate) => Promise<Transaction>
      getStats: () => Promise<Stats>
      getChartData: (p: GetChartDataParams) => Promise<ChartDataPoint[]>
      togglePin: (id: number) => Promise<{ success: boolean; is_pinned: number }>
      deleteTransaction: (id: number) => Promise<{ success: boolean }>
      archiveTransaction: (id: number) => Promise<{ success: boolean; is_archived: number }>
    }
  }
}
