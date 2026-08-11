import { ipcRenderer, contextBridge } from 'electron'
import type {
  PaginatedTransactions,
  TransactionCreate,
  Transaction,
  Stats,
  GetTransactionsParams,
  ChartDataPoint,
  GetChartDataParams,
} from '../src/types'

// --------- Expose typed electronAPI to the Renderer process ---------
contextBridge.exposeInMainWorld('electronAPI', {
  getTransactions: (params: GetTransactionsParams): Promise<PaginatedTransactions> =>
    ipcRenderer.invoke('db:get-transactions', params),

  createTransaction: (payload: TransactionCreate): Promise<Transaction> =>
    ipcRenderer.invoke('db:create-transaction', payload),

  getStats: (): Promise<Stats> =>
    ipcRenderer.invoke('db:get-stats'),

  getChartData: (params: GetChartDataParams): Promise<ChartDataPoint[]> =>
    ipcRenderer.invoke('db:get-chart-data', params),

  togglePin: (id: number): Promise<{ success: boolean; is_pinned: number }> =>
    ipcRenderer.invoke('db:toggle-pin', id),

  deleteTransaction: (id: number, permanent?: boolean): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:delete-transaction', id, permanent),

  restoreTransaction: (id: number): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:restore-transaction', id),

  archiveTransaction: (id: number): Promise<{ success: boolean; is_archived: number }> =>
    ipcRenderer.invoke('db:archive-transaction', id),

  deleteEntityTransactions: (clientName: string, permanent?: boolean): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:delete-entity-transactions', clientName, permanent),

  restoreEntityTransactions: (clientName: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:restore-entity-transactions', clientName),

  updateEntityName: (params: { oldName: string; newName: string }): Promise<{ success: boolean; updatedCount?: number; message?: string }> =>
    ipcRenderer.invoke('db:update-entity-name', params),

  restoreAllTransactions: (txs: Transaction[]): Promise<{ success: boolean; restoredCount?: number; error?: string }> =>
    ipcRenderer.invoke('db:restore-all-transactions', txs),
})

// Keep legacy ipcRenderer for backward compatibility
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})
