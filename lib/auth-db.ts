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
  code: string
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
      code            VARCHAR(255) NOT NULL UNIQUE,
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
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_vendor_code ON ${VENDOR_TABLE}(code);`)

  // Header/footer live on the vendor and are shared by all its templates.
  await pool.query(
    `ALTER TABLE ${VENDOR_TABLE} ADD COLUMN IF NOT EXISTS header_html TEXT`
  )
  await pool.query(
    `ALTER TABLE ${VENDOR_TABLE} ADD COLUMN IF NOT EXISTS footer_html TEXT`
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

/** Look up an active user by email, with vendor name/code joined. */
export async function findUserByEmail(
  email: string
): Promise<UserWithVendor | null> {
  const { rows } = await pool.query<UserWithVendor>(
    `SELECT u.*, v.name AS vendor_name, v.code AS vendor_code
     FROM ${USER_TABLE} u
     LEFT JOIN ${VENDOR_TABLE} v ON v.id = u.vendor_id
     WHERE lower(u.email) = lower($1)
     LIMIT 1`,
    [email]
  )
  return rows[0] || null
}

/** Find a vendor by its unique code. */
export async function findVendorByCode(code: string): Promise<Vendor | null> {
  const { rows } = await pool.query<Vendor>(
    `SELECT * FROM ${VENDOR_TABLE} WHERE code = $1 LIMIT 1`,
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
    `INSERT INTO ${VENDOR_TABLE} (name, code, domain, status)
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
}): Promise<User> {
  const { rows } = await pool.query<User>(
    `INSERT INTO ${USER_TABLE}
       (vendor_id, email, password_hash, first_name, last_name, role, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.vendor_id,
      input.email,
      input.password_hash,
      input.first_name,
      input.last_name ?? null,
      input.role ?? 'ADMIN',
      input.status ?? 'ACTIVE',
    ]
  )
  return rows[0]
}

export { pool as authPool }
