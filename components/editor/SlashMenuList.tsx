'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { Editor, Range } from '@tiptap/core'
import type { BlockCommand, BlockGroup } from '@/lib/block-commands'

const GROUP_ORDER: BlockGroup[] = ['Basic blocks', 'Lists', 'Media', 'Advanced']

export interface SlashMenuListProps {
  items: BlockCommand[]
  command: (item: BlockCommand) => void
  editor: Editor
  range: Range
}

/** Exposed to the Suggestion plugin so it can forward key events. */
export interface SlashMenuListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const SlashMenuList = forwardRef<SlashMenuListRef, SlashMenuListProps>(
  function SlashMenuList({ items, command }, ref) {
    const [selected, setSelected] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

    // A new query produces a new item list; reset to the first match.
    useEffect(() => {
      setSelected(0)
    }, [items])

    /** Keeps the active row inside the scroll viewport. */
    useLayoutEffect(() => {
      const el = itemRefs.current[selected]
      if (el) el.scrollIntoView({ block: 'nearest' })
    }, [selected])

    const select = useCallback(
      (index: number) => {
        const item = items[index]
        if (item) command(item)
      },
      [items, command]
    )

    // The Suggestion plugin calls this before ProseMirror sees the key, and a
    // `true` return stops ProseMirror from also acting on it. That is the whole
    // reason arrow keys work here: one owner for the event, no racing handlers.
    useImperativeHandle(
      ref,
      () => ({
        onKeyDown: ({ event }) => {
          if (items.length === 0) return false

          if (event.key === 'ArrowUp') {
            setSelected((i) => (i + items.length - 1) % items.length)
            return true
          }

          if (event.key === 'ArrowDown') {
            setSelected((i) => (i + 1) % items.length)
            return true
          }

          if (event.key === 'Enter' || event.key === 'Tab') {
            select(selected)
            return true
          }

          return false
        },
      }),
      [items, selected, select]
    )

    if (items.length === 0) {
      return (
        <div className="w-80 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5">
          <div className="px-3 py-6 text-center text-sm text-gray-400">
            No blocks found
          </div>
        </div>
      )
    }

    // Group while preserving the flat index, so keyboard and mouse agree on
    // which row is which.
    let flatIndex = -1

    return (
      <div
        ref={containerRef}
        role="listbox"
        className="max-h-[22rem] w-80 overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5"
      >
        {GROUP_ORDER.map((group) => {
          const groupItems = items.filter((item) => item.group === group)
          if (groupItems.length === 0) return null

          return (
            <div key={group}>
              <div className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {group}
              </div>

              {groupItems.map((item) => {
                flatIndex += 1
                const index = flatIndex
                const isActive = index === selected

                return (
                  <button
                    key={item.title}
                    ref={(el) => {
                      itemRefs.current[index] = el
                    }}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => select(index)}
                    onMouseEnter={() => setSelected(index)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm outline-none transition-colors ${
                      isActive ? 'bg-gray-100' : ''
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-[11px] font-semibold text-gray-600">
                      {item.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-gray-900">
                        {item.title}
                      </span>
                      <span className="block truncate text-xs text-gray-500">
                        {item.description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }
)
