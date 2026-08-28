'use client'

import React, { useEffect, useState } from 'react'
import {
  FolderOpen,
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'

interface Category {
  id: string
  name: string
  color: string
  sort_order: number
  created_at: string
}

const COLOR_PRESETS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316',
]

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', color: '#3b82f6' })
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  useEffect(() => { loadCategories() }, [])

  async function loadCategories() {
    try {
      const res = await fetch('/api/templates/categories')
      if (res.ok) {
        const data = await res.json()
        if (data.success) setCategories(data.data?.categories || [])
      }
    } catch {}
    setLoading(false)
  }

  async function handleCreate() {
    if (!form.name.trim()) return
    try {
      const res = await fetch('/api/templates/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setForm({ name: '', color: '#3b82f6' })
        setShowForm(false)
        loadCategories()
      }
    } catch {}
  }

  async function handleUpdate(id: string) {
    if (!form.name.trim()) return
    try {
      const res = await fetch('/api/templates/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...form }),
      })
      if (res.ok) {
        setEditingId(null)
        setForm({ name: '', color: '#3b82f6' })
        loadCategories()
      }
    } catch {}
  }

  async function handleDelete(id: string) {
    try {
      await fetch('/api/templates/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      loadCategories()
    } catch {}
    setDeleteTarget(null)
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setForm({ name: cat.name, color: cat.color })
    setShowForm(false)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm({ name: '', color: '#3b82f6' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Organize your templates into groups</p>
        </div>
        <Button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', color: '#3b82f6' }) }}
        >
          <Plus className="size-4" />
          New Category
        </Button>
      </div>

      {/* Create/Edit Form */}
      {(showForm || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Category' : 'New Category'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="flex-1 space-y-2 w-full">
                <Label htmlFor="cat-name">Name</Label>
                <Input
                  id="cat-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Marketing, Transactional"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-1.5">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        form.color === c ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="icon"
                  onClick={editingId ? () => handleUpdate(editingId) : handleCreate}
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={cancelForm}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories List */}
      {loading ? (
        <Card>
          <CardContent className="py-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-32 flex-1" />
                <Skeleton className="h-7 w-14" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="size-10 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-foreground mb-1">No categories yet</h3>
            <p className="text-xs text-muted-foreground">Create categories to organize your templates</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-2">
            {categories.map((cat, index) => (
              <React.Fragment key={cat.id}>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-sm font-medium text-foreground">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => startEdit(cat)}
                    >
                      <Edit3 className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setDeleteTarget(cat)}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                {index < categories.length - 1 && <Separator />}
              </React.Fragment>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;? Templates using it will be uncategorized.
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
