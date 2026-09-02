'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import {
  Tour,
  TourContent,
  TourHeader,
  TourProgressText,
  TourTitle,
  TourDescription,
  TourFooter,
  TourActions,
  type TourStepType,
  useTourContext,
} from '@/components/ui/tour'

/**
 * Per-surface tour. Bump the key's suffix when the steps change so returning
 * users see the refreshed walkthrough once. Keyed per surface so the vendor
 * tour and the platform tour are remembered independently.
 */
function seenKey(surface: string) {
  return `tour-seen:${surface}:v2`
}

const targetFor = (name: string) => () =>
  document.querySelector<HTMLElement>(`[data-tour="${name}"]`)

/** A step plus the anchor it needs; steps whose anchor is absent are dropped. */
interface TourDef {
  anchor?: string
  /** Section id to reveal before this step (fires tour-goto-section). */
  goto?: string
  step: Omit<TourStepType, 'target'>
}

/**
 * The full catalogue of steps. Each surface renders the subset whose anchors
 * are actually on the page, so one component drives both dashboards.
 *
 * Section steps point at the sidebar RAIL buttons (data-tour="section:<id>"),
 * which are always in the DOM regardless of the active tab. Each also carries
 * `goto` so the tour switches to that tab as the step opens, so the walkthrough
 * covers every section instead of ending when a tab's content is hidden.
 */
const CATALOGUE: TourDef[] = [
  {
    step: {
      id: 'welcome',
      type: 'dialog',
      title: 'Welcome to Template Studio',
      description:
        'A quick tour of where everything lives. About 30 seconds, and you can skip any time.',
      actions: [
        { label: 'Skip', action: 'dismiss' },
        { label: 'Start', action: 'next' },
      ],
    },
  },
  {
    anchor: 'nav',
    step: {
      id: 'nav',
      type: 'tooltip',
      title: 'Move between sections',
      description:
        'This rail switches sections without leaving the page. The tour walks each one now.',
    },
  },
  // Platform (super-admin) sections
  {
    anchor: 'section:overview',
    goto: 'overview',
    step: {
      id: 'overview',
      type: 'tooltip',
      title: 'Overview',
      description:
        'Vendors, templates, and users across the platform, refreshed on each visit.',
    },
  },
  {
    anchor: 'section:vendors',
    goto: 'vendors',
    step: {
      id: 'vendors',
      type: 'tooltip',
      title: 'Vendors',
      description:
        'Every vendor. Open one to manage it, or delete a vendor and all its data.',
    },
  },
  // Vendor sections
  {
    anchor: 'section:templates',
    goto: 'templates',
    step: {
      id: 'templates',
      type: 'tooltip',
      title: 'Email templates',
      description:
        'Each template body is wrapped in the shared header and footer for this vendor.',
    },
  },
  {
    anchor: 'section:users',
    goto: 'users',
    step: {
      id: 'users',
      type: 'tooltip',
      title: 'User management',
      description:
        'Invite admins and members. New users set their own password on first sign-in.',
    },
  },
  {
    anchor: 'section:shell',
    goto: 'shell',
    step: {
      id: 'shell',
      type: 'tooltip',
      title: 'Header and footer',
      description:
        'The shared chrome wrapped around every template body for this vendor.',
    },
  },
  {
    anchor: 'section:settings',
    goto: 'settings',
    step: {
      id: 'settings',
      type: 'tooltip',
      title: 'Branding',
      description:
        'Accent color and favicon. They apply across this vendor’s pages and header.',
    },
  },
  {
    anchor: 'new-vendor',
    step: {
      id: 'new-vendor',
      type: 'tooltip',
      title: 'Add a vendor',
      description:
        'Create a vendor, then open it to set its branding, users, and templates.',
    },
  },
  {
    anchor: 'theme',
    step: {
      id: 'theme',
      type: 'tooltip',
      title: 'Light or dark',
      description:
        'Switch themes any time. It follows your system setting by default.',
    },
  },
]

/** Build the step list for whatever anchors exist on this surface. */
function useResolvedSteps(): { steps: TourStepType[]; ready: boolean } {
  const [present, setPresent] = useState<Set<string> | null>(null)

  useEffect(() => {
    let cancelled = false
    const scan = () => {
      if (cancelled) return
      const found = new Set<string>()
      for (const def of CATALOGUE) {
        if (
          !def.anchor ||
          document.querySelector(`[data-tour="${def.anchor}"]`)
        ) {
          found.add(def.step.id as string)
        }
      }
      setPresent(found)
    }
    // Scan on mount and again after paint, since some anchors (client-rendered
    // rails, tabbed sections) attach a tick later than this effect runs.
    scan()
    const t1 = window.setTimeout(scan, 200)
    const t2 = window.setTimeout(scan, 800)
    return () => {
      cancelled = true
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [])

  const steps = useMemo(() => {
    const set = present ?? new Set<string>()
    const usable = CATALOGUE.filter((d) => set.has(d.step.id as string))
    return usable.map((d, i) => {
      const isFirst = i === 0
      const isLast = i === usable.length - 1
      const actions =
        d.step.type === 'dialog'
          ? [
              { label: 'Skip', action: 'dismiss' as const },
              { label: 'Start', action: 'next' as const },
            ]
          : [
              ...(isFirst ? [] : [{ label: 'Back', action: 'prev' as const }]),
              isLast
                ? { label: 'Done', action: 'dismiss' as const }
                : { label: 'Next', action: 'next' as const },
            ]
      return {
        ...d.step,
        actions,
        ...(d.anchor ? { target: targetFor(d.anchor) } : {}),
      } as TourStepType
    })
  }, [present])

  return { steps, ready: present !== null && steps.length > 0 }
}

function AutoStart({ enabled, surface }: { enabled: boolean; surface: string }) {
  const { handleStart } = useTourContext()
  const fired = useRef(false)

  useEffect(() => {
    if (!enabled || fired.current) return
    if (typeof window === 'undefined') return
    if (window.localStorage.getItem(seenKey(surface))) return

    fired.current = true
    const t = window.setTimeout(() => handleStart(), 700)
    return () => window.clearTimeout(t)
  }, [enabled, surface, handleStart])

  return null
}

function ReplayButton({ ready }: { ready: boolean }) {
  const { handleStart } = useTourContext()
  return (
    <button
      type="button"
      onClick={handleStart}
      disabled={!ready}
      className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-[0.97] disabled:opacity-50"
    >
      <HelpCircle size={14} strokeWidth={1.75} />
      Tour
    </button>
  )
}

/**
 * @param surface  Unique id for this page's tour, used for the seen-flag and to
 *                 keep separate walkthroughs independent (e.g. "platform" vs
 *                 "vendor").
 */
export function DashboardTour({
  surface = 'platform',
  autoStart = true,
}: {
  surface?: string
  autoStart?: boolean
}) {
  const { steps, ready } = useResolvedSteps()

  return (
    <Tour
      // Re-instantiate Ark's tour once the real steps resolve. useTour() reads
      // `steps` at construction, so a key change is what makes it pick them up
      // after the post-mount anchor scan.
      key={`${surface}:${steps.length}`}
      keyboardNavigation
      steps={steps}
      onStepChange={({ stepId }) => {
        // Reveal the section this step points at, so its rail button (and the
        // section content) is on screen as the step opens.
        const def = CATALOGUE.find((d) => d.step.id === stepId)
        if (def?.goto) {
          window.dispatchEvent(
            new CustomEvent('tour-goto-section', { detail: def.goto })
          )
        }
      }}
      onStatusChange={({ status }) => {
        if (status === 'dismissed' || status === 'completed') {
          try {
            window.localStorage.setItem(seenKey(surface), '1')
          } catch {
            // Storage disabled: the tour reappears next visit. Acceptable.
          }
        }
      }}
    >
      <AutoStart enabled={autoStart && ready} surface={surface} />
      <ReplayButton ready={ready} />
      <TourContent>
        <TourHeader>
          <TourProgressText />
          <TourTitle />
          <TourDescription />
        </TourHeader>
        <TourFooter>
          <TourActions />
        </TourFooter>
      </TourContent>
    </Tour>
  )
}
