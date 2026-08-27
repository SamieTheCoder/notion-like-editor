import { initTemplatesTable, listTemplates } from '@/lib/email-templates'

export const runtime = 'nodejs'

/** GET /api/email-templates — list shells (metadata + config, no HTML) */
export async function GET() {
  try {
    await initTemplatesTable()
    const templates = await listTemplates()
    return Response.json({ templates })
  } catch (error) {
    console.error('DB error:', error)
    return Response.json(
      {
        error: 'Failed to fetch email templates',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
