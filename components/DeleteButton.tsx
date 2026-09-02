'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trash2, Loader2, X, TriangleAlert } from 'lucide-react'

interface Props {
  /** DELETE endpoint to call. */
  url: string
  /** What is being removed, shown in the dialog title. */
  label: string
  /** Extra warning shown for cascading deletes. */
  warning?: string
  /**
   * When set, the operator must type this exact string to enable the button.
   * Use for irreversible cascades (deleting a vendor and all its data).
   */
  confirmText?: string
  /** Accessible label for the icon trigger. */
  srLabel: string
}

export function DeleteButton({
  url,
  label,
  warning,
  confirmText,
  srLabel,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [typed, setTyped] = useState('')

  const armed = confirmText ? typed.trim() === confirmText : true

  async function run() {
    if (!armed || busy) return
    setBusy(true)
    try {
      const res = await fetch(url, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Delete failed.')
        setBusy(false)
        return
      }
      toast.success(`${label} deleted.`)
      setOpen(false)
      setTyped('')
      router.refresh()
    } catch {
      toast.error('Network error.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        title="Delete"
        aria-label={srLabel}
      >
        <Trash2 size={15} strokeWidth={1.75} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            className="mt-24 w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                  <TriangleAlert size={17} strokeWidth={2} />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Delete {label}?
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {warning || 'This cannot be undone.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !busy && setOpen(false)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {confirmText && (
              <div>
                <label
                  htmlFor="confirm-delete"
                  className="text-sm font-medium text-foreground"
                >
                  Type{' '}
                  <span className="font-mono text-destructive">
                    {confirmText}
                  </span>{' '}
                  to confirm
                </label>
                <input
                  id="confirm-delete"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => !busy && setOpen(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={run}
                disabled={!armed || busy}
                className="flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy && <Loader2 size={15} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
