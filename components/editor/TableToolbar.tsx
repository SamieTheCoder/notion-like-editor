'use client'

import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'

interface TableToolbarProps {
  editor: Editor | null
}

function Btn({
  onClick,
  title,
  danger,
  children,
}: {
  onClick: () => void
  title: string
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
        danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}

/** Contextual table controls, rendered only while the caret is in a table. */
export function TableToolbar({ editor }: TableToolbarProps) {
  const inTable = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? e.isActive('table') : false),
  })

  if (!editor || !inTable) return null

  const c = () => editor.chain().focus()

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-3 py-1.5">
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        Table
      </span>
      <Btn onClick={() => c().addColumnBefore().run()} title="Add column before">
        +Col ←
      </Btn>
      <Btn onClick={() => c().addColumnAfter().run()} title="Add column after">
        +Col →
      </Btn>
      <Btn onClick={() => c().addRowBefore().run()} title="Add row above">
        +Row ↑
      </Btn>
      <Btn onClick={() => c().addRowAfter().run()} title="Add row below">
        +Row ↓
      </Btn>
      <span aria-hidden className="mx-1 h-4 w-px bg-gray-300" />
      <Btn onClick={() => c().toggleHeaderRow().run()} title="Toggle header row">
        Header row
      </Btn>
      <Btn onClick={() => c().toggleHeaderColumn().run()} title="Toggle header column">
        Header col
      </Btn>
      <Btn onClick={() => c().mergeOrSplit().run()} title="Merge or split cells">
        Merge/Split
      </Btn>
      <span aria-hidden className="mx-1 h-4 w-px bg-gray-300" />
      <Btn onClick={() => c().deleteColumn().run()} title="Delete column" danger>
        −Col
      </Btn>
      <Btn onClick={() => c().deleteRow().run()} title="Delete row" danger>
        −Row
      </Btn>
      <Btn onClick={() => c().deleteTable().run()} title="Delete table" danger>
        Delete table
      </Btn>
    </div>
  )
}
