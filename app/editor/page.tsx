import { DemoEditor } from '@/components/editor/DemoEditor'
import { VendorBodyEditor } from '@/components/editor/VendorBodyEditor'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
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

    const id = Number(vendorId)
    await initAuthDB()
    await initTemplatesTable()
    const vendor = await getVendorById(id)
    if (!vendor) redirect('/dashboard')

    const tplId = templateId ? Number(templateId) : null
    const template =
      tplId != null && Number.isFinite(tplId)
        ? await getTemplateById(tplId)
        : null

    return (
      <main className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-5xl px-4">
          <VendorBodyEditor
            vendorId={id}
            vendorName={vendor.name}
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
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl px-4">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Editor Demo
            </h1>
            <p className="mt-1 text-sm text-gray-500">
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
