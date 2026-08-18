'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEditor, EditorContent } from '@tiptap/react'
import type { AnyExtension, JSONContent } from '@tiptap/core'
import {
  SlashCmdProvider,
  Slash,
  createSuggestionsItems,
  renderItems,
} from '@harshtalks/slash-tiptap'
import Placeholder from '@tiptap/extension-placeholder'
import { useCallback, useState } from 'react'
import { extensions } from '@/lib/tiptap-extensions'
import { BLOCK_COMMANDS } from '@/lib/block-commands'
import { SlashMenu } from './SlashMenu'
import { Toolbar } from './Toolbar'
import { TableToolbar } from './TableToolbar'
import { SelectionBubbleMenu } from './SelectionBubbleMenu'
import { BlockDragHandle } from './BlockDragHandle'
import { DocStats } from './DocStats'

/** Slash-menu items derived from the shared block registry. */
const suggestions = createSuggestionsItems(
  BLOCK_COMMANDS.map((block) => ({
    title: block.title,
    searchTerms: block.searchTerms,
    command: ({ editor, range }: { editor: any; range: any }) =>
      block.run(editor, range),
  }))
)

const STORAGE_KEY = 'notion-editor:doc'

const INITIAL_CONTENT = `
<h1>Welcome to your editor</h1>
<p>This is a Notion-style block editor. Press <code>/</code> on an empty line to insert a block, or select text to format it.</p>
<div data-type="callout" data-variant="info"><p>Everything you write is stored as ProseMirror JSON and exported as HTML with Tailwind classes baked in.</p></div>
<h2>Try these</h2>
<ul><li>Type <code>/</code> for the block menu</li><li>Select text for the formatting bubble</li><li>Hover a block and use the grip to drag it</li></ul>
<p></p>
`

type Panel = 'none' | 'html' | 'json'

export function TiptapEditor() {
  const [panel, setPanel] = useState<Panel>('none')
  const [output, setOutput] = useState('')
  const [serverHtml, setServerHtml] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle')

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      ...extensions,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') return 'Heading'
          if (node.type.name === 'toggleSummary') return 'Toggle heading...'
          return "Type '/' for commands…"
        },
        includeChildren: true,
      }),
      Slash.configure({
        suggestion: {
          items: () => suggestions,
          render: renderItems,
        },
      }) as unknown as AnyExtension,
    ],
    content: INITIAL_CONTENT,
    editorProps: {
      attributes: {
        class:
          'tiptap max-w-none focus:outline-none min-h-[60vh] px-16 py-8 text-gray-900',
      },
    },
  })

  const showHtml = useCallback(() => {
    if (!editor) return
    setServerHtml(null)
    setOutput(editor.getHTML())
    setPanel('html')
  }, [editor])

  const showJson = useCallback(() => {
    if (!editor) return
    setServerHtml(null)
    setOutput(JSON.stringify(editor.getJSON(), null, 2))
    setPanel('json')
  }, [editor])

  /** Round-trips the document through /api/render to prove parity. */
  const renderOnServer = useCallback(async () => {
    if (!editor) return
    const res = await fetch('/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: editor.getJSON() }),
    })
    const data = (await res.json()) as { html?: string; error?: string }
    setServerHtml(data.html ?? `Error: ${data.error}`)
    setOutput(editor.getHTML())
    setPanel('html')
  }, [editor])

  const save = useCallback(() => {
    if (!editor) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(editor.getJSON()))
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 1500)
  }, [editor])

  const load = useCallback(() => {
    if (!editor) return
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      window.alert('Nothing saved yet.')
      return
    }
    editor.commands.setContent(JSON.parse(raw) as JSONContent)
  }, [editor])

  return (
    <SlashCmdProvider>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* `useEditorState` caches its first snapshot and only re-notifies on
            editor transactions, so any component using it must not mount while
            the editor is still null (`immediatelyRender: false` means the first
            render has no editor). Otherwise it reports empty state until the
            user's first edit. */}
        {editor && <Toolbar editor={editor} />}
        {editor && <TableToolbar editor={editor} />}

        <div className="relative">
          <BlockDragHandle editor={editor} />
          {editor && <SelectionBubbleMenu editor={editor} />}
          <EditorContent editor={editor} />
          <SlashMenu editor={editor} />
        </div>

        {/* Status bar */}
        <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-500">
          {editor ? <DocStats editor={editor} /> : <span>0 words · 0 characters</span>}
          <span className="ml-auto flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={save}
              className="rounded-md border border-gray-200 bg-white px-2.5 py-1 font-medium text-gray-700 hover:bg-gray-100"
            >
              {saveState === 'saved' ? 'Saved ✓' : 'Save'}
            </button>
            <button
              type="button"
              onClick={load}
              className="rounded-md border border-gray-200 bg-white px-2.5 py-1 font-medium text-gray-700 hover:bg-gray-100"
            >
              Load
            </button>
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
        </div>

        {/* Output panel */}
        {panel !== 'none' && (
          <div className="border-t border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {panel === 'html'
                ? 'Client HTML — editor.getHTML()'
                : 'ProseMirror JSON — editor.getJSON()'}
            </h3>
            <pre className="max-h-72 overflow-auto rounded-lg border border-gray-200 bg-white p-3 text-xs leading-relaxed whitespace-pre-wrap">
              {output}
            </pre>

            {serverHtml !== null && (
              <>
                <h3 className="mt-4 mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Server HTML — generateHTML()
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      serverHtml === output
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {serverHtml === output ? 'IDENTICAL' : 'DIFFERS'}
                  </span>
                </h3>
                <pre className="max-h-72 overflow-auto rounded-lg border border-gray-200 bg-white p-3 text-xs leading-relaxed whitespace-pre-wrap">
                  {serverHtml}
                </pre>
              </>
            )}
          </div>
        )}
      </div>
    </SlashCmdProvider>
  )
}
