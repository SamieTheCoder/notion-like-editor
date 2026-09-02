import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { sessionVendorId } from '@/lib/authz'
import { initAuthDB, getVendorById } from '@/lib/auth-db'
import { initTemplatesTable } from '@/lib/email-templates'
import { getDashboardAnalytics } from '@/lib/analytics'
import { CreateVendorButton } from '@/components/CreateVendorButton'
import { DashboardTour } from '@/components/DashboardTour'
import { VendorSectionNav } from '@/components/VendorSectionNav'
import { VendorSettings } from '@/components/VendorSettings'
import {
  StatCards,
  MonthlyChart,
  RecentTemplates,
  VendorTable,
} from '@/components/dashboard/Analytics'

export const dynamic = 'force-dynamic'

/** Platform tab title and favicon for the super admin. */
export async function generateMetadata() {
  await initAuthDB()
  const platform = await getVendorById(1)
  return {
    title: 'Platform · Template Studio',
    icons: platform?.favicon_url ? { icon: platform.favicon_url } : undefined,
  }
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/')
  if (session.mustChangePassword) redirect('/change-password')

  // Vendor users (non super admins) go straight to their own vendor.
  if (session.role !== 'SUPER_ADMIN') {
    const vid = sessionVendorId(session)
    if (vid) redirect(`/dashboard/${vid}`)
  }

  await initAuthDB()
  await initTemplatesTable()
  const analytics = await getDashboardAnalytics()

  // The super admin belongs to the Platform vendor; its branding is theirs.
  const platform = await getVendorById(sessionVendorId(session) ?? 1)

  return (
    <main
      className="min-h-[100dvh] bg-background"
      style={
        platform?.primary_color
          ? ({
              '--primary': platform.primary_color,
              '--ring': platform.primary_color,
            } as React.CSSProperties)
          : undefined
      }
    >
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Platform
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Signed in as {session.email} · Super admin
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DashboardTour surface="platform" />
            <span data-tour="new-vendor">
              <CreateVendorButton />
            </span>
          </div>
        </div>

        <VendorSectionNav
          title="Platform"
          subtitle={`${analytics.totals.vendors} vendors`}
          sections={[
            {
              id: 'overview',
              label: 'Overview',
              icon: 'overview',
              content: (
                <div key="overview" className="space-y-6">
                  <div data-tour="stats">
                    <StatCards totals={analytics.totals} />
                  </div>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <MonthlyChart data={analytics.monthly} />
                    </div>
                    <div className="lg:col-span-1">
                      <RecentTemplates items={analytics.recentTemplates} />
                    </div>
                  </div>
                </div>
              ),
            },
            {
              id: 'vendors',
              label: 'Vendors',
              icon: 'vendors',
              count: analytics.totals.vendors,
              content: (
                <div key="vendors" data-tour="vendors">
                  <VendorTable vendors={analytics.vendors} canDelete />
                </div>
              ),
            },
            ...(platform
              ? [
                  {
                    id: 'settings',
                    label: 'Settings',
                    icon: 'branding' as const,
                    content: (
                      <VendorSettings
                        key="settings"
                        vendorId={Number(platform.id)}
                        vendorName={platform.name}
                        initialAccent={platform.primary_color}
                        initialFavicon={platform.favicon_url}
                      />
                    ),
                  },
                ]
              : []),
          ]}
        />
      </div>
    </main>
  )
}
