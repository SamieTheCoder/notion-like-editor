'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  ArrowLeft,
  Save,
  Eye,
  Share2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Monitor,
  Smartphone,
  Braces,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

// Dynamically import the heavy editor to avoid SSR issues
const TiptapEditor = dynamic(
  () => import('@/components/editor/TiptapEditor').then((m) => ({ default: m.TiptapEditor })),
  { ssr: false, loading: () => <EditorSkeleton /> }
)

const VariablePanel = dynamic(
  () => import('@/components/editor/VariablePanel').then((m) => ({ default: m.VariablePanel })),
  { ssr: false }
)

function EditorSkeleton() {
  return (
    <div className="bg-card rounded-lg border p-6 min-h-[400px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  )
}

interface Template {
  id: string
  title: string
  description: string | null
  status: string
  content: Record<string, unknown>
  shell_config: Record<string, unknown> | null
  variables: string[]
  slug: string
  category_id: string | null
  created_at: string
  updated_at: string
}

export default function EditTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.id as string

  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [editorContent, setEditorContent] = useState<Record<string, unknown> | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [showVariables, setShowVariables] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editorInstance, setEditorInstance] = useState<any>(null)

  useEffect(() => {
    loadTemplate()
  }, [templateId])

  async function loadTemplate() {
    try {
      const res = await fetch(`/api/templates/${templateId}`)
      if (!res.ok) {
        router.push('/dashboard/templates')
        return
      }
      const data = await res.json()
      if (data.success) {
        const t = data.data?.template
        setTemplate(t)
        setTitle(t.title)
        setDescription(t.description || '')
        setEditorContent(t.content)
      }
    } catch {
      router.push('/dashboard/templates')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = useCallback(async (status?: string) => {
    if (!editorContent) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        title: title.trim() || 'Untitled Template',
        description: description.trim() || null,
        content: editorContent,
      }
      if (status) body.status = status

      const res = await fetch(`/api/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        setTemplate(data.data?.template || data.data)
        setLastSaved(new Date())
        if (status) setTemplate((prev) => prev ? { ...prev, status } : prev)
      }
    } catch {}
    setSaving(false)
  }, [templateId, title, description, editorContent])

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!editorContent || loading) return
    const interval = setInterval(() => {
      handleSave()
    }, 30000)
    return () => clearInterval(interval)
  }, [editorContent, loading, handleSave])

  async function handleShare() {
    try {
      const res = await fetch(`/api/templates/${templateId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.success) {
        const token = data.data?.link?.token || ''
        setShareUrl(`${window.location.origin}/share/${token}`)
        setShowShareModal(true)
      }
    } catch {}
  }

  async function handlePublish() {
    await handleSave('PUBLISHED')
  }

  function handleEditorUpdate(json: Record<string, unknown>) {
    setEditorContent(json)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    )
  }

  if (!template) return null

  return (
    <div className="space-y-4 -m-4 lg:-m-6">
      {/* Top Bar */}
      <div className="sticky top-14 z-30 bg-card border-b px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Link href="/dashboard/templates">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-none bg-transparent text-base font-semibold h-8 px-1 focus-visible:ring-0 focus-visible:border-none max-w-md"
              placeholder="Template name..."
            />
            <Badge
              variant={template.status === 'PUBLISHED' ? 'default' : 'secondary'}
            >
              {template.status?.toLowerCase() || 'draft'}
            </Badge>
            {lastSaved && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                <CheckCircle2 className="size-3 text-green-600" />
                Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant={showVariables ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setShowVariables(!showVariables)}
            >
              <Braces className="size-3.5" />
              <span className="hidden sm:inline">Variables</span>
            </Button>
            <Button
              variant={showPreview ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="size-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="size-3.5" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave()}
              disabled={saving}
            >
              <Save className="size-3.5" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            {template.status !== 'PUBLISHED' && (
              <Button size="sm" onClick={handlePublish} disabled={saving}>
                <CheckCircle2 className="size-3.5" />
                Publish
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div className="px-4 lg:px-6 pb-6">
        <div className={cn('grid gap-4', showPreview ? 'grid-cols-2' : 'grid-cols-1')}>
          {/* Editor Column */}
          <div className="min-w-0">
            {editorContent && (
              <TiptapEditor
                initialContent={editorContent}
                onUpdate={handleEditorUpdate}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onEditorReady={(e: any) => setEditorInstance(e)}
              />
            )}
            {showVariables && editorInstance && (
              <VariablePanel
                editor={editorInstance}
                open={showVariables}
                onClose={() => setShowVariables(false)}
              />
            )}
          </div>

          {/* Preview Column */}
          {showPreview && (
            <div className="min-w-0">
              <div className="sticky top-32">
                <div className="bg-card rounded-lg border overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
                    <span className="text-xs font-medium text-muted-foreground">Email Preview</span>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant={previewMode === 'desktop' ? 'secondary' : 'ghost'}
                        size="icon-xs"
                        onClick={() => setPreviewMode('desktop')}
                      >
                        <Monitor className="size-3" />
                      </Button>
                      <Button
                        variant={previewMode === 'mobile' ? 'secondary' : 'ghost'}
                        size="icon-xs"
                        onClick={() => setPreviewMode('mobile')}
                      >
                        <Smartphone className="size-3" />
                      </Button>
                    </div>
                  </div>
                  <div className={cn(
                    'p-4 bg-muted/30 min-h-[500px] flex justify-center',
                    previewMode === 'mobile' && 'max-w-[375px] mx-auto'
                  )}>
                    <div className="bg-card rounded-md border w-full overflow-auto max-h-[600px]">
                      <div className="p-6 text-sm text-muted-foreground">
                        <p className="text-center text-xs">
                          Preview renders here when you type in the editor.
                          <br />
                          The full email shell wraps your content automatically.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Template</DialogTitle>
            <DialogDescription>
              Anyone with this link can view the template.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={shareUrl}
              className="flex-1 font-mono text-xs"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={() => navigator.clipboard.writeText(shareUrl)}
            >
              <Copy className="size-4" />
            </Button>
          </div>
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="size-3.5" /> Open in new tab
          </a>
        </DialogContent>
      </Dialog>
    </div>
  )
}
