import { NextResponse } from 'next/server'
import { initSaasDB, getOrgAnalytics } from '@/lib/saas-db'
import { withAuth, type AuthContext } from '@/lib/api-middleware'

export const runtime = 'nodejs'

/** GET /api/analytics - Get org-level analytics */
export const GET = withAuth(async (req: Request, ctx: AuthContext) => {
  try {
    await initSaasDB()

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30', 10)

    if (days < 1 || days > 365) {
      return NextResponse.json(
        { success: false, message: 'days must be between 1 and 365' },
        { status: 400 }
      )
    }

    const analytics = await getOrgAnalytics(ctx.orgId, days)

    return NextResponse.json({
      success: true,
      data: {
        period_days: days,
        total_templates: analytics.total_templates,
        events: analytics.events,
      },
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to get analytics' },
      { status: 500 }
    )
  }
})
