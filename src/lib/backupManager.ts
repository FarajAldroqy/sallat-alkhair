// Web Crypto API Encrypted Data Backup & 7-Version Rolling Backup Manager
// Pure TypeScript, zero external dependencies.

const PASSPHRASE = 'SALLAT_AL_KHAIR_SECURE_KEY_2026'
const SALT = new TextEncoder().encode('SALAT_AL_KHAIR_SALT_2026')
const MAX_ROLLING_BACKUPS = 7
const ROLLING_KEY = 'system_rolling_backups'

export interface BackupPayload {
  version: string
  timestamp: string
  users: any[]
  notes: any[]
  transactions: any[]
  treasury: any[]
  archived: any[]
  audit_logs: any[]
}

export interface RollingBackupItem {
  id: string
  filename: string
  timestamp: string
  sizeBytes: number
  encryptedData: string
  type: 'AUTO' | 'MANUAL'
}

/**
 * Derive 256-bit AES-GCM Key using PBKDF2
 */
async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(PASSPHRASE),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt arbitrary JS object payload into AES-GCM encrypted Base64 JSON string
 */
export async function encryptPayload(payload: BackupPayload): Promise<string> {
  const key = await getCryptoKey()
  const enc = new TextEncoder()
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const jsonStr = JSON.stringify(payload)
  const encodedData = enc.encode(jsonStr)

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  )

  const combined = {
    iv: Array.from(iv),
    cipherText: Array.from(new Uint8Array(encryptedBuffer)),
  }

  return btoa(JSON.stringify(combined))
}

/**
 * Decrypt AES-GCM Base64 string back into validated BackupPayload
 */
export async function decryptPayload(encryptedBase64: string): Promise<BackupPayload> {
  try {
    const key = await getCryptoKey()
    const dec = new TextDecoder()
    const rawJson = atob(encryptedBase64)
    const { iv, cipherText } = JSON.parse(rawJson)

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      new Uint8Array(cipherText)
    )

    const jsonStr = dec.decode(decryptedBuffer)
    const payload = JSON.parse(jsonStr) as BackupPayload

    if (!payload || !payload.timestamp || !Array.isArray(payload.users)) {
      throw new Error('سلامة البنية غير صالحة: البيانات تفتقد للمفاتيح الأساسية')
    }

    return payload
  } catch (err: any) {
    throw new Error(`فشل فك تشفير البيانات: ${err.message || 'الملف غير صالح أو مفتاح التشفير غير مطابق'}`)
  }
}

/**
 * Collect all current system state into a BackupPayload
 */
export async function collectSystemPayload(): Promise<BackupPayload> {
  let users = []
  let notes = []
  let treasury = []
  let archived = []
  let audit_logs = []
  let transactions: any[] = []

  try {
    const u = localStorage.getItem('system_users')
    if (u) users = JSON.parse(u)
  } catch {}

  try {
    const n = localStorage.getItem('user_notes')
    if (n) notes = JSON.parse(n)
  } catch {}

  try {
    const t = localStorage.getItem('salla_treasury_custom_entities')
    if (t) treasury = JSON.parse(t)
  } catch {}

  try {
    const a = localStorage.getItem('salla_archived_transactions')
    if (a) archived = JSON.parse(a)
  } catch {}

  try {
    const l = localStorage.getItem('user_audit_logs')
    if (l) audit_logs = JSON.parse(l)
  } catch {}

  if (window.electronAPI?.getTransactions) {
    try {
      const res = await window.electronAPI.getTransactions({ page: 1, pageSize: 10000 })
      transactions = res.data || []
    } catch {
      transactions = []
    }
  }

  return {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    users,
    notes,
    treasury,
    archived,
    audit_logs,
    transactions,
  }
}

/**
 * Fetch array of saved 7-rolling backups from localStorage
 */
export function getRollingBackups(): RollingBackupItem[] {
  try {
    const saved = localStorage.getItem(ROLLING_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return []
}

/**
 * Perform a backup (AUTO or MANUAL) with 7-version FIFO rolling rule
 */
export async function createBackup(type: 'AUTO' | 'MANUAL' = 'AUTO'): Promise<RollingBackupItem> {
  const payload = await collectSystemPayload()
  const encryptedData = await encryptPayload(payload)

  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  const secs = String(d.getSeconds()).padStart(2, '0')
  const filename = `backup_${year}-${month}-${day}_${hours}-${mins}-${secs}.json.enc`

  const newItem: RollingBackupItem = {
    id: `bup_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    filename,
    timestamp: d.toISOString(),
    sizeBytes: new Blob([encryptedData]).size,
    encryptedData,
    type,
  }

  let list = getRollingBackups()

  // FIFO Rolling Rule: Keep max 7 versions
  if (list.length >= MAX_ROLLING_BACKUPS) {
    list = list.slice(list.length - (MAX_ROLLING_BACKUPS - 1))
  }

  list.push(newItem)
  localStorage.setItem(ROLLING_KEY, JSON.stringify(list))
  return newItem
}

/**
 * Delete a specific backup item by ID
 */
export function deleteBackupItem(id: string): void {
  const list = getRollingBackups().filter((b) => b.id !== id)
  localStorage.setItem(ROLLING_KEY, JSON.stringify(list))
}

/**
 * Restore system state from a validated BackupPayload
 */
export async function restoreSystemState(payload: BackupPayload): Promise<void> {
  if (Array.isArray(payload.users)) {
    localStorage.setItem('system_users', JSON.stringify(payload.users))
  }
  if (Array.isArray(payload.notes)) {
    localStorage.setItem('user_notes', JSON.stringify(payload.notes))
  }
  if (Array.isArray(payload.treasury)) {
    localStorage.setItem('salla_treasury_custom_entities', JSON.stringify(payload.treasury))
  }
  if (Array.isArray(payload.archived)) {
    localStorage.setItem('salla_archived_transactions', JSON.stringify(payload.archived))
  }
  if (Array.isArray(payload.audit_logs)) {
    localStorage.setItem('user_audit_logs', JSON.stringify(payload.audit_logs))
  }

  // Force page reload to apply full restored state seamlessly
  window.location.reload()
}

/**
 * Initialize auto-backup listener on unload/exit
 */
export function initAutoBackupListener() {
  if (typeof window === 'undefined') return

  let hasBackedUpOnExit = false

  const handleExit = () => {
    if (hasBackedUpOnExit) return
    hasBackedUpOnExit = true
    createBackup('AUTO').catch((err) => console.error('Exit backup failed', err))
  }

  window.addEventListener('beforeunload', handleExit)

  // Also create a baseline backup if no backups exist yet
  const existing = getRollingBackups()
  if (existing.length === 0) {
    createBackup('AUTO').catch(() => {})
  }
}
