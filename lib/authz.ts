/**
 * Authorization helpers built on the session.
 *
 * Rules:
 *   - SUPER_ADMIN can act on any vendor.
 *   - Any other role can only act on the vendor it belongs to (session.vendorId).
 */
import type { SessionPayload } from './session'

export function isSuperAdmin(session: SessionPayload | null): boolean {
  return session?.role === 'SUPER_ADMIN'
}

/** True if the session may read/write data for `vendorId`. */
export function canAccessVendor(
  session: SessionPayload | null,
  vendorId: number
): boolean {
  if (!session) return false
  if (session.role === 'SUPER_ADMIN') return true
  // session.vendorId may arrive as a string (bigint from pg serialized into the
  // cookie), so coerce both sides before comparing.
  if (session.vendorId == null) return false
  return Number(session.vendorId) === Number(vendorId)
}

/** The session's vendor id as a number, or null. */
export function sessionVendorId(session: SessionPayload | null): number | null {
  if (!session || session.vendorId == null) return null
  const n = Number(session.vendorId)
  return Number.isFinite(n) ? n : null
}

/**
 * Roles, most to least privileged:
 *   SUPER_ADMIN — platform owner; all vendors.
 *   ADMIN       — vendor admin; manages their vendor's users + templates.
 *   MEMBER      — vendor member; edits templates only, cannot manage users.
 */
export function canManageUsers(session: SessionPayload | null): boolean {
  return session?.role === 'SUPER_ADMIN' || session?.role === 'ADMIN'
}
