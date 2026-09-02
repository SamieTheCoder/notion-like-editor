import { NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/api-keys'
import {
  initTemplatesTable,
  getTemplateByVendorAndTrigger,
} from '@/lib/email-templates'
import { substituteTokens } from '@/lib/compose-email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/templates/body
 *
 * One-shot, key-authenticated body lookup with merge-field substitution.
 * The client sends a single JSON body:
 *
 *   {
 *     "apiKey":    "ak_...",
 *     "secret":    "sk_...",
 *     "vendor_id": 3,
 *     "trigger":   "LEAD_REGISTERED",
 *     "keys": [
 *       { "name": "#LEAD_PARENT_NAME#", "value": "test parent name" },
 *       { "name": "#CHILD_NAME#",       "value": "test child name" }
 *     ]
 *   }
 *
 * `keys` is an array of { name, value } objects, so a consumer can iterate:
 *   keys.forEach(k => body.replace(k.name, k.value)).
 * Any `#TOKEN#` in the template body that has a non-empty value is replaced.
 * Tokens with an empty or missing value are left in place and reported in
 * `missing_keys`, so the caller knows what still needs filling.
 *
 * Authenticated purely by the key + secret (no session). Security: the API key
 * belongs to a vendor, so the requested vendor_id must match the key's vendor.
 */
export async function POST(req: Request) {
  let body: {
    apiKey?: unknown
    secret?: unknown
    vendor_id?: unknown
    vendorId?: unknown
    trigger?: unknown
    keys?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  const secret = typeof body.secret === 'string' ? body.secret.trim() : ''
  const rawVendorId = body.vendor_id ?? body.vendorId
  const vendorId = Number(rawVendorId)
  const trigger = typeof body.trigger === 'string' ? body.trigger.trim() : ''

  // Merge-field values. Primary form is an ARRAY of { name, value } objects:
  //   "keys": [ { "name": "#TOKEN#", "value": "..." }, ... ]
  // so a consumer can do keys.forEach(k => body.replace(k.name, k.value)).
  //
  // For backward compatibility we also accept:
  //   - an array of single-key objects: [ { "#TOKEN#": "value" }, ... ]
  //   - a plain object:                 { "#TOKEN#": "value", ... }
  // Empty values are ignored (the token is treated as "not provided").
  const keys: Record<string, string> = {}
  if (body.keys != null) {
    if (Array.isArray(body.keys)) {
      for (const entry of body.keys) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
          return NextResponse.json(
            {
              error:
                'Each item in keys must be an object like { "name": "#TOKEN#", "value": "..." }.',
            },
            { status: 400 }
          )
        }
        const e = entry as Record<string, unknown>
        if ('name' in e) {
          // { name, value } form
          const name = typeof e.name === 'string' ? e.name : ''
          if (name) keys[name] = e.value == null ? '' : String(e.value)
        } else {
          // legacy single-key form { "#TOKEN#": "value" }
          for (const [k, v] of Object.entries(e)) {
            keys[k] = v == null ? '' : String(v)
          }
        }
      }
    } else if (typeof body.keys === 'object') {
      // legacy plain-object form
      for (const [k, v] of Object.entries(body.keys as Record<string, unknown>)) {
        keys[k] = v == null ? '' : String(v)
      }
    } else {
      return NextResponse.json(
        {
          error:
            'keys must be an array of { "name": "#TOKEN#", "value": "..." } objects.',
        },
        { status: 400 }
      )
    }
  }

  // Validate shape before touching the database.
  if (!apiKey || !secret) {
    return NextResponse.json(
      { error: 'apiKey and secret are required.' },
      { status: 400 }
    )
  }
  if (!Number.isFinite(vendorId) || vendorId <= 0) {
    return NextResponse.json(
      { error: 'A valid vendor_id is required.' },
      { status: 400 }
    )
  }
  if (!trigger) {
    return NextResponse.json({ error: 'A trigger is required.' }, { status: 400 })
  }

  try {
    // 1. Authenticate the key.
    const key = await verifyApiKey(apiKey, secret)
    if (!key) {
      return NextResponse.json(
        { error: 'Invalid, revoked, or expired API key.' },
        { status: 401 }
      )
    }

    // 2. Authorize: the key may only read its own vendor's templates.
    if (Number(key.vendor_id) !== vendorId) {
      return NextResponse.json(
        { error: 'This API key cannot access that vendor.' },
        { status: 403 }
      )
    }

    // 3. Look up the body.
    await initTemplatesTable()
    const template = await getTemplateByVendorAndTrigger(vendorId, trigger)
    if (!template) {
      return NextResponse.json(
        {
          error: 'No template found for this vendor and trigger.',
          vendor_id: vendorId,
          trigger,
        },
        { status: 404 }
      )
    }

    // 4. Substitute the provided merge-field values into the final body and
    //    collect any tokens left unfilled.
    const { output: finalBody, missing } = substituteTokens(
      template.final_body ?? '',
      keys
    )

    // If any #TOKEN# is still unfilled, refuse to return the body: the caller
    // must supply every value first. Report exactly which keys are missing.
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing values for one or more template variables.',
          id: template.id,
          vendor_id: template.vendor_id,
          trigger: template.trigger,
          missing_keys: missing,
        },
        { status: 422 }
      )
    }

    return NextResponse.json({
      id: template.id,
      vendor_id: template.vendor_id,
      vendor_name: template.vendor_name,
      name: template.name,
      trigger: template.trigger,
      is_active: template.is_active,
      final_body: finalBody,
      missing_keys: missing,
    })
  } catch (err) {
    console.error('Authenticated template body error:', err)
    return NextResponse.json(
      {
        error: 'Failed to fetch template body.',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}
