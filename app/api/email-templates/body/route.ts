import { NextResponse } from 'next/server'
import {
  initTemplatesTable,
  getTemplateByVendorAndTrigger,
} from '@/lib/email-templates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/email-templates/body?vendor_id=3&trigger=welcome
 *
 * Given a vendor id and a trigger name, return the full body of the template
 * linked to that pair. This is the send-path lookup: the caller knows which
 * vendor is sending and which event fired, and needs the body to render.
 *
 * Returns the raw editor body (`body_html` / `body_json`) and the composed,
 * inbox-ready `final_body`, plus a little identifying metadata.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  // Accept both snake_case and camelCase for the caller's convenience.
  const rawVendorId =
    url.searchParams.get('vendor_id') ?? url.searchParams.get('vendorId')
  const trigger = (url.searchParams.get('trigger') ?? '').trim()

  const vendorId = rawVendorId != null ? Number(rawVendorId) : NaN

  if (!Number.isFinite(vendorId) || vendorId <= 0) {
    return NextResponse.json(
      { error: 'A valid vendor_id is required.' },
      { status: 400 }
    )
  }
  if (!trigger) {
    return NextResponse.json(
      { error: 'A trigger is required.' },
      { status: 400 }
    )
  }

  try {
    await initTemplatesTable()
    const template = await getTemplateByVendorAndTrigger(vendorId, trigger)

    if (!template) {
      return NextResponse.json(
        {
          error: 'No template found for this vendor and trigger.',
          vendor_id: vendorId,
          trigger,
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: template.id,
      vendor_id: template.vendor_id,
      vendor_name: template.vendor_name,
      name: template.name,
      trigger: template.trigger,
      is_active: template.is_active,
      body_html: template.body_html,
      body_json: template.body_json,
      final_body: template.final_body,
    })
  } catch (error) {
    console.error('Fetch template body error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch template body.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
