import { NextResponse } from 'next/server'
import { initSaasDB, getTemplateById, updateTemplate, deleteTemplate, type TemplateStatus } from '@/lib/saas-db'
import { withAuth, type AuthContext } from '@/lib/api-middleware'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ id: string }>
}

/** GET /api/templates/[id] - Get a single template */
export async function GET(req: Request, { params }: RouteParams) {
  return withAuth(async (_req: Request, ctx: AuthContext) => {
    try {
      await initSaasDB()
      const { id } = await params

      const template = await getTemplateById(id)
      if (!template) {
        return NextResponse.json(
          { success: false, message: 'Template not found' },
          { status: 404 }
        )
      }

      // Ensure user can only access their org's templates
      if (template.org_id !== ctx.orgId) {
        return NextResponse.json(
          { success: false, message: 'Template not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ success: true, data: { template } })
    } catch (error) {
      console.error('Get template error:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to get template' },
        { status: 500 }
      )
    }
  })(req)
}

/** PUT /api/templates/[id] - Update a template */
export async function PUT(req: Request, { params }: RouteParams) {
  return withAuth(async (request: Request, ctx: AuthContext) => {
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

      const body = await request.json() as {
        title?: string
        description?: string
        slug?: string
        category_id?: string | null
        head_html?: string
        footer_html?: string
        content?: Record<string, unknown>
        shell_config?: Record<string, unknown> | null
        status?: TemplateStatus
        variables?: string[]
        thumbnail_url?: string | null
      }

      const template = await updateTemplate(id, {
        ...body,
        updated_by: ctx.userId,
      })

      return NextResponse.json({ success: true, data: { template } })
    } catch (error) {
      console.error('Update template error:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to update template' },
        { status: 500 }
      )
    }
  })(req)
}

/** DELETE /api/templates/[id] - Delete a template */
export async function DELETE(req: Request, { params }: RouteParams) {
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

      const deleted = await deleteTemplate(id)
      if (!deleted) {
        return NextResponse.json(
          { success: false, message: 'Failed to delete template' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, data: { message: 'Template deleted' } })
    } catch (error) {
      console.error('Delete template error:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to delete template' },
        { status: 500 }
      )
    }
  })(req)
}
