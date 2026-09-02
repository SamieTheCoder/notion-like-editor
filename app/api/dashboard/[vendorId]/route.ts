import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { canAccessVendor, canManageUsers } from '@/lib/authz'
import {
  getVendorById,
  updateVendorShell,
  updateVendorBranding,
  initAuthDB,
  vendorHasSuperAdmin,
  deleteVendorCascade,
} from '@/lib/auth-db'

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
  if (!canAccessVendor(session, id)) {
    return NextResponse.json(
      { error: 'You do not have access to this vendor.' },
      { status: 403 }
    )
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

/**
 * Update a vendor's branding: accent color and favicon URL.
 *
 * Body: { accentColor?: string|null, faviconUrl?: string|null }
 * Requires manage rights (super admin, or an admin of this vendor).
 */
export async function PATCH(
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
  if (!canAccessVendor(session, id) || !canManageUsers(session)) {
    return NextResponse.json(
      { error: 'You do not have permission to change vendor settings.' },
      { status: 403 }
    )
  }

  let body: { accentColor?: unknown; faviconUrl?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }

  // Accept #RGB / #RRGGBB, or null/empty to clear.
  let accentColor: string | null = null
  if (typeof body.accentColor === 'string' && body.accentColor.trim()) {
    const c = body.accentColor.trim()
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c)) {
      return NextResponse.json(
        { error: 'Accent color must be a hex value like #4F46E5.' },
        { status: 400 }
      )
    }
    accentColor = c
  }

  let faviconUrl: string | null = null
  if (typeof body.faviconUrl === 'string' && body.faviconUrl.trim()) {
    const u = body.faviconUrl.trim()
    // Allow absolute URLs or same-origin/relative paths.
    if (!/^(https?:\/\/|\/)/.test(u)) {
      return NextResponse.json(
        { error: 'Favicon must be a URL (https://...) or a path (/...).' },
        { status: 400 }
      )
    }
    faviconUrl = u
  }

  try {
    await initAuthDB()
    const vendor = await getVendorById(id)
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 })
    }
    const updated = await updateVendorBranding({ id, accentColor, faviconUrl })
    return NextResponse.json({
      ok: true,
      accentColor: updated?.primary_color ?? null,
      faviconUrl: updated?.favicon_url ?? null,
    })
  } catch (err) {
    console.error('Update vendor branding error:', err)
    return NextResponse.json({ error: 'Save failed.' }, { status: 500 })
  }
}

/**
 * Delete a vendor and everything scoped to it (users + templates).
 *
 * Super admin only. Refuses vendors that host a super-admin account, so the
 * platform vendor cannot be removed out from under the operator.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  if (session.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'Only a super admin can delete a vendor.' },
      { status: 403 }
    )
  }

  const { vendorId } = await params
  const id = Number(vendorId)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid vendor id.' }, { status: 400 })
  }

  try {
    await initAuthDB()
    const vendor = await getVendorById(id)
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 })
    }

    if (await vendorHasSuperAdmin(id)) {
      return NextResponse.json(
        {
          error:
            'This vendor hosts a super-admin account and cannot be deleted. Move that account to another vendor first.',
        },
        { status: 400 }
      )
    }

    const removed = await deleteVendorCascade(id)
    return NextResponse.json({ ok: true, removed, name: vendor.name })
  } catch (err) {
    console.error('Delete vendor error:', err)
    return NextResponse.json({ error: 'Delete failed.' }, { status: 500 })
  }
}
