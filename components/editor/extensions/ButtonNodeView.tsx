'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  ExternalLink,
  Link2,
  RotateCcw,
  Trash2,
  Type,
  TriangleAlert,
} from 'lucide-react'
import {
  BUTTON_ALIGN_CLASS,
  BUTTON_BG_SWATCHES,
  BUTTON_TEXT_SWATCHES,
  buildButtonClass,
  buildButtonStyle,
  sanitizeColor,
  sanitizeHref,
} from './ButtonNode'
import type { ButtonAlign, ButtonSize, ButtonVariant } from './ButtonNode'

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'outline', 'ghost']
const SIZES: ButtonSize[] = ['small', 'default', 'large']

/**
 * Shows the modifier the user actually has. Guarded for SSR, where there is no
 * navigator; the node view only renders client-side but the guard keeps this
 * safe if that ever changes.
 */
function modKeyLabel(): string {
  if (typeof navigator === 'undefined') return 'Ctrl'
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData?.platform ||
    navigator.platform ||
    ''
  return /mac|iphone|ipad|ipod/i.test(platform) ? '⌘' : 'Ctrl'
}

export function ButtonNodeView({
  node,
  updateAttributes,
  selected,
  deleteNode,
  editor,
}: NodeViewProps) {
  const label = String(node.attrs.label ?? '')
  const href = String(node.attrs.href ?? '')
  const variant = (node.attrs.variant || 'primary') as ButtonVariant
  const size = (node.attrs.size || 'default') as ButtonSize
  const align = (node.attrs.align || 'left') as ButtonAlign
  const bgColor = String(node.attrs.bgColor ?? '')
  const textColor = String(node.attrs.textColor ?? '')

  const isEditable = editor.isEditable
  const resolvedHref = sanitizeHref(href)
  const hrefRejected = href.trim() !== '' && resolvedHref === ''

  const styleInput = { variant, size, bgColor, textColor }
  const buttonClass = buildButtonClass(styleInput)
  const inlineStyle = buildButtonStyle(styleInput)

  const openLink = useCallback(() => {
    if (resolvedHref) window.open(resolvedHref, '_blank', 'noopener,noreferrer')
  }, [resolvedHref])

  // Turn the inline style string into a React style object.
  const styleObject: React.CSSProperties = {}
  for (const decl of inlineStyle.split(';')) {
    const [prop, value] = decl.split(':')
    if (!prop || !value) continue
    if (prop.trim() === 'background-color') styleObject.backgroundColor = value.trim()
    if (prop.trim() === 'color') styleObject.color = value.trim()
    if (prop.trim() === 'border-color') styleObject.borderColor = value.trim()
  }

  return (
    <NodeViewWrapper
      className={`relative my-4 ${BUTTON_ALIGN_CLASS[align]}`}
      data-node-type="buttonBlock"
      data-drag-handle
    >
      <span
        className={`relative inline-block ${
          selected ? 'ring-2 ring-blue-500 ring-offset-2 rounded-md' : ''
        }`}
      >
        <span
          className={buttonClass}
          style={styleObject}
          // Cmd/Ctrl-click follows the link, matching how the editor treats
          // ordinary links. A plain click selects the node for editing.
          onClick={(e) => {
            if ((e.metaKey || e.ctrlKey) && resolvedHref) {
              e.preventDefault()
              e.stopPropagation()
              openLink()
            }
          }}
          title={
            resolvedHref
              ? `${resolvedHref} — ${modKeyLabel()}-click to open`
              : undefined
          }
        >
          {label || 'Button'}
        </span>
      </span>

      {selected && isEditable && (
        <ButtonConfigPanel
          label={label}
          href={href}
          variant={variant}
          size={size}
          align={align}
          bgColor={bgColor}
          textColor={textColor}
          hrefRejected={hrefRejected}
          canOpen={Boolean(resolvedHref)}
          onOpen={openLink}
          onChange={updateAttributes}
          onDelete={deleteNode}
        />
      )}
    </NodeViewWrapper>
  )
}

interface ConfigProps {
  label: string
  href: string
  variant: ButtonVariant
  size: ButtonSize
  align: ButtonAlign
  bgColor: string
  textColor: string
  hrefRejected: boolean
  canOpen: boolean
  onOpen: () => void
  onChange: (attrs: Record<string, unknown>) => void
  onDelete: () => void
}

function ButtonConfigPanel({
  label,
  href,
  variant,
  size,
  align,
  bgColor,
  textColor,
  hrefRejected,
  canOpen,
  onOpen,
  onChange,
  onDelete,
}: ConfigProps) {
  const [draftLabel, setDraftLabel] = useState(label)
  const [draftHref, setDraftHref] = useState(href)
  const panelRef = useRef<HTMLSpanElement>(null)
  const [flipUp, setFlipUp] = useState(false)

  // If the panel would hang below the viewport, render it above the button.
  // Measured after layout so the decision uses the real panel height.
  useLayoutEffect(() => {
    const el = panelRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const overflowsBottom = rect.bottom > window.innerHeight - 8
    // Only flip when there is actually more usable room above.
    const roomAbove = rect.top
    if (overflowsBottom && roomAbove > rect.height) setFlipUp(true)
  }, [])

  // Re-sync drafts when the node changes underneath us (undo, remote edit).
  const [seen, setSeen] = useState({ label, href })
  if (seen.label !== label || seen.href !== href) {
    setSeen({ label, href })
    setDraftLabel(label)
    setDraftHref(href)
  }

  const commitLabel = useCallback(() => {
    const next = draftLabel.trim()
    if (next !== label) onChange({ label: next || 'Button' })
  }, [draftLabel, label, onChange])

  const commitHref = useCallback(() => {
    const next = draftHref.trim()
    if (next !== href) onChange({ href: next })
  }, [draftHref, href, onChange])

  return (
    <span
      // contentEditable={false} keeps ProseMirror from treating this UI as
      // document content, so keystrokes here never reach the editor.
      contentEditable={false}
      className={`absolute left-0 z-30 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-xl ${
        flipUp ? 'bottom-full mb-2' : 'top-full mt-2'
      }`}
      onMouseDown={(e) => e.stopPropagation()}
      ref={panelRef}
    >
      {/* Label */}
      <label className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2">
        <Type size={13} strokeWidth={1.5} className="shrink-0 text-gray-400" />
        <input
          value={draftLabel}
          onChange={(e) => setDraftLabel(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitLabel()
            }
          }}
          placeholder="Button label"
          aria-label="Button label"
          className="h-7 w-full border-0 bg-transparent text-xs text-gray-800 outline-none placeholder:text-gray-400"
        />
      </label>

      {/* Link + open */}
      <div className="flex items-center gap-1.5">
        <label
          className={`flex flex-1 items-center gap-1.5 rounded-md border px-2 ${
            hrefRejected ? 'border-amber-400' : 'border-gray-200'
          }`}
        >
          <Link2 size={13} strokeWidth={1.5} className="shrink-0 text-gray-400" />
          <input
            value={draftHref}
            onChange={(e) => setDraftHref(e.target.value)}
            onBlur={commitHref}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitHref()
              }
            }}
            placeholder="https://example.com"
            aria-label="Button link"
            className="h-7 w-full border-0 bg-transparent text-xs text-gray-800 outline-none placeholder:text-gray-400"
          />
        </label>
        <PanelBtn
          onClick={onOpen}
          title={canOpen ? 'Open link in a new tab' : 'Set a link first'}
          disabled={!canOpen}
        >
          <ExternalLink size={14} strokeWidth={1.5} />
        </PanelBtn>
      </div>

      {hrefRejected && (
        <span className="flex items-start gap-1.5 text-[11px] leading-4 text-amber-700">
          <TriangleAlert size={12} strokeWidth={1.5} className="mt-px shrink-0" />
          Only http, https, mailto and tel links are exported.
        </span>
      )}

      {/* Variant + size */}
      <div className="flex items-center gap-1.5">
        <select
          value={variant}
          onChange={(e) => onChange({ variant: e.target.value as ButtonVariant })}
          aria-label="Button style"
          className="h-7 flex-1 rounded-md border border-gray-200 bg-white px-1.5 text-xs text-gray-700 outline-none"
        >
          {VARIANTS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={size}
          onChange={(e) => onChange({ size: e.target.value as ButtonSize })}
          aria-label="Button size"
          className="h-7 flex-1 rounded-md border border-gray-200 bg-white px-1.5 text-xs text-gray-700 outline-none"
        >
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <ColorRow
        title="Background"
        swatches={BUTTON_BG_SWATCHES}
        current={bgColor}
        onPick={(value) => onChange({ bgColor: value })}
      />
      <ColorRow
        title="Text"
        swatches={BUTTON_TEXT_SWATCHES}
        current={textColor}
        onPick={(value) => onChange({ textColor: value })}
      />

      {/* Alignment + delete */}
      <div className="flex items-center gap-0.5 border-t border-gray-100 pt-2">
        <PanelBtn
          active={align === 'left'}
          onClick={() => onChange({ align: 'left' })}
          title="Align left"
        >
          <AlignLeft size={14} strokeWidth={1.5} />
        </PanelBtn>
        <PanelBtn
          active={align === 'center'}
          onClick={() => onChange({ align: 'center' })}
          title="Align center"
        >
          <AlignCenter size={14} strokeWidth={1.5} />
        </PanelBtn>
        <PanelBtn
          active={align === 'right'}
          onClick={() => onChange({ align: 'right' })}
          title="Align right"
        >
          <AlignRight size={14} strokeWidth={1.5} />
        </PanelBtn>

        <span className="ml-auto" />

        <PanelBtn onClick={onDelete} title="Delete button" danger>
          <Trash2 size={14} strokeWidth={1.5} />
        </PanelBtn>
      </div>

      {/* Discoverability: the click-to-open shortcut is not guessable. */}
      <span className="flex items-center gap-1 text-[11px] leading-4 text-gray-500">
        <kbd className="rounded border border-gray-200 bg-gray-50 px-1 font-sans text-[10px] text-gray-600">
          {modKeyLabel()}
        </kbd>
        <span>click the button to open its link</span>
      </span>
    </span>
  )
}

function ColorRow({
  title,
  swatches,
  current,
  onPick,
}: {
  title: string
  swatches: { name: string; value: string }[]
  current: string
  onPick: (value: string) => void
}) {
  const custom = sanitizeColor(current)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
          {title}
        </span>
        {current !== '' && (
          <button
            type="button"
            onClick={() => onPick('')}
            title={`Reset ${title.toLowerCase()} to the variant default`}
            aria-label={`Reset ${title.toLowerCase()} colour`}
            className="flex items-center gap-1 rounded px-1 text-[11px] text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <RotateCcw size={11} strokeWidth={1.5} />
            Reset
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {swatches.map((s) => (
          <button
            key={s.value}
            type="button"
            title={s.name}
            aria-label={`${title} ${s.name}`}
            aria-pressed={custom.toLowerCase() === s.value.toLowerCase()}
            onClick={() => onPick(s.value)}
            className={`h-6 w-6 shrink-0 rounded border transition-transform hover:scale-110 ${
              custom.toLowerCase() === s.value.toLowerCase()
                ? 'border-gray-900 ring-1 ring-gray-400'
                : 'border-gray-200'
            }`}
            style={{ backgroundColor: s.value }}
          />
        ))}

        {/* Native picker for anything outside the swatch list. The input covers
            the whole chip so a click anywhere on it opens the OS picker. */}
        <label
          className="relative flex h-6 shrink-0 cursor-pointer items-center gap-1 overflow-hidden rounded border border-gray-200 px-1.5 text-[11px] text-gray-600 hover:bg-gray-50"
          title={`Custom ${title.toLowerCase()} colour`}
        >
          <span
            aria-hidden
            className="h-3 w-3 rounded-sm border border-gray-300"
            style={{
              backgroundColor: custom || 'transparent',
              backgroundImage: custom
                ? undefined
                : 'linear-gradient(45deg,#e5e7eb 25%,transparent 25%,transparent 75%,#e5e7eb 75%)',
              backgroundSize: custom ? undefined : '6px 6px',
            }}
          />
          Custom
          <input
            type="color"
            value={custom || '#2563eb'}
            onChange={(e) => onPick(e.target.value)}
            aria-label={`Custom ${title.toLowerCase()} colour`}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  )
}

function PanelBtn({
  children,
  onClick,
  active,
  title,
  danger,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  title: string
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'bg-blue-100 text-blue-700'
          : danger
            ? 'text-red-500 hover:bg-red-50'
            : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}
