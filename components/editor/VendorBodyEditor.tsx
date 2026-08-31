'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, Eye, Braces, Copy, Check } from 'lucide-react'
import type { Editor } from '@tiptap/core'
import { TiptapEditor } from './TiptapEditor'
import { VariablePanel } from './VariablePanel'

interface Props {
  vendorId: number
  vendorName: string
  templateId: number | null
  headHtml: string
  footerHtml: string
  initialTrigger: string
  initialBodyJson: Record<string, unknown> | null
  initialFinalBody: string
}

export function VendorBodyEditor({
  vendorId,
  vendorName,
  templateId,
  headHtml,
  footerHtml,
  initialTrigger,
  initialBodyJson,
  initialFinalBody,
}: Props) {
  const router = useRouter()
  const [trigger, setTrigger] = useState(initialTrigger)
  const [saving, setSaving] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [finalBody, setFinalBody] = useState(initialFinalBody)
  const [copied, setCopied] = useState(false)
  const [variablePanelOpen, setVariablePanelOpen] = useState(false)
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null)
  const editorRef = useRef<Editor | null>(null)

  // The /variable slash command dispatches this event to open the panel.
  useEffect(() => {
    const handler = () => setVariablePanelOpen(true)
    window.addEventListener('open-variable-picker', handler)
    return () => window.removeEventListener('open-variable-picker', handler)
  }, [])

  const getBody = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return { html: '', json: {} as Record<string, unknown> }
    return {
      html: editor.getHTML(),
      json: editor.getJSON() as Record<string, unknown>,
    }
  }, [])

  async function save() {
    if (!trigger.trim()) {
      toast.error('Enter a template name (trigger) first.')
      return
    }
    setSaving(true)
    try {
      const { html, json } = getBody()
      const res = await fetch('/api/dashboard/body', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          templateId,
          trigger: trigger.trim(),
          bodyHtml: html,
          bodyJson: json,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Save failed.')
      } else {
        if (typeof data.finalBody === 'string') setFinalBody(data.finalBody)
        toast.success(`Saved template "${data.trigger}".`)
      }
    } catch {
      toast.error('Network error.')
    } finally {
      setSaving(false)
    }
  }

  async function copyFinalBody() {
    if (!finalBody) {
      toast.error('Save the template first to generate the final body.')
      return
    }
    try {
      await navigator.clipboard.writeText(finalBody)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = finalBody
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    toast.success('Final body copied.')
  }

  function showPreview() {
    const { html } = getBody()
    setPreviewHtml(`${headHtml}\n${html}\n${footerHtml}`)
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => router.push(`/dashboard/${vendorId}`)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-700"
          title="Back to vendor"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex-1">
          <input
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            placeholder="Template name / trigger (e.g. LEAD_REGISTERED)"
            className="w-full border-none bg-transparent text-lg font-semibold text-gray-900 outline-none placeholder:text-gray-300"
          />
          <p className="text-xs text-gray-400">
            {vendorName} · saved as the trigger for this vendor
          </p>
        </div>

        <button
          onClick={() => setVariablePanelOpen((v) => !v)}
          aria-pressed={variablePanelOpen}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            variablePanelOpen
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Braces size={16} /> Variables
        </button>

        <button
          onClick={showPreview}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Eye size={16} /> Preview email
        </button>

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save template
        </button>
      </div>

      <div className="flex items-start">
        <div className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white">
          <TiptapEditor
            initialContent={initialBodyJson || undefined}
            hideOutputPanel
            onEditorReady={(e) => {
              editorRef.current = e
              setEditorInstance(e)
            }}
          />
        </div>

        {/* VariablePanel uses h-full internally, so give it a real height. */}
        <div
          className="shrink-0 overflow-hidden"
          style={{
            width: variablePanelOpen ? '288px' : '0',
            height: '600px',
            marginLeft: variablePanelOpen ? '12px' : '0',
            transition: 'width 150ms ease, margin 150ms ease',
          }}
        >
          <VariablePanel
            editor={editorInstance}
            open={variablePanelOpen}
            onClose={() => setVariablePanelOpen(false)}
          />
        </div>
      </div>

      {previewHtml !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setPreviewHtml(null)}
        >
          <div
            className="flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <span className="text-sm font-semibold text-gray-900">
                Full email preview — header + body + footer
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyFinalBody}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy final body'}
                </button>
                <button
                  onClick={() => setPreviewHtml(null)}
                  className="text-sm text-gray-500 hover:text-gray-900"
                >
                  Close
                </button>
              </div>
            </div>
            <iframe title="email-preview" srcDoc={previewHtml} className="h-full w-full" />
          </div>
        </div>
      )}
    </div>
  )
}
