'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { Variable } from '@/lib/variables'

export interface VariableSuggestionListProps {
  items: Variable[]
  command: (item: Variable) => void
  query: string
  loading?: boolean
}

/** Exposed to the Suggestion plugin so it can forward key events. */
export interface VariableSuggestionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

/**
 * Inline variable picker shown while typing `#` in the document. Mirrors the
 * slash menu's keyboard contract: this owns Arrow/Enter/Tab so ProseMirror does
 * not also act on them.
 */
export const VariableSuggestionList = forwardRef<
  VariableSuggestionListRef,
  VariableSuggestionListProps
>(function VariableSuggestionList({ items, command, query, loading }, ref) {
  const [selected, setSelected] = useState(0)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => setSelected(0), [items])

  useLayoutEffect(() => {
    itemRefs.current[selected]?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (items.length === 0) return false

      if (event.key === 'ArrowDown') {
        setSelected((i) => (i + 1) % items.length)
        return true
      }
      if (event.key === 'ArrowUp') {
        setSelected((i) => (i - 1 + items.length) % items.length)
        return true
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        const item = items[selected]
        if (item) command(item)
        return true
      }
      return false
    },
  }))

  if (loading) {
    return (
      <div className="w-72 rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-400 shadow-xl ring-1 ring-black/5">
        Loading variables…
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="w-72 rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-500 shadow-xl ring-1 ring-black/5">
        {query ? (
          <>
            No variable matches{' '}
            <code className="font-mono text-gray-700">{query}</code>
          </>
        ) : (
          'No variables available. An admin can add them on the vendor page.'
        )}
      </div>
    )
  }

  return (
    <div className="max-h-[20rem] w-72 overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5">
      {items.map((item, i) => (
        <button
          key={item.id}
          ref={(el) => {
            itemRefs.current[i] = el
          }}
          type="button"
          onClick={() => command(item)}
          onMouseEnter={() => setSelected(i)}
          className={`flex w-full flex-col rounded-md px-2 py-1.5 text-left transition-colors ${
            i === selected ? 'bg-blue-50' : 'hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-medium text-gray-900">
              {item.label}
            </span>
            <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-400">
              {item.group_name}
            </span>
          </span>
          <span className="flex items-center gap-2 text-[11px] text-gray-500">
            <code className="rounded bg-gray-100 px-1 py-px font-mono text-[10px] text-blue-700">
              #{item.token}#
            </code>
            {item.dummy_value && (
              <span className="truncate">{item.dummy_value}</span>
            )}
          </span>
        </button>
      ))}
    </div>
  )
})
