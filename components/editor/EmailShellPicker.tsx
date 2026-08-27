'use client'

import { useEffect, useState } from 'react'
import { Mail, MailX } from 'lucide-react'
import type { EmailShellConfig } from '@/lib/email-shell'

export interface ShellOption {
  id: number
  slug: string
  name: string
  config: EmailShellConfig
}

/**
 * Loads the email shells stored in the database.
 *
 * A failure is non-fatal by design: the editor still works, it just renders
 * without the email frame. Losing the preview should never cost you the editor.
 */
export function useEmailShells() {
  const [shells, setShells] = useState<ShellOption[]>([])
  const [activeShellId, setActiveShellId] = useState<number | null>(null)
  const [showShell, setShowShell] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/email-templates')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: { templates: ShellOption[] }) => {
        if (cancelled) return
        const list = data.templates ?? []
        setShells(list)
        if (list.length > 0) setActiveShellId(list[0].id)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setShells([])
        setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const activeShell = shells.find((s) => s.id === activeShellId) ?? null

  return {
    shells,
    activeShell,
    activeShellId,
    setActiveShellId,
    showShell,
    setShowShell,
    error,
  }
}

interface EmailShellPickerProps {
  shells: ShellOption[]
  activeShellId: number | null
  onSelect: (id: number) => void
  showShell: boolean
  onToggle: () => void
}

/** Shell dropdown plus a toggle to hide the frame. */
export function EmailShellPicker({
  shells,
  activeShellId,
  onSelect,
  showShell,
  onToggle,
}: EmailShellPickerProps) {
  if (shells.length === 0) return null

  return (
    <>
      <select
        value={activeShellId ?? ''}
        onChange={(e) => onSelect(Number(e.target.value))}
        aria-label="Email shell"
        title="Which email shell frames this document"
        className="h-8 shrink-0 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 outline-none hover:bg-gray-50"
      >
        {shells.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={onToggle}
        aria-pressed={showShell}
        title={showShell ? 'Hide email header and footer' : 'Show email header and footer'}
        aria-label={showShell ? 'Hide email header and footer' : 'Show email header and footer'}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
          showShell
            ? 'bg-gray-900 text-white'
            : 'text-gray-400 hover:bg-gray-200 hover:text-gray-700'
        }`}
      >
        {showShell ? <Mail size={16} strokeWidth={1.5} /> : <MailX size={16} strokeWidth={1.5} />}
      </button>
    </>
  )
}
