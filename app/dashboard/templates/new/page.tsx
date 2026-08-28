'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  Mail,
  Megaphone,
  UserPlus,
  Bell,
  ShoppingBag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

interface Category {
  id: string
  name: string
  color: string
}

const STARTER_TEMPLATES = [
  { name: 'Blank Template', description: 'Start from scratch', icon: FileText },
  { name: 'Welcome Email', description: 'Onboard new users', icon: UserPlus },
  { name: 'Newsletter', description: 'Regular updates', icon: Mail },
  { name: 'Promotional', description: 'Offers and campaigns', icon: Megaphone },
  { name: 'Notification', description: 'Alerts and reminders', icon: Bell },
  { name: 'Transactional', description: 'Orders and receipts', icon: ShoppingBag },
]

export default function NewTemplatePage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    categoryId: '',
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetch('/api/templates/categories')
      .then((res) => res.json())
      .then((data) => { if (data.success) setCategories(data.data?.categories || []) })
      .catch(() => {})
  }, [])

  async function handleCreate(starterName?: string) {
    const title = form.title.trim() || starterName || 'Untitled Template'
    setCreating(true)
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: form.description || `${title} email template`,
          categoryId: form.categoryId || null,
          content: { type: 'doc', content: [{ type: 'paragraph' }] },
        }),
      })
      const data = await res.json()
      if (data.success) {
        router.push(`/dashboard/templates/${data.data.template.id}/edit`)
      } else {
        alert(data.message || 'Error creating template')
      }
    } catch {
      alert('Failed to create template')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/templates">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Create New Template</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Start with a blank canvas or choose a starter
          </p>
        </div>
      </div>

      {/* Custom Template Form */}
      <Card>
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
          <CardDescription>Give your template a name and start editing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Template Name *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Welcome Email Series"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What is this template for?"
              rows={3}
              maxLength={250}
            />
          </div>

          {categories.length > 0 && (
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.categoryId}
                onValueChange={(val) => setForm({ ...form, categoryId: val ?? '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            onClick={() => handleCreate()}
            disabled={creating || !form.title.trim()}
            className="w-full"
          >
            {creating ? 'Creating...' : 'Create & Open Editor'}
          </Button>
        </CardContent>
      </Card>

      {/* Starter Templates */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Or start with a template:</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {STARTER_TEMPLATES.map((starter) => {
            const Icon = starter.icon
            return (
              <Card
                key={starter.name}
                className="cursor-pointer hover:ring-2 hover:ring-ring/20 transition-all"
              >
                <CardContent
                  className="pt-4"
                  onClick={() => handleCreate(starter.name)}
                >
                  <div className="flex size-9 items-center justify-center rounded-md bg-muted mb-2">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <h4 className="text-sm font-medium text-foreground">{starter.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{starter.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
