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
  slug: string
  name: string
  head_html: string
  footer_html: string
  config: EmailShellConfig
  created_at: string
  updated_at: string
}

/** Creates the table if it does not exist. */
export async function initTemplatesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id           SERIAL PRIMARY KEY,
      slug         TEXT NOT NULL UNIQUE,
      name         TEXT NOT NULL,
      head_html    TEXT NOT NULL,
      footer_html  TEXT NOT NULL,
      config       JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
}

export async function listTemplates(): Promise<Omit<EmailTemplate, 'head_html' | 'footer_html'>[]> {
  const { rows } = await pool.query(`
    SELECT id, slug, name, config, created_at, updated_at
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
    `SELECT * FROM ${TABLE} WHERE slug = $1`,
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
}): Promise<EmailTemplate> {
  const { rows } = await pool.query<EmailTemplate>(
    `INSERT INTO ${TABLE} (slug, name, head_html, footer_html, config)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (slug) DO UPDATE SET
       name        = EXCLUDED.name,
       head_html   = EXCLUDED.head_html,
       footer_html = EXCLUDED.footer_html,
       config      = EXCLUDED.config,
       updated_at  = now()
     RETURNING *`,
    [input.slug, input.name, input.headHtml, input.footerHtml, JSON.stringify(input.config)]
  )
  return rows[0]
}

export async function closeTemplatesPool() {
  await pool.end()
}
