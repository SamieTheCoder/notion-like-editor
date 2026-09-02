import { DemoEditor } from '@/components/editor/DemoEditor'
import { VendorBodyEditor } from '@/components/editor/VendorBodyEditor'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { canAccessVendor, canManageUsers } from '@/lib/authz'
import { initAuthDB, getVendorById } from '@/lib/auth-db'
import { initTemplatesTable, getTemplateById } from '@/lib/email-templates'

export const metadata = {
  title: 'Editor',
  description: 'A block-based editor that exports Tailwind-styled HTML.',
}

export const dynamic = 'force-dynamic'

export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ vendorId?: string; templateId?: string }>
}) {
  const { vendorId, templateId } = await searchParams

  // Vendor mode: author a template body and save it (create or edit).
  if (vendorId) {
    const session = await getSession()
    if (!session) redirect('/')
    if (session.mustChangePassword) redirect('/change-password')

    const id = Number(vendorId)
    // Vendor users can only open their own vendor's editor.
    if (!canAccessVendor(session, id)) redirect('/dashboard')

    await initAuthDB()
    await initTemplatesTable()
    const vendor = await getVendorById(id)
    if (!vendor) redirect('/dashboard')

    const tplId = templateId ? Number(templateId) : null
    const rawTemplate =
      tplId != null && Number.isFinite(tplId)
        ? await getTemplateById(tplId)
        : null
    // Don't load a template that belongs to a different vendor.
    const template =
      rawTemplate && Number(rawTemplate.vendor_id) === id ? rawTemplate : null

    return (
      <main
        className="min-h-[100dvh] bg-background py-10"
        style={
          vendor.primary_color
            ? ({
                '--primary': vendor.primary_color,
                '--ring': vendor.primary_color,
              } as React.CSSProperties)
            : undefined
        }
      >
        <div className="mx-auto max-w-5xl px-4">
          <VendorBodyEditor
            vendorId={id}
            vendorName={vendor.name}
            canManageVariables={canManageUsers(session)}
            templateId={template?.id ?? null}
            headHtml={vendor.header_html || ''}
            footerHtml={vendor.footer_html || ''}
            initialTrigger={template?.trigger || ''}
            initialBodyJson={template?.body_json || null}
            initialFinalBody={template?.final_body || ''}
          />
        </div>
      </main>
    )
  }

  // Standalone demo mode.
  return (
    <main className="min-h-[100dvh] bg-background py-10">
      <div className="mx-auto max-w-5xl px-4">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Editor Demo
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Standalone demo. Press{' '}
              <kbd className="rounded border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-xs">
                /
              </kbd>{' '}
              to insert a block.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Dashboard
          </Link>
        </header>

        <DemoEditor />
      </div>
    </main>
  )
}
