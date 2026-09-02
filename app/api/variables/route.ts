import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { canAccessVendor, canManageUsers, sessionVendorId } from '@/lib/authz'
import {
  initVariablesTable,
  listVariablesForVendor,
  listVariablesByScope,
  createVariable,
  tokenExists,
  normalizeToken,
} from '@/lib/variables'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/variables?vendorId=3[&scope=own]
 *
 * Default returns the vendor's effective list (globals + its own), which is what
 * the editor picker and slash command consume. `scope=own` returns only rows
 * owned by that scope, for the management screen.
 */
export async function GET(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const url = new URL(req.url)
  const raw = url.searchParams.get('vendorId')
  const scope = url.searchParams.get('scope')

  // Fall back to the caller's own vendor when none is supplied.
  const vendorId =
    raw != null && raw !== '' ? Number(raw) : sessionVendorId(session)

  if (vendorId != null && !Number.isFinite(vendorId)) {
    return NextResponse.json({ error: 'Invalid vendor id.' }, { status: 400 })
  }
  if (vendorId != null && !canAccessVendor(session, vendorId)) {
    return NextResponse.json(
      { error: 'You do not have access to this vendor.' },
      { status: 403 }
    )
  }

  try {
    await initVariablesTable()
    const variables =
      scope === 'own'
        ? await listVariablesByScope(vendorId)
        : scope === 'global'
          ? await listVariablesByScope(null)
          : await listVariablesForVendor(vendorId)
    return NextResponse.json({ variables })
  } catch (err) {
    console.error('List variables error:', err)
    return NextResponse.json({ error: 'Could not load variables.' }, { status: 500 })
  }
}

/**
 * POST /api/variables
 * Body: { vendorId | null, groupName, token, label, dummyValue }
 *
 * Only a super admin may create global variables (vendorId null). A vendor admin
 * may create variables for their own vendor. Members cannot.
 */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  if (!canManageUsers(session)) {
    return NextResponse.json(
      { error: 'You do not have permission to manage variables.' },
      { status: 403 }
    )
  }

  let body: {
    vendorId?: unknown
    groupName?: unknown
    token?: unknown
    label?: unknown
    dummyValue?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }

  const isGlobal = body.vendorId == null || body.vendorId === ''
  const vendorId = isGlobal ? null : Number(body.vendorId)
  const groupName =
    typeof body.groupName === 'string' && body.groupName.trim()
      ? body.groupName.trim()
      : 'General'
  const token = normalizeToken(
    typeof body.token === 'string' ? body.token : ''
  )
  const label =
    typeof body.label === 'string' && body.label.trim()
      ? body.label.trim()
      : token
  const dummyValue =
    typeof body.dummyValue === 'string' ? body.dummyValue : ''

  if (!token) {
    return NextResponse.json(
      { error: 'A token name is required (letters, numbers, underscores).' },
      { status: 400 }
    )
  }

  if (isGlobal) {
    if (session.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only a super admin can create shared variables.' },
        { status: 403 }
      )
    }
  } else {
    if (!Number.isFinite(vendorId)) {
      return NextResponse.json({ error: 'Invalid vendor id.' }, { status: 400 })
    }
    if (!canAccessVendor(session, vendorId as number)) {
      return NextResponse.json(
        { error: 'You do not have access to this vendor.' },
        { status: 403 }
      )
    }
  }

  try {
    await initVariablesTable()
    if (await tokenExists(vendorId, token)) {
      return NextResponse.json(
        { error: `#${token}# already exists in this scope.` },
        { status: 409 }
      )
    }
    const variable = await createVariable({
      vendorId,
      groupName,
      token,
      label,
      dummyValue,
    })
    return NextResponse.json({ ok: true, variable })
  } catch (err) {
    console.error('Create variable error:', err)
    return NextResponse.json({ error: 'Create failed.' }, { status: 500 })
  }
}
