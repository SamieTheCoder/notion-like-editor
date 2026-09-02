/**
 * Authentication persistence layer (PostgreSQL).
 *
 * Translates the VENDOR and USER tables from feedback.sql (MySQL/MariaDB) into
 * PostgreSQL. Uses the same DATABASE_* env vars as lib/db.ts.
 *
 * Tables:
 *   - notion_sam_vendor
 *   - notion_sam_user  (references notion_sam_vendor)
 */
import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: false,
})

export const VENDOR_TABLE = 'notion_sam_vendor'
export const USER_TABLE = 'notion_sam_user'

export interface Vendor {
  id: number
  name: string
  vendor_name: string
  domain: string | null
  logo_url: string | null
  status: string
  primary_color: string | null
  secondary_color: string | null
  tertiary_color: string | null
  favicon_url: string | null
  header_html: string | null
  footer_html: string | null
  created_at: string
  updated_at: string
}

export interface User {
  id: number
  vendor_id: number | null
  email: string
  password_hash: string | null
  first_name: string
  last_name: string | null
  role: string
  status: string
  permissions: string | null
  must_change_password: boolean
  created_at: string
  updated_at: string
}

/** User row with its vendor fields joined in. */
export interface UserWithVendor extends User {
  vendor_name: string | null
  vendor_code: string | null
}

/**
 * Initialize the VENDOR and USER tables if they don't exist.
 * Mirrors the columns from feedback.sql, adapted to PostgreSQL types.
 */
export async function initAuthDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${VENDOR_TABLE} (
      id              BIGSERIAL PRIMARY KEY,
      name            VARCHAR(255) NOT NULL,
      vendor_name     VARCHAR(255) NOT NULL UNIQUE,
      domain          VARCHAR(255),
      logo_url        VARCHAR(255),
      status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      favicon_url     VARCHAR(255),
      primary_color   VARCHAR(255),
      secondary_color VARCHAR(255),
      tertiary_color  VARCHAR(255),
      webhook_events  VARCHAR(255),
      webhook_url     VARCHAR(255),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${USER_TABLE} (
      id                       BIGSERIAL PRIMARY KEY,
      vendor_id                BIGINT REFERENCES ${VENDOR_TABLE}(id),
      email                    VARCHAR(255) NOT NULL UNIQUE,
      password_hash            VARCHAR(255),
      first_name               VARCHAR(255) NOT NULL,
      last_name                VARCHAR(255),
      role                     VARCHAR(20) NOT NULL DEFAULT 'ADMIN',
      status                   VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      invite_token             VARCHAR(255) UNIQUE,
      invite_token_expires_at  TIMESTAMPTZ,
      permissions              TEXT,
      created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_email ON ${USER_TABLE}(email);`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_vendor ON ${USER_TABLE}(vendor_id);`)

  // Migration: the vendor "code" column was renamed to "vendor_name". Rename it
  // in place on existing databases; a NULL-safe guard keeps this idempotent.
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '${VENDOR_TABLE}' AND column_name = 'code'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '${VENDOR_TABLE}' AND column_name = 'vendor_name'
      ) THEN
        ALTER TABLE ${VENDOR_TABLE} RENAME COLUMN code TO vendor_name;
      END IF;
    END $$;
  `)
  await pool.query(
    `ALTER INDEX IF EXISTS idx_vendor_code RENAME TO idx_vendor_vendor_name`
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_vendor_vendor_name ON ${VENDOR_TABLE}(vendor_name);`
  )

  // Header/footer live on the vendor and are shared by all its templates.
  await pool.query(
    `ALTER TABLE ${VENDOR_TABLE} ADD COLUMN IF NOT EXISTS header_html TEXT`
  )
  await pool.query(
    `ALTER TABLE ${VENDOR_TABLE} ADD COLUMN IF NOT EXISTS footer_html TEXT`
  )

  // Force a password reset on first login for admin-created vendor users.
  await pool.query(
    `ALTER TABLE ${USER_TABLE} ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false`
  )
}

/** Update a vendor's shared header/footer HTML. */
export async function updateVendorShell(input: {
  id: number
  headerHtml: string
  footerHtml: string
}): Promise<Vendor | null> {
  const { rows } = await pool.query<Vendor>(
    `UPDATE ${VENDOR_TABLE}
     SET header_html = $2, footer_html = $3, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [input.id, input.headerHtml, input.footerHtml]
  )
  return rows[0] || null
}

/**
 * Update a vendor's branding: accent color (stored in primary_color) and
 * favicon URL. Both are optional; passing null clears the value.
 */
export async function updateVendorBranding(input: {
  id: number
  accentColor: string | null
  faviconUrl: string | null
}): Promise<Vendor | null> {
  const { rows } = await pool.query<Vendor>(
    `UPDATE ${VENDOR_TABLE}
     SET primary_color = $2, favicon_url = $3, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [input.id, input.accentColor, input.faviconUrl]
  )
  return rows[0] || null
}

/** Look up an active user by email, with vendor name/code joined. */
export async function findUserByEmail(
  email: string
): Promise<UserWithVendor | null> {
  const { rows } = await pool.query<UserWithVendor>(
    `SELECT u.*, v.name AS vendor_name, v.vendor_name AS vendor_code
     FROM ${USER_TABLE} u
     LEFT JOIN ${VENDOR_TABLE} v ON v.id = u.vendor_id
     WHERE lower(u.email) = lower($1)
     LIMIT 1`,
    [email]
  )
  return rows[0] || null
}

/** Find a vendor by its unique name/code. */
export async function findVendorByCode(code: string): Promise<Vendor | null> {
  const { rows } = await pool.query<Vendor>(
    `SELECT * FROM ${VENDOR_TABLE} WHERE vendor_name = $1 LIMIT 1`,
    [code]
  )
  return rows[0] || null
}

/** List all vendors, newest ids last. */
export async function listVendors(): Promise<Vendor[]> {
  const { rows } = await pool.query<Vendor>(
    `SELECT * FROM ${VENDOR_TABLE} ORDER BY id ASC`
  )
  return rows
}

/** Get a single vendor by id. */
export async function getVendorById(id: number): Promise<Vendor | null> {
  const { rows } = await pool.query<Vendor>(
    `SELECT * FROM ${VENDOR_TABLE} WHERE id = $1 LIMIT 1`,
    [id]
  )
  return rows[0] || null
}

/** Insert a vendor and return it. */
export async function createVendor(input: {
  name: string
  code: string
  domain?: string | null
  status?: string
}): Promise<Vendor> {
  const { rows } = await pool.query<Vendor>(
    `INSERT INTO ${VENDOR_TABLE} (name, vendor_name, domain, status)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.name, input.code, input.domain ?? null, input.status ?? 'ACTIVE']
  )
  return rows[0]
}

/** Insert a user and return it. */
export async function createUser(input: {
  vendor_id: number | null
  email: string
  password_hash: string
  first_name: string
  last_name?: string | null
  role?: string
  status?: string
  must_change_password?: boolean
}): Promise<User> {
  const { rows } = await pool.query<User>(
    `INSERT INTO ${USER_TABLE}
       (vendor_id, email, password_hash, first_name, last_name, role, status, must_change_password)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.vendor_id,
      input.email,
      input.password_hash,
      input.first_name,
      input.last_name ?? null,
      input.role ?? 'ADMIN',
      input.status ?? 'ACTIVE',
      input.must_change_password ?? false,
    ]
  )
  return rows[0]
}

/** Find a user by id (no vendor join). */
export async function getUserById(id: number): Promise<User | null> {
  const { rows } = await pool.query<User>(
    `SELECT * FROM ${USER_TABLE} WHERE id = $1 LIMIT 1`,
    [id]
  )
  return rows[0] || null
}

/** List users for a vendor (newest last), without password hashes. */
export async function listUsersByVendor(
  vendorId: number
): Promise<Omit<User, 'password_hash'>[]> {
  const { rows } = await pool.query<Omit<User, 'password_hash'>>(
    `SELECT id, vendor_id, email, first_name, last_name, role, status,
            permissions, must_change_password, created_at, updated_at
     FROM ${USER_TABLE}
     WHERE vendor_id = $1
     ORDER BY id ASC`,
    [vendorId]
  )
  return rows
}

/**
 * Update a user's password hash and clear the must_change_password flag.
 * Returns the updated user (without hash) or null.
 */
export async function updateUserPassword(input: {
  id: number
  password_hash: string
}): Promise<Omit<User, 'password_hash'> | null> {
  const { rows } = await pool.query<Omit<User, 'password_hash'>>(
    `UPDATE ${USER_TABLE}
     SET password_hash = $2, must_change_password = false, updated_at = now()
     WHERE id = $1
     RETURNING id, vendor_id, email, first_name, last_name, role, status,
               permissions, must_change_password, created_at, updated_at`,
    [input.id, input.password_hash]
  )
  return rows[0] || null
}

/** Delete a user by id. Returns true if a row was removed. */
export async function deleteUser(id: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM ${USER_TABLE} WHERE id = $1`,
    [id]
  )
  return (rowCount ?? 0) > 0
}

/** Count active super admins, used to avoid deleting the last one. */
export async function countSuperAdmins(): Promise<number> {
  const { rows } = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM ${USER_TABLE} WHERE role = 'SUPER_ADMIN'`
  )
  return rows[0]?.n ?? 0
}

/** Does this vendor have any super-admin users attached? */
export async function vendorHasSuperAdmin(vendorId: number): Promise<boolean> {
  const { rows } = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM ${USER_TABLE}
     WHERE vendor_id = $1 AND role = 'SUPER_ADMIN'`,
    [vendorId]
  )
  return (rows[0]?.n ?? 0) > 0
}

/**
 * Delete a vendor along with its users and templates, in one transaction.
 * Destructive: callers must confirm with the operator first.
 */
export async function deleteVendorCascade(vendorId: number): Promise<{
  vendor: number
  users: number
  templates: number
}> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const t = await client.query(
      `DELETE FROM notion_sam_email_templates WHERE vendor_id = $1`,
      [vendorId]
    )
    const u = await client.query(
      `DELETE FROM ${USER_TABLE} WHERE vendor_id = $1`,
      [vendorId]
    )
    const v = await client.query(`DELETE FROM ${VENDOR_TABLE} WHERE id = $1`, [
      vendorId,
    ])
    await client.query('COMMIT')
    return {
      vendor: v.rowCount ?? 0,
      users: u.rowCount ?? 0,
      templates: t.rowCount ?? 0,
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export { pool as authPool }
