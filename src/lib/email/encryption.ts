import crypto from 'crypto'

/**
 * Microsoft 365 / Email credentials and token encryption.
 * Uses AES-256-GCM authenticated encryption.
 * Format: `<iv-hex>:<ciphertext-hex>:<authTag-hex>`
 */

const GCM_IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getKeyBuffer(): Buffer {
  const rawKey = process.env.EMAIL_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY
  if (!rawKey) {
    throw new Error('EMAIL_ENCRYPTION_KEY or ENCRYPTION_KEY environment variable is missing')
  }
  const key = rawKey.trim()

  // 1. 64-character hex string (32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(key)) {
    return Buffer.from(key, 'hex')
  }

  // 2. Base64-encoded 32-byte key
  const base64Buffer = Buffer.from(key, 'base64')
  if (base64Buffer.length === 32) {
    return base64Buffer
  }

  // 3. Fallback hex attempt
  const hexBuffer = Buffer.from(key, 'hex')
  if (hexBuffer.length === 32) {
    return hexBuffer
  }

  throw new Error(
    'EMAIL_ENCRYPTION_KEY must be a valid 32-byte key (64 hex characters or 32-byte base64 string)',
  )
}

export function encryptEmailData(text: string): string {
  const iv = crypto.randomBytes(GCM_IV_LENGTH)
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    getKeyBuffer(),
    iv,
  )
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`
}

export function decryptEmailData(encryptedText: string): string {
  const keyBuffer = getKeyBuffer()
  const parts = encryptedText.split(':')

  if (parts.length === 3) {
    const [ivHex, ctHex, tagHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    if (iv.length !== GCM_IV_LENGTH) {
      throw new Error(
        `Encrypted data has unexpected GCM IV length ${iv.length}`,
      )
    }
    const authTag = Buffer.from(tagHex, 'hex')
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(
        `Encrypted data has unexpected GCM auth-tag length ${authTag.length}`,
      )
    }
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      keyBuffer,
      iv,
    )
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(ctHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  throw new Error(
    `Encrypted data has unrecognised format (expected 2 colons, got ${parts.length - 1})`,
  )
}
