import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { initAuthDB, findVendorByCode, createVendor } from '@/lib/auth-db'
import { initTemplatesTable, upsertTemplate } from '@/lib/email-templates'
import type { EmailShellConfig } from '@/lib/email-shell'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Create a new vendor and its initial (header/footer/body) template. */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let body: {
    name?: unknown
    code?: unknown
    primaryColor?: unknown
    headHtml?: unknown
    footerHtml?: unknown
    bodyHtml?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const rawCode = typeof body.code === 'string' ? body.code.trim() : ''
  const primaryColor =
    typeof body.primaryColor === 'string' ? body.primaryColor.trim() : ''
  const headHtml = typeof body.headHtml === 'string' ? body.headHtml : ''
  const footerHtml = typeof body.footerHtml === 'string' ? body.footerHtml : ''
  const bodyHtml = typeof body.bodyHtml === 'string' ? body.bodyHtml : ''

  if (!name) {
    return NextResponse.json({ error: 'Vendor name is required.' }, { status: 400 })
  }

  // Derive an uppercase, underscore code from the name if none supplied.
  const code = (rawCode || name)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  if (!code) {
    return NextResponse.json({ error: 'Could not derive a vendor code.' }, { status: 400 })
  }

  try {
    await initAuthDB()
    await initTemplatesTable()

    if (await findVendorByCode(code)) {
      return NextResponse.json(
        { error: `A vendor with code "${code}" already exists.` },
        { status: 409 }
      )
    }

    const vendor = await createVendor({ name, code })

    // Optional branding color.
    if (primaryColor) {
      const { authPool, VENDOR_TABLE } = await import('@/lib/auth-db')
      await authPool.query(
        `UPDATE ${VENDOR_TABLE} SET primary_color = $2 WHERE id = $1`,
        [vendor.id, primaryColor]
      )
    }

    await upsertTemplate({
      slug: code.toLowerCase(),
      name: `${name} Template`,
      headHtml,
      footerHtml,
      bodyHtml,
      config: {} as EmailShellConfig,
      vendorId: vendor.id,
    })

    return NextResponse.json({ ok: true, vendorId: vendor.id })
  } catch (err) {
    console.error('Create vendor error:', err)
    return NextResponse.json({ error: 'Create failed.' }, { status: 500 })
  }
}
