'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  FileText,
  MoreVertical,
  Copy,
  Trash2,
  Edit3,
  LayoutGrid,
  List,
  Archive,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'

interface Template {
  id: string
  title: string
  description: string | null
  status: string
  category_id: string | null
  variables: string[]
  created_at: string
  updated_at: string
}

interface Category {
  id: string
  name: string
  color: string
}

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [totalCount, setTotalCount] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null)

  const loadTemplates = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (categoryFilter) params.set('category', categoryFilter)
      params.set('limit', '50')

      const res = await fetch(`/api/templates?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setTemplates(data.data.templates || [])
          setTotalCount(data.data.total || 0)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, categoryFilter])

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/templates/categories')
      if (res.ok) {
        const data = await res.json()
        if (data.success) setCategories(data.data?.categories || [])
      }
    } catch {}
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    const timeout = setTimeout(loadTemplates, 300)
    return () => clearTimeout(timeout)
  }, [loadTemplates])

  async function handleDuplicate(id: string) {
    try {
      const res = await fetch(`/api/templates/${id}/duplicate`, { method: 'POST' })
      if (res.ok) {
        loadTemplates()
      }
    } catch {}
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/templates/${id}`, { method: 'DELETE' })
      loadTemplates()
    } catch {}
    setDeleteTarget(null)
  }

  async function handleArchive(id: string) {
    try {
      await fetch(`/api/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ARCHIVED' }),
      })
      loadTemplates()
    } catch {}
  }

  function getStatusBadgeVariant(status: string) {
    switch (status) {
      case 'PUBLISHED': return 'default' as const
      case 'ARCHIVED': return 'outline' as const
      default: return 'secondary' as const
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Email Templates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalCount} template{totalCount !== 1 ? 's' : ''} in your workspace
          </p>
        </div>
        <Link href="/dashboard/templates/new">
          <Button>
            <Plus className="size-4" />
            New Template
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="pl-8"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Status Tabs + Content */}
      <Tabs defaultValue="ALL" value={statusFilter} onValueChange={(v) => setStatusFilter(v as string)}>
        <TabsList>
          <TabsTrigger value="ALL">All</TabsTrigger>
          <TabsTrigger value="DRAFT">Draft</TabsTrigger>
          <TabsTrigger value="PUBLISHED">Published</TabsTrigger>
          <TabsTrigger value="ARCHIVED">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-4">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-4 space-y-3">
                    <Skeleton className="h-24 w-full rounded-md" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="size-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-foreground mb-1">No templates found</h3>
                <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
                  {search ? 'Try a different search term' : 'Create your first email template to start building'}
                </p>
                {!search && (
                  <Link href="/dashboard/templates/new">
                    <Button size="sm">
                      <Plus className="size-3.5" />
                      Create Template
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="group hover:ring-2 hover:ring-ring/20 transition-all">
                  <CardContent className="pt-4">
                    {/* Thumbnail placeholder */}
                    <div className="h-28 bg-muted rounded-md flex items-center justify-center mb-3 relative">
                      <FileText className="size-8 text-muted-foreground/30" />
                      <div className="absolute top-2 right-2">
                        <Badge variant={getStatusBadgeVariant(template.status)}>
                          {template.status.toLowerCase()}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Link href={`/dashboard/templates/${template.id}/edit`}>
                          <h3 className="text-sm font-medium text-foreground truncate hover:underline">
                            {template.title}
                          </h3>
                        </Link>
                        {template.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {template.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {formatRelativeDate(template.updated_at)}
                        </p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon-xs" />}
                        >
                          <MoreVertical className="size-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/templates/${template.id}/edit`)}>
                            <Edit3 className="size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(template.id)}>
                            <Copy className="size-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchive(template.id)}>
                            <Archive className="size-4" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(template)}>
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* List View */
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Variables</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <Link href={`/dashboard/templates/${template.id}/edit`} className="flex items-center gap-3 group">
                          <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                            <FileText className="size-3.5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-medium text-foreground group-hover:underline truncate">
                              {template.title}
                            </h3>
                            {template.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {template.description}
                              </p>
                            )}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(template.status)}>
                          {template.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {template.variables?.length || 0} vars
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeDate(template.updated_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button variant="ghost" size="icon-xs" />}
                          >
                            <MoreVertical className="size-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/templates/${template.id}/edit`)}>
                              <Edit3 className="size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(template.id)}>
                              <Copy className="size-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleArchive(template.id)}>
                              <Archive className="size-4" />
                              Archive
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(template)}>
                              <Trash2 className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.title}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget.id)}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
