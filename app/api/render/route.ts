import type { JSONContent } from '@tiptap/core'
import { renderTailwindHTML, renderEmailHTML } from '@/lib/render-html'

export const runtime = 'nodejs'

const MODES = ['tailwind', 'email'] as const
type Mode = (typeof MODES)[number]

/**
 * POST { json: ProseMirrorJSON, mode?: 'tailwind' | 'email' } -> { html, mode }
 *
 * `tailwind` (default) uses the same extension array as the client editor, so
 * the markup returned is byte-identical to `editor.getHTML()`.
 *
 * `email` swaps in the inline-CSS variants for nodes that have one, for
 * consumers with no Tailwind build step.
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

  const { json, mode: rawMode } = (body ?? {}) as {
    json?: JSONContent
    mode?: string
  }

  if (!json || typeof json !== 'object' || json.type !== 'doc') {
    return Response.json(
      { error: 'Expected { json: { type: "doc", content: [...] } }' },
      { status: 400 }
    )
  }

  if (rawMode !== undefined && !MODES.includes(rawMode as Mode)) {
    return Response.json(
      { error: `mode must be one of: ${MODES.join(', ')}` },
      { status: 400 }
    )
  }

  const mode: Mode = (rawMode as Mode) ?? 'tailwind'

  try {
    const html =
      mode === 'email' ? renderEmailHTML(json) : renderTailwindHTML(json)
    return Response.json({ html, mode })
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
