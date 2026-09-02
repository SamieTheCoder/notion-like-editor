/**
 * Keeps the session alive: refreshes the session expiry on each matched request.
 *
 * Next.js 16 runs Proxy on the Node.js runtime, so this can re-export `auth`
 * straight from @/auth (which imports `pg` and `bcryptjs`).
 */
export { auth as proxy } from '@/auth'

export const config = {
  // Skip static assets and image optimization.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
