'use client'

import { DragHandle } from '@tiptap/extension-drag-handle-react'
import type { Editor } from '@tiptap/react'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
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
  Palette,
  Paintbrush,
} from 'lucide-react'

interface BlockDragHandleProps {
  editor: Editor | null
}

/** Uniform icon sizing + stroke across the whole menu. */
const ICON = { size: 16, strokeWidth: 1.5 } as const

/** Horizontal breathing room between a block's left edge and the handle. */
const GAP_DEFAULT = 8

interface Placement {
  /** Distance from the target block's left edge to the handle's right edge. */
  gap: number
  /** Offset from the target block's top to the top of its first text line. */
  lineTop: number
  /** Height of that first line, used to center the handle on it. */
  lineHeight: number
}

const placements = new WeakMap<Editor, Placement>()

function getPlacement(editor: Editor): Placement {
  let p = placements.get(editor)
  if (!p) {
    p = { gap: GAP_DEFAULT, lineTop: 0, lineHeight: 0 }
    placements.set(editor, p)
  }
  return p
}

/* ------------------------------------------------------- nested targeting */

/**
 * Containers whose first child block *is* their first visual line. They have
 * no separate header row, so hovering that line has to grab the container —
 * the same trick Tiptap's built-in `listItemFirstChild` rule uses for list
 * items. Lines 2..n inside them stay individually draggable.
 */
const FIRST_LINE_CONTAINERS = new Set(['callout', 'blockquote'])

/** Structural parts of the toggle node view; never drag targets themselves. */
const TOGGLE_STRUCTURE = new Set(['toggleSummary', 'toggleContent'])

/** Cell content defers to the table, so the whole table stays draggable. */
const TABLE_CELLS = new Set(['tableCell', 'tableHeader'])

/**
 * Structural subset of Tiptap's `RuleContext`. Declared locally so this file
 * only depends on `@tiptap/extension-drag-handle-react`, which is the package
 * listed in package.json.
 */
interface DragRuleContext {
  node: PMNode
  parent: PMNode | null
  isFirst: boolean
}

const NESTED_OPTIONS = {
  /**
   * Left-edge detection is the bug. It deducts `strength * depth` from the
   * hovered node whenever the pointer comes within 12px of that node's left
   * edge, which promotes the ancestor instead. A paragraph inside a callout
   * sits 16px inside the callout's padding, so moving the pointer left toward
   * the handle crossed the threshold: the paragraph's handle disappeared and
   * the callout's handle took over. With detection off, the target is decided
   * by the rules below and by depth, so it no longer depends on how close the
   * pointer is to the gutter.
   */
  edgeDetection: 'none' as const,
  defaultRules: true,
  rules: [
    {
      id: 'containerFirstChild',
      evaluate: ({ parent, isFirst }: DragRuleContext) =>
        isFirst && parent && FIRST_LINE_CONTAINERS.has(parent.type.name) ? 1000 : 0,
    },
    {
      id: 'excludeToggleStructure',
      evaluate: ({ node }: DragRuleContext) =>
        TOGGLE_STRUCTURE.has(node.type.name) ? 1000 : 0,
    },
    {
      id: 'tableCellContent',
      evaluate: ({ parent }: DragRuleContext) =>
        parent && TABLE_CELLS.has(parent.type.name) ? 1000 : 0,
    },
  ],
}

/* ------------------------------------------------------------- measurement */

/** The block's top-level ancestor element, i.e. a direct child of the editor. */
function topLevelAncestor(editor: Editor, dom: HTMLElement): HTMLElement {
  const root = editor.view.dom
  let current = dom
  while (current.parentElement && current.parentElement !== root) {
    current = current.parentElement
  }
  return current
}

/**
 * Viewport rect of the block's first line of text. Measured with a Range so
 * multi-line blocks and padded containers (callout, quote, toggle) report the
 * line the handle should align with, not the whole box.
 */
function firstLineRect(dom: HTMLElement): { top: number; height: number } {
  const walker = document.createTreeWalker(dom, NodeFilter.SHOW_TEXT)
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    const value = text.textContent
    if (!value || !value.trim()) continue
    const range = document.createRange()
    range.setStart(text, 0)
    range.setEnd(text, 1)
    const rect = range.getClientRects()[0]
    if (rect && rect.height > 0) return { top: rect.top, height: rect.height }
  }

  // Empty block: fall back to its own line box, offset past any top padding.
  const rect = dom.getBoundingClientRect()
  const cs = window.getComputedStyle(dom)
  const parsed = Number.parseFloat(cs.lineHeight)
  return {
    top: rect.top + (Number.parseFloat(cs.paddingTop) || 0),
    height: Number.isFinite(parsed) ? parsed : Number.parseFloat(cs.fontSize) * 1.2,
  }
}

/**
 * Anchor every handle to one gutter column — the one its top-level ancestor
 * would use. Offsetting a nested block by a flat 8px would drop the handle
 * onto the callout's padding and tinted background, or onto a list's marker.
 */
function measurePlacement(editor: Editor, dom: HTMLElement): Placement {
  const rect = dom.getBoundingClientRect()
  const columnRight = topLevelAncestor(editor, dom).getBoundingClientRect().left - GAP_DEFAULT
  const line = firstLineRect(dom)

  return {
    gap: Math.max(GAP_DEFAULT, rect.left - columnRight),
    lineTop: Math.max(0, line.top - rect.top),
    lineHeight: line.height,
  }
}

/* --------------------------------------------------------- gutter corridor */

const gutterPluginKey = new PluginKey('blockDragHandleGutter')

/** Vertical slack so the margin between two blocks still counts as the band. */
const BAND_TOLERANCE = 4

/** Document position of the block the handle currently points at. */
const targets = new WeakMap<Editor, number>()

/**
 * Keeps the handle attached to the block it already points at while the
 * pointer travels left through that block's gutter.
 *
 * Needed because `posAtCoords` on a point inside a container's own padding
 * resolves to the container, not to the child block rendered there. Walking
 * the pointer from a paragraph inside a callout out to its handle crosses that
 * padding, so the target flipped to the callout and the line's handle was
 * replaced mid-travel. Returning `true` here consumes the event before the
 * drag handle plugin's `mousemove` runs, so nothing is recomputed. Vertical
 * moves that leave the block's band fall through and re-target normally.
 */
function createGutterPlugin(editor: Editor) {
  return new Plugin({
    key: gutterPluginKey,
    props: {
      handleDOMEvents: {
        mousemove: (view, event) => {
          const pos = targets.get(editor)
          if (pos === undefined || pos < 0) return false

          const dom = view.nodeDOM(pos)
          if (!(dom instanceof HTMLElement)) return false

          const rect = dom.getBoundingClientRect()
          return (
            event.clientX < rect.left &&
            event.clientY >= rect.top - BAND_TOLERANCE &&
            event.clientY <= rect.bottom + BAND_TOLERANCE
          )
        },
      },
    },
  })
}

/* ---------------------------------------------------------------- colors */

const TEXT_COLORS = [
  { name: 'Default', value: '', swatch: '#1f2937' },
  { name: 'Gray', value: '#6b7280', swatch: '#6b7280' },
  { name: 'Brown', value: '#92400e', swatch: '#92400e' },
  { name: 'Orange', value: '#ea580c', swatch: '#ea580c' },
  { name: 'Yellow', value: '#ca8a04', swatch: '#ca8a04' },
  { name: 'Green', value: '#16a34a', swatch: '#16a34a' },
  { name: 'Blue', value: '#2563eb', swatch: '#2563eb' },
  { name: 'Purple', value: '#9333ea', swatch: '#9333ea' },
  { name: 'Pink', value: '#db2777', swatch: '#db2777' },
  { name: 'Red', value: '#dc2626', swatch: '#dc2626' },
]

const BG_COLORS = [
  { name: 'Default', value: '', swatch: '#ffffff' },
  { name: 'Gray', value: '#f3f4f6', swatch: '#f3f4f6' },
  { name: 'Brown', value: '#fef3c7', swatch: '#fef3c7' },
  { name: 'Orange', value: '#fed7aa', swatch: '#fed7aa' },
  { name: 'Yellow', value: '#fef08a', swatch: '#fef08a' },
  { name: 'Green', value: '#bbf7d0', swatch: '#bbf7d0' },
  { name: 'Blue', value: '#bfdbfe', swatch: '#bfdbfe' },
  { name: 'Purple', value: '#e9d5ff', swatch: '#e9d5ff' },
  { name: 'Pink', value: '#fbcfe8', swatch: '#fbcfe8' },
  { name: 'Red', value: '#fecaca', swatch: '#fecaca' },
]

/* ------------------------------------------------------------ component */

type Submenu = 'turnInto' | 'color' | 'bgColor' | null

export function BlockDragHandle({ editor }: BlockDragHandleProps) {
  const [pos, setPos] = useState<number | null>(null)
  const [node, setNode] = useState<PMNode | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [openSubmenu, setOpenSubmenu] = useState<Submenu>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const closeMenus = useCallback(() => {
    setMenuOpen(false)
    setOpenSubmenu(null)
  }, [])

  // Close the menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        closeMenus()
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenus()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen, closeMenus])

  // Runs before the drag handle's own mousemove handler: `handleDOMEvents`
  // resolves in plugin order and this one is prepended.
  useEffect(() => {
    if (!editor) return
    editor.registerPlugin(createGutterPlugin(editor), (plugin, plugins) => [plugin, ...plugins])
    return () => {
      if (!editor.isDestroyed) editor.unregisterPlugin(gutterPluginKey)
    }
  }, [editor])

  const computePositionConfig = useMemo<Partial<ComputePositionConfig>>(
    () => ({
      placement: 'left-start',
      strategy: 'absolute',
      middleware: [
        offset(({ rects }) => {
          const p = editor ? getPlacement(editor) : null
          const measured = p?.lineHeight || rects.reference.height
          const firstLine = Math.min(measured, rects.reference.height)
          // Clamp so a stale measurement can never push the handle past the
          // bottom of the block it points at.
          const lineTop = Math.min(
            p?.lineTop ?? 0,
            Math.max(0, rects.reference.height - firstLine)
          )
          return {
            mainAxis: p?.gap ?? GAP_DEFAULT,
            crossAxis: lineTop + Math.max(0, (firstLine - rects.floating.height) / 2),
          }
        }),
      ],
    }),
    [editor]
  )

  if (!editor) return null

  /* -------------------------------------------------------------- actions */

  const insertBelow = () => {
    if (pos === null || !node) return
    const insertAt = pos + node.nodeSize
    editor
      .chain()
      .focus()
      .insertContentAt(insertAt, { type: 'paragraph' })
      .command(({ tr, dispatch }) => {
        const $pos = tr.doc.resolve(Math.min(insertAt + 1, tr.doc.content.size - 1))
        if ($pos.parent.inlineContent) {
          if (dispatch) tr.setSelection(TextSelection.create(tr.doc, $pos.pos))
          return true
        }
        const found = TextSelection.findFrom(
          tr.doc.resolve(Math.min(insertAt, tr.doc.content.size)),
          1,
          true
        )
        if (found && dispatch) tr.setSelection(found)
        return true
      })
      .insertContent('/')
      .run()
  }

  const selectCurrentBlock = () => {
    if (pos === null || !node) return
    const { doc } = editor.state
    const from = doc.resolve(Math.min(pos + 1, doc.content.size))
    const to = doc.resolve(Math.min(pos + node.nodeSize - 1, doc.content.size))
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.between(from, to)))
  }

  const handleDuplicate = () => {
    if (pos === null || !node) return
    editor.chain().focus().insertContentAt(pos + node.nodeSize, node.toJSON()).run()
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

  const applyTextColor = (color: string) => {
    if (pos === null || !node) return
    selectCurrentBlock()
    if (color) editor.chain().focus().setColor(color).run()
    else editor.chain().focus().unsetColor().run()
    closeMenus()
  }

  const applyBgColor = (color: string) => {
    if (pos === null || !node) return
    selectCurrentBlock()
    if (color) editor.chain().focus().setHighlight({ color }).run()
    else editor.chain().focus().unsetHighlight().run()
    closeMenus()
  }

  /* --------------------------------------------------------- menu config */

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
    'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors'

  /** Toggle a submenu: clicking the same one closes it, clicking another switches. */
  const toggleSubmenu = (sub: Submenu) => {
    setOpenSubmenu((prev) => (prev === sub ? null : sub))
  }

  /* -------------------------------------------------------------- render */

  return (
    <DragHandle
      editor={editor}
      nested={NESTED_OPTIONS}
      computePositionConfig={computePositionConfig as ComputePositionConfig}
      onNodeChange={({ node: n, pos: nodePos }) => {
        setNode(n)
        setPos(nodePos)
        targets.set(editor, n ? nodePos : -1)

        const p = getPlacement(editor)
        p.gap = GAP_DEFAULT
        p.lineTop = 0
        p.lineHeight = 0

        if (!n || nodePos < 0) return
        const dom = editor.view.nodeDOM(nodePos)
        if (!(dom instanceof HTMLElement)) return
        Object.assign(p, measurePlacement(editor, dom))
      }}
      className="flex items-center gap-0.5"
    >
      <button
        type="button"
        onClick={insertBelow}
        title="Add block below"
        aria-label="Add block below"
        className="flex h-6 w-6 items-center justify-center rounded text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-700"
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
            setOpenSubmenu(null)
          }}
          title="Drag to move, click to open menu"
          aria-label="Block options"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex h-6 w-6 cursor-grab items-center justify-center rounded text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-700 active:cursor-grabbing"
        >
          <GripVertical {...ICON} />
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            role="menu"
            className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1.5 shadow-xl"
          >
            {/* Turn into */}
            <div className="relative">
              <button
                type="button"
                role="menuitem"
                aria-expanded={openSubmenu === 'turnInto'}
                className={itemClass}
                onClick={() => toggleSubmenu('turnInto')}
              >
                <Repeat2 {...ICON} className="shrink-0 text-gray-400" />
                <span className="flex-1">Turn into</span>
                <ChevronRight
                  size={14}
                  strokeWidth={1.5}
                  className={`text-gray-400 transition-transform duration-150 ${openSubmenu === 'turnInto' ? 'rotate-90' : ''}`}
                />
              </button>

              {openSubmenu === 'turnInto' && (
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

            {/* Color */}
            <div className="relative">
              <button
                type="button"
                role="menuitem"
                aria-expanded={openSubmenu === 'color'}
                className={itemClass}
                onClick={() => toggleSubmenu('color')}
              >
                <Palette {...ICON} className="shrink-0 text-gray-400" />
                <span className="flex-1">Color</span>
                <ChevronRight
                  size={14}
                  strokeWidth={1.5}
                  className={`text-gray-400 transition-transform duration-150 ${openSubmenu === 'color' ? 'rotate-90' : ''}`}
                />
              </button>

              {openSubmenu === 'color' && (
                <div
                  role="menu"
                  className="absolute left-full top-0 z-50 ml-1 w-48 rounded-lg border border-gray-200 bg-white p-2.5 shadow-xl"
                >
                  <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Text color
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        title={c.name}
                        onClick={() => applyTextColor(c.value)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-xs font-bold transition-all hover:scale-110 hover:border-gray-400"
                        style={{ color: c.swatch }}
                      >
                        A
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Background color */}
            <div className="relative">
              <button
                type="button"
                role="menuitem"
                aria-expanded={openSubmenu === 'bgColor'}
                className={itemClass}
                onClick={() => toggleSubmenu('bgColor')}
              >
                <Paintbrush {...ICON} className="shrink-0 text-gray-400" />
                <span className="flex-1">Background</span>
                <ChevronRight
                  size={14}
                  strokeWidth={1.5}
                  className={`text-gray-400 transition-transform duration-150 ${openSubmenu === 'bgColor' ? 'rotate-90' : ''}`}
                />
              </button>

              {openSubmenu === 'bgColor' && (
                <div
                  role="menu"
                  className="absolute left-full top-0 z-50 ml-1 w-48 rounded-lg border border-gray-200 bg-white p-2.5 shadow-xl"
                >
                  <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Background
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {BG_COLORS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        title={c.name}
                        onClick={() => applyBgColor(c.value)}
                        className="h-7 w-7 rounded-md border border-gray-200 transition-all hover:scale-110 hover:border-gray-400"
                        style={{ backgroundColor: c.swatch || '#ffffff' }}
                      />
                    ))}
                  </div>
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
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
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
