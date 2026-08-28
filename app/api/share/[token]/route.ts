import { NextResponse } from 'next/server'
import { initSaasDB, getSharedLinkByToken, getTemplateById, incrementShareViewCount, trackEvent } from '@/lib/saas-db'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ token: string }>
}

/** GET /api/share/[token] - Public route: view a shared template */
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    await initSaasDB()
    const { token } = await params

    const link = await getSharedLinkByToken(token)
    if (!link) {
      return NextResponse.json(
        { success: false, message: 'Share link not found' },
        { status: 404 }
      )
    }

    // Check expiry
    if (link.expires_at) {
      const expiryDate = new Date(link.expires_at)
      if (expiryDate < new Date()) {
        return NextResponse.json(
          { success: false, message: 'Share link has expired' },
          { status: 410 }
        )
      }
    }

    // Check if password protected
    if (link.password_hash) {
      // For password-protected links, require password in query
      const { searchParams } = new URL(_req.url)
      const password = searchParams.get('password')

      if (!password) {
        return NextResponse.json(
          { success: false, message: 'This link is password protected', passwordRequired: true },
          { status: 401 }
        )
      }

      // Verify password using the same method
      const { verifyPassword } = await import('@/lib/auth')
      const valid = await verifyPassword(password, link.password_hash)
      if (!valid) {
        return NextResponse.json(
          { success: false, message: 'Invalid password' },
          { status: 401 }
        )
      }
    }

    // Get the template
    const template = await getTemplateById(link.template_id)
    if (!template) {
      return NextResponse.json(
        { success: false, message: 'Template not found' },
        { status: 404 }
      )
    }

    // Increment view count and track event
    await incrementShareViewCount(token)
    await trackEvent({ template_id: template.id, event: 'viewed', metadata: { via: 'share_link', token } })

    return NextResponse.json({
      success: true,
      data: {
        template: {
          id: template.id,
          title: template.title,
          description: template.description,
          content: template.content,
          shell_config: template.shell_config,
          variables: template.variables,
          status: template.status,
          created_at: template.created_at,
          updated_at: template.updated_at,
        },
      },
    })
  } catch (error) {
    console.error('Share view error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load shared template' },
      { status: 500 }
    )
  }
}
