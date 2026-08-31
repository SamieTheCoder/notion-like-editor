/**
 * Minimal session handling: a signed, httpOnly cookie.
 *
 * The cookie value is `base64url(payload).base64url(hmacSHA256(payload))`.
 * No external session store — the signature is verified on read. Set
 * AUTH_SECRET in the environment for production; a dev fallback is used
 * otherwise.
 */
import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

const SECRET =
  process.env.AUTH_SECRET || 'dev-insecure-secret-change-me-in-production'

export interface SessionPayload {
  userId: number
  email: string
  role: string
  vendorId: number | null
  exp: number // unix seconds
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

function sign(data: string): string {
  return createHmac('sha256', SECRET).update(data).digest('base64url')
}

/** Serialize + sign a session payload into a cookie string. */
export function encodeSession(
  payload: Omit<SessionPayload, 'exp'>
): { value: string; maxAge: number } {
  const full: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  }
  const data = b64url(JSON.stringify(full))
  const sig = sign(data)
  return { value: `${data}.${sig}`, maxAge: MAX_AGE_SECONDS }
}

/** Verify signature + expiry. Returns the payload or null. */
export function decodeSession(token: string | undefined): SessionPayload | null {
  if (!token) return null
  const [data, sig] = token.split('.')
  if (!data || !sig) return null

  const expected = sign(data)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const payload = JSON.parse(
      Buffer.from(data, 'base64url').toString('utf8')
    ) as SessionPayload
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

/** Read and verify the current session from the request cookies. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  return decodeSession(store.get(SESSION_COOKIE)?.value)
}
