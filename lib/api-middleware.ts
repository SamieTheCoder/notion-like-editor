/**
 * API middleware for authenticated routes.
 *
 * Provides a `withAuth` higher-order function that extracts and verifies
 * JWT tokens from cookies or the Authorization header.
 */
import { NextResponse } from 'next/server'
import { verifyToken, type TokenPayload } from '@/lib/auth'

export interface AuthContext {
  userId: string
  orgId: string
  email: string
  role: string
}

type AuthenticatedHandler = (
  req: Request,
  context: AuthContext
) => Promise<Response>

/**
 * Extracts the access token from cookies or the Authorization header.
 */
function extractToken(req: Request): string | null {
  // Check Authorization header first
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  // Check cookies
  const cookieHeader = req.headers.get('cookie')
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [key, ...val] = c.trim().split('=')
        return [key, val.join('=')]
      })
    )
    if (cookies['access_token']) {
      return cookies['access_token']
    }
  }

  return null
}

/**
 * Higher-order function that wraps a route handler with JWT authentication.
 * If the token is invalid or missing, returns a 401 response.
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (req: Request, routeContext?: unknown): Promise<Response> => {
    const token = extractToken(req)

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload || payload.type !== 'access') {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const authContext: AuthContext = {
      userId: payload.userId,
      orgId: payload.orgId,
      email: payload.email,
      role: payload.role,
    }

    // Pass routeContext through for dynamic routes that need params
    if (routeContext) {
      return handler(req, authContext)
    }
    return handler(req, authContext)
  }
}

/**
 * Helper to extract token payload without requiring authentication
 * (returns null if no valid token). Useful for optional auth routes.
 */
export function getOptionalAuth(req: Request): TokenPayload | null {
  const token = extractToken(req)
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload || payload.type !== 'access') return null
  return payload
}
