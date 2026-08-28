import { NextResponse } from 'next/server'
import { initSaasDB, getUserByEmail, getOrgById } from '@/lib/saas-db'
import { verifyPassword, signToken, generateRefreshToken } from '@/lib/auth'

export const runtime = 'nodejs'

/** POST /api/auth/login - Authenticate a user */
export async function POST(req: Request) {
  try {
    await initSaasDB()
    const body = await req.json() as { email?: string; password?: string }

    if (!body.email || !body.password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user
    const user = await getUserByEmail(body.email)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, message: 'Account is inactive' },
        { status: 403 }
      )
    }

    // Verify password
    const valid = await verifyPassword(body.password, user.password_hash)
    if (!valid) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Get org
    const org = await getOrgById(user.org_id)
    if (!org) {
      return NextResponse.json(
        { success: false, message: 'Organization not found' },
        { status: 500 }
      )
    }

    // Generate tokens
    const tokenPayload = { userId: user.id, orgId: org.id, email: user.email, role: user.role }
    const accessToken = signToken(tokenPayload, 'access')
    const refreshToken = generateRefreshToken(tokenPayload)

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
        },
        org: { id: org.id, name: org.name, slug: org.slug },
        accessToken,
        refreshToken,
      },
    })

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    })
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to authenticate', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
