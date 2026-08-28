import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/** POST /api/auth/logout - Clear auth cookies */
export async function POST() {
  const response = NextResponse.json({
    success: true,
    data: { message: 'Logged out successfully' },
  })

  response.cookies.set('access_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  return response
}
