import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { canAccessVendor, canManageUsers } from '@/lib/authz'
import { initAuthDB, getVendorById, listUsersByVendor } from '@/lib/auth-db'
import { initTemplatesTable, listTemplatesByVendor } from '@/lib/email-templates'
import { initApiKeysTable, listApiKeys } from '@/lib/api-keys'
import { ChevronLeft } from 'lucide-react'
import { VendorShellEditor } from '@/components/VendorTemplateEditor'
import { VendorTemplatesTable } from '@/components/VendorTemplatesTable'
import { VendorUsersTable } from '@/components/VendorUsersTable'
import { VendorSettings } from '@/components/VendorSettings'
import { ApiKeysCard } from '@/components/ApiKeysCard'
import { VendorSectionNav } from '@/components/VendorSectionNav'
import { DashboardTour } from '@/components/DashboardTour'

export const dynamic = 'force-dynamic'

/** Per-vendor tab title and favicon. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ vendorId: string }>
}) {
  const { vendorId } = await params
  const id = Number(vendorId)
  if (!Number.isFinite(id)) return { title: 'Vendor' }
  await initAuthDB()
  const vendor = await getVendorById(id)
  if (!vendor) return { title: 'Vendor' }
  return {
    title: `${vendor.name} · Template Studio`,
    icons: vendor.favicon_url ? { icon: vendor.favicon_url } : undefined,
  }
}

export default async function VendorPage({
  params,
}: {
  params: Promise<{ vendorId: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/')
  if (session.mustChangePassword) redirect('/change-password')

  const { vendorId } = await params
  const id = Number(vendorId)
  if (!Number.isFinite(id)) notFound()

  const isSuperAdmin = session.role === 'SUPER_ADMIN'
  // Non-super-admins can only view their own vendor.
  if (!canAccessVendor(session, id)) redirect('/dashboard')

  // Only SUPER_ADMIN and vendor ADMIN can manage users; MEMBER cannot.
  const canManage = canManageUsers(session)
  // Super admin creates vendor ADMINs; a vendor ADMIN creates MEMBERs.
  const createsRole = isSuperAdmin ? 'ADMIN' : 'MEMBER'

  await initAuthDB()
  await initTemplatesTable()
  const vendor = await getVendorById(id)
  if (!vendor) notFound()

  const templates = await listTemplatesByVendor(id)
  const users = await listUsersByVendor(id)
  // API keys back the admin Settings tab, which only managers can see.
  const apiKeys = canManage
    ? await initApiKeysTable().then(() => listApiKeys(id))
    : []

  return (
    <main
      className="min-h-[100dvh] bg-background"
      // Scope the vendor's accent to this page only. Overriding the theme
      // tokens means every token-based button, link, and badge below adopts
      // the accent without per-component wiring. CSS variables accept any color
      // value, so a hex override coexists with the OKLCH theme defaults.
      style={
        vendor.primary_color
          ? ({
              '--primary': vendor.primary_color,
              '--ring': vendor.primary_color,
              '--sidebar-primary': vendor.primary_color,
            } as React.CSSProperties)
          : undefined
      }
    >
      <div className="mx-auto max-w-6xl px-4 py-10">
        {isSuperAdmin && (
          <Link
            href="/dashboard"
            className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft size={16} /> All vendors
          </Link>
        )}

        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {vendor.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {vendor.vendor_name} · vendor #{Number(vendor.id)} · {templates.length} template
              {templates.length !== 1 ? 's' : ''}
            </p>
          </div>
          <DashboardTour surface={`vendor-${id}`} />
        </div>

        <div className="space-y-6">
          <VendorSectionNav
            title="Manage"
            subtitle={vendor.vendor_name}
            sections={[
              {
                id: 'templates',
                label: 'Templates',
                icon: 'templates',
                count: templates.length,
                content: (
                  <VendorTemplatesTable
                    key="templates"
                    vendorId={id}
                    canDelete={canManage}
                    templates={templates.map((t) => ({
                      id: t.id,
                      trigger: t.trigger,
                      name: t.name,
                      is_active: t.is_active,
                      updated_at: t.updated_at,
                    }))}
                  />
                ),
              },
              {
                id: 'users',
                label: 'User management',
                icon: 'users',
                count: users.length,
                content: (
                  <VendorUsersTable
                    key="users"
                    vendorId={id}
                    vendorName={vendor.name}
                    canManage={canManage}
                    createsRole={createsRole}
                    viewerRole={session.role}
                    viewerId={session.userId}
                    users={users.map((u) => ({
                      id: u.id,
                      email: u.email,
                      first_name: u.first_name,
                      last_name: u.last_name,
                      role: u.role,
                      status: u.status,
                      must_change_password: u.must_change_password,
                    }))}
                  />
                ),
              },
              {
                id: 'shell',
                label: 'Header & footer',
                icon: 'shell',
                content: (
                  <VendorShellEditor
                    key="shell"
                    vendorId={id}
                    vendorName={vendor.name}
                    initialHeader={vendor.header_html || ''}
                    initialFooter={vendor.footer_html || ''}
                  />
                ),
              },
              ...(canManage
                ? [
                    {
                      id: 'settings',
                      label: 'Settings',
                      icon: 'branding' as const,
                      content: (
                        <div key="settings" className="space-y-6">
                          <VendorSettings
                            vendorId={id}
                            vendorName={vendor.name}
                            initialAccent={vendor.primary_color}
                            initialFavicon={vendor.favicon_url}
                          />
                          <ApiKeysCard
                            vendorId={id}
                            vendorName={vendor.name}
                            initialKeys={apiKeys.map((k) => ({
                              id: k.id,
                              api_key: k.api_key,
                              status: k.status,
                              label: k.label,
                              created_at: k.created_at,
                              expires_at: k.expires_at,
                              last_used_at: k.last_used_at,
                            }))}
                          />
                        </div>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      </div>
    </main>
  )
}
