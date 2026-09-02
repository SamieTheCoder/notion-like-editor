import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/session'
import { canManageUsers, sessionVendorId } from '@/lib/authz'
import {
  initAuthDB,
  findUserByEmail,
  getVendorById,
  createUser,
} from '@/lib/auth-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Create a vendor user. Role rules:
 *   - SUPER_ADMIN: creates an ADMIN on any vendor.
 *   - ADMIN:       creates a MEMBER on their own vendor only.
 *   - MEMBER:      not allowed.
 *
 * Body: { email, firstName, lastName?, vendorId, tempPassword }
 * New users are flagged must_change_password so they reset on first login.
 */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  if (!canManageUsers(session)) {
    return NextResponse.json(
      { error: 'You do not have permission to create users.' },
      { status: 403 }
    )
  }

  let body: {
    email?: unknown
    firstName?: unknown
    lastName?: unknown
    vendorId?: unknown
    tempPassword?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const firstName =
    typeof body.firstName === 'string' ? body.firstName.trim() : ''
  const lastName =
    typeof body.lastName === 'string' ? body.lastName.trim() : ''
  const vendorId =
    typeof body.vendorId === 'number' ? body.vendorId : Number(body.vendorId)
  const tempPassword =
    typeof body.tempPassword === 'string' ? body.tempPassword : ''

  if (!email || !firstName) {
    return NextResponse.json(
      { error: 'Email and first name are required.' },
      { status: 400 }
    )
  }
  if (!Number.isFinite(vendorId)) {
    return NextResponse.json({ error: 'A valid vendor is required.' }, { status: 400 })
  }
  if (tempPassword.length < 8) {
    return NextResponse.json(
      { error: 'Temporary password must be at least 8 characters.' },
      { status: 400 }
    )
  }

  const isSuperAdmin = session.role === 'SUPER_ADMIN'

  // A vendor admin can only add users to their own vendor.
  if (!isSuperAdmin) {
    const myVendor = sessionVendorId(session)
    if (myVendor == null || myVendor !== vendorId) {
      return NextResponse.json(
        { error: 'You can only add users to your own vendor.' },
        { status: 403 }
      )
    }
  }

  // Super admin creates vendor ADMINs; a vendor ADMIN creates MEMBERs.
  const newRole = isSuperAdmin ? 'ADMIN' : 'MEMBER'

  try {
    await initAuthDB()

    const vendor = await getVendorById(vendorId)
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 })
    }

    if (await findUserByEmail(email)) {
      return NextResponse.json(
        { error: 'A user with this email already exists.' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(tempPassword, 10)
    const user = await createUser({
      vendor_id: vendorId,
      email,
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName || null,
      role: newRole,
      status: 'ACTIVE',
      must_change_password: true,
    })

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        vendorId: user.vendor_id,
      },
    })
  } catch (err) {
    console.error('Create user error:', err)
    return NextResponse.json({ error: 'Create failed.' }, { status: 500 })
  }
}
