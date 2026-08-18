'use client'

import { DragHandle } from '@tiptap/extension-drag-handle-react'
import type { Editor } from '@tiptap/react'
import { TextSelection } from '@tiptap/pm/state'
import { useState, useRef, useEffect, useMemo } from 'react'
import type { Node as PMNode } from '@tiptap/pm/model'
import { offset } from '@floating-ui/dom'
import type { ComputePositionConfig } from '@floating-ui/dom'
import {
  Plus,
  GripVertical,
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  TextQuote,
  Code,
  Info,
  Repeat2,
  Copy,
  ClipboardCopy,
  Trash2,
  ChevronRight,
} from 'lucide-react'

interface BlockDragHandleProps {
  editor: Editor | null
}

/** Uniform icon sizing + stroke across the whole menu. */
const ICON = { size: 16, strokeWidth: 1.5 } as const

/**
 * Node types whose DOM box starts at the text, with the list marker painted
 * to the LEFT of that box (a consequence of `list-style-position: outside`).
 * The handle must clear that marker zone, otherwise it sits on top of the
 * bullet / number.
 */
const MARKER_NODES = new Set(['listItem', 'taskItem'])

/** Horizontal gap between the handle and the block it points at, in px. */
const GAP_DEFAULT = 8
/** Wider gap for list items so the handle clears the bullet / number. */
const GAP_LIST = 30

interface Placement {
  /** Horizontal distance from the block's left edge. */
  gap: number
  /** Height of the block's first line box, 0 when unknown. */
  lineHeight: number
}

/**
 * Mutable placement inputs shared between `onNodeChange` and the offset
 * middleware, stored outside React because the extension repositions the
 * handle imperatively: mutating these must not trigger a re-render, and they
 * must be readable during positioning rather than during render.
 *
 * Keyed by editor so multiple editors stay independent, and weakly held so
 * entries disappear with the editor.
 */
const placements = new WeakMap<Editor, Placement>()

function getPlacement(editor: Editor): Placement {
  let p = placements.get(editor)
  if (!p) {
    p = { gap: GAP_DEFAULT, lineHeight: 0 }
    placements.set(editor, p)
  }
  return p
}

export function BlockDragHandle({ editor }: BlockDragHandleProps) {
  const [pos, setPos] = useState<number | null>(null)
  const [node, setNode] = useState<PMNode | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [turnIntoOpen, setTurnIntoOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close the menu on outside click or Escape. Declared before any early
  // return so hook order stays stable across renders.
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        setMenuOpen(false)
        setTurnIntoOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setTurnIntoOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  /**
   * The extension positions the handle with floating-ui using
   * `placement: 'left-start'` and no middleware, which puts the handle's right
   * edge exactly on the block's left edge (colliding with list markers) and
   * aligns its top edge with the block's top edge (so it never centers on the
   * text). Both are corrected here:
   *
   * - `mainAxis` pushes the handle left, out of the marker zone.
   * - `crossAxis` centers the handle against the block's first line box
   *   instead of the block's full height, so multi-line blocks still align to
   *   the first line the way Notion does.
   */
  const computePositionConfig = useMemo<Partial<ComputePositionConfig>>(
    () => ({
      placement: 'left-start',
      strategy: 'absolute',
      middleware: [
        offset(({ rects }) => {
          // Read at positioning time, not during render.
          const p = editor ? getPlacement(editor) : null
          const measured = p?.lineHeight || rects.reference.height
          // Never exceed the block height (single-line blocks).
          const firstLine = Math.min(measured, rects.reference.height)
          return {
            mainAxis: p?.gap ?? GAP_DEFAULT,
            crossAxis: Math.max(0, (firstLine - rects.floating.height) / 2),
          }
        }),
      ],
    }),
    [editor]
  )

  if (!editor) return null

  const insertBelow = () => {
    if (pos === null || !node) return
    const insertAt = pos + node.nodeSize
    editor
      .chain()
      .focus()
      .insertContentAt(insertAt, { type: 'paragraph' })
      .command(({ tr, dispatch }) => {
        const $pos = tr.doc.resolve(
          Math.min(insertAt + 1, tr.doc.content.size - 1)
        )
        if ($pos.parent.inlineContent) {
          if (dispatch) {
            tr.setSelection(TextSelection.create(tr.doc, $pos.pos))
          }
          return true
        }
        const found = TextSelection.findFrom(
          tr.doc.resolve(Math.min(insertAt, tr.doc.content.size)),
          1,
          true
        )
        if (found && dispatch) {
          tr.setSelection(found)
        }
        return true
      })
      .insertContent('/')
      .run()
  }

  const closeMenus = () => {
    setMenuOpen(false)
    setTurnIntoOpen(false)
  }

  /** Puts the selection inside the hovered block so commands target it. */
  const selectCurrentBlock = () => {
    if (pos === null || !node) return
    const { doc } = editor.state
    const from = doc.resolve(Math.min(pos + 1, doc.content.size))
    const to = doc.resolve(Math.min(pos + node.nodeSize - 1, doc.content.size))
    editor.view.dispatch(
      editor.state.tr.setSelection(TextSelection.between(from, to))
    )
  }

  const handleDuplicate = () => {
    if (pos === null || !node) return
    editor
      .chain()
      .focus()
      .insertContentAt(pos + node.nodeSize, node.toJSON())
      .run()
    closeMenus()
  }

  const handleDelete = () => {
    if (pos === null || !node) return
    editor
      .chain()
      .focus()
      .command(({ tr, dispatch }) => {
        if (dispatch) tr.delete(pos, pos + node.nodeSize)
        return true
      })
      .run()
    closeMenus()
  }

  const handleCopy = async () => {
    if (pos === null || !node) return
    const text = node.textContent
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard API needs a secure context; fall back to a temp textarea.
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('aria-hidden', 'true')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    closeMenus()
  }

  const turnInto = (run: (e: Editor) => void) => {
    if (pos === null || !node) return
    selectCurrentBlock()
    run(editor)
    closeMenus()
  }

  const TURN_INTO: { label: string; icon: React.ReactNode; run: (e: Editor) => void }[] = [
    { label: 'Text', icon: <Type {...ICON} />, run: (e) => e.chain().focus().setParagraph().run() },
    { label: 'Heading 1', icon: <Heading1 {...ICON} />, run: (e) => e.chain().focus().setHeading({ level: 1 }).run() },
    { label: 'Heading 2', icon: <Heading2 {...ICON} />, run: (e) => e.chain().focus().setHeading({ level: 2 }).run() },
    { label: 'Heading 3', icon: <Heading3 {...ICON} />, run: (e) => e.chain().focus().setHeading({ level: 3 }).run() },
    { label: 'Bulleted list', icon: <List {...ICON} />, run: (e) => e.chain().focus().toggleBulletList().run() },
    { label: 'Numbered list', icon: <ListOrdered {...ICON} />, run: (e) => e.chain().focus().toggleOrderedList().run() },
    { label: 'To-do list', icon: <ListChecks {...ICON} />, run: (e) => e.chain().focus().toggleTaskList().run() },
    { label: 'Quote', icon: <TextQuote {...ICON} />, run: (e) => e.chain().focus().toggleBlockquote().run() },
    { label: 'Code', icon: <Code {...ICON} />, run: (e) => e.chain().focus().setCodeBlock().run() },
    { label: 'Callout', icon: <Info {...ICON} />, run: (e) => e.chain().focus().toggleCallout({ variant: 'info' }).run() },
  ]

  const itemClass =
    'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100'

  return (
    <DragHandle
      editor={editor}
      nested
      computePositionConfig={computePositionConfig as ComputePositionConfig}
      onNodeChange={({ node: n, pos: nodePos }) => {
        setNode(n)
        setPos(nodePos)

        // Measure the target block before the extension repositions the
        // handle (this callback runs immediately before that).
        const p = getPlacement(editor)
        p.gap = n && MARKER_NODES.has(n.type.name) ? GAP_LIST : GAP_DEFAULT
        p.lineHeight = 0

        if (!n || nodePos < 0) return
        const dom = editor.view.nodeDOM(nodePos)
        if (!(dom instanceof HTMLElement)) return
        const cs = window.getComputedStyle(dom)
        const parsed = Number.parseFloat(cs.lineHeight)
        p.lineHeight = Number.isFinite(parsed)
          ? parsed
          : Number.parseFloat(cs.fontSize) * 1.2
      }}
      className="flex items-center gap-0.5"
    >
      <button
        type="button"
        onClick={insertBelow}
        title="Add block below"
        aria-label="Add block below"
        className="flex h-6 w-6 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
      >
        <Plus {...ICON} />
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setMenuOpen((v) => !v)
            setTurnIntoOpen(false)
          }}
          title="Drag to move, click to open menu"
          aria-label="Block options"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex h-6 w-6 cursor-grab items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 active:cursor-grabbing"
        >
          <GripVertical {...ICON} />
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            role="menu"
            className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1.5 shadow-xl"
          >
            <div
              className="relative"
              onMouseEnter={() => setTurnIntoOpen(true)}
              onMouseLeave={() => setTurnIntoOpen(false)}
            >
              <button
                type="button"
                role="menuitem"
                aria-expanded={turnIntoOpen}
                className={itemClass}
                onClick={() => setTurnIntoOpen((v) => !v)}
              >
                <Repeat2 {...ICON} className="shrink-0 text-gray-400" />
                <span className="flex-1">Turn into</span>
                <ChevronRight size={14} strokeWidth={1.5} className="text-gray-400" />
              </button>

              {turnIntoOpen && (
                <div
                  role="menu"
                  className="absolute left-full top-0 z-50 ml-1 w-48 rounded-lg border border-gray-200 bg-white py-1.5 shadow-xl"
                >
                  {TURN_INTO.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      role="menuitem"
                      className={itemClass}
                      onClick={() => turnInto(opt.run)}
                    >
                      <span className="shrink-0 text-gray-400">{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="my-1 border-t border-gray-100" />

            <button type="button" role="menuitem" className={itemClass} onClick={handleDuplicate}>
              <Copy {...ICON} className="shrink-0 text-gray-400" />
              <span className="flex-1">Duplicate</span>
            </button>

            <button type="button" role="menuitem" className={itemClass} onClick={handleCopy}>
              <ClipboardCopy {...ICON} className="shrink-0 text-gray-400" />
              <span className="flex-1">Copy text</span>
            </button>

            <div className="my-1 border-t border-gray-100" />

            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
              onClick={handleDelete}
            >
              <Trash2 {...ICON} className="shrink-0 text-red-400" />
              <span className="flex-1">Delete</span>
            </button>
          </div>
        )}
      </div>
    </DragHandle>
  )
}
