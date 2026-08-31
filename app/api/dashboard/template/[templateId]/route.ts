import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { initTemplatesTable, deleteTemplate } from '@/lib/email-templates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  const { templateId } = await params
  const id = Number(templateId)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid template id.' }, { status: 400 })
  }
  try {
    await initTemplatesTable()
    const ok = await deleteTemplate(id)
    return NextResponse.json({ ok })
  } catch (err) {
    console.error('Delete template error:', err)
    return NextResponse.json({ error: 'Delete failed.' }, { status: 500 })
  }
}
