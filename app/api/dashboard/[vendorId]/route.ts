import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getVendorById, updateVendorShell, initAuthDB } from '@/lib/auth-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Save a vendor's shared header/footer HTML. */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { vendorId } = await params
  const id = Number(vendorId)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid vendor id.' }, { status: 400 })
  }

  let body: { headerHtml?: unknown; footerHtml?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }

  const headerHtml = typeof body.headerHtml === 'string' ? body.headerHtml : ''
  const footerHtml = typeof body.footerHtml === 'string' ? body.footerHtml : ''

  try {
    await initAuthDB()
    const vendor = await getVendorById(id)
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 })
    }
    await updateVendorShell({ id, headerHtml, footerHtml })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Save vendor shell error:', err)
    return NextResponse.json({ error: 'Save failed.' }, { status: 500 })
  }
}
