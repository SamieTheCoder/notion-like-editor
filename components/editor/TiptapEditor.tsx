'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import type { JSONContent } from '@tiptap/core'
import Placeholder from '@tiptap/extension-placeholder'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { extensions } from '@/lib/tiptap-extensions'
import { formatHTML, wrapStandaloneHTML } from '@/lib/html-export'
import { SlashCommand } from './extensions/SlashCommand'
import { Toolbar } from './Toolbar'
import { TableToolbar } from './TableToolbar'
import { SelectionBubbleMenu } from './SelectionBubbleMenu'
import { BlockDragHandle } from './BlockDragHandle'
import { DocStats } from './DocStats'
import { uploadAndInsertImage as uploadImage } from '@/lib/upload'

const INITIAL_CONTENT = `
<h1>Welcome to your editor</h1>
<p>This is a Notion-style block editor. Press <code>/</code> on an empty line to insert a block, or select text to format it.</p>
<div data-type="callout" data-variant="info"><p>Everything you write is stored as ProseMirror JSON and exported as HTML with Tailwind classes baked in.</p></div>
<h2>Try these</h2>
<ul><li>Type <code>/</code> for the block menu</li><li>Select text for the formatting bubble</li><li>Hover a block and use the grip to drag it</li></ul>
<p></p>
`

type Panel = 'none' | 'html' | 'json'
type HtmlMode = 'fragment' | 'standalone' | 'email'

const HTML_MODES: { id: HtmlMode; label: string; hint: string }[] = [
  {
    id: 'fragment',
    label: 'Fragment',
    hint: 'Tailwind classes. Needs Tailwind compiled on the destination page.',
  },
  {
    id: 'standalone',
    label: 'Standalone page',
    hint: 'Complete document with the Tailwind browser build and Geist. Opens styled on its own.',
  },
  {
    id: 'email',
    label: 'Email',
    hint: 'Inline CSS with Lato font. Works in Gmail, Outlook, Apple Mail.',
  },
]

/** Module-level ref so paste/drop handlers can access the editor. */
let editorRef: import('@tiptap/core').Editor | null = null

interface TiptapEditorProps {
  initialContent?: Record<string, unknown> | string
  onUpdate?: (json: Record<string, unknown>) => void
  /**
   * Email shell to wrap the `email` output in. When set, the HTML shown and
   * copied is the full email — real header and footer — rather than the body
   * alone. Changing it re-renders the email output.
   */
  templateId?: number | null
  /** Called once when the editor instance is ready. */
  onEditorReady?: (editor: import('@tiptap/core').Editor) => void
  /** Hide the HTML/JSON/Render output panel and its status-bar buttons. */
  hideOutputPanel?: boolean
}

export function TiptapEditor({
  initialContent,
  onUpdate,
  templateId = null,
  onEditorReady,
  hideOutputPanel = false,
}: TiptapEditorProps = {}) {
  const [panel, setPanel] = useState<Panel>('none')
  const [htmlMode, setHtmlMode] = useState<HtmlMode>('fragment')
  const [rawHtml, setRawHtml] = useState('')
  const [jsonText, setJsonText] = useState('')
  const [serverHtml, setServerHtml] = useState<string | null>(null)
  const [emailHtml, setEmailHtml] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      ...extensions,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') return 'Heading'
          if (node.type.name === 'toggleSummary') return 'Toggle heading...'
          return "Type '/' for commands..."
        },
        includeChildren: true,
      }),
      SlashCommand,
    ],
    content: initialContent || INITIAL_CONTENT,
    onUpdate: ({ editor: e }) => {
      onUpdate?.(e.getJSON() as Record<string, unknown>)
    },
    editorProps: {
      attributes: {
        class:
          'tiptap max-w-none focus:outline-none min-h-[60vh] px-16 py-8 text-gray-900',
      },
      handlePaste: (view, event) => {
        const files = Array.from(event.clipboardData?.files || [])
        const images = files.filter((f) => f.type.startsWith('image/'))
        if (images.length === 0) return false
        event.preventDefault()
        if (!editorRef) return false
        for (const file of images) {
          uploadImage(file, editorRef, view.state.selection.from)
        }
        return true
      },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files || [])
        const images = files.filter((f) => f.type.startsWith('image/'))
        if (images.length === 0) return false
        event.preventDefault()
        if (!editorRef) return false
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
        for (const file of images) {
          uploadImage(file, editorRef, coords?.pos)
        }
        return true
      },
    },
  })

  useEffect(() => {
    editorRef = editor
    if (editor) onEditorReady?.(editor)
    return () => { editorRef = null }
  }, [editor, onEditorReady])

  const showHtml = useCallback(() => {
    if (!editor) return
    setServerHtml(null)
    setEmailHtml(null)
    setEmailError(null)
    setRawHtml(editor.getHTML())
    setPanel('html')
  }, [editor])

  const showJson = useCallback(() => {
    if (!editor) return
    setServerHtml(null)
    setJsonText(JSON.stringify(editor.getJSON(), null, 2))
    setPanel('json')
  }, [editor])

  const renderOnServer = useCallback(async () => {
    if (!editor) return
    const res = await fetch('/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: editor.getJSON() }),
    })
    const data = (await res.json()) as { html?: string; error?: string }
    setServerHtml(data.html ?? `Error: ${data.error}`)
    setRawHtml(editor.getHTML())
    setHtmlMode('fragment')
    setPanel('html')
  }, [editor])

  const loadEmailHtml = useCallback(async () => {
    if (!editor) return
    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          json: editor.getJSON(),
          mode: 'email',
          // Omitted when no shell is selected, which keeps the standalone
          // email output as the fallback.
          ...(templateId !== null ? { templateId } : {}),
        }),
      })
      const data = (await res.json()) as { html?: string; error?: string }
      if (data.html) {
        setEmailHtml(data.html)
        setEmailError(null)
      } else {
        setEmailError(data.error ?? 'Render failed')
      }
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : String(error))
    }
  }, [editor, templateId])

  // Picking a different shell invalidates output rendered with the previous
  // one. Adjusting state during render — rather than in an effect — is the
  // documented way to react to a changed prop, and avoids rendering one frame
  // of stale HTML.
  const [renderedTemplateId, setRenderedTemplateId] = useState(templateId)
  if (renderedTemplateId !== templateId) {
    setRenderedTemplateId(templateId)
    setEmailHtml(null)
    setEmailError(null)
  }

  // Fetch whenever the email tab is showing but has nothing to show.
  //
  // set-state-in-effect is disabled for the call below because it is a false
  // positive: the rule traces into `loadEmailHtml`, sees setState, and assumes
  // it runs synchronously. It does not — the function guards on `editor`, then
  // awaits `fetch`, so every state update happens in the async continuation.
  // Rendering on the server in response to state is exactly the external-system
  // synchronisation effects are for.
  useEffect(() => {
    if (panel !== 'html' || htmlMode !== 'email') return
    if (emailHtml !== null || emailError !== null) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadEmailHtml()
  }, [panel, htmlMode, emailHtml, emailError, loadEmailHtml])

  const selectHtmlMode = useCallback((mode: HtmlMode) => {
    // Switching to `email` needs no fetch here — the effect above notices the
    // tab is showing with nothing rendered and loads it. One owner, no double
    // request.
    setHtmlMode(mode)
  }, [])

  const displayed = useMemo(() => {
    if (panel === 'json') return jsonText
    if (htmlMode === 'standalone') {
      return wrapStandaloneHTML(rawHtml, { title: 'Exported document' })
    }
    if (htmlMode === 'email') {
      if (emailError) return `Error: ${emailError}`
      if (emailHtml === null) return 'Rendering...'
      return formatHTML(emailHtml)
    }
    return formatHTML(rawHtml)
  }, [panel, htmlMode, jsonText, rawHtml, emailHtml, emailError])

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(displayed)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = displayed
      ta.setAttribute('aria-hidden', 'true')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [displayed])

  const download = useCallback(() => {
    const isDoc = htmlMode === 'standalone'
    const blob = new Blob([displayed], {
      type: panel === 'json' ? 'application/json' : 'text/html',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download =
      panel === 'json'
        ? 'document.json'
        : isDoc
          ? 'document.html'
          : `document-${htmlMode}.html`
    a.click()
    URL.revokeObjectURL(url)
  }, [displayed, htmlMode, panel])

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {editor && <Toolbar editor={editor} />}
      {editor && <TableToolbar editor={editor} />}

      <div className="relative">
        <BlockDragHandle editor={editor} />
        {editor && <SelectionBubbleMenu editor={editor} />}
        <EditorContent editor={editor} />
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-500">
        {editor ? <DocStats editor={editor} /> : <span>0 words</span>}
        {!hideOutputPanel && (
        <span className="ml-auto flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={showHtml}
            className="rounded-md border border-gray-200 bg-white px-2.5 py-1 font-medium text-gray-700 hover:bg-gray-100"
          >
            HTML
          </button>
          <button
            type="button"
            onClick={showJson}
            className="rounded-md border border-gray-200 bg-white px-2.5 py-1 font-medium text-gray-700 hover:bg-gray-100"
          >
            JSON
          </button>
          <button
            type="button"
            onClick={renderOnServer}
            className="rounded-md bg-gray-900 px-2.5 py-1 font-medium text-white hover:bg-gray-800"
          >
            Render on server
          </button>
          {panel !== 'none' && (
            <button
              type="button"
              onClick={() => setPanel('none')}
              className="rounded-md px-2 py-1 font-medium text-gray-500 hover:bg-gray-200"
            >
              Close
            </button>
          )}
        </span>
        )}
      </div>

      {/* Output panel */}
      {!hideOutputPanel && panel !== 'none' && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {panel === 'html' ? 'HTML output' : 'ProseMirror JSON'}
            </h3>

            {panel === 'html' && (
              <div
                role="tablist"
                aria-label="HTML export format"
                className="flex items-center gap-0.5 rounded-md border border-gray-200 bg-white p-0.5"
              >
                {HTML_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    role="tab"
                    aria-selected={htmlMode === mode.id}
                    title={mode.hint}
                    onClick={() => selectHtmlMode(mode.id)}
                    className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                      htmlMode === mode.id
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            )}

            <span className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={copy}
                className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 active:scale-[0.97]"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={download}
                className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 active:scale-[0.97]"
              >
                Download
              </button>
            </span>
          </div>

          {panel === 'html' && (
            <p className="mb-2 text-[11px] leading-relaxed text-gray-500">
              {HTML_MODES.find((m) => m.id === htmlMode)?.hint}
            </p>
          )}

          <pre className="max-h-72 overflow-auto rounded-lg border border-gray-200 bg-white p-3 text-xs leading-relaxed">
            <code>{displayed}</code>
          </pre>

          {panel === 'html' && serverHtml !== null && (
            <>
              <h3 className="mt-4 mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Server parity
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    serverHtml === rawHtml
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {serverHtml === rawHtml ? 'IDENTICAL' : 'DIFFERS'}
                </span>
              </h3>
              <pre className="max-h-72 overflow-auto rounded-lg border border-gray-200 bg-white p-3 text-xs leading-relaxed">
                <code>{formatHTML(serverHtml)}</code>
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  )
}
