'use client'

import { useState, useRef, useEffect } from 'react'
import { Palette } from 'lucide-react'

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

interface ColorPickerProps {
  onTextColor: (color: string) => void
  onBgColor: (color: string) => void
  /** Current active text color (for the indicator) */
  currentTextColor?: string
  /** Current active bg color (for the indicator) */
  currentBgColor?: string
  /** Light theme (toolbar) or dark theme (bubble menu) */
  variant?: 'light' | 'dark'
}

export function ColorPicker({
  onTextColor,
  onBgColor,
  currentTextColor,
  currentBgColor,
  variant = 'light',
}: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const isDark = variant === 'dark'

  const triggerClass = isDark
    ? `flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-sm transition-colors ${open ? 'bg-white/20 text-white' : 'text-gray-200 hover:bg-white/10'}`
    : `flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${open ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`

  const panelClass = isDark
    ? 'absolute left-1/2 bottom-full z-50 mb-2 -translate-x-1/2 w-52 rounded-lg bg-gray-800 border border-gray-700 p-3 shadow-xl'
    : 'absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 w-52 rounded-lg bg-white border border-gray-200 p-3 shadow-xl'

  const labelClass = isDark
    ? 'text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5'
    : 'text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Color"
        aria-expanded={open}
        title="Color"
        className={triggerClass}
      >
        <Palette size={isDark ? 15 : 16} strokeWidth={1.5} />
      </button>

      {open && (
        <div className={panelClass}>
          {/* Text color */}
          <div className={labelClass}>Text color</div>
          <div className="grid grid-cols-5 gap-1 mb-3">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                title={c.name}
                onClick={() => {
                  onTextColor(c.value)
                  setOpen(false)
                }}
                className={`flex h-7 w-7 items-center justify-center rounded-md border text-xs font-bold transition-all hover:scale-110 ${
                  currentTextColor === c.value
                    ? isDark ? 'border-white/60 ring-1 ring-white/30' : 'border-gray-900 ring-1 ring-gray-400'
                    : isDark ? 'border-gray-600 hover:border-gray-400' : 'border-gray-200 hover:border-gray-400'
                }`}
                style={{ color: c.swatch }}
              >
                A
              </button>
            ))}
          </div>

          {/* Background color */}
          <div className={labelClass}>Background color</div>
          <div className="grid grid-cols-5 gap-1">
            {BG_COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                title={c.name}
                onClick={() => {
                  onBgColor(c.value)
                  setOpen(false)
                }}
                className={`h-7 w-7 rounded-md border transition-all hover:scale-110 ${
                  currentBgColor === c.value
                    ? isDark ? 'border-white/60 ring-1 ring-white/30' : 'border-gray-900 ring-1 ring-gray-400'
                    : isDark ? 'border-gray-600 hover:border-gray-400' : 'border-gray-200 hover:border-gray-400'
                }`}
                style={{ backgroundColor: c.swatch || (isDark ? '#1f2937' : '#ffffff') }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
