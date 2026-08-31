import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { initAuthDB, getVendorById } from '@/lib/auth-db'
import { initTemplatesTable, listTemplatesByVendor } from '@/lib/email-templates'
import { ChevronLeft } from 'lucide-react'
import { VendorShellEditor } from '@/components/VendorTemplateEditor'
import { VendorTemplatesTable } from '@/components/VendorTemplatesTable'

export const dynamic = 'force-dynamic'

export default async function VendorPage({
  params,
}: {
  params: Promise<{ vendorId: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/')

  const { vendorId } = await params
  const id = Number(vendorId)
  if (!Number.isFinite(id)) notFound()

  await initAuthDB()
  await initTemplatesTable()
  const vendor = await getVendorById(id)
  if (!vendor) notFound()

  const templates = await listTemplatesByVendor(id)

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
        >
          <ChevronLeft size={16} /> All vendors
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {vendor.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {vendor.code} · {templates.length} template
            {templates.length !== 1 ? 's' : ''}. Each template body combines with
            the shared header and footer into one email.
          </p>
        </div>

        <div className="space-y-6">
          <VendorTemplatesTable
            vendorId={id}
            templates={templates.map((t) => ({
              id: t.id,
              trigger: t.trigger,
              name: t.name,
              updated_at: t.updated_at,
            }))}
          />

          <VendorShellEditor
            vendorId={id}
            vendorName={vendor.name}
            initialHeader={vendor.header_html || ''}
            initialFooter={vendor.footer_html || ''}
          />
        </div>
      </div>
    </main>
  )
}
