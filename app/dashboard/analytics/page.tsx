'use client'

import React, { useEffect, useState } from 'react'
import {
  Eye,
  Share2,
  Download,
  Send,
  FileText,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

interface Analytics {
  totalTemplates: number
  publishedTemplates: number
  totalViews: number
  totalShares: number
  totalExports: number
  totalSends: number
  recentEvents: Array<{
    event: string
    template_title: string
    created_at: string
  }>
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then((res) => res.json())
      .then((d) => {
        if (d.success) {
          const raw = d.data
          setData({
            totalTemplates: raw.total_templates ?? 0,
            publishedTemplates: 0,
            totalViews: raw.events?.viewed ?? 0,
            totalShares: raw.events?.shared ?? 0,
            totalExports: raw.events?.exported ?? 0,
            totalSends: raw.events?.sent ?? 0,
            recentEvents: [],
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const stats = [
    { label: 'Total Templates', value: data?.totalTemplates ?? 0, icon: FileText },
    { label: 'Published', value: data?.publishedTemplates ?? 0, icon: TrendingUp },
    { label: 'Views', value: data?.totalViews ?? 0, icon: Eye },
    { label: 'Shares', value: data?.totalShares ?? 0, icon: Share2 },
    { label: 'Exports', value: data?.totalExports ?? 0, icon: Download },
    { label: 'Sends', value: data?.totalSends ?? 0, icon: Send },
  ]

  const eventIcons: Record<string, typeof Eye> = {
    viewed: Eye,
    shared: Share2,
    exported: Download,
    sent: Send,
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <Skeleton className="h-4 w-4 mb-3" />
                <Skeleton className="h-6 w-12 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="py-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track your template performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="pt-4">
                <Icon className="size-4 text-muted-foreground mb-2" />
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest events across your templates</CardDescription>
        </CardHeader>
        <CardContent>
          {!data?.recentEvents?.length ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-0">
              {data.recentEvents.map((event, i) => {
                const Icon = eventIcons[event.event] || Eye
                return (
                  <React.Fragment key={i}>
                    <div className="flex items-center gap-3 py-2.5">
                      <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                        <Icon className="size-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          <span className="font-medium capitalize">{event.event}</span>
                          {' — '}
                          <span className="text-muted-foreground">{event.template_title}</span>
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(event.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {i < data.recentEvents.length - 1 && <Separator />}
                  </React.Fragment>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
