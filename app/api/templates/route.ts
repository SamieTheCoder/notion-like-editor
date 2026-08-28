import { NextResponse } from 'next/server'
import { initSaasDB, createTemplate, getTemplatesByOrg, type TemplateStatus } from '@/lib/saas-db'
import { withAuth, type AuthContext } from '@/lib/api-middleware'

export const runtime = 'nodejs'

/** GET /api/templates - List templates with pagination, search, filters */
export const GET = withAuth(async (req: Request, ctx: AuthContext) => {
  try {
    await initSaasDB()

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') as TemplateStatus | undefined
    const category_id = searchParams.get('category_id') || undefined

    // Validate status if provided
    if (status && !['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status. Must be DRAFT, PUBLISHED, or ARCHIVED' },
        { status: 400 }
      )
    }

    const result = await getTemplatesByOrg(ctx.orgId, { page, limit, search, status, category_id })

    return NextResponse.json({
      success: true,
      data: {
        templates: result.templates,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      },
    })
  } catch (error) {
    console.error('List templates error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to list templates' },
      { status: 500 }
    )
  }
})

/** POST /api/templates - Create a new template */
export const POST = withAuth(async (req: Request, ctx: AuthContext) => {
  try {
    await initSaasDB()

    const body = await req.json() as {
      title?: string
      description?: string
      category_id?: string
      head_html?: string
      footer_html?: string
      content?: Record<string, unknown>
      shell_config?: Record<string, unknown>
      status?: TemplateStatus
      variables?: string[]
    }

    if (!body.title) {
      return NextResponse.json(
        { success: false, message: 'title is required' },
        { status: 400 }
      )
    }

    // Generate slug from title
    const slug = body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + `-${Date.now()}`

    const template = await createTemplate({
      org_id: ctx.orgId,
      title: body.title,
      description: body.description || null,
      slug,
      category_id: body.category_id || null,
      head_html: body.head_html || '',
      footer_html: body.footer_html || '',
      content: body.content,
      shell_config: body.shell_config || null,
      status: body.status || 'DRAFT',
      variables: body.variables || [],
      created_by: ctx.userId,
    })

    return NextResponse.json({
      success: true,
      data: { template },
    }, { status: 201 })
  } catch (error) {
    console.error('Create template error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create template' },
      { status: 500 }
    )
  }
})
