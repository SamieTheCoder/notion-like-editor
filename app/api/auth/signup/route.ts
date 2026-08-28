import { NextResponse } from 'next/server'
import { initSaasDB, createOrg, createUser, getUserByEmail } from '@/lib/saas-db'
import { hashPassword, signToken, generateRefreshToken } from '@/lib/auth'

export const runtime = 'nodejs'

/** POST /api/auth/signup - Register a new user and organization */
export async function POST(req: Request) {
  try {
    await initSaasDB()
    const body = await req.json() as {
      orgName?: string
      email?: string
      password?: string
      firstName?: string
      lastName?: string
    }

    // Validate required fields
    if (!body.orgName || !body.email || !body.password || !body.firstName || !body.lastName) {
      return NextResponse.json(
        { success: false, message: 'All fields are required: orgName, email, password, firstName, lastName' },
        { status: 400 }
      )
    }

    if (body.password.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existing = await getUserByEmail(body.email)
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 409 }
      )
    }

    // Create org with slug from orgName
    const slug = body.orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const org = await createOrg({ name: body.orgName, slug: `${slug}-${Date.now()}` })

    // Create user as OWNER
    const passwordHash = await hashPassword(body.password)
    const user = await createUser({
      org_id: org.id,
      email: body.email,
      password_hash: passwordHash,
      first_name: body.firstName,
      last_name: body.lastName,
      role: 'OWNER',
    })

    // Generate tokens
    const tokenPayload = { userId: user.id, orgId: org.id, email: user.email, role: user.role }
    const accessToken = signToken(tokenPayload, 'access')
    const refreshToken = generateRefreshToken(tokenPayload)

    // Build response with cookies
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
    }, { status: 201 })

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 1 hour
    })
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create account', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
