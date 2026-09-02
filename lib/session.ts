/**
 * Session access for server components and route handlers.
 *
 * Backed by Auth.js (see auth.ts). `getSession()` keeps the original
 * SessionPayload shape so every page and API that already reads
 * `session.role` / `session.vendorId` / `session.mustChangePassword`
 * continues to work unchanged.
 */
import { auth } from '@/auth'

export interface SessionPayload {
  userId: number
  email: string
  role: string
  vendorId: number | null
  mustChangePassword?: boolean
}

/** Read the current Auth.js session, mapped to SessionPayload. Null if signed out. */
export async function getSession(): Promise<SessionPayload | null> {
  const session = await auth()
  const user = session?.user
  if (!user?.email) return null

  return {
    userId: Number(user.id),
    email: user.email,
    role: user.role ?? 'MEMBER',
    vendorId: user.vendorId == null ? null : Number(user.vendorId),
    mustChangePassword: user.mustChangePassword === true,
  }
}
