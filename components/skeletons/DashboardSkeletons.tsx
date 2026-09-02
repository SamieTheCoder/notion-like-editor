'use client'

import { Skeleton, configureBoneyard } from 'boneyard-js/react'

/**
 * Boneyard snapshots the real DOM of `children` to derive bone geometry, so the
 * shapes below mirror the actual page layout. Colors are the theme's own CSS
 * variables, which means the bones follow light/dark automatically instead of
 * relying on boneyard's media-query based dark handling (this app switches
 * themes with a class).
 */
configureBoneyard({
  color: 'var(--muted)',
  darkColor: 'var(--muted)',
  animate: 'shimmer',
  shimmerColor: 'var(--accent)',
  darkShimmerColor: 'var(--accent)',
  speed: '1.6s',
})

function Line({ className = '' }: { className?: string }) {
  return <div className={`h-4 rounded bg-muted ${className}`} />
}

/** Mirrors app/dashboard/page.tsx: stat cards, chart + recent, vendor table. */
export function DashboardSkeleton() {
  return (
    <Skeleton loading name="dashboard">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="space-y-2">
            <Line className="w-40" />
            <Line className="w-64" />
          </div>
          <Line className="h-9 w-32" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="space-y-3 rounded-xl border border-border bg-card p-5"
            >
              <Line className="w-24" />
              <Line className="h-8 w-16" />
              <Line className="w-20" />
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 rounded-xl border border-border bg-card p-5 lg:col-span-2">
            <Line className="w-40" />
            <div className="flex h-48 items-end gap-3">
              {[60, 35, 80, 45, 95, 25].map((h, i) => (
                <div key={i} className="flex-1">
                  <div
                    className="w-full rounded-t-md bg-muted"
                    style={{ height: `${h}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4 rounded-xl border border-border bg-card p-5">
            <Line className="w-32" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <Line className="w-3/4" />
                  <Line className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-4 rounded-xl border border-border bg-card p-5">
          <Line className="w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted" />
              <div className="flex-1 space-y-1.5">
                <Line className="w-48" />
                <Line className="h-3 w-32" />
              </div>
              <Line className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </Skeleton>
  )
}

/** Mirrors app/dashboard/[vendorId]/page.tsx: templates, users, shell editor. */
export function VendorSkeleton() {
  return (
    <Skeleton loading name="vendor">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Line className="mb-6 w-28" />
        <div className="mb-8 space-y-2">
          <Line className="h-6 w-56" />
          <Line className="w-72" />
        </div>

        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, card) => (
            <div
              key={card}
              className="space-y-4 rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Line className="w-36" />
                  <Line className="h-3 w-56" />
                </div>
                <Line className="h-9 w-28" />
              </div>
              {Array.from({ length: 3 }).map((_, row) => (
                <div key={row} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-muted" />
                  <Line className="w-1/3" />
                  <Line className="ml-auto h-3 w-24" />
                </div>
              ))}
            </div>
          ))}

          <div className="space-y-4 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <Line className="w-48" />
              <Line className="h-9 w-24" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-40 rounded-md bg-muted" />
              <div className="h-40 rounded-md bg-muted" />
            </div>
          </div>
        </div>
      </div>
    </Skeleton>
  )
}
