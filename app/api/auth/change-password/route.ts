import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/session'
import { unstable_update } from '@/auth'
import { initAuthDB, getUserById, updateUserPassword } from '@/lib/auth-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The logged-in user sets a new password.
 *
 * Body: { currentPassword, newPassword }
 * On success the must_change_password flag is cleared in the database and the
 * Auth.js token is updated so the /change-password gate stops redirecting.
 */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let body: { currentPassword?: unknown; newPassword?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }

  const currentPassword =
    typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword =
    typeof body.newPassword === 'string' ? body.newPassword : ''

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: 'New password must be at least 8 characters.' },
      { status: 400 }
    )
  }
  if (newPassword === currentPassword) {
    return NextResponse.json(
      { error: 'New password must be different from the current one.' },
      { status: 400 }
    )
  }

  try {
    await initAuthDB()
    const user = await getUserById(session.userId)
    if (!user || !user.password_hash) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const ok = await bcrypt.compare(currentPassword, user.password_hash)
    if (!ok) {
      return NextResponse.json(
        { error: 'Current password is incorrect.' },
        { status: 401 }
      )
    }

    const newHash = await bcrypt.hash(newPassword, 10)
    await updateUserPassword({ id: user.id, password_hash: newHash })

    // Clear the flag on the JWT so the gate stops redirecting.
    await unstable_update({ user: { mustChangePassword: false } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Change password error:', err)
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 })
  }
}
