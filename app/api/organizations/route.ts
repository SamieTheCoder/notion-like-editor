import { NextResponse } from 'next/server'
import { initSaasDB, getOrgById, updateOrg } from '@/lib/saas-db'
import { withAuth, type AuthContext } from '@/lib/api-middleware'

export const runtime = 'nodejs'

/** GET /api/organizations - Get user's organization */
export const GET = withAuth(async (_req: Request, ctx: AuthContext) => {
  try {
    await initSaasDB()
    const org = await getOrgById(ctx.orgId)

    if (!org) {
      return NextResponse.json(
        { success: false, message: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: { org } })
  } catch (error) {
    console.error('Get org error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to get organization' },
      { status: 500 }
    )
  }
})

/** PUT /api/organizations - Update organization */
export const PUT = withAuth(async (req: Request, ctx: AuthContext) => {
  try {
    await initSaasDB()

    if (ctx.role !== 'OWNER' && ctx.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Only owners and admins can update the organization' },
        { status: 403 }
      )
    }

    const body = await req.json() as {
      name?: string
      logo_url?: string
      primary_color?: string
    }

    if (!body.name && !body.logo_url && !body.primary_color) {
      return NextResponse.json(
        { success: false, message: 'At least one field to update is required' },
        { status: 400 }
      )
    }

    const org = await updateOrg(ctx.orgId, {
      name: body.name,
      logo_url: body.logo_url,
      primary_color: body.primary_color,
    })

    if (!org) {
      return NextResponse.json(
        { success: false, message: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: { org } })
  } catch (error) {
    console.error('Update org error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update organization' },
      { status: 500 }
    )
  }
})
