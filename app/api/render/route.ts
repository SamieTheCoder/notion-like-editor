import type { JSONContent } from '@tiptap/core'
import {
  renderTailwindHTML,
  renderEmailHTML,
  renderEmailBody,
} from '@/lib/render-html'
import { composeEmail } from '@/lib/email-shell'
import { getTemplateById, initTemplatesTable } from '@/lib/email-templates'

export const runtime = 'nodejs'

const MODES = ['tailwind', 'email'] as const
type Mode = (typeof MODES)[number]

/**
 * POST { json, mode?: 'tailwind' | 'email', templateId?: number } -> { html, mode }
 *
 * `tailwind` (default) uses the same extension array as the client editor, so
 * the markup returned is byte-identical to `editor.getHTML()`.
 *
 * `email` swaps in the inline-CSS variants for nodes that have one, for
 * consumers with no Tailwind build step.
 *
 * `templateId` (email mode only) wraps the body in a stored master shell — the
 * real header and footer, MSO conditionals and all. Composition happens here
 * rather than in the browser so the shell HTML has a single source of truth and
 * never needs to be shipped to the client.
 *
 * NOTE: this endpoint is unauthenticated. It transforms request-body JSON and
 * reads email shell templates by id; it writes nothing. Add auth and a
 * body-size limit before exposing it publicly.
 */
export async function POST(req: Request) {
  let body: unknown

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Body must be valid JSON' }, { status: 400 })
  }

  const { json, mode: rawMode, templateId: rawTemplateId } = (body ?? {}) as {
    json?: JSONContent
    mode?: string
    templateId?: unknown
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

  // Only accept a positive integer id; anything else is a client bug worth
  // reporting rather than silently ignoring.
  let templateId: number | null = null
  if (rawTemplateId !== undefined && rawTemplateId !== null) {
    const parsed = Number(rawTemplateId)
    if (!Number.isInteger(parsed) || parsed < 1) {
      return Response.json(
        { error: 'templateId must be a positive integer' },
        { status: 400 }
      )
    }
    templateId = parsed
  }

  try {
    if (mode === 'tailwind') {
      return Response.json({ html: renderTailwindHTML(json), mode })
    }

    // Email mode without a shell keeps the previous standalone behaviour.
    if (templateId === null) {
      return Response.json({ html: renderEmailHTML(json), mode })
    }

    await initTemplatesTable()
    const shell = await getTemplateById(templateId)
    if (!shell) {
      return Response.json(
        { error: `No email template with id ${templateId}` },
        { status: 404 }
      )
    }

    const html = composeEmail(
      shell.head_html,
      renderEmailBody(json),
      shell.footer_html
    )
    return Response.json({
      html,
      mode,
      template: { id: shell.id, slug: shell.slug, name: shell.name },
    })
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
