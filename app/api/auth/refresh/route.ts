import { NextResponse } from 'next/server'
import { verifyToken, signToken } from '@/lib/auth'

export const runtime = 'nodejs'

/** POST /api/auth/refresh - Refresh the access token */
export async function POST(req: Request) {
  try {
    // Extract refresh token from cookies
    let refreshToken: string | null = null
    const cookieHeader = req.headers.get('cookie')
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map(c => {
          const [key, ...val] = c.trim().split('=')
          return [key, val.join('=')]
        })
      )
      refreshToken = cookies['refresh_token'] || null
    }

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'Refresh token not found' },
        { status: 401 }
      )
    }

    const payload = verifyToken(refreshToken)
    if (!payload || payload.type !== 'refresh') {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired refresh token' },
        { status: 401 }
      )
    }

    // Generate new access token
    const tokenPayload = {
      userId: payload.userId,
      orgId: payload.orgId,
      email: payload.email,
      role: payload.role,
    }
    const accessToken = signToken(tokenPayload, 'access')

    const response = NextResponse.json({
      success: true,
      data: { accessToken },
    })

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    })

    return response
  } catch (error) {
    console.error('Refresh error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to refresh token' },
      { status: 500 }
    )
  }
}
