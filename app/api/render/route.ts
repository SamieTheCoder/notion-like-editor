// `@tiptap/html` ships a DOM-based renderer by default; the `/server` entry is
// the one that works in the Node runtime used by route handlers.
import { generateHTML } from '@tiptap/html/server'
import type { JSONContent } from '@tiptap/core'
import { extensions } from '@/lib/tiptap-extensions'

export const runtime = 'nodejs'

/**
 * POST { json: ProseMirrorJSON } -> { html }
 *
 * Uses the same extension array as the client editor, so the markup returned
 * here is byte-identical to `editor.getHTML()`.
 *
 * NOTE: this endpoint is unauthenticated. It only transforms the JSON in the
 * request body and does not read or write any stored data, but if you expose it
 * publicly you should add auth and a body-size limit before shipping.
 */
export async function POST(req: Request) {
  let body: unknown

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Body must be valid JSON' }, { status: 400 })
  }

  const json = (body as { json?: JSONContent })?.json

  if (!json || typeof json !== 'object' || json.type !== 'doc') {
    return Response.json(
      { error: 'Expected { json: { type: "doc", content: [...] } }' },
      { status: 400 }
    )
  }

  try {
    const html = generateHTML(json, extensions)
    return Response.json({ html })
  } catch (error) {
    // Most likely a node/mark in the document that is not in the schema.
    return Response.json(
      {
        error: 'Failed to render document',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 422 }
    )
  }
}
