'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Trash2, Check, Braces } from 'lucide-react'
import { TiptapEditor } from './TiptapEditor'
import { EmailShellFrame } from './EmailShellFrame'
import { useEmailShells, EmailShellPicker } from './EmailShellPicker'
import { VariablePanel } from './VariablePanel'

interface DocEditorProps {
  docId: string
  initialTitle: string
  initialContent: Record<string, unknown>
}

export function DocEditor({ docId, initialTitle, initialContent }: DocEditorProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('saved')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorJsonRef = useRef<Record<string, unknown>>(initialContent)
  const titleRef = useRef(initialTitle)
  const docIdRef = useRef(docId)

  const {
    shells,
    activeShell,
    activeShellId,
    setActiveShellId,
    showShell,
    setShowShell,
  } = useEmailShells()

  const [variablePanelOpen, setVariablePanelOpen] = useState(false)
  const [editorInstance, setEditorInstance] = useState<import('@tiptap/core').Editor | null>(null)

  // The /variable slash command dispatches this event so the panel opens.
  useEffect(() => {
    const handler = () => setVariablePanelOpen(true)
    window.addEventListener('open-variable-picker', handler)
    return () => window.removeEventListener('open-variable-picker', handler)
  }, [])

  const doSave = useCallback(async () => {
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/documents/${docIdRef.current}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleRef.current,
          content: editorJsonRef.current,
        }),
      })
      if (res.ok) {
        setSaveStatus('saved')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Save failed')
        setSaveStatus('idle')
      }
    } catch {
      toast.error('Failed to save. Check your connection.')
      setSaveStatus('idle')
    }
  }, [])

  const scheduleSave = useCallback(() => {
    setSaveStatus('idle')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void doSave()
    }, 2000)
  }, [doSave])

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value
      setTitle(newTitle)
      titleRef.current = newTitle
      scheduleSave()
    },
    [scheduleSave]
  )

  const onContentChange = useCallback(
    (json: Record<string, unknown>) => {
      editorJsonRef.current = json
      // Also extract title from the first heading if present
      const content = json.content as Array<{ type: string; attrs?: Record<string, unknown>; content?: Array<{ text?: string }> }> | undefined
      if (content && content.length > 0) {
        const firstBlock = content[0]
        if (firstBlock.type === 'heading' && firstBlock.content?.[0]?.text) {
          const headingText = firstBlock.content.map(n => n.text || '').join('')
          if (headingText && headingText !== titleRef.current) {
            titleRef.current = headingText
            setTitle(headingText)
          }
        }
      }
      scheduleSave()
    },
    [scheduleSave]
  )

  const handleDelete = useCallback(async () => {
    if (!confirm('Delete this document? This cannot be undone.')) return
    try {
      await fetch(`/api/documents/${docIdRef.current}`, { method: 'DELETE' })
      toast.success('Document deleted')
      router.push('/')
    } catch {
      toast.error('Failed to delete')
    }
  }, [router])

  return (
    <div>
      {/* Top bar */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => router.push('/')}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700"
          title="Back to documents"
        >
          <ArrowLeft size={18} strokeWidth={1.5} />
        </button>

        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="flex-1 border-none bg-transparent text-xl font-bold text-gray-900 outline-none placeholder:text-gray-300"
        />

        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          {saveStatus === 'saving' && (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
              Saving
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <Check size={12} strokeWidth={2} className="text-green-500" />
              Saved
            </>
          )}
        </span>

        <EmailShellPicker
          shells={shells}
          activeShellId={activeShellId}
          onSelect={setActiveShellId}
          showShell={showShell}
          onToggle={() => setShowShell(!showShell)}
        />

        <button
          type="button"
          onClick={() => setVariablePanelOpen((v) => !v)}
          aria-pressed={variablePanelOpen}
          title={variablePanelOpen ? 'Hide variables panel' : 'Show variables panel'}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
            variablePanelOpen
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:bg-gray-200 hover:text-gray-700'
          }`}
        >
          <Braces size={16} strokeWidth={1.5} />
        </button>

        <button
          onClick={handleDelete}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
          title="Delete document"
        >
          <Trash2 size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Editor, optionally framed by the email shell so the author sees the
          header and footer their body will ship inside. The frame is chrome —
          it never becomes part of the document JSON.

          `templateId` is passed regardless of the frame toggle: hiding the
          preview is a view preference, not a change to which shell the document
          renders and copies with. */}
      <div className="flex">
        <div className="min-w-0 flex-1">
          {showShell && activeShell ? (
            <EmailShellFrame config={activeShell.config}>
              <TiptapEditor
                initialContent={initialContent}
                onUpdate={onContentChange}
                templateId={activeShellId}
                onEditorReady={(e) => { setEditorInstance(e) }}
              />
            </EmailShellFrame>
          ) : (
            <TiptapEditor
              initialContent={initialContent}
              onUpdate={onContentChange}
              templateId={activeShellId}
              onEditorReady={(e) => { setEditorInstance(e) }}
            />
          )}
        </div>

        <VariablePanel
          editor={editorInstance}
          open={variablePanelOpen}
          onClose={() => setVariablePanelOpen(false)}
        />
      </div>
    </div>
  )
}
