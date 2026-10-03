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
      updateTransactionNotes?: (p: { id: number; notes: string }) => Promise<{ success: boolean; id?: number; notes?: string; error?: string }>
      updateTransaction?: (p: import('./index').TransactionUpdate) => Promise<{ success: boolean; transaction?: Transaction; error?: string }>
      deleteTransactionsBatch?: (ids: number[], permanent?: boolean) => Promise<{ success: boolean; count?: number; error?: string }>
      archiveTransactionsBatch?: (ids: number[]) => Promise<{ success: boolean; count?: number; error?: string }>
      restoreTransactionsBatch?: (ids: number[]) => Promise<{ success: boolean; count?: number; error?: string }>
      deleteEntitiesBatch?: (clientNames: string[], permanent?: boolean) => Promise<{ success: boolean; count?: number; error?: string }>
      restoreEntitiesBatch?: (clientNames: string[]) => Promise<{ success: boolean; count?: number; error?: string }>
      onRequestAutoBackup?: (callback: () => void) => void
      notifyAutoBackupCompleted?: () => Promise<{ success: boolean }>
      savePDF?: (params?: { filename?: string; landscape?: boolean; showInFolder?: boolean }) => Promise<{ success: boolean; filePath?: string; filename?: string; error?: string }>
      sendWhatsApp?: (params: { phone?: string; message?: string; filePath?: string }) => Promise<{ success: boolean; error?: string }>
      copyFileToClipboard?: (filePath: string) => Promise<{ success: boolean; error?: string }>
      openExternal?: (url: string) => Promise<{ success: boolean; error?: string }>
      showItemInFolder?: (filePath: string) => Promise<{ success: boolean; error?: string }>
      openPath?: (filePath: string) => Promise<{ success: boolean; error?: string }>
    }
  }
}
