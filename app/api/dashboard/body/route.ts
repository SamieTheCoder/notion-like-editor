import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getVendorById, initAuthDB } from '@/lib/auth-db'
import {
  initTemplatesTable,
  createVendorTemplate,
  updateVendorTemplate,
  getTemplateById,
} from '@/lib/email-templates'
import { composeFinalBody } from '@/lib/compose-email'
import { renderEmailBody } from '@/lib/render-html'
import type { JSONContent } from '@tiptap/core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Save an editor-authored template body + trigger.
 * - With `templateId`: updates that template.
 * - Without `templateId`: creates a new template for the vendor.
 */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let body: {
    vendorId?: unknown
    templateId?: unknown
    trigger?: unknown
    bodyHtml?: unknown
    bodyJson?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }

  const vendorId = Number(body.vendorId)
  const templateId =
    body.templateId != null && body.templateId !== ''
      ? Number(body.templateId)
      : null
  const trigger = typeof body.trigger === 'string' ? body.trigger.trim() : ''
  const bodyHtml = typeof body.bodyHtml === 'string' ? body.bodyHtml : ''
  const bodyJson =
    body.bodyJson && typeof body.bodyJson === 'object'
      ? (body.bodyJson as Record<string, unknown>)
      : {}

  if (!Number.isFinite(vendorId)) {
    return NextResponse.json({ error: 'Invalid vendor id.' }, { status: 400 })
  }
  if (!trigger) {
    return NextResponse.json(
      { error: 'Template name (trigger) is required.' },
      { status: 400 }
    )
  }

  try {
    await initAuthDB()
    await initTemplatesTable()
    const vendor = await getVendorById(vendorId)
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 })
    }

    // Render the body with INLINE styles (callout backgrounds, colors, etc.)
    // so it renders in email clients that have no Tailwind stylesheet. Falls
    // back to the client-provided HTML if the JSON isn't a usable doc.
    let inlinedBody = bodyHtml
    try {
      if (bodyJson && (bodyJson as JSONContent).type === 'doc') {
        inlinedBody = renderEmailBody(bodyJson as JSONContent)
      }
    } catch {
      inlinedBody = bodyHtml
    }

    // The stored final body strips document chrome and joins header + body +
    // footer into inbox-ready markup.
    const finalBody = composeFinalBody(
      vendor.header_html || '',
      inlinedBody,
      vendor.footer_html || ''
    )

    if (templateId != null && Number.isFinite(templateId)) {
      const existing = await getTemplateById(templateId)
      if (!existing || Number(existing.vendor_id) !== vendorId) {
        return NextResponse.json(
          { error: 'Template not found for this vendor.' },
          { status: 404 }
        )
      }
      const saved = await updateVendorTemplate({
        id: templateId,
        trigger,
        bodyHtml: inlinedBody,
        bodyJson,
        finalBody,
      })
      return NextResponse.json({ ok: true, id: saved!.id, trigger: saved!.trigger, finalBody })
    }

    const created = await createVendorTemplate({
      vendorId,
      vendorCode: vendor.code,
      trigger,
      bodyHtml: inlinedBody,
      bodyJson,
      finalBody,
    })
    return NextResponse.json({ ok: true, id: created.id, trigger: created.trigger, finalBody })
  } catch (err) {
    console.error('Save body error:', err)
    return NextResponse.json({ error: 'Save failed.' }, { status: 500 })
  }
}
