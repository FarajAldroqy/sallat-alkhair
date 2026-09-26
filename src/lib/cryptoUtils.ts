// =====================================================================
// Crypto Utilities — Password Hashing (PBKDF2) + Device Key Management
// Pure Web Crypto API, zero external dependencies.
// =====================================================================

const DEVICE_KEY_STORAGE = 'mjs_device_key_v1'

// ── Password Hashing ─────────────────────────────────────────────────

/**
 * Hash a plain-text password using PBKDF2-SHA256 with a random 16-byte salt.
 * Returns a string in the format: "pbkdf2$<salt_hex>$<hash_hex>"
 */
export async function hashPassword(plaintext: string): Promise<string> {
  const enc = new TextEncoder()
  const salt = window.crypto.getRandomValues(new Uint8Array(16))

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(plaintext),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const bits = await window.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
    keyMaterial,
    256
  )

  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join('')
  const hashHex = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('')

  return `pbkdf2$${saltHex}$${hashHex}`
}

/**
 * Verify a plain-text password against a stored hash string.
 * Supports legacy plain-text passwords (no "pbkdf2$" prefix) for backward compatibility.
 */
export async function verifyPassword(plaintext: string, stored: string): Promise<boolean> {
  // Legacy plain-text comparison (will be upgraded on first successful login)
  if (!stored.startsWith('pbkdf2$')) {
    return plaintext === stored
  }

  const parts = stored.split('$')
  if (parts.length !== 3) return false

  const saltHex = parts[1]
  const storedHashHex = parts[2]

  // Reconstruct salt from hex
  const saltBytes = new Uint8Array(
    saltHex.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
  )

  const enc = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(plaintext),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const bits = await window.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: 120000, hash: 'SHA-256' },
    keyMaterial,
    256
  )

  const computedHashHex = Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  // Constant-time comparison to prevent timing attacks
  if (computedHashHex.length !== storedHashHex.length) return false
  let diff = 0
  for (let i = 0; i < computedHashHex.length; i++) {
    diff |= computedHashHex.charCodeAt(i) ^ storedHashHex.charCodeAt(i)
  }
  return diff === 0
}

/**
 * Returns true if the stored password is plain-text (legacy) and needs upgrading.
 */
export function isLegacyPassword(stored: string): boolean {
  return !stored.startsWith('pbkdf2$')
}

// ── Device-Unique Backup Key ──────────────────────────────────────────

/**
 * Get or generate a device-unique 32-character random passphrase stored in localStorage.
 * This replaces the hardcoded PASSPHRASE in backupManager.ts.
 */
export function getOrCreateDeviceKey(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY_STORAGE)
    if (existing && existing.length >= 32) return existing

    // Generate a cryptographically random 48-char key
    const bytes = window.crypto.getRandomValues(new Uint8Array(36))
    const newKey = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    localStorage.setItem(DEVICE_KEY_STORAGE, newKey)
    return newKey
  } catch {
    // Fallback to a stable but better-than-hardcoded key
    return 'MJS_RESORT_FALLBACK_KEY_2026_SECURE'
  }
}
