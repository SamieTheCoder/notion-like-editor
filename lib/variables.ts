/**
 * Merge-field variables, managed by admins instead of hardcoded in source.
 *
 * Scoping:
 *   vendor_id IS NULL  -> global, available to every vendor (super admin owns these)
 *   vendor_id = N      -> private to that vendor
 *
 * A vendor's effective list is "globals + its own". Tokens are stored uppercase
 * and are unique within a scope, so a vendor can override a global token.
 *
 * Table: notion_sam_variables
 */
import { authPool } from './auth-db'

const TABLE = 'notion_sam_variables'

export interface Variable {
  id: number
  vendor_id: number | null
  group_name: string
  token: string
  label: string
  dummy_value: string
  sort_order: number
  created_at: string
  updated_at: string
}

/** Normalize user input into a valid #TOKEN# name. */
export function normalizeToken(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/^#+|#+$/g, '')
    .replace(/[^A-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export async function initVariablesTable() {
  await authPool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id          SERIAL PRIMARY KEY,
      vendor_id   BIGINT,
      group_name  TEXT NOT NULL DEFAULT 'General',
      token       TEXT NOT NULL,
      label       TEXT NOT NULL,
      dummy_value TEXT NOT NULL DEFAULT '',
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
  // Postgres treats NULLs as distinct in a plain UNIQUE, so global rows need
  // their own partial index to stay unique.
  await authPool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_variables_vendor_token
     ON ${TABLE}(vendor_id, token) WHERE vendor_id IS NOT NULL`
  )
  await authPool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_variables_global_token
     ON ${TABLE}(token) WHERE vendor_id IS NULL`
  )
  await authPool.query(
    `CREATE INDEX IF NOT EXISTS idx_variables_vendor ON ${TABLE}(vendor_id)`
  )
}

/**
 * Variables visible to a vendor: its own plus the globals. A vendor-specific
 * token shadows a global one with the same name.
 */
export async function listVariablesForVendor(
  vendorId: number | null
): Promise<Variable[]> {
  const { rows } = await authPool.query<Variable>(
    `SELECT DISTINCT ON (token) *
     FROM ${TABLE}
     WHERE vendor_id IS NULL OR vendor_id = $1
     ORDER BY token, vendor_id NULLS LAST`,
    [vendorId]
  )
  // Re-sort for display: group, then explicit order, then label.
  return rows.sort(
    (a, b) =>
      a.group_name.localeCompare(b.group_name) ||
      a.sort_order - b.sort_order ||
      a.label.localeCompare(b.label)
  )
}

/** Rows owned by exactly one scope, for the management screen. */
export async function listVariablesByScope(
  vendorId: number | null
): Promise<Variable[]> {
  const { rows } = await authPool.query<Variable>(
    vendorId == null
      ? `SELECT * FROM ${TABLE} WHERE vendor_id IS NULL ORDER BY group_name, sort_order, label`
      : `SELECT * FROM ${TABLE} WHERE vendor_id = $1 ORDER BY group_name, sort_order, label`,
    vendorId == null ? [] : [vendorId]
  )
  return rows
}

export async function getVariableById(id: number): Promise<Variable | null> {
  const { rows } = await authPool.query<Variable>(
    `SELECT * FROM ${TABLE} WHERE id = $1`,
    [id]
  )
  return rows[0] || null
}

export async function createVariable(input: {
  vendorId: number | null
  groupName: string
  token: string
  label: string
  dummyValue: string
  sortOrder?: number
}): Promise<Variable> {
  const { rows } = await authPool.query<Variable>(
    `INSERT INTO ${TABLE} (vendor_id, group_name, token, label, dummy_value, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.vendorId,
      input.groupName || 'General',
      normalizeToken(input.token),
      input.label,
      input.dummyValue ?? '',
      input.sortOrder ?? 0,
    ]
  )
  return rows[0]
}

export async function updateVariable(input: {
  id: number
  groupName: string
  token: string
  label: string
  dummyValue: string
}): Promise<Variable | null> {
  const { rows } = await authPool.query<Variable>(
    `UPDATE ${TABLE}
     SET group_name = $2, token = $3, label = $4, dummy_value = $5, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      input.id,
      input.groupName || 'General',
      normalizeToken(input.token),
      input.label,
      input.dummyValue ?? '',
    ]
  )
  return rows[0] || null
}

export async function deleteVariable(id: number): Promise<boolean> {
  const { rowCount } = await authPool.query(
    `DELETE FROM ${TABLE} WHERE id = $1`,
    [id]
  )
  return (rowCount ?? 0) > 0
}

/** True when the token already exists in the given scope. */
export async function tokenExists(
  vendorId: number | null,
  token: string,
  excludeId?: number
): Promise<boolean> {
  const t = normalizeToken(token)
  const { rows } = await authPool.query<{ n: number }>(
    vendorId == null
      ? `SELECT count(*)::int AS n FROM ${TABLE}
         WHERE vendor_id IS NULL AND token = $1 AND ($2::int IS NULL OR id <> $2)`
      : `SELECT count(*)::int AS n FROM ${TABLE}
         WHERE vendor_id = $3 AND token = $1 AND ($2::int IS NULL OR id <> $2)`,
    vendorId == null ? [t, excludeId ?? null] : [t, excludeId ?? null, vendorId]
  )
  return (rows[0]?.n ?? 0) > 0
}
