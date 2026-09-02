import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { canAccessVendor, canManageUsers } from '@/lib/authz'
import { getVendorById, initAuthDB } from '@/lib/auth-db'
import {
  initApiKeysTable,
  listApiKeys,
  createApiKey,
  revokeApiKey,
} from '@/lib/api-keys'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Resolve + authorize the vendor id from the route. Returns either the numeric
 * id or a ready-to-send error response. Managing keys requires manage rights
 * (super admin, or an admin of this vendor).
 */
async function authorize(
  params: Promise<{ vendorId: string }>
): Promise<{ id: number } | { error: NextResponse }> {
  const session = await getSession()
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) }
  }

  const { vendorId } = await params
  const id = Number(vendorId)
  if (!Number.isFinite(id)) {
    return { error: NextResponse.json({ error: 'Invalid vendor id.' }, { status: 400 }) }
  }
  if (!canAccessVendor(session, id) || !canManageUsers(session)) {
    return {
      error: NextResponse.json(
        { error: 'You do not have permission to manage API keys.' },
        { status: 403 }
      ),
    }
  }
  return { id }
}

/** GET /api/dashboard/{vendorId}/api-keys — list this vendor's keys (JSON). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const auth = await authorize(params)
  if ('error' in auth) return auth.error

  try {
    await initAuthDB()
    await initApiKeysTable()
    const vendor = await getVendorById(auth.id)
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 })
    }
    const keys = await listApiKeys(auth.id)
    return NextResponse.json({ keys })
  } catch (err) {
    console.error('List API keys error:', err)
    return NextResponse.json({ error: 'Could not load API keys.' }, { status: 500 })
  }
}

/**
 * POST /api/dashboard/{vendorId}/api-keys — create a key (JSON).
 * Body: { label?: string, expiresAt?: string (ISO) }
 *
 * The response includes the plaintext `secret` exactly once. It is never
 * retrievable again.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const auth = await authorize(params)
  if ('error' in auth) return auth.error

  let body: { label?: unknown; expiresAt?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    // An empty body is fine — label and expiry are both optional.
    body = {}
  }

  const label =
    typeof body.label === 'string' && body.label.trim()
      ? body.label.trim().slice(0, 255)
      : null

  let expiresAt: Date | null = null
  if (typeof body.expiresAt === 'string' && body.expiresAt.trim()) {
    const d = new Date(body.expiresAt)
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json(
        { error: 'expiresAt must be a valid date.' },
        { status: 400 }
      )
    }
    expiresAt = d
  }

  try {
    await initAuthDB()
    await initApiKeysTable()
    const vendor = await getVendorById(auth.id)
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 })
    }
    const created = await createApiKey({ vendorId: auth.id, label, expiresAt })
    // `created` carries the one-time plaintext secret; return it here only.
    return NextResponse.json({ ok: true, key: created })
  } catch (err) {
    console.error('Create API key error:', err)
    return NextResponse.json({ error: 'Create failed.' }, { status: 500 })
  }
}

/**
 * DELETE /api/dashboard/{vendorId}/api-keys?id=123 — revoke a key.
 * Soft-delete: the row is marked REVOKED, not removed.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const auth = await authorize(params)
  if ('error' in auth) return auth.error

  const url = new URL(req.url)
  const keyId = Number(url.searchParams.get('id'))
  if (!Number.isFinite(keyId) || keyId <= 0) {
    return NextResponse.json({ error: 'A valid key id is required.' }, { status: 400 })
  }

  try {
    await initAuthDB()
    await initApiKeysTable()
    const revoked = await revokeApiKey(keyId, auth.id)
    if (!revoked) {
      return NextResponse.json({ error: 'Key not found.' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, key: revoked })
  } catch (err) {
    console.error('Revoke API key error:', err)
    return NextResponse.json({ error: 'Revoke failed.' }, { status: 500 })
  }
}
