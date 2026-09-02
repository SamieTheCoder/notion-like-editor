'use client'

import { useEffect, useState } from 'react'
import {
  Mail,
  Users,
  Palette,
  LayoutTemplate,
  LayoutDashboard,
  Building2,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type IconKey =
  | 'templates'
  | 'users'
  | 'branding'
  | 'shell'
  | 'overview'
  | 'vendors'

export interface VendorSection {
  id: string
  label: string
  icon: IconKey
  /** Rendered when this section is active. */
  content: React.ReactNode
  /** Optional count shown as a pill in the rail. */
  count?: number
  /** Optional one-line description under the section title. */
  description?: string
}

const ICONS: Record<IconKey, LucideIcon> = {
  templates: LayoutTemplate,
  users: Users,
  branding: Palette,
  shell: Mail,
  overview: LayoutDashboard,
  vendors: Building2,
}

/**
 * Left-rail navigation for a set of management sections. Server components
 * render each section's card and pass it as `content`; this shell only owns the
 * active-tab state, so the heavy rendering stays on the server.
 *
 * Operate-mode UI: the rail is quiet chrome. One icon family (lucide, already
 * the project default), token-driven colors so it follows the vendor accent and
 * light/dark, and a single active indicator rather than decorative dots.
 */
export function VendorSectionNav({
  sections,
  title,
  subtitle,
}: {
  sections: VendorSection[]
  /** Optional label at the top of the rail. */
  title?: string
  subtitle?: string
}) {
  const [active, setActive] = useState(sections[0]?.id)
  const current = sections.find((s) => s.id === active) ?? sections[0]

  // Let the tour drive the active tab so a step can reveal its section before
  // pointing at it. Fired by DashboardTour via onStepChange.
  useEffect(() => {
    const onGoto = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (id && sections.some((s) => s.id === id)) setActive(id)
    }
    window.addEventListener('tour-goto-section', onGoto as EventListener)
    return () =>
      window.removeEventListener('tour-goto-section', onGoto as EventListener)
  }, [sections])

  return (
    <div className="grid gap-8 md:grid-cols-[15rem_minmax(0,1fr)]">
      <nav
        aria-label={title ?? 'Sections'}
        data-tour="nav"
        className="md:sticky md:top-20 md:h-fit"
      >
        {title && (
          <div className="mb-2 px-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground/70">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Horizontal scroll on mobile, vertical stack on desktop */}
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1.5 md:flex-col md:overflow-visible">
          {sections.map((s) => {
            const Icon = ICONS[s.icon]
            const isActive = s.id === current?.id
            return (
              <button
                key={s.id}
                type="button"
                data-tour={`section:${s.id}`}
                onClick={() => setActive(s.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group relative flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors md:w-full',
                  isActive
                    ? 'bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {/* Active indicator bar (desktop) */}
                <span
                  aria-hidden
                  className={cn(
                    'absolute left-0 top-1/2 hidden h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-opacity md:block',
                    isActive ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <Icon
                  size={17}
                  strokeWidth={1.75}
                  className={cn('shrink-0', isActive && 'text-primary')}
                />
                <span className="whitespace-nowrap">{s.label}</span>
                {typeof s.count === 'number' && (
                  <span
                    className={cn(
                      'ml-auto rounded-full px-1.5 text-xs tabular-nums',
                      isActive
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {s.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      <div className="min-w-0" key={current?.id}>
        {current?.description && (
          <p className="mb-4 text-sm text-muted-foreground md:hidden">
            {current.description}
          </p>
        )}
        {current?.content}
      </div>
    </div>
  )
}
