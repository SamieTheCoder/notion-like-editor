/**
 * PostgreSQL persistence layer for the Email Template Editor SaaS.
 *
 * Tables: saas_organizations, saas_users, saas_templates, saas_categories,
 * saas_shared_links, saas_api_keys, saas_template_analytics
 *
 * Reuses the same Pool/env configuration as lib/db.ts.
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

// ─── Types ───────────────────────────────────────────────────────────────────

export type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER'
export type UserStatus = 'ACTIVE' | 'INACTIVE'
export type TemplateStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type AnalyticsEvent = 'viewed' | 'shared' | 'exported' | 'sent'

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  org_id: string
  email: string
  password_hash: string
  first_name: string
  last_name: string
  role: OrgRole
  avatar_url: string | null
  status: UserStatus
  created_at: string
  updated_at: string
}

export type UserPublic = Omit<User, 'password_hash'>

export interface Template {
  id: string
  org_id: string
  title: string
  description: string | null
  slug: string
  category_id: string | null
  head_html: string
  footer_html: string
  content: Record<string, unknown>
  shell_config: Record<string, unknown> | null
  status: TemplateStatus
  variables: string[]
  thumbnail_url: string | null
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  org_id: string
  name: string
  color: string
  sort_order: number
  created_at: string
}

export interface SharedLink {
  id: string
  template_id: string
  token: string
  expires_at: string | null
  password_hash: string | null
  view_count: number
  created_by: string
  created_at: string
}

export interface ApiKey {
  id: string
  org_id: string
  name: string
  key_hash: string
  prefix: string
  last_used_at: string | null
  created_at: string
}

export interface TemplateAnalytics {
  id: number
  template_id: string
  event: AnalyticsEvent
  metadata: Record<string, unknown> | null
  created_at: string
}

// ─── Schema Initialization ───────────────────────────────────────────────────

export async function initSaasDB(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS saas_organizations (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name          TEXT NOT NULL,
      slug          TEXT NOT NULL UNIQUE,
      logo_url      TEXT,
      primary_color TEXT NOT NULL DEFAULT '#3b82f6',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS saas_users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id        UUID NOT NULL REFERENCES saas_organizations(id) ON DELETE CASCADE,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      first_name    TEXT NOT NULL,
      last_name     TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),
      avatar_url    TEXT,
      status        TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS saas_categories (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id      UUID NOT NULL REFERENCES saas_organizations(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      color       TEXT NOT NULL DEFAULT '#6b7280',
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS saas_templates (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id        UUID NOT NULL REFERENCES saas_organizations(id) ON DELETE CASCADE,
      title         TEXT NOT NULL DEFAULT 'Untitled Template',
      description   TEXT,
      slug          TEXT NOT NULL,
      category_id   UUID REFERENCES saas_categories(id) ON DELETE SET NULL,
      head_html     TEXT NOT NULL DEFAULT '',
      footer_html   TEXT NOT NULL DEFAULT '',
      content       JSONB NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
      shell_config  JSONB,
      status        TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
      variables     JSONB NOT NULL DEFAULT '[]'::jsonb,
      thumbnail_url TEXT,
      created_by    UUID NOT NULL REFERENCES saas_users(id),
      updated_by    UUID NOT NULL REFERENCES saas_users(id),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS saas_shared_links (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id   UUID NOT NULL REFERENCES saas_templates(id) ON DELETE CASCADE,
      token         TEXT NOT NULL UNIQUE,
      expires_at    TIMESTAMPTZ,
      password_hash TEXT,
      view_count    INTEGER NOT NULL DEFAULT 0,
      created_by    UUID NOT NULL REFERENCES saas_users(id),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS saas_api_keys (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id      UUID NOT NULL REFERENCES saas_organizations(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      key_hash    TEXT NOT NULL,
      prefix      TEXT NOT NULL,
      last_used_at TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS saas_template_analytics (
      id          SERIAL PRIMARY KEY,
      template_id UUID NOT NULL REFERENCES saas_templates(id) ON DELETE CASCADE,
      event       TEXT NOT NULL CHECK (event IN ('viewed', 'shared', 'exported', 'sent')),
      metadata    JSONB,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
}

// ─── Organization CRUD ───────────────────────────────────────────────────────

export async function createOrg(data: {
  name: string
  slug: string
  logo_url?: string | null
  primary_color?: string
}): Promise<Organization> {
  const { rows } = await pool.query<Organization>(
    `INSERT INTO saas_organizations (name, slug, logo_url, primary_color)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.name, data.slug, data.logo_url || null, data.primary_color || '#3b82f6']
  )
  return rows[0]
}

export async function getOrgById(id: string): Promise<Organization | null> {
  const { rows } = await pool.query<Organization>(
    `SELECT * FROM saas_organizations WHERE id = $1`,
    [id]
  )
  return rows[0] || null
}

export async function getOrgBySlug(slug: string): Promise<Organization | null> {
  const { rows } = await pool.query<Organization>(
    `SELECT * FROM saas_organizations WHERE slug = $1`,
    [slug]
  )
  return rows[0] || null
}

export async function updateOrg(
  id: string,
  data: Partial<Pick<Organization, 'name' | 'slug' | 'logo_url' | 'primary_color'>>
): Promise<Organization | null> {
  const fields: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name) }
  if (data.slug !== undefined) { fields.push(`slug = $${idx++}`); values.push(data.slug) }
  if (data.logo_url !== undefined) { fields.push(`logo_url = $${idx++}`); values.push(data.logo_url) }
  if (data.primary_color !== undefined) { fields.push(`primary_color = $${idx++}`); values.push(data.primary_color) }

  if (fields.length === 0) return getOrgById(id)

  fields.push(`updated_at = now()`)
  values.push(id)

  const { rows } = await pool.query<Organization>(
    `UPDATE saas_organizations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )
  return rows[0] || null
}

// ─── User CRUD ───────────────────────────────────────────────────────────────

export async function createUser(data: {
  org_id: string
  email: string
  password_hash: string
  first_name: string
  last_name: string
  role?: OrgRole
  avatar_url?: string | null
}): Promise<User> {
  const { rows } = await pool.query<User>(
    `INSERT INTO saas_users (org_id, email, password_hash, first_name, last_name, role, avatar_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [data.org_id, data.email, data.password_hash, data.first_name, data.last_name, data.role || 'MEMBER', data.avatar_url || null]
  )
  return rows[0]
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { rows } = await pool.query<User>(
    `SELECT * FROM saas_users WHERE email = $1`,
    [email]
  )
  return rows[0] || null
}

export async function getUserById(id: string): Promise<User | null> {
  const { rows } = await pool.query<User>(
    `SELECT * FROM saas_users WHERE id = $1`,
    [id]
  )
  return rows[0] || null
}

export async function getUsersByOrg(orgId: string): Promise<UserPublic[]> {
  const { rows } = await pool.query<UserPublic>(
    `SELECT id, org_id, email, first_name, last_name, role, avatar_url, status, created_at, updated_at
     FROM saas_users WHERE org_id = $1 ORDER BY created_at ASC`,
    [orgId]
  )
  return rows
}

export async function updateUser(
  id: string,
  data: Partial<Pick<User, 'first_name' | 'last_name' | 'role' | 'avatar_url' | 'status' | 'password_hash'>>
): Promise<User | null> {
  const fields: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (data.first_name !== undefined) { fields.push(`first_name = $${idx++}`); values.push(data.first_name) }
  if (data.last_name !== undefined) { fields.push(`last_name = $${idx++}`); values.push(data.last_name) }
  if (data.role !== undefined) { fields.push(`role = $${idx++}`); values.push(data.role) }
  if (data.avatar_url !== undefined) { fields.push(`avatar_url = $${idx++}`); values.push(data.avatar_url) }
  if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status) }
  if (data.password_hash !== undefined) { fields.push(`password_hash = $${idx++}`); values.push(data.password_hash) }

  if (fields.length === 0) return getUserById(id)

  fields.push(`updated_at = now()`)
  values.push(id)

  const { rows } = await pool.query<User>(
    `UPDATE saas_users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )
  return rows[0] || null
}

// ─── Template CRUD ───────────────────────────────────────────────────────────

export async function createTemplate(data: {
  org_id: string
  title: string
  description?: string | null
  slug: string
  category_id?: string | null
  head_html?: string
  footer_html?: string
  content?: Record<string, unknown>
  shell_config?: Record<string, unknown> | null
  status?: TemplateStatus
  variables?: string[]
  thumbnail_url?: string | null
  created_by: string
}): Promise<Template> {
  const { rows } = await pool.query<Template>(
    `INSERT INTO saas_templates (org_id, title, description, slug, category_id, head_html, footer_html, content, shell_config, status, variables, thumbnail_url, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
     RETURNING *`,
    [
      data.org_id,
      data.title,
      data.description || null,
      data.slug,
      data.category_id || null,
      data.head_html || '',
      data.footer_html || '',
      JSON.stringify(data.content || { type: 'doc', content: [{ type: 'paragraph' }] }),
      data.shell_config ? JSON.stringify(data.shell_config) : null,
      data.status || 'DRAFT',
      JSON.stringify(data.variables || []),
      data.thumbnail_url || null,
      data.created_by,
    ]
  )
  return rows[0]
}

export async function getTemplateById(id: string): Promise<Template | null> {
  const { rows } = await pool.query<Template>(
    `SELECT * FROM saas_templates WHERE id = $1`,
    [id]
  )
  return rows[0] || null
}

export async function getTemplatesByOrg(
  orgId: string,
  options: {
    page?: number
    limit?: number
    search?: string
    status?: TemplateStatus
    category_id?: string
  } = {}
): Promise<{ templates: Template[]; total: number }> {
  const page = options.page || 1
  const limit = options.limit || 20
  const offset = (page - 1) * limit

  const conditions: string[] = ['org_id = $1']
  const values: unknown[] = [orgId]
  let idx = 2

  if (options.search) {
    conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`)
    values.push(`%${options.search}%`)
    idx++
  }
  if (options.status) {
    conditions.push(`status = $${idx}`)
    values.push(options.status)
    idx++
  }
  if (options.category_id) {
    conditions.push(`category_id = $${idx}`)
    values.push(options.category_id)
    idx++
  }

  const where = conditions.join(' AND ')

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM saas_templates WHERE ${where}`,
    values
  )
  const total = parseInt(countResult.rows[0].count, 10)

  values.push(limit, offset)
  const { rows } = await pool.query<Template>(
    `SELECT * FROM saas_templates WHERE ${where} ORDER BY updated_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    values
  )

  return { templates: rows, total }
}

export async function updateTemplate(
  id: string,
  data: Partial<Pick<Template, 'title' | 'description' | 'slug' | 'category_id' | 'head_html' | 'footer_html' | 'content' | 'shell_config' | 'status' | 'variables' | 'thumbnail_url' | 'updated_by'>>
): Promise<Template | null> {
  const fields: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (data.title !== undefined) { fields.push(`title = $${idx++}`); values.push(data.title) }
  if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description) }
  if (data.slug !== undefined) { fields.push(`slug = $${idx++}`); values.push(data.slug) }
  if (data.category_id !== undefined) { fields.push(`category_id = $${idx++}`); values.push(data.category_id) }
  if (data.head_html !== undefined) { fields.push(`head_html = $${idx++}`); values.push(data.head_html) }
  if (data.footer_html !== undefined) { fields.push(`footer_html = $${idx++}`); values.push(data.footer_html) }
  if (data.content !== undefined) { fields.push(`content = $${idx++}`); values.push(JSON.stringify(data.content)) }
  if (data.shell_config !== undefined) { fields.push(`shell_config = $${idx++}`); values.push(data.shell_config ? JSON.stringify(data.shell_config) : null) }
  if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status) }
  if (data.variables !== undefined) { fields.push(`variables = $${idx++}`); values.push(JSON.stringify(data.variables)) }
  if (data.thumbnail_url !== undefined) { fields.push(`thumbnail_url = $${idx++}`); values.push(data.thumbnail_url) }
  if (data.updated_by !== undefined) { fields.push(`updated_by = $${idx++}`); values.push(data.updated_by) }

  if (fields.length === 0) return getTemplateById(id)

  fields.push(`updated_at = now()`)
  values.push(id)

  const { rows } = await pool.query<Template>(
    `UPDATE saas_templates SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )
  return rows[0] || null
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM saas_templates WHERE id = $1`,
    [id]
  )
  return (rowCount ?? 0) > 0
}

export async function duplicateTemplate(id: string, userId: string): Promise<Template | null> {
  const original = await getTemplateById(id)
  if (!original) return null

  const { rows } = await pool.query<Template>(
    `INSERT INTO saas_templates (org_id, title, description, slug, category_id, content, shell_config, status, variables, thumbnail_url, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'DRAFT', $8, $9, $10, $10)
     RETURNING *`,
    [
      original.org_id,
      `${original.title} (Copy)`,
      original.description,
      `${original.slug}-copy-${Date.now()}`,
      original.category_id,
      JSON.stringify(original.content),
      original.shell_config ? JSON.stringify(original.shell_config) : null,
      JSON.stringify(original.variables),
      original.thumbnail_url,
      userId,
    ]
  )
  return rows[0]
}

// ─── Category CRUD ───────────────────────────────────────────────────────────

export async function createCategory(data: {
  org_id: string
  name: string
  color?: string
  sort_order?: number
}): Promise<Category> {
  const { rows } = await pool.query<Category>(
    `INSERT INTO saas_categories (org_id, name, color, sort_order)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.org_id, data.name, data.color || '#6b7280', data.sort_order ?? 0]
  )
  return rows[0]
}

export async function getCategoriesByOrg(orgId: string): Promise<Category[]> {
  const { rows } = await pool.query<Category>(
    `SELECT * FROM saas_categories WHERE org_id = $1 ORDER BY sort_order ASC, name ASC`,
    [orgId]
  )
  return rows
}

export async function updateCategory(
  id: string,
  data: Partial<Pick<Category, 'name' | 'color' | 'sort_order'>>
): Promise<Category | null> {
  const fields: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name) }
  if (data.color !== undefined) { fields.push(`color = $${idx++}`); values.push(data.color) }
  if (data.sort_order !== undefined) { fields.push(`sort_order = $${idx++}`); values.push(data.sort_order) }

  if (fields.length === 0) return null

  values.push(id)
  const { rows } = await pool.query<Category>(
    `UPDATE saas_categories SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )
  return rows[0] || null
}

export async function deleteCategory(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM saas_categories WHERE id = $1`,
    [id]
  )
  return (rowCount ?? 0) > 0
}

// ─── Shared Links CRUD ───────────────────────────────────────────────────────

export async function createSharedLink(data: {
  template_id: string
  token: string
  expires_at?: string | null
  password_hash?: string | null
  created_by: string
}): Promise<SharedLink> {
  const { rows } = await pool.query<SharedLink>(
    `INSERT INTO saas_shared_links (template_id, token, expires_at, password_hash, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.template_id, data.token, data.expires_at || null, data.password_hash || null, data.created_by]
  )
  return rows[0]
}

export async function getSharedLinkByToken(token: string): Promise<SharedLink | null> {
  const { rows } = await pool.query<SharedLink>(
    `SELECT * FROM saas_shared_links WHERE token = $1`,
    [token]
  )
  return rows[0] || null
}

export async function getSharedLinksByTemplate(templateId: string): Promise<SharedLink[]> {
  const { rows } = await pool.query<SharedLink>(
    `SELECT * FROM saas_shared_links WHERE template_id = $1 ORDER BY created_at DESC`,
    [templateId]
  )
  return rows
}

export async function incrementShareViewCount(token: string): Promise<void> {
  await pool.query(
    `UPDATE saas_shared_links SET view_count = view_count + 1 WHERE token = $1`,
    [token]
  )
}

// ─── API Keys CRUD ───────────────────────────────────────────────────────────

export async function createApiKey(data: {
  org_id: string
  name: string
  key_hash: string
  prefix: string
}): Promise<ApiKey> {
  const { rows } = await pool.query<ApiKey>(
    `INSERT INTO saas_api_keys (org_id, name, key_hash, prefix)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.org_id, data.name, data.key_hash, data.prefix]
  )
  return rows[0]
}

export async function getApiKeysByOrg(orgId: string): Promise<ApiKey[]> {
  const { rows } = await pool.query<ApiKey>(
    `SELECT id, org_id, name, prefix, last_used_at, created_at FROM saas_api_keys WHERE org_id = $1 ORDER BY created_at DESC`,
    [orgId]
  )
  return rows
}

export async function deleteApiKey(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM saas_api_keys WHERE id = $1`,
    [id]
  )
  return (rowCount ?? 0) > 0
}

export async function validateApiKey(keyHash: string): Promise<ApiKey | null> {
  const { rows } = await pool.query<ApiKey>(
    `UPDATE saas_api_keys SET last_used_at = now() WHERE key_hash = $1 RETURNING *`,
    [keyHash]
  )
  return rows[0] || null
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export async function trackEvent(data: {
  template_id: string
  event: AnalyticsEvent
  metadata?: Record<string, unknown> | null
}): Promise<void> {
  await pool.query(
    `INSERT INTO saas_template_analytics (template_id, event, metadata)
     VALUES ($1, $2, $3)`,
    [data.template_id, data.event, data.metadata ? JSON.stringify(data.metadata) : null]
  )
}

export async function getTemplateAnalytics(
  templateId: string,
  days: number = 30
): Promise<{ event: string; count: number }[]> {
  const { rows } = await pool.query<{ event: string; count: string }>(
    `SELECT event, COUNT(*) as count
     FROM saas_template_analytics
     WHERE template_id = $1 AND created_at >= now() - interval '1 day' * $2
     GROUP BY event`,
    [templateId, days]
  )
  return rows.map(r => ({ event: r.event, count: parseInt(r.count, 10) }))
}

export async function getOrgAnalytics(
  orgId: string,
  days: number = 30
): Promise<{
  total_templates: number
  events: { event: string; count: number }[]
}> {
  const templateCount = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM saas_templates WHERE org_id = $1`,
    [orgId]
  )

  const { rows } = await pool.query<{ event: string; count: string }>(
    `SELECT a.event, COUNT(*) as count
     FROM saas_template_analytics a
     JOIN saas_templates t ON t.id = a.template_id
     WHERE t.org_id = $1 AND a.created_at >= now() - interval '1 day' * $2
     GROUP BY a.event`,
    [orgId, days]
  )

  return {
    total_templates: parseInt(templateCount.rows[0].count, 10),
    events: rows.map(r => ({ event: r.event, count: parseInt(r.count, 10) })),
  }
}
