import { NextResponse } from 'next/server'
import { initSaasDB, createApiKey, getApiKeysByOrg, deleteApiKey } from '@/lib/saas-db'
import { generateApiKeyRaw } from '@/lib/auth'
import { withAuth, type AuthContext } from '@/lib/api-middleware'

export const runtime = 'nodejs'

/** GET /api/organizations/api-keys - List API keys */
export const GET = withAuth(async (_req: Request, ctx: AuthContext) => {
  try {
    await initSaasDB()
    const keys = await getApiKeysByOrg(ctx.orgId)
    return NextResponse.json({ success: true, data: { keys } })
  } catch (error) {
    console.error('List API keys error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to list API keys' },
      { status: 500 }
    )
  }
})

/** POST /api/organizations/api-keys - Create a new API key */
export const POST = withAuth(async (req: Request, ctx: AuthContext) => {
  try {
    await initSaasDB()

    if (ctx.role !== 'OWNER' && ctx.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Only owners and admins can create API keys' },
        { status: 403 }
      )
    }

    const body = await req.json() as { name?: string }

    if (!body.name) {
      return NextResponse.json(
        { success: false, message: 'name is required' },
        { status: 400 }
      )
    }

    const { raw, prefix, hash } = generateApiKeyRaw()

    const key = await createApiKey({
      org_id: ctx.orgId,
      name: body.name,
      key_hash: hash,
      prefix,
    })

    return NextResponse.json({
      success: true,
      data: {
        key: {
          id: key.id,
          name: key.name,
          prefix: key.prefix,
          created_at: key.created_at,
        },
        // Only returned once at creation time
        secret: raw,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Create API key error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create API key' },
      { status: 500 }
    )
  }
})

/** DELETE /api/organizations/api-keys - Delete an API key */
export const DELETE = withAuth(async (req: Request, ctx: AuthContext) => {
  try {
    await initSaasDB()

    if (ctx.role !== 'OWNER' && ctx.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Only owners and admins can delete API keys' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const keyId = searchParams.get('id')

    if (!keyId) {
      return NextResponse.json(
        { success: false, message: 'id query parameter is required' },
        { status: 400 }
      )
    }

    const deleted = await deleteApiKey(keyId)
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: 'API key not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: { message: 'API key deleted' } })
  } catch (error) {
    console.error('Delete API key error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete API key' },
      { status: 500 }
    )
  }
})
