import type {
  Transaction,
  TransactionCreate,
  PaginatedTransactions,
  GetTransactionsParams,
  Stats,
  ChartDataPoint,
  GetChartDataParams,
} from '@/types'

const STORAGE_KEY = 'salla_mock_transactions_v2'

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 1,
    client_name: 'شركة النماء للمقاولات',
    type: 'DEPOSIT',
    amount_cents: 15000000,
    payment_method: 'نقداً',
    status: 'COMPLETED',
    is_pinned: 1,
    is_archived: 0,
    is_deleted: 0,
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
  },
  {
    id: 2,
    client_name: 'مؤسسة الأفق للتجارة',
    type: 'WITHDRAWAL',
    amount_cents: 4500000,
    payment_method: 'تحويل مصرفي',
    status: 'COMPLETED',
    is_pinned: 0,
    is_archived: 0,
    is_deleted: 0,
    created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
  },
  {
    id: 3,
    client_name: 'سلة الخير',
    type: 'DEPOSIT',
    amount_cents: 50000000,
    payment_method: 'نقداً',
    status: 'COMPLETED',
    is_pinned: 1,
    is_archived: 0,
    is_deleted: 0,
    created_at: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
  },
]

function getStoredTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TRANSACTIONS))
      return INITIAL_TRANSACTIONS
    }
    return JSON.parse(raw)
  } catch {
    return INITIAL_TRANSACTIONS
  }
}

function saveStoredTransactions(txs: Transaction[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(txs))
  } catch (e) {
    console.error('Failed to save mock transactions:', e)
  }
}

export function initMockElectronAPI() {
  if (typeof window === 'undefined') return
  if (window.electronAPI) return // Already defined in Electron desktop runtime

  console.log('[MockAPI] Initializing localStorage fallback for web browser mode')

  window.electronAPI = {
    getTransactions: async (params: GetTransactionsParams): Promise<PaginatedTransactions> => {
      const page = params?.page ?? 1
      const pageSize = params?.pageSize ?? 10
      const search = (params?.search ?? '').trim().toLowerCase()
      const type = params?.type ?? 'ALL'
      const status = params?.status ?? 'ACTIVE'

      let all = getStoredTransactions()

      if (status === 'ACTIVE') {
        all = all.filter((t) => (t.is_deleted ?? 0) === 0 && (t.is_archived ?? 0) === 0)
      } else if (status === 'ARCHIVED') {
        all = all.filter((t) => (t.is_deleted ?? 0) === 0 && (t.is_archived ?? 1) === 1)
      } else if (status === 'TRASH') {
        all = all.filter((t) => (t.is_deleted ?? 0) === 1)
      } else if (status === 'ALL_NON_DELETED') {
        all = all.filter((t) => (t.is_deleted ?? 0) === 0)
      }

      if (search) {
        all = all.filter((t) => t.client_name.toLowerCase().includes(search))
      }

      if (type !== 'ALL') {
        all = all.filter((t) => t.type === type)
      }

      all.sort((a, b) => {
        const pinA = a.is_pinned ?? 0
        const pinB = b.is_pinned ?? 0
        if (pinA !== pinB) return pinB - pinA
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      const total = all.length
      const start = (page - 1) * pageSize
      const data = all.slice(start, start + pageSize)

      return { data, total, page, pageSize }
    },

    createTransaction: async (payload: TransactionCreate): Promise<Transaction> => {
      const all = getStoredTransactions()
      const maxId = all.reduce((max, t) => Math.max(max, t.id), 0)
      const newTx: Transaction = {
        id: maxId + 1,
        client_name: payload.client_name,
        type: payload.type,
        amount_cents: payload.amount_cents,
        payment_method: payload.payment_method || 'نقداً',
        status: payload.status || 'COMPLETED',
        is_pinned: 0,
        is_archived: 0,
        is_deleted: 0,
        created_at: new Date().toISOString(),
      }
      saveStoredTransactions([newTx, ...all])
      return newTx
    },

    getStats: async (): Promise<Stats> => {
      const all = getStoredTransactions().filter((t) => (t.is_deleted ?? 0) === 0)
      let dep = 0
      let withd = 0
      let depCnt = 0
      let withdCnt = 0
      let cashDepCnt = 0
      let bankDepCnt = 0
      let cashWithdCnt = 0
      let bankWithdCnt = 0
      const accounts = new Set<string>()

      all.forEach((tx) => {
        if (tx.client_name) accounts.add(tx.client_name.trim())
        const isCash = !tx.payment_method || tx.payment_method === 'نقداً'

        if (tx.type === 'DEPOSIT') {
          dep += tx.amount_cents
          depCnt += 1
          if (isCash) cashDepCnt += 1
          else bankDepCnt += 1
        } else {
          withd += tx.amount_cents
          withdCnt += 1
          if (isCash) cashWithdCnt += 1
          else bankWithdCnt += 1
        }
      })

      return {
        total_balance_cents: dep - withd,
        total_deposits_cents: dep,
        total_withdrawals_cents: withd,
        active_accounts: accounts.size,
        deposit_count: depCnt,
        withdrawal_count: withdCnt,
        cash_deposit_count: cashDepCnt,
        bank_deposit_count: bankDepCnt,
        cash_withdrawal_count: cashWithdCnt,
        bank_withdrawal_count: bankWithdCnt,
      }
    },

    getChartData: async (params: GetChartDataParams): Promise<ChartDataPoint[]> => {
      const timeframe = params?.timeframe ?? '3m'
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
      const all = getStoredTransactions().filter((t) => (t.is_deleted ?? 0) === 0)

      const map = new Map<string, { dep: number; withd: number }>()
      all.forEach((tx) => {
        const dateKey = tx.created_at.slice(0, 10)
        const current = map.get(dateKey) || { dep: 0, withd: 0 }
        if (tx.type === 'DEPOSIT') current.dep += tx.amount_cents
        else current.withd += tx.amount_cents
        map.set(dateKey, current)
      })

      const result: ChartDataPoint[] = []
      const now = new Date()
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const dateKey = d.toISOString().slice(0, 10)
        const entry = map.get(dateKey) || { dep: 0, withd: 0 }
        const dateLabel = new Intl.DateTimeFormat('ar-LY', { day: 'numeric', month: 'short' }).format(d)
        result.push({
          date: dateKey,
          dateLabel,
          deposits: entry.dep / 100,
          withdrawals: entry.withd / 100,
          deposits_cents: entry.dep,
          withdrawals_cents: entry.withd,
        })
      }
      return result
    },

    togglePin: async (id: number) => {
      const all = getStoredTransactions()
      let is_pinned = 0
      const updated = all.map((t) => {
        if (t.id === id) {
          is_pinned = t.is_pinned === 1 ? 0 : 1
          return { ...t, is_pinned }
        }
        return t
      })
      saveStoredTransactions(updated)
      return { success: true, is_pinned }
    },

    deleteTransaction: async (id: number, permanent?: boolean) => {
      let all = getStoredTransactions()
      if (permanent) {
        all = all.filter((t) => t.id !== id)
      } else {
        all = all.map((t) => (t.id === id ? { ...t, is_deleted: 1 } : t))
      }
      saveStoredTransactions(all)
      return { success: true }
    },

    restoreTransaction: async (id: number) => {
      const all = getStoredTransactions()
      const updated = all.map((t) => (t.id === id ? { ...t, is_deleted: 0, is_archived: 0 } : t))
      saveStoredTransactions(updated)
      return { success: true }
    },

    archiveTransaction: async (id: number) => {
      const all = getStoredTransactions()
      let is_archived = 0
      const updated = all.map((t) => {
        if (t.id === id) {
          is_archived = t.is_archived === 1 ? 0 : 1
          return { ...t, is_archived }
        }
        return t
      })
      saveStoredTransactions(updated)
      return { success: true, is_archived }
    },

    deleteEntityTransactions: async (clientName: string, permanent?: boolean) => {
      let all = getStoredTransactions()
      const trimmed = clientName.trim()
      if (permanent) {
        all = all.filter((t) => t.client_name.trim() !== trimmed)
      } else {
        all = all.map((t) => (t.client_name.trim() === trimmed ? { ...t, is_deleted: 1 } : t))
      }
      saveStoredTransactions(all)
      return { success: true }
    },

    restoreEntityTransactions: async (clientName: string) => {
      const all = getStoredTransactions()
      const trimmed = clientName.trim()
      const updated = all.map((t) =>
        t.client_name.trim() === trimmed ? { ...t, is_deleted: 0, is_archived: 0 } : t
      )
      saveStoredTransactions(updated)
      return { success: true }
    },

    updateEntityName: async (p: { oldName: string; newName: string }) => {
      const all = getStoredTransactions()
      const oldTrim = p.oldName.trim()
      const newTrim = p.newName.trim()
      let updatedCount = 0
      const updated = all.map((t) => {
        if (t.client_name.trim() === oldTrim) {
          updatedCount++
          return { ...t, client_name: newTrim }
        }
        return t
      })
      saveStoredTransactions(updated)
      return { success: true, updatedCount }
    },
  }
}
