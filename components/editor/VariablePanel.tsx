'use client'

import { useCallback, useEffect, useState } from 'react'
import { X, Search, ChevronDown, ChevronRight } from 'lucide-react'
import type { Editor } from '@tiptap/react'
import { VARIABLE_GROUPS } from '@/lib/variable-registry'
import type { MergeVariable } from '@/lib/variable-registry'

interface VariablePanelProps {
  editor: Editor | null
  open: boolean
  onClose: () => void
}

/**
 * A sidebar listing all available merge-field variables grouped by domain.
 *
 * Shows each variable's token and dummy value. Clicking a row inserts the token
 * at the current cursor position in the editor.
 */
export function VariablePanel({ editor, open, onClose }: VariablePanelProps) {
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleGroup = useCallback((name: string) => {
    setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }))
  }, [])

  const insertVariable = useCallback(
    (variable: MergeVariable) => {
      if (!editor) return
      editor.chain().focus().insertMergeField(variable.token).run()
    },
    [editor]
  )

  // Listen for the custom event dispatched by the slash command.
  useEffect(() => {
    const handler = () => {
      // The slash menu already deleted the /variable text before dispatching,
      // so the editor cursor is in the right position for an insert.
    }
    window.addEventListener('open-variable-picker', handler)
    return () => window.removeEventListener('open-variable-picker', handler)
  }, [])

  if (!open) return null

  const lowerQuery = query.toLowerCase()
  const filtered = VARIABLE_GROUPS.map((group) => ({
    ...group,
    variables: group.variables.filter(
      (v) =>
        v.label.toLowerCase().includes(lowerQuery) ||
        v.token.toLowerCase().includes(lowerQuery) ||
        v.dummyValue.toLowerCase().includes(lowerQuery)
    ),
  })).filter((g) => g.variables.length > 0)

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-l border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2.5">
        <span className="text-sm font-semibold text-gray-900">Variables</span>
        <button
          type="button"
          onClick={onClose}
          title="Close"
          aria-label="Close variable panel"
          className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-gray-200 px-3 py-2">
        <label className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2">
          <Search size={13} strokeWidth={1.5} className="shrink-0 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search variables..."
            aria-label="Search variables"
            className="h-7 w-full border-0 bg-transparent text-xs text-gray-800 outline-none placeholder:text-gray-400"
          />
        </label>
      </div>

      {/* Variable list */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-2">
        {filtered.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-gray-400">
            No variables match &ldquo;{query}&rdquo;
          </p>
        )}

        {filtered.map((group) => {
          const isCollapsed = collapsed[group.name]
          return (
            <div key={group.name} className="mb-1">
              <button
                type="button"
                onClick={() => toggleGroup(group.name)}
                className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 hover:bg-gray-50"
              >
                {isCollapsed ? (
                  <ChevronRight size={12} strokeWidth={2} />
                ) : (
                  <ChevronDown size={12} strokeWidth={2} />
                )}
                {group.name}
                <span className="ml-auto text-[10px] font-normal text-gray-400">
                  {group.variables.length}
                </span>
              </button>

              {!isCollapsed && (
                <div className="ml-1">
                  {group.variables.map((variable) => (
                    <button
                      key={variable.token}
                      type="button"
                      onClick={() => insertVariable(variable)}
                      title={`Insert #${variable.token}# — dummy: ${variable.dummyValue}`}
                      className="flex w-full flex-col rounded-md px-2 py-1.5 text-left transition-colors hover:bg-blue-50"
                    >
                      <span className="text-xs font-medium text-gray-900">
                        {variable.label}
                      </span>
                      <span className="flex items-center gap-2 text-[11px] text-gray-500">
                        <code className="rounded bg-gray-100 px-1 py-px font-mono text-[10px] text-blue-700">
                          #{variable.token}#
                        </code>
                        <span className="truncate">{variable.dummyValue}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer hint */}
      <div className="border-t border-gray-200 px-3 py-2 text-[11px] text-gray-400">
        Click a variable to insert it at the cursor. In the email, it becomes{' '}
        <code className="font-mono">#TOKEN#</code> for the backend to replace.
      </div>
    </div>
  )
}
