'use client'

import { useCallback, useRef, useState } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  Trash2,
} from 'lucide-react'

const MIN_WIDTH = 80

export function ImageNodeView({ node, updateAttributes, selected, deleteNode }: NodeViewProps) {
  const { src, alt, width, align } = node.attrs
  const imgRef = useRef<HTMLImageElement>(null)
  const [resizing, setResizing] = useState(false)
  const [currentWidth, setCurrentWidth] = useState<number | null>(width)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)
  const sideRef = useRef<'left' | 'right'>('right')

  // Sync width from props without useEffect (use the render itself)
  if (!resizing && currentWidth !== width) {
    setCurrentWidth(width)
  }

  const onResizeStart = useCallback(
    (event: React.MouseEvent, side: 'left' | 'right') => {
      event.preventDefault()
      event.stopPropagation()

      const img = imgRef.current
      if (!img) return

      setResizing(true)
      startXRef.current = event.clientX
      startWidthRef.current = img.offsetWidth
      sideRef.current = side

      const onMouseMove = (e: MouseEvent) => {
        const diff = e.clientX - startXRef.current
        const multiplier = side === 'left' ? -1 : 1
        const newWidth = Math.max(MIN_WIDTH, startWidthRef.current + diff * multiplier)
        setCurrentWidth(newWidth)
      }

      const onMouseUp = (e: MouseEvent) => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        setResizing(false)

        const diff = e.clientX - startXRef.current
        const multiplier = side === 'left' ? -1 : 1
        const finalWidth = Math.max(MIN_WIDTH, startWidthRef.current + diff * multiplier)
        updateAttributes({ width: Math.round(finalWidth) })
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [updateAttributes]
  )

  const setAlign = useCallback(
    (newAlign: 'left' | 'center' | 'right') => {
      updateAttributes({ align: newAlign })
    },
    [updateAttributes]
  )

  const resetWidth = useCallback(() => {
    updateAttributes({ width: null })
    setCurrentWidth(null)
  }, [updateAttributes])

  const alignmentClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[(align || 'center') as 'left' | 'center' | 'right']

  return (
    <NodeViewWrapper
      className={`flex my-4 ${alignmentClass}`}
      data-drag-handle
    >
      <div
        className={`relative group inline-block ${
          selected ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg' : ''
        } ${resizing ? 'select-none' : ''}`}
      >
        {/* Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={alt || ''}
          draggable={false}
          className="rounded-lg block h-auto shadow-sm"
          style={{
            width: currentWidth ? `${currentWidth}px` : undefined,
            maxWidth: '100%',
          }}
        />

        {/* Resize handle - left */}
        <div
          className="absolute left-0 top-0 bottom-0 w-3 cursor-col-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={(e) => onResizeStart(e, 'left')}
        >
          <div className="w-1 h-8 rounded-full bg-blue-500/80" />
        </div>

        {/* Resize handle - right */}
        <div
          className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={(e) => onResizeStart(e, 'right')}
        >
          <div className="w-1 h-8 rounded-full bg-blue-500/80" />
        </div>

        {/* Width indicator while resizing */}
        {resizing && currentWidth && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 rounded bg-black/75 px-2 py-0.5 text-xs text-white font-mono">
            {Math.round(currentWidth)}px
          </div>
        )}

        {/* Toolbar - shown when selected */}
        {selected && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-lg bg-white border border-gray-200 shadow-lg px-1 py-0.5 z-10">
            <ToolbarBtn
              active={align === 'left'}
              onClick={() => setAlign('left')}
              title="Align left"
            >
              <AlignLeft size={15} strokeWidth={1.5} />
            </ToolbarBtn>
            <ToolbarBtn
              active={align === 'center'}
              onClick={() => setAlign('center')}
              title="Align center"
            >
              <AlignCenter size={15} strokeWidth={1.5} />
            </ToolbarBtn>
            <ToolbarBtn
              active={align === 'right'}
              onClick={() => setAlign('right')}
              title="Align right"
            >
              <AlignRight size={15} strokeWidth={1.5} />
            </ToolbarBtn>

            <span className="w-px h-5 bg-gray-200 mx-0.5" />

            <ToolbarBtn
              onClick={resetWidth}
              title="Reset to original size"
            >
              <Maximize2 size={15} strokeWidth={1.5} />
            </ToolbarBtn>

            <ToolbarBtn
              onClick={deleteNode}
              title="Delete image"
              className="text-red-500 hover:bg-red-50"
            >
              <Trash2 size={15} strokeWidth={1.5} />
            </ToolbarBtn>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

function ToolbarBtn({
  children,
  onClick,
  active,
  title,
  className = '',
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  title: string
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
        active
          ? 'bg-blue-100 text-blue-700'
          : `text-gray-600 hover:bg-gray-100 ${className}`
      }`}
    >
      {children}
    </button>
  )
}
