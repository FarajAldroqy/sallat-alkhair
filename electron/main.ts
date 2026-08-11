import { app, BrowserWindow, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null

// ─── Database Setup ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any

function initDatabase() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3')
  const dbPath = path.join(app.getPath('userData'), 'finance.db')
  db = new Database(dbPath)

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Create transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name    TEXT    NOT NULL,
      type           TEXT    NOT NULL CHECK(type IN ('DEPOSIT', 'WITHDRAWAL')),
      amount_cents    BIGINT  NOT NULL,
      payment_method TEXT    NOT NULL DEFAULT 'نقداً',
      status         TEXT    NOT NULL DEFAULT 'COMPLETED',
      is_pinned      INTEGER NOT NULL DEFAULT 0,
      is_archived    INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // Performance Indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tx_list ON transactions(is_archived, is_pinned DESC, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tx_search ON transactions(client_name, type);
    CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(is_deleted, is_archived, created_at DESC);
  `)

  // Migration: check if columns exist for existing database
  const tableInfo = db.pragma('table_info(transactions)') as { name: string }[]
  const colNames = new Set(tableInfo.map((col) => col.name))

  if (!colNames.has('payment_method')) {
    try { db.exec(`ALTER TABLE transactions ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'نقداً'`) } catch {}
  }
  if (!colNames.has('is_pinned')) {
    try { db.exec(`ALTER TABLE transactions ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0`) } catch {}
  }
  if (!colNames.has('is_archived')) {
    try { db.exec(`ALTER TABLE transactions ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0`) } catch {}
  }
  if (!colNames.has('is_deleted')) {
    try { db.exec(`ALTER TABLE transactions ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0`) } catch {}
  }
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

function registerIpcHandlers() {
  // POST /reset-database – clear all transactions and reset database
  ipcMain.handle('db:reset-database', () => {
    try {
      db.exec('DELETE FROM transactions')
      db.exec('VACUUM')
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // GET /transactions – paginated + searchable + sorted by is_pinned DESC
  ipcMain.handle('db:get-transactions', (_event, params: {
    page?: number
    pageSize?: number
    search?: string
    type?: string
    status?: 'ACTIVE' | 'ARCHIVED' | 'TRASH' | 'ALL_NON_DELETED'
  }) => {
    try {
      const page = params?.page ?? 1
      const pageSize = params?.pageSize ?? 10
      const search = params?.search ?? ''
      const type = params?.type ?? 'ALL'
      const status = params?.status ?? 'ACTIVE'
      const offset = (page - 1) * pageSize

      let whereClause = 'WHERE 1=1'
      if (status === 'ACTIVE') {
        whereClause += ' AND is_deleted = 0 AND is_archived = 0'
      } else if (status === 'ARCHIVED') {
        whereClause += ' AND is_deleted = 0 AND is_archived = 1'
      } else if (status === 'TRASH') {
        whereClause += ' AND is_deleted = 1'
      } else if (status === 'ALL_NON_DELETED') {
        whereClause += ' AND is_deleted = 0'
      }

      const args: (string | number)[] = []

      if (search) {
        const sanitized = search.replace(/[%_]/g, '\\$&')
        whereClause += " AND client_name LIKE ? ESCAPE '\\'"
        args.push(`%${sanitized}%`)
      }
      if (type !== 'ALL') {
        whereClause += ' AND type = ?'
        args.push(type)
      }

      const total = (db.prepare(
        `SELECT COUNT(*) as c FROM transactions ${whereClause}`
      ).get(...args) as { c: number }).c

      const data = db.prepare(
        `SELECT * FROM transactions ${whereClause} ORDER BY is_pinned DESC, created_at DESC LIMIT ? OFFSET ?`
      ).all(...args, pageSize, offset)

      return { data, total, page, pageSize }
    } catch (err: any) {
      console.error('Failed to get transactions:', err)
      return { data: [], total: 0, page: 1, pageSize: 10 }
    }
  })

  // POST /transactions – create new
  ipcMain.handle('db:create-transaction', (_event, payload: {
    client_name: string
    type: string
    amount_cents: number
    payment_method?: string
    status?: string
  }) => {
    try {
      const paymentMethod = payload.payment_method || 'نقداً'
      const status = payload.status || 'COMPLETED'
      const stmt = db.prepare(`
        INSERT INTO transactions (client_name, type, amount_cents, payment_method, status, is_pinned, is_archived, is_deleted)
        VALUES (?, ?, ?, ?, ?, 0, 0, 0)
      `)
      const result = stmt.run(
        payload.client_name,
        payload.type,
        payload.amount_cents,
        paymentMethod,
        status
      )
      return db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid)
    } catch (err: any) {
      console.error('Failed to create transaction:', err)
      throw err
    }
  })

  // POST /toggle-pin – toggle row pinned status
  ipcMain.handle('db:toggle-pin', (_event, id: number) => {
    try {
      const current = db.prepare('SELECT is_pinned FROM transactions WHERE id = ?').get(id) as { is_pinned: number } | undefined
      const newStatus = current && current.is_pinned === 1 ? 0 : 1
      db.prepare('UPDATE transactions SET is_pinned = ? WHERE id = ?').run(newStatus, id)
      return { success: true, is_pinned: newStatus }
    } catch (err: any) {
      console.error('Failed to toggle pin:', err)
      return { success: false, is_pinned: 0 }
    }
  })

  // DELETE /transactions – soft delete or permanent delete
  ipcMain.handle('db:delete-transaction', (_event, id: number, permanent?: boolean) => {
    try {
      if (permanent) {
        db.prepare('DELETE FROM transactions WHERE id = ?').run(id)
      } else {
        db.prepare('UPDATE transactions SET is_deleted = 1 WHERE id = ?').run(id)
      }
      return { success: true }
    } catch (err: any) {
      console.error('Failed to delete transaction:', err)
      return { success: false, error: err.message }
    }
  })

  // POST /restore-transaction – restore soft deleted transaction
  ipcMain.handle('db:restore-transaction', (_event, id: number) => {
    try {
      db.prepare('UPDATE transactions SET is_deleted = 0, is_archived = 0 WHERE id = ?').run(id)
      return { success: true }
    } catch (err: any) {
      console.error('Failed to restore transaction:', err)
      return { success: false, error: err.message }
    }
  })

  // POST /archive-transaction – archive transaction
  ipcMain.handle('db:archive-transaction', (_event, id: number) => {
    try {
      const current = db.prepare('SELECT is_archived FROM transactions WHERE id = ?').get(id) as { is_archived: number } | undefined
      const newStatus = current && current.is_archived === 1 ? 0 : 1
      db.prepare('UPDATE transactions SET is_archived = ? WHERE id = ? AND is_deleted = 0').run(newStatus, id)
      return { success: true, is_archived: newStatus }
    } catch (err: any) {
      console.error('Failed to archive transaction:', err)
      return { success: false, is_archived: 0 }
    }
  })

  // POST /delete-entity-transactions – delete all entity transactions
  ipcMain.handle('db:delete-entity-transactions', (_event, clientName: string, permanent?: boolean) => {
    try {
      if (permanent) {
        db.prepare('DELETE FROM transactions WHERE client_name = ?').run(clientName)
      } else {
        db.prepare('UPDATE transactions SET is_deleted = 1 WHERE client_name = ?').run(clientName)
      }
      return { success: true }
    } catch (err: any) {
      console.error('Failed to delete entity transactions:', err)
      return { success: false, error: err.message }
    }
  })

  // POST /restore-entity-transactions – restore all entity transactions
  ipcMain.handle('db:restore-entity-transactions', (_event, clientName: string) => {
    try {
      db.prepare('UPDATE transactions SET is_deleted = 0, is_archived = 0 WHERE client_name = ?').run(clientName)
      return { success: true }
    } catch (err: any) {
      console.error('Failed to restore entity transactions:', err)
      return { success: false, error: err.message }
    }
  })

  // POST /update-entity-name – rename entity client_name across all transactions
  ipcMain.handle('db:update-entity-name', (_event, params: { oldName: string; newName: string }) => {
    try {
      if (!params.oldName || !params.newName) return { success: false, message: 'بيانات غير مكتملة' }
      if (params.oldName.trim() === 'سلة الخير') return { success: false, message: 'لا يمكن تعديل اسم جهة سلة الخير' }
      const stmt = db.prepare('UPDATE transactions SET client_name = ? WHERE client_name = ?')
      const res = stmt.run(params.newName.trim(), params.oldName.trim())
      return { success: true, updatedCount: res.changes }
    } catch (err: any) {
      console.error('Failed to update entity name:', err)
      return { success: false, message: err.message }
    }
  })

  // GET /stats – aggregated balances across all non-deleted transactions (active + archived)
  ipcMain.handle('db:get-stats', () => {
    try {
      const deposits = db.prepare(
        `SELECT COALESCE(SUM(amount_cents),0) as total, COUNT(*) as cnt
         FROM transactions WHERE type='DEPOSIT' AND is_deleted=0`
      ).get() as { total: number; cnt: number }

      const withdrawals = db.prepare(
        `SELECT COALESCE(SUM(amount_cents),0) as total, COUNT(*) as cnt
         FROM transactions WHERE type='WITHDRAWAL' AND is_deleted=0`
      ).get() as { total: number; cnt: number }

      const activeAccounts = (db.prepare(
        `SELECT COUNT(DISTINCT client_name) as cnt FROM transactions WHERE is_deleted=0`
      ).get() as { cnt: number }).cnt

      return {
        total_balance_cents: deposits.total - withdrawals.total,
        total_deposits_cents: deposits.total,
        total_withdrawals_cents: withdrawals.total,
        active_accounts: activeAccounts,
        deposit_count: deposits.cnt,
        withdrawal_count: withdrawals.cnt,
      }
    } catch (err: any) {
      console.error('Failed to get stats:', err)
      return {
        total_balance_cents: 0,
        total_deposits_cents: 0,
        total_withdrawals_cents: 0,
        active_accounts: 0,
        deposit_count: 0,
        withdrawal_count: 0,
      }
    }
  })

  // GET /chart-data – aggregated daily transactions for Recharts
  ipcMain.handle('db:get-chart-data', (_event, params: { timeframe?: '7d' | '30d' | '3m' }) => {
    try {
      const timeframe = params?.timeframe ?? '3m'
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90

      const rows = db.prepare(`
        SELECT
          strftime('%Y-%m-%d', created_at) as date_str,
          COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount_cents ELSE 0 END), 0) as deposits_cents,
          COALESCE(SUM(CASE WHEN type = 'WITHDRAWAL' THEN amount_cents ELSE 0 END), 0) as withdrawals_cents
        FROM transactions
        WHERE created_at >= date('now', '-' || ? || ' days') AND is_deleted = 0
        GROUP BY strftime('%Y-%m-%d', created_at)
        ORDER BY date_str ASC
      `).all(days) as { date_str: string; deposits_cents: number; withdrawals_cents: number }[]

      const dataMap = new Map<string, { deposits_cents: number; withdrawals_cents: number }>()
      for (const r of rows) {
        dataMap.set(r.date_str, {
          deposits_cents: r.deposits_cents,
          withdrawals_cents: r.withdrawals_cents,
        })
      }

      const result = []
      const now = new Date()
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const dateKey = d.toISOString().slice(0, 10)

        const entry = dataMap.get(dateKey)
        const deposits_cents = entry ? entry.deposits_cents : 0
        const withdrawals_cents = entry ? entry.withdrawals_cents : 0

        const dateLabel = new Intl.DateTimeFormat('ar-LY', {
          day: 'numeric',
          month: 'short',
        }).format(d)

        result.push({
          date: dateKey,
          dateLabel,
          deposits: deposits_cents / 100,
          withdrawals: withdrawals_cents / 100,
          deposits_cents,
          withdrawals_cents,
        })
      }

      return result
    } catch (err: any) {
      console.error('Failed to get chart data:', err)
      return []
    }
  })
}

// ─── Window ───────────────────────────────────────────────────────────────────

function createWindow() {
  win = new BrowserWindow({
    title: 'منظومة سلة الخير للمعاملات المالية',
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    autoHideMenuBar: true,
    icon: path.join(process.env.VITE_PUBLIC!, 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.setMenu(null)
  win.center()

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date()).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  initDatabase()
  registerIpcHandlers()
  createWindow()
})
