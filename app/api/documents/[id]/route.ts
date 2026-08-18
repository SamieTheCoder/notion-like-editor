import { initDB, getDocument, saveDocument, deleteDocument } from '@/lib/db'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ id: string }>
}

/** GET /api/documents/[id] - Get a document */
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    await initDB()
    const { id } = await params
    const doc = await getDocument(id)
    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 })
    }
    return Response.json({ document: doc })
  } catch (error) {
    console.error('DB error:', error)
    return Response.json(
      { error: 'Failed to fetch document', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/** PUT /api/documents/[id] - Update a document */
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    await initDB()
    const { id } = await params
    const body = await req.json() as { title?: string; content?: Record<string, unknown> }

    if (!body.content) {
      return Response.json({ error: 'content field is required' }, { status: 400 })
    }

    const doc = await saveDocument(id, body.title || 'Untitled', body.content)
    return Response.json({ document: doc })
  } catch (error) {
    console.error('DB error:', error)
    return Response.json(
      { error: 'Failed to save document', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/** DELETE /api/documents/[id] - Delete a document */
export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    await initDB()
    const { id } = await params
    const deleted = await deleteDocument(id)
    if (!deleted) {
      return Response.json({ error: 'Document not found' }, { status: 404 })
    }
    return Response.json({ ok: true })
  } catch (error) {
    console.error('DB error:', error)
    return Response.json(
      { error: 'Failed to delete document', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
