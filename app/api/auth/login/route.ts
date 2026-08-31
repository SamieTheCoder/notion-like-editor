import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { findUserByEmail, initAuthDB } from '@/lib/auth-db'
import { encodeSession, SESSION_COOKIE } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  let body: { email?: unknown; password?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required.' },
      { status: 400 }
    )
  }

  try {
    await initAuthDB()
    const user = await findUserByEmail(email)

    // Same generic error for missing user / bad password / no hash, to avoid
    // leaking which emails exist.
    const invalid = () =>
      NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })

    if (!user || !user.password_hash) return invalid()
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'This account is not active.' },
        { status: 403 }
      )
    }

    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) return invalid()

    const { value, maxAge } = encodeSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      vendorId: user.vendor_id,
    })

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        vendorId: user.vendor_id,
        vendorCode: user.vendor_code,
      },
    })

    res.cookies.set(SESSION_COOKIE, value, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge,
    })

    return res
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
