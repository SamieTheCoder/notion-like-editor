import { NextResponse } from 'next/server'
import { initSaasDB, getTemplateById, createSharedLink, getSharedLinksByTemplate, trackEvent } from '@/lib/saas-db'
import { generateShareToken, hashPassword } from '@/lib/auth'
import { withAuth, type AuthContext } from '@/lib/api-middleware'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ id: string }>
}

/** GET /api/templates/[id]/share - List share links for a template */
export async function GET(req: Request, { params }: RouteParams) {
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

      const links = await getSharedLinksByTemplate(id)
      return NextResponse.json({ success: true, data: { links } })
    } catch (error) {
      console.error('List share links error:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to list share links' },
        { status: 500 }
      )
    }
  })(req)
}

/** POST /api/templates/[id]/share - Create a share link */
export async function POST(req: Request, { params }: RouteParams) {
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
        expires_at?: string
        password?: string
      }

      const token = generateShareToken()
      let passwordHash: string | null = null
      if (body.password) {
        passwordHash = await hashPassword(body.password)
      }

      const link = await createSharedLink({
        template_id: id,
        token,
        expires_at: body.expires_at || null,
        password_hash: passwordHash,
        created_by: ctx.userId,
      })

      // Track the share event
      await trackEvent({ template_id: id, event: 'shared', metadata: { link_id: link.id } })

      return NextResponse.json({
        success: true,
        data: {
          link,
          url: `/api/share/${token}`,
        },
      }, { status: 201 })
    } catch (error) {
      console.error('Create share link error:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to create share link' },
        { status: 500 }
      )
    }
  })(req)
}
