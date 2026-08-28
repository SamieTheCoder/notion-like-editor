import { NextResponse } from 'next/server'
import { initSaasDB, getTemplateById, duplicateTemplate } from '@/lib/saas-db'
import { withAuth, type AuthContext } from '@/lib/api-middleware'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ id: string }>
}

/** POST /api/templates/[id]/duplicate - Duplicate a template */
export async function POST(req: Request, { params }: RouteParams) {
  return withAuth(async (_req: Request, ctx: AuthContext) => {
    try {
      await initSaasDB()
      const { id } = await params

      const existing = await getTemplateById(id)
      if (!existing || existing.org_id !== ctx.orgId) {
        return NextResponse.json(
          { success: false, message: 'Template not found' },
          { status: 404 }
        )
      }

      const template = await duplicateTemplate(id, ctx.userId)
      if (!template) {
        return NextResponse.json(
          { success: false, message: 'Failed to duplicate template' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: { template },
      }, { status: 201 })
    } catch (error) {
      console.error('Duplicate template error:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to duplicate template' },
        { status: 500 }
      )
    }
  })(req)
}
