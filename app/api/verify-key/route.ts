import { NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/api-keys'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/verify-key — authenticate an API key pair.
 *
 * This is the endpoint a client (or the downstream send pipeline) calls to
 * check its credentials. It does NOT require a logged-in session; it is
 * authenticated purely by the key + secret it carries.
 *
 * Credentials can be supplied either way:
 *   1. Header:  Authorization: Bearer ak_xxx:sk_xxx
 *   2. JSON body: { "apiKey": "ak_xxx", "secret": "sk_xxx" }
 *
 * Returns 200 with the owning vendor + key metadata when valid, 401 otherwise.
 * The response never contains the secret.
 */
export async function POST(req: Request) {
  let apiKey = ''
  let secret = ''

  // 1. Prefer the Authorization header: "Bearer <apiKey>:<secret>".
  const authHeader = req.headers.get('authorization') || ''
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)
  if (bearer) {
    const idx = bearer[1].indexOf(':')
    if (idx > -1) {
      apiKey = bearer[1].slice(0, idx).trim()
      secret = bearer[1].slice(idx + 1).trim()
    }
  }

  // 2. Fall back to a JSON body.
  if (!apiKey || !secret) {
    try {
      const body = (await req.json()) as { apiKey?: unknown; secret?: unknown }
      if (typeof body.apiKey === 'string') apiKey = body.apiKey.trim()
      if (typeof body.secret === 'string') secret = body.secret.trim()
    } catch {
      // no body — handled by the validation below
    }
  }

  if (!apiKey || !secret) {
    return NextResponse.json(
      {
        valid: false,
        error:
          'Provide credentials via "Authorization: Bearer ak_...:sk_..." or a JSON body { apiKey, secret }.',
      },
      { status: 400 }
    )
  }

  try {
    const key = await verifyApiKey(apiKey, secret)
    if (!key) {
      return NextResponse.json(
        { valid: false, error: 'Invalid, revoked, or expired API key.' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      valid: true,
      vendor_id: key.vendor_id,
      key: {
        id: key.id,
        api_key: key.api_key,
        label: key.label,
        status: key.status,
        created_at: key.created_at,
        expires_at: key.expires_at,
        last_used_at: key.last_used_at,
      },
    })
  } catch (err) {
    console.error('Verify API key error:', err)
    return NextResponse.json(
      { valid: false, error: 'Verification failed.' },
      { status: 500 }
    )
  }
}
