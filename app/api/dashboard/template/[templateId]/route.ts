import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { canAccessVendor, canManageUsers } from '@/lib/authz'
import {
  initTemplatesTable,
  deleteTemplate,
  getTemplateById,
} from '@/lib/email-templates'

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
  // Members can edit templates but not delete them; only admins/super admins.
  if (!canManageUsers(session)) {
    return NextResponse.json(
      { error: 'Members cannot delete templates.' },
      { status: 403 }
    )
  }
  const { templateId } = await params
  const id = Number(templateId)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid template id.' }, { status: 400 })
  }
  try {
    await initTemplatesTable()

    const template = await getTemplateById(id)
    if (!template) {
      return NextResponse.json({ error: 'Template not found.' }, { status: 404 })
    }
    // Only a super admin or the owning vendor may delete it.
    if (
      template.vendor_id == null ||
      !canAccessVendor(session, Number(template.vendor_id))
    ) {
      return NextResponse.json(
        { error: 'You do not have access to this template.' },
        { status: 403 }
      )
    }

    const ok = await deleteTemplate(id)
    return NextResponse.json({ ok })
  } catch (err) {
    console.error('Delete template error:', err)
    return NextResponse.json({ error: 'Delete failed.' }, { status: 500 })
  }
}
