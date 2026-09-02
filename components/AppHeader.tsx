import Link from 'next/link'
import { Layers } from 'lucide-react'
import { getSession } from '@/lib/session'
import { sessionVendorId } from '@/lib/authz'
import { getVendorById, initAuthDB } from '@/lib/auth-db'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LogoutButton } from '@/components/LogoutButton'

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super admin',
  ADMIN: 'Vendor admin',
  MEMBER: 'Member',
}

/**
 * Shared app chrome. Rendered once in the root layout so every page gets the
 * same header. Single row, 64px tall, sticky.
 *
 * The brand slot shows the signed-in user's vendor: its favicon (if set) and
 * name, so a Connect2excel user sees Connect2excel in the header rather than
 * the generic product name. The header also adopts that vendor's accent.
 */
export async function AppHeader() {
  const session = await getSession()
  const vendorId = sessionVendorId(session)

  // Load the user's vendor for branding. Cheap single-row lookup; the pool is
  // shared and initAuthDB is idempotent.
  let vendor = null
  if (session && vendorId) {
    try {
      await initAuthDB()
      vendor = await getVendorById(vendorId)
    } catch {
      vendor = null
    }
  }

  const homeHref = session
    ? session.role === 'SUPER_ADMIN'
      ? '/dashboard'
      : vendorId
        ? `/dashboard/${vendorId}`
        : '/dashboard'
    : '/'

  const brandName = vendor?.name ?? 'Template Studio'

  return (
    <header
      className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-sm"
      style={
        vendor?.primary_color
          ? ({
              '--primary': vendor.primary_color,
              '--ring': vendor.primary_color,
            } as React.CSSProperties)
          : undefined
      }
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href={homeHref}
          className="flex min-w-0 shrink items-center gap-2 text-foreground"
        >
          {vendor?.favicon_url ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card">
              {/* Vendor logo. eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={vendor.favicon_url}
                alt={brandName}
                className="h-8 w-8 object-contain"
              />
            </span>
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Layers size={22} strokeWidth={2} />
            </span>
          )}
          <span className="truncate text-sm font-semibold tracking-tight">
            {brandName}
          </span>
        </Link>

        <div className="flex min-w-0 items-center gap-3">
          {session ? (
            <>
              <div className="hidden min-w-0 items-center gap-2 sm:flex">
                <span className="truncate text-sm text-muted-foreground">
                  {session.email}
                </span>
                <Badge variant="secondary" className="shrink-0">
                  {ROLE_LABEL[session.role] ?? session.role}
                </Badge>
              </div>
              <span data-tour="theme">
                <ThemeToggle />
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              <ThemeToggle />
              <Link
                href="/"
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 active:scale-[0.98]"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
