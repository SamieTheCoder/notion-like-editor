'use client'

import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import { Minus, Plus, Table2 } from 'lucide-react'
import type { TableDensity } from './extensions/Table'
import { TABLE_DENSITIES } from './extensions/Table'

interface TableToolbarProps {
  editor: Editor | null
}

function Btn({
  onClick,
  title,
  active,
  danger,
  disabled,
  children,
}: {
  onClick: () => void
  title: string
  active?: boolean
  danger?: boolean
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      className={`rounded px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'bg-gray-900 text-white'
          : danger
            ? 'text-red-600 hover:bg-red-50'
            : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-gray-300" />
}

/** Contextual table controls, rendered only while the caret is in a table. */
export function TableToolbar({ editor }: TableToolbarProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e || !e.isActive('table')) return null
      // Borders default to true so the check is safe when the attribute is absent.
      const borders = e.getAttributes('tableCell').borders !== false
      const density =
        (e.getAttributes('tableCell').density as TableDensity | undefined) ?? 'none'
      return { borders, density }
    },
  })

  if (!editor || !state) return null

  const c = () => editor.chain().focus()
  const canIncreaseRow = TABLE_DENSITIES.indexOf(state.density) < TABLE_DENSITIES.length - 1
  const canDecreaseRow = TABLE_DENSITIES.indexOf(state.density) > 0

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-3 py-1.5">
      <span className="mr-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        <Table2 size={12} strokeWidth={1.5} />
        Table
      </span>

      {/* Column / Row add-remove */}
      <Btn onClick={() => c().addColumnBefore().run()} title="Add column before">+Col ←</Btn>
      <Btn onClick={() => c().addColumnAfter().run()} title="Add column after">+Col →</Btn>
      <Btn onClick={() => c().addRowBefore().run()} title="Add row above">+Row ↑</Btn>
      <Btn onClick={() => c().addRowAfter().run()} title="Add row below">+Row ↓</Btn>

      <Sep />

      {/* Header row/col, merge */}
      <Btn onClick={() => c().toggleHeaderRow().run()} title="Toggle header row">
        Header row
      </Btn>
      <Btn onClick={() => c().toggleHeaderColumn().run()} title="Toggle header column">
        Header col
      </Btn>
      <Btn onClick={() => c().mergeOrSplit().run()} title="Merge or split cells">
        Merge/Split
      </Btn>

      <Sep />

      {/* ── Borders ─────────────────────────────────── */}
      <Btn
        onClick={() => c().toggleTableBorders().run()}
        active={state.borders}
        title={state.borders ? 'Hide table lines' : 'Show table lines'}
      >
        {state.borders ? 'Lines on' : 'Lines off'}
      </Btn>

      <Sep />

      {/* ── Row height / density ─────────────────────── */}
      <span className="text-[11px] text-gray-500">Row height</span>
      <div className="flex items-center rounded border border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => c().decreaseTableDensity().run()}
          disabled={!canDecreaseRow}
          title="Decrease row height"
          aria-label="Decrease row height"
          className="flex h-6 w-6 items-center justify-center rounded-l text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus size={12} strokeWidth={2} />
        </button>
        <span className="w-16 select-none border-x border-gray-200 text-center text-[11px] font-medium text-gray-700 capitalize">
          {state.density}
        </span>
        <button
          type="button"
          onClick={() => c().increaseTableDensity().run()}
          disabled={!canIncreaseRow}
          title="Increase row height"
          aria-label="Increase row height"
          className="flex h-6 w-6 items-center justify-center rounded-r text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={12} strokeWidth={2} />
        </button>
      </div>

      <Sep />

      {/* Delete */}
      <Btn onClick={() => c().deleteColumn().run()} title="Delete column" danger>−Col</Btn>
      <Btn onClick={() => c().deleteRow().run()} title="Delete row" danger>−Row</Btn>
      <Btn onClick={() => c().deleteTable().run()} title="Delete table" danger>
        Delete table
      </Btn>
    </div>
  )
}
