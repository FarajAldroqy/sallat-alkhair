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

  deleteTransaction: (id: number): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:delete-transaction', id),

  archiveTransaction: (id: number): Promise<{ success: boolean; is_archived: number }> =>
    ipcRenderer.invoke('db:archive-transaction', id),

  updateEntityName: (params: { oldName: string; newName: string }): Promise<{ success: boolean; updatedCount?: number; message?: string }> =>
    ipcRenderer.invoke('db:update-entity-name', params),
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
