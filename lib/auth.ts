/**
 * Authentication utilities for the SaaS backend.
 *
 * - Password hashing with PBKDF2 (no external deps)
 * - JWT signing/verification with HMAC-SHA256 (no external deps)
 * - Token generation and validation
 */
import crypto from 'crypto'

const AUTH_SECRET = process.env.AUTH_SECRET || 'dev-secret-change-me'
const ACCESS_TOKEN_EXPIRY = 60 * 60 // 1 hour in seconds
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 // 7 days in seconds

// ─── Password Hashing ────────────────────────────────────────────────────────

const PBKDF2_ITERATIONS = 100_000
const PBKDF2_KEYLEN = 64
const PBKDF2_DIGEST = 'sha512'
const SALT_LENGTH = 32

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex')
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST, (err, key) => {
      if (err) return reject(err)
      resolve(`${salt}:${key.toString('hex')}`)
    })
  })
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, storedKey] = hash.split(':')
  if (!salt || !storedKey) return false
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST, (err, key) => {
      if (err) return reject(err)
      resolve(crypto.timingSafeEqual(Buffer.from(storedKey, 'hex'), key))
    })
  })
}

// ─── JWT Implementation ──────────────────────────────────────────────────────

export interface TokenPayload {
  userId: string
  orgId: string
  email: string
  role: string
}

interface JWTHeader {
  alg: string
  typ: string
}

interface JWTPayload extends TokenPayload {
  iat: number
  exp: number
  type: 'access' | 'refresh'
}

function base64UrlEncode(data: string): string {
  return Buffer.from(data)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4 !== 0) base64 += '='
  return Buffer.from(base64, 'base64').toString('utf-8')
}

function sign(input: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(input)
  return hmac.digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function signToken(payload: TokenPayload, type: 'access' | 'refresh' = 'access'): string {
  const header: JWTHeader = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const expiry = type === 'access' ? ACCESS_TOKEN_EXPIRY : REFRESH_TOKEN_EXPIRY

  const jwtPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiry,
    type,
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload))
  const signature = sign(`${encodedHeader}.${encodedPayload}`, AUTH_SECRET)

  return `${encodedHeader}.${encodedPayload}.${signature}`
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [encodedHeader, encodedPayload, signature] = parts

    // Verify signature
    const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`, AUTH_SECRET)
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null
    }

    // Decode and check expiry
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JWTPayload
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) return null

    return payload
  } catch {
    return null
  }
}

export function generateRefreshToken(payload: TokenPayload): string {
  return signToken(payload, 'refresh')
}

// ─── Utility ─────────────────────────────────────────────────────────────────

export function generateApiKeyRaw(): { raw: string; prefix: string; hash: string } {
  const raw = `sk_${crypto.randomBytes(32).toString('hex')}`
  const prefix = `sk_...${raw.slice(-6)}`
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  return { raw, prefix, hash }
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

export function generateShareToken(): string {
  return crypto.randomBytes(24).toString('base64url')
}
