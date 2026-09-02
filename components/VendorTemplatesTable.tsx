'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Mail, FlaskConical } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TemplateRow {
  id: number
  trigger: string | null
  name: string
  is_active: string
  updated_at: string
}

export function VendorTemplatesTable({
  vendorId,
  templates,
  canDelete = false,
}: {
  vendorId: number
  templates: TemplateRow[]
  /** Members can create and edit templates but not delete them. */
  canDelete?: boolean
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<number | null>(null)

  async function remove(id: number) {
    if (!confirm('Delete this template? This cannot be undone.')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/dashboard/template/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Delete failed.')
      } else {
        toast.success('Template deleted.')
        router.refresh()
      }
    } catch {
      toast.error('Network error.')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">Email templates</CardTitle>
          <p className="text-sm text-muted-foreground">
            Each body is wrapped in the shared header and footer.
          </p>
        </div>
        <button
          onClick={() => router.push(`/editor?vendorId=${vendorId}`)}
          className="flex shrink-0 items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 active:scale-[0.98]"
        >
          <Plus size={15} strokeWidth={2} /> New template
        </button>
      </CardHeader>

      <CardContent className={templates.length === 0 ? undefined : 'px-0'}>
        {templates.length === 0 ? (
          <div className="rounded-md border border-dashed border-border px-6 py-12 text-center">
            <p className="text-sm font-medium text-foreground">No templates yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Create one to author its body in the editor.
            </p>
            <button
              onClick={() => router.push(`/editor?vendorId=${vendorId}`)}
              className="mt-4 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              New template
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-2 font-medium">Name</th>
                  <th className="px-6 py-2 font-medium">Active</th>
                  <th className="px-6 py-2 font-medium">Updated</th>
                  <th className="px-6 py-2" />
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-border/60 last:border-0 hover:bg-accent/50"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Mail size={15} className="text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {t.trigger || t.name || `Template #${t.id}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      {(t.is_active ?? 'Y').toUpperCase() === 'Y' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          Y
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                          N
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {new Date(t.updated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() =>
                            router.push(
                              `/dashboard/${vendorId}/template/${t.id}/test`
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          title="Test template"
                          aria-label={`Test ${t.trigger || t.name}`}
                        >
                          <FlaskConical size={15} strokeWidth={1.75} />
                        </button>
                        <button
                          onClick={() =>
                            router.push(`/editor?vendorId=${vendorId}&templateId=${t.id}`)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          title="Edit"
                          aria-label={`Edit ${t.trigger || t.name}`}
                        >
                          <Pencil size={15} strokeWidth={1.75} />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => remove(t.id)}
                            disabled={deleting === t.id}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                            title="Delete"
                            aria-label={`Delete ${t.trigger || t.name}`}
                          >
                            <Trash2 size={15} strokeWidth={1.75} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
