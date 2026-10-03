import { app, BrowserWindow, ipcMain, shell, clipboard } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { exec } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'

app.setName('منتجع MJS')

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
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'finance.db')

  // Migration safeguard: if database does not exist in current userData, check legacy folders
  if (!fs.existsSync(dbPath)) {
    try {
      const appData = app.getPath('appData')
      const legacyDirs = [
        path.join(appData, 'SallatAlkhair'),
        path.join(appData, 'sallat-alkhair'),
        path.join(appData, 'منتجع MJS للمعاملات المالية'),
      ]
      for (const legacyDir of legacyDirs) {
        const legacyDb = path.join(legacyDir, 'finance.db')
        if (fs.existsSync(legacyDb)) {
          if (!fs.existsSync(userDataPath)) {
            fs.mkdirSync(userDataPath, { recursive: true })
          }
          fs.copyFileSync(legacyDb, dbPath)
          if (fs.existsSync(legacyDb + '-wal')) {
            fs.copyFileSync(legacyDb + '-wal', dbPath + '-wal')
          }
          if (fs.existsSync(legacyDb + '-shm')) {
            fs.copyFileSync(legacyDb + '-shm', dbPath + '-shm')
          }
          console.log(`Migrated database from ${legacyDb} to ${dbPath}`)
          break
        }
      }
    } catch (migErr) {
      console.error('Failed checking legacy database paths:', migErr)
    }
  }

  db = new Database(dbPath, { timeout: 10000 })

  // Enable WAL mode & busy_timeout for maximum concurrency and zero locking
  try { db.pragma('journal_mode = WAL') } catch {}
  try { db.pragma('synchronous = NORMAL') } catch {}
  try { db.pragma('busy_timeout = 10000') } catch {}
  try { db.pragma('foreign_keys = ON') } catch {}

  // Create transactions table with all schema columns
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        client_name    TEXT    NOT NULL,
        type           TEXT    NOT NULL CHECK(type IN ('DEPOSIT', 'WITHDRAWAL')),
        subtype        TEXT    NOT NULL DEFAULT 'REGULAR',
        person_name    TEXT    NOT NULL DEFAULT '',
        person_names   TEXT    NOT NULL DEFAULT '',
        amount_cents   BIGINT  NOT NULL,
        payment_method TEXT    NOT NULL DEFAULT 'نقداً',
        status         TEXT    NOT NULL DEFAULT 'COMPLETED',
        notes          TEXT    NOT NULL DEFAULT '',
        is_pinned      INTEGER NOT NULL DEFAULT 0,
        is_archived    INTEGER NOT NULL DEFAULT 0,
        is_deleted     INTEGER NOT NULL DEFAULT 0,
        created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS transaction_notes (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL UNIQUE,
        notes          TEXT    NOT NULL DEFAULT '',
        updated_at     TEXT    NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
      );
    `)
  } catch (e) {
    console.error('Failed to create transactions table:', e)
  }

  // Migration FIRST: check and add missing columns for existing database
  try {
    const tableInfo = db.pragma('table_info(transactions)') as { name: string }[]
    const colNames = new Set(tableInfo.map((col) => col.name))

    if (!colNames.has('payment_method')) {
      try { db.exec(`ALTER TABLE transactions ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'نقداً'`) } catch {}
    }
    if (!colNames.has('notes')) {
      try { db.exec(`ALTER TABLE transactions ADD COLUMN notes TEXT NOT NULL DEFAULT ''`) } catch {}
    }
    if (!colNames.has('subtype')) {
      try { db.exec(`ALTER TABLE transactions ADD COLUMN subtype TEXT NOT NULL DEFAULT 'REGULAR'`) } catch {}
    }
    if (!colNames.has('person_name')) {
      try { db.exec(`ALTER TABLE transactions ADD COLUMN person_name TEXT NOT NULL DEFAULT ''`) } catch {}
    }
    if (!colNames.has('person_names')) {
      try { db.exec(`ALTER TABLE transactions ADD COLUMN person_names TEXT NOT NULL DEFAULT ''`) } catch {}
    }
    if (!colNames.has('invoice_items')) {
      try { db.exec(`ALTER TABLE transactions ADD COLUMN invoice_items TEXT NOT NULL DEFAULT ''`) } catch {}
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

    // Migrate legacy system entity name 'سلة الخير' to 'منتجع MJS'
    try {
      db.prepare(`UPDATE transactions SET client_name = 'منتجع MJS' WHERE client_name = 'سلة الخير'`).run()
    } catch {}
  } catch (e) {
    console.error('Migration error:', e)
  }

  // Performance Indexes AFTER columns are guaranteed to exist
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tx_list ON transactions(is_archived, is_pinned DESC, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_tx_search ON transactions(client_name, type);
      CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(is_deleted, is_archived, created_at DESC);
    `)
  } catch (e) {
    console.error('Index creation error:', e)
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

  // POST /restore-all-transactions – replace all transactions in SQLite for backup restoration
  ipcMain.handle('db:restore-all-transactions', (_event, txs: any[]) => {
    try {
      db.exec('DELETE FROM transactions')
      db.exec('DELETE FROM transaction_notes')
      const stmt = db.prepare(`
        INSERT INTO transactions (id, client_name, type, subtype, person_name, person_names, invoice_items, amount_cents, payment_method, status, notes, is_pinned, is_archived, is_deleted, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const noteStmt = db.prepare(`
        INSERT OR REPLACE INTO transaction_notes (transaction_id, notes)
        VALUES (?, ?)
      `)

      const insertMany = db.transaction((items: any[]) => {
        for (const t of items) {
          const notesVal = t.notes || ''
          const personNamesStr = Array.isArray(t.person_names) ? JSON.stringify(t.person_names) : (t.person_names || '')
          const invoiceItemsStr = t.invoice_items ? (typeof t.invoice_items === 'string' ? t.invoice_items : JSON.stringify(t.invoice_items)) : ''
          stmt.run(
            t.id,
            t.client_name,
            t.type,
            t.subtype || 'REGULAR',
            t.person_name || '',
            personNamesStr,
            invoiceItemsStr,
            t.amount_cents,
            t.payment_method || 'نقداً',
            t.status || 'COMPLETED',
            notesVal,
            t.is_pinned ?? 0,
            t.is_archived ?? 0,
            t.is_deleted ?? 0,
            t.created_at || new Date().toISOString()
          )
          if (notesVal) {
            try { noteStmt.run(t.id, notesVal) } catch {}
          }
        }
      })

      insertMany(txs || [])
      return { success: true, restoredCount: txs?.length ?? 0 }
    } catch (err: any) {
      console.error('Failed to restore all transactions:', err)
      return { success: false, error: err.message }
    }
  })

  // POST /auto-backup-completed – renderer completed auto backup on window close
  ipcMain.handle('app:auto-backup-completed', () => {
    isQuitting = true
    if (win && !win.isDestroyed()) {
      win.destroy()
    }
    return { success: true }
  })

  // GET /transactions – paginated + searchable + sorted by is_pinned DESC
  ipcMain.handle('db:get-transactions', (_event, params: {
    page?: number
    pageSize?: number
    search?: string
    type?: string
    status?: 'ACTIVE' | 'ARCHIVED' | 'TRASH' | 'ALL_NON_DELETED' | 'ALL'
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
      } else if (status === 'ALL') {
        // No status filter: return ALL rows
      }

      const args: (string | number)[] = []

      if (search) {
        const sanitized = search.replace(/[%_]/g, '\\$&')
        whereClause += " AND (client_name LIKE ? ESCAPE '\\' OR person_name LIKE ? ESCAPE '\\' OR notes LIKE ? ESCAPE '\\')"
        args.push(`%${sanitized}%`, `%${sanitized}%`, `%${sanitized}%`)
      }
      if (type !== 'ALL') {
        whereClause += ' AND type = ?'
        args.push(type)
      }

      const total = (db.prepare(
        `SELECT COUNT(*) as c FROM transactions ${whereClause}`
      ).get(...args) as { c: number }).c

      const rawData = db.prepare(
        `SELECT * FROM transactions ${whereClause} ORDER BY is_pinned DESC, created_at DESC LIMIT ? OFFSET ?`
      ).all(...args, pageSize, offset) as any[]

      const data = rawData.map((t) => {
        let person_names: string[] | undefined = undefined
        if (t.person_names) {
          try {
            person_names = JSON.parse(t.person_names)
          } catch {
            person_names = [t.person_names]
          }
        }
        let invoice_items: any[] | undefined = undefined
        if (t.invoice_items) {
          try {
            invoice_items = JSON.parse(t.invoice_items)
          } catch {
            invoice_items = undefined
          }
        }
        return { ...t, person_names, invoice_items }
      })

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
    subtype?: string
    person_name?: string
    person_names?: string[]
    invoice_items?: any[]
    amount_cents: number
    payment_method?: string
    notes?: string
    status?: string
  }) => {
    try {
      const paymentMethod = payload.payment_method || 'نقداً'
      const status = payload.status || 'COMPLETED'
      const notes = (payload.notes || '').trim()
      const subtype = payload.subtype || 'REGULAR'
      const personName = payload.person_name || ''
      const personNamesStr = payload.person_names ? JSON.stringify(payload.person_names) : ''
      const invoiceItemsStr = payload.invoice_items ? JSON.stringify(payload.invoice_items) : ''

      // Self-healing migration check for all columns
      try {
        const info = db.pragma('table_info(transactions)') as { name: string }[]
        const colNames = new Set(info.map((c) => c.name))
        if (!colNames.has('payment_method')) {
          try { db.exec(`ALTER TABLE transactions ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'نقداً'`) } catch {}
        }
        if (!colNames.has('notes')) {
          try { db.exec(`ALTER TABLE transactions ADD COLUMN notes TEXT NOT NULL DEFAULT ''`) } catch {}
        }
        if (!colNames.has('subtype')) {
          try { db.exec(`ALTER TABLE transactions ADD COLUMN subtype TEXT NOT NULL DEFAULT 'REGULAR'`) } catch {}
        }
        if (!colNames.has('person_name')) {
          try { db.exec(`ALTER TABLE transactions ADD COLUMN person_name TEXT NOT NULL DEFAULT ''`) } catch {}
        }
        if (!colNames.has('person_names')) {
          try { db.exec(`ALTER TABLE transactions ADD COLUMN person_names TEXT NOT NULL DEFAULT ''`) } catch {}
        }
        if (!colNames.has('invoice_items')) {
          try { db.exec(`ALTER TABLE transactions ADD COLUMN invoice_items TEXT NOT NULL DEFAULT ''`) } catch {}
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
      } catch {}

      let result: any
      try {
        const stmt = db.prepare(`
          INSERT INTO transactions (client_name, type, subtype, person_name, person_names, invoice_items, amount_cents, payment_method, status, notes, is_pinned, is_archived, is_deleted)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)
        `)
        result = stmt.run(
          payload.client_name,
          payload.type,
          subtype,
          personName,
          personNamesStr,
          invoiceItemsStr,
          payload.amount_cents,
          paymentMethod,
          status,
          notes
        )
      } catch {
        const stmtFallback = db.prepare(`
          INSERT INTO transactions (client_name, type, amount_cents, payment_method, status)
          VALUES (?, ?, ?, ?, ?)
        `)
        result = stmtFallback.run(
          payload.client_name,
          payload.type,
          payload.amount_cents,
          paymentMethod,
          status
        )
      }

      if (notes && result?.lastInsertRowid) {
        try {
          db.prepare('INSERT OR REPLACE INTO transaction_notes (transaction_id, notes) VALUES (?, ?)').run(result.lastInsertRowid, notes)
        } catch {}
      }

      const createdRow: any = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid)
      if (createdRow) {
        if (createdRow.person_names) {
          try {
            const parsed = JSON.parse(createdRow.person_names)
            createdRow.person_names = Array.isArray(parsed) ? parsed : [String(parsed)]
          } catch {
            createdRow.person_names = [createdRow.person_names]
          }
        } else {
          createdRow.person_names = undefined
        }

        if (createdRow.invoice_items) {
          try {
            const parsed = JSON.parse(createdRow.invoice_items)
            createdRow.invoice_items = Array.isArray(parsed) ? parsed : undefined
          } catch {
            createdRow.invoice_items = undefined
          }
        } else {
          createdRow.invoice_items = undefined
        }
      }
      return createdRow
    } catch (err: any) {
      console.error('Failed to create transaction:', err)
      throw err
    }
  })

  // POST /update-transaction-notes – edit or fill notes for an existing transaction
  ipcMain.handle('db:update-transaction-notes', (_event, payload: { id: number; notes: string }) => {
    try {
      const trimmedNotes = (payload.notes || '').trim()

      // Update main transactions table
      db.prepare('UPDATE transactions SET notes = ? WHERE id = ?').run(trimmedNotes, payload.id)

      // Update relational transaction_notes table
      try {
        db.prepare(`
          INSERT INTO transaction_notes (transaction_id, notes, updated_at)
          VALUES (?, ?, datetime('now'))
          ON CONFLICT(transaction_id) DO UPDATE SET notes = excluded.notes, updated_at = datetime('now')
        `).run(payload.id, trimmedNotes)
      } catch {}

      return { success: true, id: payload.id, notes: trimmedNotes }
    } catch (err: any) {
      console.error('Failed to update transaction notes:', err)
      return { success: false, error: err.message }
    }
  })

  // POST /update-transaction – full edit of any transaction fields
  ipcMain.handle('db:update-transaction', (_event, payload: {
    id: number
    client_name?: string
    type?: string
    subtype?: string
    person_name?: string
    person_names?: string[]
    invoice_items?: any[]
    amount_cents?: number
    payment_method?: string
    notes?: string
    status?: string
    created_at?: string
  }) => {
    try {
      const existing: any = db.prepare('SELECT * FROM transactions WHERE id = ?').get(payload.id)
      if (!existing) {
        return { success: false, error: 'المعاملة غير موجودة' }
      }

      const clientName = payload.client_name !== undefined ? payload.client_name.trim() : existing.client_name
      const type = payload.type !== undefined ? payload.type : existing.type
      const subtype = payload.subtype !== undefined ? payload.subtype : existing.subtype
      const personName = payload.person_name !== undefined ? payload.person_name.trim() : existing.person_name
      const personNamesStr = payload.person_names !== undefined
        ? (Array.isArray(payload.person_names) ? JSON.stringify(payload.person_names) : payload.person_names)
        : existing.person_names
      const invoiceItemsStr = payload.invoice_items !== undefined
        ? (Array.isArray(payload.invoice_items) ? JSON.stringify(payload.invoice_items) : payload.invoice_items)
        : (existing.invoice_items || '')
      const amountCents = payload.amount_cents !== undefined ? payload.amount_cents : existing.amount_cents
      const paymentMethod = payload.payment_method !== undefined ? payload.payment_method : existing.payment_method
      const notes = payload.notes !== undefined ? payload.notes.trim() : existing.notes
      const status = payload.status !== undefined ? payload.status : existing.status
      const createdAt = payload.created_at !== undefined ? payload.created_at : existing.created_at

      db.prepare(`
        UPDATE transactions
        SET client_name = ?,
            type = ?,
            subtype = ?,
            person_name = ?,
            person_names = ?,
            invoice_items = ?,
            amount_cents = ?,
            payment_method = ?,
            notes = ?,
            status = ?,
            created_at = ?
        WHERE id = ?
      `).run(
        clientName,
        type,
        subtype,
        personName,
        personNamesStr,
        invoiceItemsStr,
        amountCents,
        paymentMethod,
        notes,
        status,
        createdAt,
        payload.id
      )

      // Also update or insert in transaction_notes
      try {
        db.prepare(`
          INSERT INTO transaction_notes (transaction_id, notes, updated_at)
          VALUES (?, ?, datetime('now'))
          ON CONFLICT(transaction_id) DO UPDATE SET notes = excluded.notes, updated_at = datetime('now')
        `).run(payload.id, notes)
      } catch {}

      const updatedRow: any = db.prepare('SELECT * FROM transactions WHERE id = ?').get(payload.id)
      if (updatedRow) {
        if (updatedRow.person_names) {
          try {
            const parsed = JSON.parse(updatedRow.person_names)
            updatedRow.person_names = Array.isArray(parsed) ? parsed : [String(parsed)]
          } catch {
            updatedRow.person_names = [updatedRow.person_names]
          }
        } else {
          updatedRow.person_names = undefined
        }

        if (updatedRow.invoice_items) {
          try {
            const parsed = JSON.parse(updatedRow.invoice_items)
            updatedRow.invoice_items = Array.isArray(parsed) ? parsed : undefined
          } catch {
            updatedRow.invoice_items = undefined
          }
        } else {
          updatedRow.invoice_items = undefined
        }
      }

      return { success: true, transaction: updatedRow }
    } catch (err: any) {
      console.error('Failed to update transaction:', err)
      return { success: false, error: err.message }
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

  // --- BATCH IPC HANDLERS FOR LIGHTNING-FAST BULK OPERATIONS ---
  ipcMain.handle('db:delete-transactions-batch', (_event, ids: number[], permanent?: boolean) => {
    try {
      if (!Array.isArray(ids) || ids.length === 0) return { success: true, count: 0 }
      const placeholders = ids.map(() => '?').join(',')
      const runBatch = db.transaction(() => {
        if (permanent) {
          db.prepare(`DELETE FROM transactions WHERE id IN (${placeholders})`).run(...ids)
        } else {
          db.prepare(`UPDATE transactions SET is_deleted = 1 WHERE id IN (${placeholders})`).run(...ids)
        }
      })
      runBatch()
      try { db.pragma('wal_checkpoint(PASSIVE)') } catch {}
      return { success: true, count: ids.length }
    } catch (err: any) {
      console.error('Failed batch delete transactions:', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('db:archive-transactions-batch', (_event, ids: number[]) => {
    try {
      if (!Array.isArray(ids) || ids.length === 0) return { success: true, count: 0 }
      const placeholders = ids.map(() => '?').join(',')
      const runBatch = db.transaction(() => {
        db.prepare(`UPDATE transactions SET is_archived = 1 WHERE id IN (${placeholders}) AND is_deleted = 0`).run(...ids)
      })
      runBatch()
      try { db.pragma('wal_checkpoint(PASSIVE)') } catch {}
      return { success: true, count: ids.length }
    } catch (err: any) {
      console.error('Failed batch archive transactions:', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('db:restore-transactions-batch', (_event, ids: number[]) => {
    try {
      if (!Array.isArray(ids) || ids.length === 0) return { success: true, count: 0 }
      const placeholders = ids.map(() => '?').join(',')
      const runBatch = db.transaction(() => {
        db.prepare(`UPDATE transactions SET is_deleted = 0, is_archived = 0 WHERE id IN (${placeholders})`).run(...ids)
      })
      runBatch()
      try { db.pragma('wal_checkpoint(PASSIVE)') } catch {}
      return { success: true, count: ids.length }
    } catch (err: any) {
      console.error('Failed batch restore transactions:', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('db:delete-entities-batch', (_event, clientNames: string[], permanent?: boolean) => {
    try {
      if (!Array.isArray(clientNames) || clientNames.length === 0) return { success: true, count: 0 }
      const placeholders = clientNames.map(() => '?').join(',')
      const runBatch = db.transaction(() => {
        if (permanent) {
          db.prepare(`DELETE FROM transactions WHERE client_name IN (${placeholders})`).run(...clientNames)
        } else {
          db.prepare(`UPDATE transactions SET is_deleted = 1 WHERE client_name IN (${placeholders})`).run(...clientNames)
        }
      })
      runBatch()
      try { db.pragma('wal_checkpoint(PASSIVE)') } catch {}
      return { success: true, count: clientNames.length }
    } catch (err: any) {
      console.error('Failed batch delete entities:', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('db:restore-entities-batch', (_event, clientNames: string[]) => {
    try {
      if (!Array.isArray(clientNames) || clientNames.length === 0) return { success: true, count: 0 }
      const placeholders = clientNames.map(() => '?').join(',')
      const runBatch = db.transaction(() => {
        db.prepare(`UPDATE transactions SET is_deleted = 0, is_archived = 0 WHERE client_name IN (${placeholders})`).run(...clientNames)
      })
      runBatch()
      try { db.pragma('wal_checkpoint(PASSIVE)') } catch {}
      return { success: true, count: clientNames.length }
    } catch (err: any) {
      console.error('Failed batch restore entities:', err)
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
      if (params.oldName.trim() === 'منتجع MJS') return { success: false, message: 'لا يمكن تعديل اسم جهة منتجع MJS' }
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

      // Cash breakdown
      const cashDeposits = db.prepare(
        `SELECT COALESCE(SUM(amount_cents),0) as total, COUNT(*) as cnt
         FROM transactions WHERE type='DEPOSIT' AND is_deleted=0
         AND (payment_method IN ('نقداً', 'CASH') OR payment_method IS NULL OR payment_method = '')`
      ).get() as { total: number; cnt: number }

      const cashWithdrawals = db.prepare(
        `SELECT COALESCE(SUM(amount_cents),0) as total, COUNT(*) as cnt
         FROM transactions WHERE type='WITHDRAWAL' AND is_deleted=0
         AND (payment_method IN ('نقداً', 'CASH') OR payment_method IS NULL OR payment_method = '')`
      ).get() as { total: number; cnt: number }

      // Bank breakdown
      const bankDeposits = db.prepare(
        `SELECT COALESCE(SUM(amount_cents),0) as total, COUNT(*) as cnt
         FROM transactions WHERE type='DEPOSIT' AND is_deleted=0
         AND payment_method IN ('بنك', 'تحويل مصرفي', 'BANK_TRANSFER', 'BANK')`
      ).get() as { total: number; cnt: number }

      const bankWithdrawals = db.prepare(
        `SELECT COALESCE(SUM(amount_cents),0) as total, COUNT(*) as cnt
         FROM transactions WHERE type='WITHDRAWAL' AND is_deleted=0
         AND payment_method IN ('بنك', 'تحويل مصرفي', 'BANK_TRANSFER', 'BANK')`
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

        // Cash breakdown
        cash_balance_cents: cashDeposits.total - cashWithdrawals.total,
        cash_deposits_cents: cashDeposits.total,
        cash_withdrawals_cents: cashWithdrawals.total,
        cash_deposit_count: cashDeposits.cnt,
        cash_withdrawal_count: cashWithdrawals.cnt,

        // Bank breakdown
        bank_balance_cents: bankDeposits.total - bankWithdrawals.total,
        bank_deposits_cents: bankDeposits.total,
        bank_withdrawals_cents: bankWithdrawals.total,
        bank_deposit_count: bankDeposits.cnt,
        bank_withdrawal_count: bankWithdrawals.cnt,
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
        cash_balance_cents: 0,
        cash_deposits_cents: 0,
        cash_withdrawals_cents: 0,
        cash_deposit_count: 0,
        cash_withdrawal_count: 0,
        bank_balance_cents: 0,
        bank_deposits_cents: 0,
        bank_withdrawals_cents: 0,
        bank_deposit_count: 0,
        bank_withdrawal_count: 0,
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

  // ─── PDF Export & External Shell Handlers (WhatsApp, Finder, etc.) ────────
  function copyPdfFileToClipboard(filePath: string) {
    if (process.platform === 'darwin') {
      try {
        const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<array>
  <string>${filePath}</string>
</array>
</plist>`
        clipboard.writeBuffer('NSFilenamesPboardType', Buffer.from(plist, 'utf8'))
      } catch (e) {
        console.error('clipboard.writeBuffer error:', e)
      }

      // Native macOS Finder alias / Swift pasteboard registration
      try {
        const escaped = filePath.replace(/"/g, '\\"')
        exec(`osascript -e 'tell application "Finder" to set the clipboard to (POSIX file "${escaped}" as alias)'`, () => {})
      } catch {}

      try {
        const escaped = filePath.replace(/"/g, '\\"')
        exec(`swift -e 'import AppKit; let pb = NSPasteboard.general; pb.clearContents(); pb.writeObjects([NSURL(fileURLWithPath: "${escaped}")])'`, () => {})
      } catch {}
    } else if (process.platform === 'win32') {
      try {
        clipboard.writeBuffer('FileNameW', Buffer.from(filePath + '\0', 'ucs2'))
      } catch (e) {
        console.error('Windows clipboard FileNameW error:', e)
      }

      // Windows 10 & 11 native PowerShell FileDropList clipboard
      try {
        const escaped = filePath.replace(/'/g, "''")
        exec(
          `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Set-Clipboard -Path '${escaped}'"`,
          { windowsHide: true },
          () => {}
        )
      } catch (e) {
        console.error('Windows Set-Clipboard error:', e)
      }
    }
  }

  ipcMain.handle('app:save-pdf', async (_event, params?: { filename?: string; landscape?: boolean; showInFolder?: boolean }) => {
    try {
      const targetWin = BrowserWindow.fromWebContents(_event.sender) || win
      if (!targetWin || targetWin.isDestroyed()) {
        return { success: false, error: 'النافذة الرئيسية غير متوفرة' }
      }

      const pdfBuffer = await targetWin.webContents.printToPDF({
        pageSize: 'A4',
        landscape: Boolean(params?.landscape),
        printBackground: true,
        preferCSSPageSize: true,
      })

      const downloadsPath = app.getPath('downloads')
      const rawName = params?.filename || `MJS_إيصال_${Date.now()}`
      const safeName = rawName.replace(/[/\\?%*:|"<>]/g, '_').replace(/\.pdf$/i, '') + '.pdf'
      const targetPath = path.join(downloadsPath, safeName)

      fs.writeFileSync(targetPath, pdfBuffer)

      // Automatically copy the PDF file to clipboard so user can paste it immediately
      copyPdfFileToClipboard(targetPath)

      // Only show in folder if explicitly asked (not automatically popping up Finder/Explorer)
      if (params?.showInFolder) {
        try {
          shell.showItemInFolder(targetPath)
        } catch (e) {
          console.error('showItemInFolder error:', e)
        }
      }

      return {
        success: true,
        filePath: targetPath,
        filename: safeName,
      }
    } catch (err: any) {
      console.error('Failed to export PDF:', err)
      return { success: false, error: err?.message || 'فشل توليد وحفظ ملف الـ PDF' }
    }
  })

  ipcMain.handle('app:send-whatsapp', async (_event, params: { phone?: string; message?: string; filePath?: string }) => {
    try {
      const { phone, message, filePath } = params

      // Ensure file is in clipboard
      if (filePath && fs.existsSync(filePath)) {
        copyPdfFileToClipboard(filePath)
      }

      const cleanPhone = phone ? phone.replace(/\D/g, '') : ''
      const encodedMsg = message ? encodeURIComponent(message) : ''

      let whatsappUrl = ''
      if (cleanPhone) {
        whatsappUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedMsg}`
      } else {
        whatsappUrl = `whatsapp://send?text=${encodedMsg}`
      }

      try {
        await shell.openExternal(whatsappUrl)
      } catch {
        const fallbackUrl = cleanPhone
          ? `https://wa.me/${cleanPhone}?text=${encodedMsg}`
          : `https://wa.me/?text=${encodedMsg}`
        await shell.openExternal(fallbackUrl)
      }

      // On macOS: attempt automatic paste into WhatsApp if accessibility allows
      if (process.platform === 'darwin' && filePath) {
        setTimeout(() => {
          const pasteScript = `
            try
              tell application "WhatsApp" to activate
              delay 0.8
              tell application "System Events"
                keystroke "v" using command down
              end tell
            end try
          `
          exec(`osascript -e '${pasteScript.replace(/'/g, "'\\''")}'`, () => {})
        }, 1000)
      } else if (process.platform === 'win32' && filePath) {
        // On Windows: attempt automatic paste into WhatsApp Desktop using PowerShell and SendKeys
        setTimeout(() => {
          const psScript = `$wshell = New-Object -ComObject WScript.Shell; Start-Sleep -Milliseconds 1200; if ($wshell.AppActivate('WhatsApp')) { Start-Sleep -Milliseconds 500; $wshell.SendKeys('^v') }`
          exec(
            `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -Command "${psScript}"`,
            { windowsHide: true },
            () => {}
          )
        }, 800)
      }

      return { success: true }
    } catch (err: any) {
      console.error('Failed to send to WhatsApp:', err)
      return { success: false, error: err?.message }
    }
  })

  ipcMain.handle('app:copy-file-to-clipboard', async (_event, filePath: string) => {
    try {
      if (filePath && fs.existsSync(filePath)) {
        copyPdfFileToClipboard(filePath)
        return { success: true }
      }
      return { success: false, error: 'الملف غير موجود' }
    } catch (err: any) {
      return { success: false, error: err?.message }
    }
  })

  ipcMain.handle('app:open-external', async (_event, url: string) => {
    try {
      await shell.openExternal(url)
      return { success: true }
    } catch (err: any) {
      console.error('Failed to open external url:', err)
      return { success: false, error: err?.message }
    }
  })

  ipcMain.handle('app:show-item-in-folder', async (_event, filePath: string) => {
    try {
      shell.showItemInFolder(filePath)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message }
    }
  })

  ipcMain.handle('app:open-path', async (_event, filePath: string) => {
    try {
      const err = await shell.openPath(filePath)
      return { success: !err, error: err || undefined }
    } catch (err: any) {
      return { success: false, error: err?.message }
    }
  })
}

let isQuitting = false

function createWindow() {
  win = new BrowserWindow({
    title: 'منتجع MJS',
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 18, y: 16 },
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

  // Intercept window close to trigger auto-backup in renderer before exit
  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      if (win && !win.isDestroyed()) {
        win.webContents.send('app:request-auto-backup')
      }
      // Safety fallback timeout (2.5s) if renderer is un-responsive
      setTimeout(() => {
        isQuitting = true
        if (win && !win.isDestroyed()) {
          win.destroy()
        }
      }, 2500)
    }
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
