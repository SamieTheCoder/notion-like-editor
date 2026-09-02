/**
 * Master email shells: the head and footer chrome that wraps body content.
 *
 * A shell is stored as two rendered HTML fragments plus the config they were
 * generated from. Storing both means the send path only concatenates strings —
 * it never has to run the builder — while the config stays available so a shell
 * can be regenerated after a brand change.
 *
 * Table: notion_sam_email_templates
 */
import { Pool } from 'pg'
import type { EmailShellConfig } from './email-shell'

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

const TABLE = 'notion_sam_email_templates'

export interface EmailTemplate {
  id: number
  vendor_name: string
  name: string
  head_html: string
  footer_html: string
  body_html: string
  body_json: Record<string, unknown> | null
  final_body: string | null
  trigger: string | null
  vendor_id: number | null
  is_active: string
  config: EmailShellConfig
  created_at: string
  updated_at: string
}

/** Creates the table if it does not exist. */
export async function initTemplatesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id           SERIAL PRIMARY KEY,
      vendor_name  TEXT NOT NULL UNIQUE,
      name         TEXT NOT NULL,
      head_html    TEXT NOT NULL,
      footer_html  TEXT NOT NULL,
      config       JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
  // Migration: the "slug" column was renamed to "vendor_name". Rename it in
  // place on existing databases; the NULL-safe guard keeps this idempotent.
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '${TABLE}' AND column_name = 'slug'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '${TABLE}' AND column_name = 'vendor_name'
      ) THEN
        ALTER TABLE ${TABLE} RENAME COLUMN slug TO vendor_name;
      END IF;
    END $$;
  `)
  // Additive migrations: vendor link, body content, editor JSON, trigger name.
  await pool.query(
    `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS body_html TEXT NOT NULL DEFAULT ''`
  )
  await pool.query(
    `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS body_json JSONB`
  )
  await pool.query(
    `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS vendor_id BIGINT`
  )
  await pool.query(
    `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS trigger TEXT`
  )
  await pool.query(
    `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS final_body TEXT`
  )
  // Active flag stored as 'Y' / 'N'. Default 'Y' so existing templates stay on.
  await pool.query(
    `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS is_active CHAR(1) NOT NULL DEFAULT 'Y'`
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_email_template_vendor ON ${TABLE}(vendor_id)`
  )
}

/** Flip a template's active flag. Returns the new value or null if not found. */
export async function setTemplateActive(
  id: number,
  active: boolean
): Promise<string | null> {
  const { rows } = await pool.query<{ is_active: string }>(
    `UPDATE ${TABLE} SET is_active = $2, updated_at = now() WHERE id = $1 RETURNING is_active`,
    [id, active ? 'Y' : 'N']
  )
  return rows[0]?.is_active ?? null
}

export async function listTemplates(): Promise<Omit<EmailTemplate, 'head_html' | 'footer_html'>[]> {
  const { rows } = await pool.query(`
    SELECT id, vendor_name, name, config, created_at, updated_at
    FROM ${TABLE}
    ORDER BY id ASC
  `)
  return rows
}

export async function getTemplateById(id: number): Promise<EmailTemplate | null> {
  const { rows } = await pool.query<EmailTemplate>(
    `SELECT * FROM ${TABLE} WHERE id = $1`,
    [id]
  )
  return rows[0] || null
}

export async function getTemplateBySlug(slug: string): Promise<EmailTemplate | null> {
  const { rows } = await pool.query<EmailTemplate>(
    `SELECT * FROM ${TABLE} WHERE vendor_name = $1`,
    [slug]
  )
  return rows[0] || null
}

/**
 * Inserts or updates by slug, so re-running a seed keeps the same id instead of
 * accumulating rows.
 */
export async function upsertTemplate(input: {
  slug: string
  name: string
  headHtml: string
  footerHtml: string
  config: EmailShellConfig
  bodyHtml?: string
  vendorId?: number | null
}): Promise<EmailTemplate> {
  const { rows } = await pool.query<EmailTemplate>(
    `INSERT INTO ${TABLE} (vendor_name, name, head_html, footer_html, config, body_html, vendor_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (vendor_name) DO UPDATE SET
       name        = EXCLUDED.name,
       head_html   = EXCLUDED.head_html,
       footer_html = EXCLUDED.footer_html,
       config      = EXCLUDED.config,
       body_html   = EXCLUDED.body_html,
       vendor_id   = EXCLUDED.vendor_id,
       updated_at  = now()
     RETURNING *`,
    [
      input.slug,
      input.name,
      input.headHtml,
      input.footerHtml,
      JSON.stringify(input.config),
      input.bodyHtml ?? '',
      input.vendorId ?? null,
    ]
  )
  return rows[0]
}

/** Get the first template row for a given vendor (legacy single-template use). */
export async function getTemplateByVendor(
  vendorId: number
): Promise<EmailTemplate | null> {
  const { rows } = await pool.query<EmailTemplate>(
    `SELECT * FROM ${TABLE} WHERE vendor_id = $1 ORDER BY id ASC LIMIT 1`,
    [vendorId]
  )
  return rows[0] || null
}

/**
 * Get a template by vendor id + trigger name. This is the lookup the send path
 * uses: given which vendor is sending and which event fired, return the row so
 * the caller can read its body. Matches the newest row when a vendor has more
 * than one template for the same trigger.
 */
export async function getTemplateByVendorAndTrigger(
  vendorId: number,
  trigger: string
): Promise<EmailTemplate | null> {
  const { rows } = await pool.query<EmailTemplate>(
    `SELECT * FROM ${TABLE}
     WHERE vendor_id = $1 AND trigger = $2
     ORDER BY id DESC
     LIMIT 1`,
    [vendorId, trigger]
  )
  return rows[0] || null
}

/** List all templates for a vendor. */
export async function listTemplatesByVendor(
  vendorId: number
): Promise<EmailTemplate[]> {
  const { rows } = await pool.query<EmailTemplate>(
    `SELECT * FROM ${TABLE} WHERE vendor_id = $1 ORDER BY id ASC`,
    [vendorId]
  )
  return rows
}

/** Count templates per vendor id. Returns a map { vendorId: count }. */
export async function countTemplatesByVendor(): Promise<Record<number, number>> {
  const { rows } = await pool.query<{ vendor_id: string; n: string }>(
    `SELECT vendor_id, count(*)::int AS n
     FROM ${TABLE}
     WHERE vendor_id IS NOT NULL
     GROUP BY vendor_id`
  )
  const map: Record<number, number> = {}
  for (const r of rows) map[Number(r.vendor_id)] = Number(r.n)
  return map
}

/** Create a new template (body + trigger) for a vendor. */
export async function createVendorTemplate(input: {
  vendorId: number
  vendorCode: string
  trigger: string
  bodyHtml?: string
  bodyJson?: Record<string, unknown>
  finalBody?: string
}): Promise<EmailTemplate> {
  // slug must be unique; derive one from vendor code + trigger + timestamp.
  const base = `${input.vendorCode}-${input.trigger}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const slug = `${base}-${Date.now().toString(36)}`

  const { rows } = await pool.query<EmailTemplate>(
    `INSERT INTO ${TABLE}
       (vendor_name, name, head_html, footer_html, body_html, body_json, final_body, trigger, vendor_id, config)
     VALUES ($1, $2, '', '', $3, $4, $5, $6, $7, '{}'::jsonb)
     RETURNING *`,
    [
      slug,
      input.trigger,
      input.bodyHtml ?? '',
      input.bodyJson ? JSON.stringify(input.bodyJson) : null,
      input.finalBody ?? '',
      input.trigger,
      input.vendorId,
    ]
  )
  return rows[0]
}

/** Update a single template's body + trigger by id. */
export async function updateVendorTemplate(input: {
  id: number
  trigger: string
  bodyHtml: string
  bodyJson: Record<string, unknown>
  finalBody: string
}): Promise<EmailTemplate | null> {
  const { rows } = await pool.query<EmailTemplate>(
    `UPDATE ${TABLE}
     SET trigger = $2, name = $2, body_html = $3, body_json = $4,
         final_body = $5, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [input.id, input.trigger, input.bodyHtml, JSON.stringify(input.bodyJson), input.finalBody]
  )
  return rows[0] || null
}

/** Delete a template by id. Returns true if a row was removed. */
export async function deleteTemplate(id: number): Promise<boolean> {
  const { rowCount } = await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id])
  return (rowCount ?? 0) > 0
}

/** Update the header, footer, and body HTML of a template by id. */
export async function updateTemplateHtml(input: {
  id: number
  headHtml: string
  footerHtml: string
  bodyHtml: string
}): Promise<EmailTemplate | null> {
  const { rows } = await pool.query<EmailTemplate>(
    `UPDATE ${TABLE}
     SET head_html = $2, footer_html = $3, body_html = $4, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [input.id, input.headHtml, input.footerHtml, input.bodyHtml]
  )
  return rows[0] || null
}

export async function closeTemplatesPool() {
  await pool.end()
}

/**
 * Save the editor-authored body (HTML + ProseMirror JSON) and the trigger
 * (template name) onto a vendor's template row. Creates the row if the vendor
 * doesn't have one yet.
 */
export async function saveVendorBody(input: {
  vendorId: number
  vendorCode: string
  trigger: string
  bodyHtml: string
  bodyJson: Record<string, unknown>
}): Promise<EmailTemplate> {
  const existing = await getTemplateByVendor(input.vendorId)
  if (existing) {
    const { rows } = await pool.query<EmailTemplate>(
      `UPDATE ${TABLE}
       SET body_html = $2, body_json = $3, trigger = $4, name = $4, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [existing.id, input.bodyHtml, JSON.stringify(input.bodyJson), input.trigger]
    )
    return rows[0]
  }
  const { rows } = await pool.query<EmailTemplate>(
    `INSERT INTO ${TABLE} (vendor_name, name, head_html, footer_html, body_html, body_json, trigger, vendor_id, config)
     VALUES ($1, $2, '', '', $3, $4, $5, $6, '{}'::jsonb)
     RETURNING *`,
    [
      input.vendorCode.toLowerCase(),
      input.trigger,
      input.bodyHtml,
      JSON.stringify(input.bodyJson),
      input.trigger,
      input.vendorId,
    ]
  )
  return rows[0]
}
