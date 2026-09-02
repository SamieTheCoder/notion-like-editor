import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getSession } from '@/lib/session'
import { canAccessVendor } from '@/lib/authz'
import { initAuthDB, getVendorById } from '@/lib/auth-db'
import { initTemplatesTable, getTemplateById } from '@/lib/email-templates'
import { initVariablesTable, listVariablesForVendor } from '@/lib/variables'
import { extractTokens } from '@/lib/compose-email'
import { TemplateTester } from '@/components/TemplateTester'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Test template' }

/**
 * Per-template test / API playground.
 *
 * Shows every `#TOKEN#` the template's final body needs (enriched with the
 * vendor's variable registry: label + dummy value), the raw ProseMirror JSON
 * body, and a live substituted preview so the operator can test the template
 * exactly as the API would render it.
 */
export default async function TemplateTestPage({
  params,
}: {
  params: Promise<{ vendorId: string; templateId: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/')
  if (session.mustChangePassword) redirect('/change-password')

  const { vendorId, templateId } = await params
  const vId = Number(vendorId)
  const tId = Number(templateId)
  if (!Number.isFinite(vId) || !Number.isFinite(tId)) notFound()
  if (!canAccessVendor(session, vId)) redirect('/dashboard')

  await initAuthDB()
  await initTemplatesTable()
  await initVariablesTable()

  const vendor = await getVendorById(vId)
  if (!vendor) notFound()

  const template = await getTemplateById(tId)
  if (!template || Number(template.vendor_id) !== vId) notFound()

  const finalBody = template.final_body || ''

  // Tokens the body actually contains, in first-seen order.
  const tokens = extractTokens(finalBody)

  // Vendor's variable registry, keyed by normalized token, to enrich the form
  // with human labels + dummy values.
  const variables = await listVariablesForVendor(vId)
  const registry: Record<string, { label: string; dummy: string }> = {}
  for (const v of variables) {
    registry[v.token.toUpperCase()] = { label: v.label, dummy: v.dummy_value }
  }

  const fields = tokens.map((tok) => {
    const bare = tok.replace(/^#+|#+$/g, '').toUpperCase()
    const meta = registry[bare]
    return {
      token: tok,
      label: meta?.label || bare,
      dummy: meta?.dummy || '',
    }
  })

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
      <div className="mx-auto max-w-6xl px-4">
        <Link
          href={`/dashboard/${vId}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft size={16} /> Back to {vendor.name}
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Test template
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {template.trigger || template.name || `Template #${template.id}`} ·{' '}
            {vendor.name} · vendor #{vId} · {fields.length} variable
            {fields.length !== 1 ? 's' : ''}
          </p>
        </div>

        <TemplateTester
          vendorId={vId}
          trigger={template.trigger || template.name || ''}
          fields={fields}
          finalBody={finalBody}
          bodyJson={template.body_json ?? null}
        />
      </div>
    </main>
  )
}
