import { NextResponse } from 'next/server'
import { initSaasDB, getUserById, getOrgById } from '@/lib/saas-db'
import { withAuth, type AuthContext } from '@/lib/api-middleware'

export const runtime = 'nodejs'

/** GET /api/auth/me - Get current authenticated user */
export const GET = withAuth(async (_req: Request, ctx: AuthContext) => {
  try {
    await initSaasDB()

    const user = await getUserById(ctx.userId)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    const org = await getOrgById(ctx.orgId)

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          avatar_url: user.avatar_url,
          status: user.status,
          created_at: user.created_at,
        },
        org: org ? {
          id: org.id,
          name: org.name,
          slug: org.slug,
          logo_url: org.logo_url,
          primary_color: org.primary_color,
        } : null,
      },
    })
  } catch (error) {
    console.error('Me error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to get user data' },
      { status: 500 }
    )
  }
})
