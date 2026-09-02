/**
 * Per-vendor API keys.
 *
 * Mirrors the API_KEY table from feedback.sql, adapted to PostgreSQL. Each key
 * is a public identifier (`api_key`, safe to display) paired with a secret. The
 * secret is shown to the operator exactly once, at creation time; only its
 * bcrypt hash is stored, so a leaked database row cannot be used to call the
 * API. Verification compares an incoming secret against the stored hash.
 *
 * Table: notion_sam_api_key
 */
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { authPool } from './auth-db'

const TABLE = 'notion_sam_api_key'

export interface ApiKey {
  id: number
  vendor_id: number
  api_key: string
  status: string
  label: string | null
  created_at: string
  expires_at: string | null
  last_used_at: string | null
}

/** A newly created key, including the one-time plaintext secret. */
export interface ApiKeyWithSecret extends ApiKey {
  secret: string
}

/** Create the table (and additive columns) if they don't exist. */
export async function initApiKeysTable() {
  await authPool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id           BIGSERIAL PRIMARY KEY,
      vendor_id    BIGINT NOT NULL,
      api_key      VARCHAR(255) NOT NULL UNIQUE,
      secret_hash  VARCHAR(255) NOT NULL,
      status       VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      label        VARCHAR(255),
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at   TIMESTAMPTZ,
      last_used_at TIMESTAMPTZ
    );
  `)
  await authPool.query(
    `CREATE INDEX IF NOT EXISTS idx_api_key_vendor ON ${TABLE}(vendor_id)`
  )
  await authPool.query(
    `CREATE INDEX IF NOT EXISTS idx_api_key_key ON ${TABLE}(api_key)`
  )
}

/** Public columns only — never selects the secret hash. */
const PUBLIC_COLS =
  'id, vendor_id, api_key, status, label, created_at, expires_at, last_used_at'

/**
 * Generate a new key pair for a vendor. Returns the row plus the one-time
 * plaintext secret; the caller must surface it to the operator immediately
 * because it is not recoverable afterwards.
 */
export async function createApiKey(input: {
  vendorId: number
  label?: string | null
  expiresAt?: Date | null
}): Promise<ApiKeyWithSecret> {
  // Public identifier: prefixed random token. Secret: longer random token.
  const apiKey = `ak_${randomBytes(18).toString('hex')}`
  const secret = `sk_${randomBytes(32).toString('hex')}`
  const secretHash = await bcrypt.hash(secret, 10)

  const { rows } = await authPool.query<ApiKey>(
    `INSERT INTO ${TABLE} (vendor_id, api_key, secret_hash, label, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${PUBLIC_COLS}`,
    [
      input.vendorId,
      apiKey,
      secretHash,
      input.label?.trim() || null,
      input.expiresAt ?? null,
    ]
  )
  return { ...rows[0], secret }
}

/** List a vendor's keys (public fields only, newest first). */
export async function listApiKeys(vendorId: number): Promise<ApiKey[]> {
  const { rows } = await authPool.query<ApiKey>(
    `SELECT ${PUBLIC_COLS} FROM ${TABLE}
     WHERE vendor_id = $1
     ORDER BY id DESC`,
    [vendorId]
  )
  return rows
}

/**
 * Revoke (soft-delete) a key by id, scoped to its vendor so one vendor cannot
 * revoke another's key. Returns the updated public row, or null if not found.
 */
export async function revokeApiKey(
  id: number,
  vendorId: number
): Promise<ApiKey | null> {
  const { rows } = await authPool.query<ApiKey>(
    `UPDATE ${TABLE}
     SET status = 'REVOKED'
     WHERE id = $1 AND vendor_id = $2
     RETURNING ${PUBLIC_COLS}`,
    [id, vendorId]
  )
  return rows[0] || null
}

/**
 * Verify an incoming (api_key, secret) pair. Returns the key row when it is
 * active, not expired, and the secret matches; otherwise null. Also stamps
 * last_used_at on success. Intended for the downstream send pipeline.
 */
export async function verifyApiKey(
  apiKey: string,
  secret: string
): Promise<ApiKey | null> {
  const { rows } = await authPool.query<ApiKey & { secret_hash: string }>(
    `SELECT ${PUBLIC_COLS}, secret_hash FROM ${TABLE}
     WHERE api_key = $1 AND status = 'ACTIVE'
       AND (expires_at IS NULL OR expires_at > now())
     LIMIT 1`,
    [apiKey]
  )
  const row = rows[0]
  if (!row) return null

  const ok = await bcrypt.compare(secret, row.secret_hash)
  if (!ok) return null

  await authPool.query(
    `UPDATE ${TABLE} SET last_used_at = now() WHERE id = $1`,
    [row.id]
  )

  // Strip the hash before returning.
  const { secret_hash: _unused, ...pub } = row
  void _unused
  return pub
}
