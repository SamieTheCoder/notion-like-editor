import Link from 'next/link'
import {
  Building2,
  FileText,
  Users,
  CheckCircle2,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DeleteButton } from '@/components/DeleteButton'
import { cn } from '@/lib/utils'
import type {
  DashboardAnalytics,
  MonthlyPoint,
  RecentTemplate,
  VendorBreakdown,
} from '@/lib/analytics'

/* --------------------------------------------------------------- stat card */

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string
  value: number
  icon: LucideIcon
  hint?: string
}) {
  return (
    <Card className="gap-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon size={18} strokeWidth={1.75} />
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight text-foreground">
          {value.toLocaleString()}
        </div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}

export function StatCards({ totals }: { totals: DashboardAnalytics['totals'] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Vendors"
        value={totals.vendors}
        icon={Building2}
        hint={`${totals.activeVendors} active`}
      />
      <StatCard
        label="Templates"
        value={totals.templates}
        icon={FileText}
        hint="Across all vendors"
      />
      <StatCard
        label="Users"
        value={totals.users}
        icon={Users}
        hint="All roles"
      />
      <StatCard
        label="Active vendors"
        value={totals.activeVendors}
        icon={CheckCircle2}
        hint={`${totals.vendors - totals.activeVendors} inactive`}
      />
    </div>
  )
}

/* ---------------------------------------------------------------- bar chart */

export function MonthlyChart({ data }: { data: MonthlyPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Templates created</CardTitle>
        <p className="text-sm text-muted-foreground">
          Last 6 months · {total} total
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex h-48 items-end gap-3">
          {data.map((d) => {
            const pct = Math.round((d.count / max) * 100)
            return (
              <div
                key={d.month}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-primary transition-all"
                    style={{ height: `${Math.max(pct, 4)}%` }}
                    title={`${d.count} in ${d.month}`}
                  />
                </div>
                <span className="text-xs font-medium text-foreground">
                  {d.count}
                </span>
                <span className="text-xs text-muted-foreground">{d.month}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/* ---------------------------------------------------------- recent activity */

function formatDate(v: string) {
  return new Date(v).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function RecentTemplates({ items }: { items: RecentTemplate[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Recent templates</CardTitle>
        <p className="text-sm text-muted-foreground">Latest updates</p>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No templates yet.
          </p>
        ) : (
          items.map((t) => (
            <Link
              key={t.id}
              href={
                t.vendor_id
                  ? `/editor?vendorId=${Number(t.vendor_id)}&templateId=${t.id}`
                  : '#'
              }
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <FileText size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {t.trigger || t.name || `Template #${t.id}`}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {t.vendor_name || 'No vendor'}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium ${
                  (t.is_active ?? 'Y').toUpperCase() === 'Y'
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'bg-muted text-muted-foreground'
                }`}
                title={(t.is_active ?? 'Y').toUpperCase() === 'Y' ? 'Active' : 'Inactive'}
              >
                {(t.is_active ?? 'Y').toUpperCase()}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDate(t.updated_at)}
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}

/* ----------------------------------------------------------- vendor table */

export function VendorTable({
  vendors,
  canDelete = false,
}: {
  vendors: VendorBreakdown[]
  canDelete?: boolean
}) {
  const maxTemplates = Math.max(1, ...vendors.map((v) => v.templates))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Vendors</CardTitle>
        <p className="text-sm text-muted-foreground">
          {vendors.length} total · templates and users per vendor
        </p>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-6 py-2 font-medium">Vendor</th>
                <th className="px-6 py-2 font-medium">Status</th>
                <th className="px-6 py-2 font-medium">Templates</th>
                <th className="px-6 py-2 font-medium">Users</th>
                <th className="px-6 py-2" />
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-border/60 last:border-0 hover:bg-accent/50"
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {v.favicon_url ? (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
                          {/* Vendor logo from its branding settings. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={v.favicon_url}
                            alt=""
                            className="h-6 w-6 object-contain"
                          />
                        </span>
                      ) : (
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                          style={{
                            backgroundColor: v.primary_color || 'var(--primary)',
                          }}
                        >
                          <Building2 size={16} strokeWidth={1.75} />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {v.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {v.vendor_name} · #{Number(v.id)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <Badge
                      variant={
                        v.status === 'ACTIVE' ? 'secondary' : 'outline'
                      }
                    >
                      {v.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 font-medium text-foreground">
                        {v.templates}
                      </span>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn('h-full rounded-full bg-primary')}
                          style={{
                            width: `${Math.round(
                              (v.templates / maxTemplates) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-foreground">{v.users}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/${Number(v.id)}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        Manage <ArrowUpRight size={14} />
                      </Link>
                      {canDelete && (
                        <DeleteButton
                          url={`/api/dashboard/${Number(v.id)}`}
                          label={v.name}
                          srLabel={`Delete vendor ${v.name}`}
                          confirmText={v.vendor_name}
                          warning={`Deletes ${v.name} along with its ${v.templates} template${
                            v.templates === 1 ? '' : 's'
                          } and ${v.users} user${
                            v.users === 1 ? '' : 's'
                          }. This cannot be undone.`}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
