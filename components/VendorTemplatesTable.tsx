'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Mail } from 'lucide-react'

interface TemplateRow {
  id: number
  trigger: string | null
  name: string
  updated_at: string
}

export function VendorTemplatesTable({
  vendorId,
  templates,
}: {
  vendorId: number
  templates: TemplateRow[]
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
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Email templates</h2>
        <button
          onClick={() => router.push(`/editor?vendorId=${vendorId}`)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={15} /> New template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-500">
          No templates yet. Click “New template” to author one in the editor.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="px-5 py-2 font-medium">Trigger / name</th>
              <th className="px-5 py-2 font-medium">Updated</th>
              <th className="px-5 py-2" />
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Mail size={15} className="text-gray-400" />
                    <span className="font-medium text-gray-900">
                      {t.trigger || t.name || `Template #${t.id}`}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-400">
                  {new Date(t.updated_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() =>
                        router.push(`/editor?vendorId=${vendorId}&templateId=${t.id}`)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => remove(t.id)}
                      disabled={deleting === t.id}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
