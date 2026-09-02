import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { canAccessVendor, canManageUsers } from '@/lib/authz'
import type { SessionPayload } from '@/lib/session'
import {
  initVariablesTable,
  getVariableById,
  updateVariable,
  deleteVariable,
  tokenExists,
  normalizeToken,
  type Variable,
} from '@/lib/variables'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Shared guard: a global variable is super-admin only; a vendor variable
 * requires access to that vendor.
 */
function mayEdit(session: SessionPayload, variable: Variable): boolean {
  if (variable.vendor_id == null) return session.role === 'SUPER_ADMIN'
  return canAccessVendor(session, Number(variable.vendor_id))
}

async function load(idRaw: string) {
  const id = Number(idRaw)
  if (!Number.isFinite(id)) return { error: 'Invalid variable id.', status: 400 } as const
  await initVariablesTable()
  const variable = await getVariableById(id)
  if (!variable) return { error: 'Variable not found.', status: 404 } as const
  return { id, variable } as const
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ variableId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  if (!canManageUsers(session)) {
    return NextResponse.json(
      { error: 'You do not have permission to manage variables.' },
      { status: 403 }
    )
  }

  const { variableId } = await params
  const found = await load(variableId)
  if ('error' in found) {
    return NextResponse.json({ error: found.error }, { status: found.status })
  }
  if (!mayEdit(session, found.variable)) {
    return NextResponse.json(
      { error: 'You do not have access to this variable.' },
      { status: 403 }
    )
  }

  let body: {
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

  const token = normalizeToken(typeof body.token === 'string' ? body.token : '')
  if (!token) {
    return NextResponse.json({ error: 'A token name is required.' }, { status: 400 })
  }

  const groupName =
    typeof body.groupName === 'string' && body.groupName.trim()
      ? body.groupName.trim()
      : 'General'
  const label =
    typeof body.label === 'string' && body.label.trim() ? body.label.trim() : token
  const dummyValue = typeof body.dummyValue === 'string' ? body.dummyValue : ''

  try {
    const vendorScope =
      found.variable.vendor_id == null ? null : Number(found.variable.vendor_id)
    if (await tokenExists(vendorScope, token, found.id)) {
      return NextResponse.json(
        { error: `#${token}# already exists in this scope.` },
        { status: 409 }
      )
    }
    const variable = await updateVariable({
      id: found.id,
      groupName,
      token,
      label,
      dummyValue,
    })
    return NextResponse.json({ ok: true, variable })
  } catch (err) {
    console.error('Update variable error:', err)
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ variableId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  if (!canManageUsers(session)) {
    return NextResponse.json(
      { error: 'You do not have permission to manage variables.' },
      { status: 403 }
    )
  }

  const { variableId } = await params
  const found = await load(variableId)
  if ('error' in found) {
    return NextResponse.json({ error: found.error }, { status: found.status })
  }
  if (!mayEdit(session, found.variable)) {
    return NextResponse.json(
      { error: 'You do not have access to this variable.' },
      { status: 403 }
    )
  }

  try {
    const ok = await deleteVariable(found.id)
    return NextResponse.json({ ok, token: found.variable.token })
  } catch (err) {
    console.error('Delete variable error:', err)
    return NextResponse.json({ error: 'Delete failed.' }, { status: 500 })
  }
}
