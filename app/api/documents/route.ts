import { initDB, listDocuments, createDocument } from '@/lib/db'

export const runtime = 'nodejs'

/** GET /api/documents - List all documents */
export async function GET() {
  try {
    await initDB()
    const docs = await listDocuments()
    return Response.json({ documents: docs })
  } catch (error) {
    console.error('DB error:', error)
    return Response.json(
      { error: 'Failed to fetch documents', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/** POST /api/documents - Create a new document */
export async function POST(req: Request) {
  try {
    await initDB()
    const body = await req.json() as { title?: string; content?: Record<string, unknown> }
    const title = body.title || 'Untitled'
    const content = body.content || { type: 'doc', content: [{ type: 'paragraph' }] }

    const doc = await createDocument(title, content)
    return Response.json({ document: doc }, { status: 201 })
  } catch (error) {
    console.error('DB error:', error)
    return Response.json(
      { error: 'Failed to create document', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
