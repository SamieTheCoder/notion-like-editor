'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, Eye, Braces, Copy, Check } from 'lucide-react'
import type { Editor } from '@tiptap/core'
import { TiptapEditor } from './TiptapEditor'
import { VariablePanel } from './VariablePanel'
import { composeFinalBody } from '@/lib/compose-email'

interface Props {
  vendorId: number
  vendorName: string
  canManageVariables?: boolean
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
  canManageVariables = false,
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
  // The current template id. Starts from the prop, but once a brand-new
  // template is saved we capture the server-assigned id here so every
  // subsequent save (manual or autosave) UPDATES that row instead of creating
  // a duplicate.
  const [currentTemplateId, setCurrentTemplateId] = useState<number | null>(
    templateId
  )
  const currentTemplateIdRef = useRef<number | null>(templateId)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [finalBody, setFinalBody] = useState(initialFinalBody)
  const [copied, setCopied] = useState(false)
  const [variablePanelOpen, setVariablePanelOpen] = useState(false)
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null)
  const editorRef = useRef<Editor | null>(null)
  // Autosave bookkeeping.
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)
  const triggerRef = useRef(initialTrigger)

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

  // Keep refs in sync for use inside debounced callbacks.
  useEffect(() => {
    triggerRef.current = trigger
  }, [trigger])
  useEffect(() => {
    currentTemplateIdRef.current = currentTemplateId
  }, [currentTemplateId])

  /**
   * Persist the body. `silent` autosaves skip the success toast and the
   * name-required error toast. Returns true on success.
   *
   * The key duplicate-fix: we always send the CURRENT template id (which may
   * have just been assigned by a prior create), and we capture the id from the
   * response so the next save updates the same row.
   */
  const persist = useCallback(
    async (opts: { silent?: boolean } = {}): Promise<boolean> => {
      const { silent = false } = opts
      const triggerName = triggerRef.current.trim()
      if (!triggerName) {
        if (!silent) toast.error('Enter a template name (trigger) first.')
        return false
      }
      // Guard against overlapping saves (e.g. autosave firing during a manual save).
      if (savingRef.current) return false
      savingRef.current = true
      setSaving(true)
      try {
        const { html, json } = getBody()
        const res = await fetch('/api/dashboard/body', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorId,
            templateId: currentTemplateIdRef.current,
            trigger: triggerName,
            bodyHtml: html,
            bodyJson: json,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (!silent) toast.error(data.error || 'Save failed.')
          return false
        }
        // Capture the (possibly newly created) id so subsequent saves update it.
        if (typeof data.id === 'number') {
          currentTemplateIdRef.current = data.id
          setCurrentTemplateId(data.id)
        }
        if (typeof data.finalBody === 'string') setFinalBody(data.finalBody)
        setLastSavedAt(Date.now())
        if (!silent) toast.success(`Saved template "${data.trigger}".`)
        return true
      } catch {
        if (!silent) toast.error('Network error.')
        return false
      } finally {
        savingRef.current = false
        setSaving(false)
      }
    },
    [getBody, vendorId]
  )

  async function save() {
    await persist()
  }

  // Debounced autosave: schedule a silent save ~1.5s after the last change.
  // Only autosaves once a trigger name exists (the server requires it).
  const AUTOSAVE_DELAY = 1500
  const scheduleAutosave = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      if (!triggerRef.current.trim()) return
      void persist({ silent: true })
    }, AUTOSAVE_DELAY)
  }, [persist])

  // Autosave when the trigger name changes too (after content already exists).
  useEffect(() => {
    if (!trigger.trim()) return
    scheduleAutosave()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger])

  // Flush a pending autosave on unmount / tab close so nothing is lost.
  useEffect(() => {
    const flush = () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current)
        autosaveTimer.current = null
      }
    }
    window.addEventListener('beforeunload', flush)
    return () => {
      flush()
      window.removeEventListener('beforeunload', flush)
    }
  }, [])

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

  const [previewLoading, setPreviewLoading] = useState(false)

  async function showPreview() {
    const { json } = getBody()
    setPreviewLoading(true)
    try {
      // Render on the server so callout backgrounds, colors, and rounding are
      // inlined as real CSS. editor.getHTML() only emits Tailwind classes,
      // which have no stylesheet inside the preview iframe, so the callout box
      // would show plain. This matches the stored final body exactly.
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json, mode: 'email' }),
      })
      const data = await res.json().catch(() => ({}))
      const inlinedBody =
        typeof data.html === 'string' ? data.html : ''
      // Compose exactly like the save/API path (header + body + footer, chrome
      // stripped, all tables converted to divs) so the preview matches the
      // stored final body and the API response byte-for-byte.
      setPreviewHtml(composeFinalBody(headHtml, inlinedBody, footerHtml))
    } catch {
      toast.error('Could not render preview.')
    } finally {
      setPreviewLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => router.push(`/dashboard/${vendorId}`)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Back to vendor"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex-1">
          <input
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            placeholder="Template name / trigger (e.g. LEAD_REGISTERED)"
            className="w-full border-none bg-transparent text-lg font-semibold text-foreground outline-none placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">
            {vendorName} · saved as the trigger for this vendor
          </p>
        </div>

        <button
          onClick={() => setVariablePanelOpen((v) => !v)}
          aria-pressed={variablePanelOpen}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            variablePanelOpen
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card text-foreground hover:bg-accent'
          }`}
        >
          <Braces size={16} /> Variables
        </button>

        <button
          onClick={showPreview}
          disabled={previewLoading}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60"
        >
          {previewLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Eye size={16} />
          )}{' '}
          Preview email
        </button>

        <span className="min-w-[92px] text-right text-xs text-muted-foreground">
          {saving
            ? 'Saving…'
            : lastSavedAt
              ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Autosave on'}
        </span>

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
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
            variableVendorId={vendorId}
            onUpdate={scheduleAutosave}
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
            vendorId={vendorId}
            canManage={canManageVariables}
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
                Full email preview: header, body, footer
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
