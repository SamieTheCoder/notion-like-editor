/**
 * PostgreSQL persistence layer for documents.
 *
 * Documents are stored as ProseMirror JSON in a JSONB column. This is the same
 * format the editor uses internally (editor.getJSON()), so no transformation
 * is needed between the database and the client.
 *
 * Table: notion_sam_documents
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

const TABLE = 'notion_sam_documents'

export interface Document {
  id: string
  title: string
  content: Record<string, unknown> // ProseMirror JSON
  created_at: string
  updated_at: string
}

/** Initialize the table if it doesn't exist. */
export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title       TEXT NOT NULL DEFAULT 'Untitled',
      content     JSONB NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
}

/** List all documents (metadata only, no content for performance). */
export async function listDocuments(): Promise<Omit<Document, 'content'>[]> {
  const { rows } = await pool.query<Omit<Document, 'content'>>(`
    SELECT id, title, created_at, updated_at
    FROM ${TABLE}
    ORDER BY updated_at DESC
  `)
  return rows
}

/** Get a single document by ID, including its full content. */
export async function getDocument(id: string): Promise<Document | null> {
  const { rows } = await pool.query<Document>(
    `SELECT id, title, content, created_at, updated_at FROM ${TABLE} WHERE id = $1`,
    [id]
  )
  return rows[0] || null
}

/** Create a new document. Returns the created document. */
export async function createDocument(
  title: string,
  content: Record<string, unknown>
): Promise<Document> {
  const { rows } = await pool.query<Document>(
    `INSERT INTO ${TABLE} (title, content)
     VALUES ($1, $2)
     RETURNING id, title, content, created_at, updated_at`,
    [title, JSON.stringify(content)]
  )
  return rows[0]
}

/**
 * Save (upsert) a document.
 * If `id` is provided and exists, updates it. Otherwise creates a new one.
 */
export async function saveDocument(
  id: string | null,
  title: string,
  content: Record<string, unknown>
): Promise<Document> {
  if (id) {
    const { rows } = await pool.query<Document>(
      `UPDATE ${TABLE}
       SET title = $2, content = $3, updated_at = now()
       WHERE id = $1
       RETURNING id, title, content, created_at, updated_at`,
      [id, title, JSON.stringify(content)]
    )
    if (rows[0]) return rows[0]
  }

  // ID not found or not provided: create new
  return createDocument(title, content)
}

/** Delete a document by ID. */
export async function deleteDocument(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM ${TABLE} WHERE id = $1`,
    [id]
  )
  return (rowCount ?? 0) > 0
}
