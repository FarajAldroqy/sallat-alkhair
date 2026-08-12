import type { PaginatedTransactions, TransactionCreate, Transaction, Stats, GetTransactionsParams, ChartDataPoint, GetChartDataParams } from './index'

declare global {
  interface Window {
    electronAPI?: {
      getTransactions: (p: GetTransactionsParams) => Promise<PaginatedTransactions>
      createTransaction: (p: TransactionCreate) => Promise<Transaction>
      getStats: () => Promise<Stats>
      getChartData: (p: GetChartDataParams) => Promise<ChartDataPoint[]>
      togglePin: (id: number) => Promise<{ success: boolean; is_pinned: number }>
      deleteTransaction: (id: number, permanent?: boolean) => Promise<{ success: boolean }>
      restoreTransaction: (id: number) => Promise<{ success: boolean }>
      archiveTransaction: (id: number) => Promise<{ success: boolean; is_archived: number }>
      deleteEntityTransactions: (clientName: string, permanent?: boolean) => Promise<{ success: boolean }>
      restoreEntityTransactions: (clientName: string) => Promise<{ success: boolean }>
      updateEntityName: (p: { oldName: string; newName: string }) => Promise<{ success: boolean; updatedCount?: number; message?: string }>
      restoreAllTransactions: (txs: Transaction[]) => Promise<{ success: boolean; restoredCount?: number; error?: string }>
      deleteTransactionsBatch?: (ids: number[], permanent?: boolean) => Promise<{ success: boolean; count?: number; error?: string }>
      archiveTransactionsBatch?: (ids: number[]) => Promise<{ success: boolean; count?: number; error?: string }>
      restoreTransactionsBatch?: (ids: number[]) => Promise<{ success: boolean; count?: number; error?: string }>
      deleteEntitiesBatch?: (clientNames: string[], permanent?: boolean) => Promise<{ success: boolean; count?: number; error?: string }>
      restoreEntitiesBatch?: (clientNames: string[]) => Promise<{ success: boolean; count?: number; error?: string }>
      onRequestAutoBackup?: (callback: () => void) => void
      notifyAutoBackupCompleted?: () => Promise<{ success: boolean }>
    }
  }
}
