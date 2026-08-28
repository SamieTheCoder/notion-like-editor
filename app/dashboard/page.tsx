'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/saas/DashboardLayout'
import {
  FileText,
  Eye,
  Share2,
  TrendingUp,
  Plus,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

interface Stats {
  totalTemplates: number
  publishedTemplates: number
  totalViews: number
  totalShares: number
  totalExports: number
}

interface RecentTemplate {
  id: string
  title: string
  status: string
  updated_at: string
}

export default function DashboardPage() {
  const { org } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentTemplates, setRecentTemplates] = useState<RecentTemplate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const [analyticsRes, templatesRes] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/templates?limit=5'),
      ])
      if (analyticsRes.ok) {
        const data = await analyticsRes.json()
        if (data.success) {
          const d = data.data
          setStats({
            totalTemplates: d.total_templates ?? 0,
            publishedTemplates: 0,
            totalViews: d.events?.viewed ?? 0,
            totalShares: d.events?.shared ?? 0,
            totalExports: d.events?.exported ?? 0,
          })
        }
      }
      if (templatesRes.ok) {
        const data = await templatesRes.json()
        if (data.success) setRecentTemplates(data.data.templates || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Total Templates', value: stats?.totalTemplates ?? 0, icon: FileText },
    { label: 'Published', value: stats?.publishedTemplates ?? 0, icon: TrendingUp },
    { label: 'Total Views', value: stats?.totalViews ?? 0, icon: Eye },
    { label: 'Total Shares', value: stats?.totalShares ?? 0, icon: Share2 },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <Skeleton className="h-4 w-4 mb-3" />
                <Skeleton className="h-7 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="py-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="h-9 w-9 rounded-md" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Welcome back{org ? `, ${org.name}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your email templates and track performance
          </p>
        </div>
        <Link href="/dashboard/templates/new">
          <Button>
            <Plus className="size-4" />
            New Template
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Templates */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Templates</CardTitle>
            <CardDescription>Your latest email templates</CardDescription>
          </div>
          <Link href="/dashboard/templates">
            <Button variant="ghost" size="sm">
              View all <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentTemplates.length === 0 ? (
            <div className="py-8 text-center">
              <FileText className="size-10 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-foreground mb-1">No templates yet</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Create your first email template to get started
              </p>
              <Link href="/dashboard/templates/new">
                <Button size="sm">
                  <Plus className="size-3.5" />
                  Create Template
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-0">
              {recentTemplates.map((template, index) => (
                <React.Fragment key={template.id}>
                  <Link
                    href={`/dashboard/templates/${template.id}/edit`}
                    className="flex items-center gap-3 py-3 hover:bg-muted/50 -mx-4 px-4 rounded-md transition-colors"
                  >
                    <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                      <FileText className="size-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-foreground truncate">
                        {template.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Updated {formatRelativeDate(template.updated_at)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        template.status === 'PUBLISHED'
                          ? 'default'
                          : template.status === 'ARCHIVED'
                          ? 'outline'
                          : 'secondary'
                      }
                    >
                      {template.status.toLowerCase()}
                    </Badge>
                  </Link>
                  {index < recentTemplates.length - 1 && <Separator />}
                </React.Fragment>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
