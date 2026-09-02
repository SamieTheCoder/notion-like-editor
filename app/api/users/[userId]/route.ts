import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { canManageUsers, sessionVendorId } from '@/lib/authz'
import {
  initAuthDB,
  getUserById,
  deleteUser,
  countSuperAdmins,
} from '@/lib/auth-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Delete a user.
 *
 * Rules:
 *   - SUPER_ADMIN may delete any ADMIN or MEMBER, on any vendor.
 *   - ADMIN may delete MEMBERs on their own vendor only.
 *   - MEMBER may not delete anyone.
 *   - Nobody may delete themselves, and the last SUPER_ADMIN is protected.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  if (!canManageUsers(session)) {
    return NextResponse.json(
      { error: 'You do not have permission to delete users.' },
      { status: 403 }
    )
  }

  const { userId } = await params
  const id = Number(userId)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid user id.' }, { status: 400 })
  }

  if (id === session.userId) {
    return NextResponse.json(
      { error: 'You cannot delete your own account.' },
      { status: 400 }
    )
  }

  try {
    await initAuthDB()
    const target = await getUserById(id)
    if (!target) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN'

    // Never strand the platform without a super admin.
    if (target.role === 'SUPER_ADMIN') {
      if (!isSuperAdmin) {
        return NextResponse.json(
          { error: 'You cannot delete a super admin.' },
          { status: 403 }
        )
      }
      if ((await countSuperAdmins()) <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last super admin.' },
          { status: 400 }
        )
      }
    }

    // A vendor admin is limited to MEMBERs inside their own vendor.
    if (!isSuperAdmin) {
      const myVendor = sessionVendorId(session)
      const targetVendor =
        target.vendor_id == null ? null : Number(target.vendor_id)
      if (myVendor == null || targetVendor !== myVendor) {
        return NextResponse.json(
          { error: 'You can only remove users from your own vendor.' },
          { status: 403 }
        )
      }
      if (target.role !== 'MEMBER') {
        return NextResponse.json(
          { error: 'Vendor admins can only remove members.' },
          { status: 403 }
        )
      }
    }

    const ok = await deleteUser(id)
    return NextResponse.json({ ok, email: target.email })
  } catch (err) {
    console.error('Delete user error:', err)
    return NextResponse.json({ error: 'Delete failed.' }, { status: 500 })
  }
}
