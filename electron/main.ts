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

  // Seed demo data if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM transactions').get() as { c: number }
  if (count.c === 0) {
    const seed = db.prepare(`
      INSERT INTO transactions (client_name, type, amount_cents, payment_method, status, is_pinned, is_archived, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const seedData = [
      ['الفندق',                  'WITHDRAWAL', 1000000000, 'نقداً',       'COMPLETED', 1, 0, '2026-08-02 10:04:00'],
      ['ffff',                   'DEPOSIT',    5000000,    'نقداً',       'COMPLETED', 0, 0, '2026-08-02 09:51:00'],
      ['الفندق',                  'DEPOSIT',    500000,     'تحويل مصرفي', 'COMPLETED', 0, 0, '2026-08-02 08:55:00'],
      ['شركة المدار الجديد',       'DEPOSIT',    1250000,    'تحويل مصرفي', 'COMPLETED', 0, 0, '2026-07-28 09:15:00'],
      ['مصرف ليبيا المركزي',       'DEPOSIT',    3500000,    'تحويل مصرفي', 'COMPLETED', 0, 0, '2026-07-28 11:30:00'],
      ['شركة ليبيانا للهاتف المحمول', 'WITHDRAWAL', 500000,     'نقداً',       'COMPLETED', 0, 0, '2026-07-29 08:45:00'],
      ['شركة الشرارة للخدمات النفطية','DEPOSIT',  750000,     'بطاقة',       'COMPLETED', 0, 0, '2026-07-29 14:20:00'],
      ['مصرف الجمهورية - طرابلس',  'WITHDRAWAL', 200000,     'نقداً',       'COMPLETED', 0, 0, '2026-07-30 10:05:00'],
      ['مؤسسة البناء والتعمير',    'DEPOSIT',    2000000,    'تحويل مصرفي', 'COMPLETED', 0, 0, '2026-07-30 15:40:00'],
      ['مطبعة الاستقلال بنغازي',  'DEPOSIT',    450000,     'بطاقة',       'COMPLETED', 0, 0, '2026-07-31 09:00:00'],
      ['شركة السهم للنقل العام',   'WITHDRAWAL', 125000,     'نقداً',       'COMPLETED', 0, 0, '2026-07-31 12:30:00'],
      ['شركة الخليج العربي للنفت', 'DEPOSIT',    4500000,    'تحويل مصرفي', 'COMPLETED', 0, 0, '2026-08-01 08:15:00'],
      ['مصرف التجارة والتنمية',    'WITHDRAWAL', 600000,     'تحويل مصرفي', 'COMPLETED', 0, 0, '2026-08-01 11:00:00'],
      ['شركة تاسيلي لتقنية المعلومات','DEPOSIT',  900000,     'بطاقة',       'COMPLETED', 0, 0, '2026-08-01 14:45:00'],
      ['حصة عبدالعزيز الفيفي',     'WITHDRAWAL', 350000,     'نقداً',       'COMPLETED', 0, 0, '2026-08-01 16:30:00'],
    ]
    const insertMany = db.transaction((rows: typeof seedData) => {
      for (const row of rows) seed.run(...row)
    })
    insertMany(seedData)
  }
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

function registerIpcHandlers() {
  // GET /transactions – paginated + searchable + sorted by is_pinned DESC
  ipcMain.handle('db:get-transactions', (_event, params: {
    page?: number
    pageSize?: number
    search?: string
    type?: string
  }) => {
    const page = params?.page ?? 1
    const pageSize = params?.pageSize ?? 10
    const search = params?.search ?? ''
    const type = params?.type ?? 'ALL'
    const offset = (page - 1) * pageSize

    let whereClause = 'WHERE is_archived = 0'
    const args: (string | number)[] = []

    if (search) {
      whereClause += ' AND client_name LIKE ?'
      args.push(`%${search}%`)
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
  })

  // POST /transactions – create new
  ipcMain.handle('db:create-transaction', (_event, payload: {
    client_name: string
    type: string
    amount_cents: number
    payment_method?: string
    status?: string
  }) => {
    const paymentMethod = payload.payment_method || 'نقداً'
    const status = payload.status || 'COMPLETED'
    const stmt = db.prepare(`
      INSERT INTO transactions (client_name, type, amount_cents, payment_method, status, is_pinned, is_archived)
      VALUES (?, ?, ?, ?, ?, 0, 0)
    `)
    const result = stmt.run(
      payload.client_name,
      payload.type,
      payload.amount_cents,
      paymentMethod,
      status
    )
    return db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid)
  })

  // POST /toggle-pin – toggle row pinned status
  ipcMain.handle('db:toggle-pin', (_event, id: number) => {
    const current = db.prepare('SELECT is_pinned FROM transactions WHERE id = ?').get(id) as { is_pinned: number } | undefined
    const newStatus = current && current.is_pinned === 1 ? 0 : 1
    db.prepare('UPDATE transactions SET is_pinned = ? WHERE id = ?').run(newStatus, id)
    return { success: true, is_pinned: newStatus }
  })

  // DELETE /transactions – delete transaction
  ipcMain.handle('db:delete-transaction', (_event, id: number) => {
    db.prepare('DELETE FROM transactions WHERE id = ?').run(id)
    return { success: true }
  })

  // POST /archive-transaction – archive transaction
  ipcMain.handle('db:archive-transaction', (_event, id: number) => {
    const current = db.prepare('SELECT is_archived FROM transactions WHERE id = ?').get(id) as { is_archived: number } | undefined
    const newStatus = current && current.is_archived === 1 ? 0 : 1
    db.prepare('UPDATE transactions SET is_archived = ? WHERE id = ?').run(newStatus, id)
    return { success: true, is_archived: newStatus }
  })

  // POST /update-entity-name – rename entity client_name across all transactions
  ipcMain.handle('db:update-entity-name', (_event, params: { oldName: string; newName: string }) => {
    if (!params.oldName || !params.newName) return { success: false, message: 'بيانات غير مكتملة' }
    if (params.oldName.trim() === 'سلة الخير') return { success: false, message: 'لا يمكن تعديل اسم جهة سلة الخير' }
    const stmt = db.prepare('UPDATE transactions SET client_name = ? WHERE client_name = ?')
    const res = stmt.run(params.newName.trim(), params.oldName.trim())
    return { success: true, updatedCount: res.changes }
  })

  // GET /stats – aggregated balances
  ipcMain.handle('db:get-stats', () => {
    const deposits = db.prepare(
      `SELECT COALESCE(SUM(amount_cents),0) as total, COUNT(*) as cnt
       FROM transactions WHERE type='DEPOSIT' AND is_archived=0`
    ).get() as { total: number; cnt: number }

    const withdrawals = db.prepare(
      `SELECT COALESCE(SUM(amount_cents),0) as total, COUNT(*) as cnt
       FROM transactions WHERE type='WITHDRAWAL' AND is_archived=0`
    ).get() as { total: number; cnt: number }

    const activeAccounts = (db.prepare(
      `SELECT COUNT(DISTINCT client_name) as cnt FROM transactions WHERE is_archived=0`
    ).get() as { cnt: number }).cnt

    return {
      total_balance_cents: deposits.total - withdrawals.total,
      total_deposits_cents: deposits.total,
      total_withdrawals_cents: withdrawals.total,
      active_accounts: activeAccounts,
      deposit_count: deposits.cnt,
      withdrawal_count: withdrawals.cnt,
    }
  })

  // GET /chart-data – aggregated daily transactions for Recharts
  ipcMain.handle('db:get-chart-data', (_event, params: { timeframe?: '7d' | '30d' | '3m' }) => {
    const timeframe = params?.timeframe ?? '3m'
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90

    const rows = db.prepare(`
      SELECT
        strftime('%Y-%m-%d', created_at) as date_str,
        COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount_cents ELSE 0 END), 0) as deposits_cents,
        COALESCE(SUM(CASE WHEN type = 'WITHDRAWAL' THEN amount_cents ELSE 0 END), 0) as withdrawals_cents
      FROM transactions
      WHERE created_at >= date('now', '-' || ? || ' days') AND is_archived = 0
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
    backgroundColor: '#ffffff',
    icon: path.join(process.env.VITE_PUBLIC!, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

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
