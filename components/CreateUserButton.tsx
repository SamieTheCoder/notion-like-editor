'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { UserPlus, X, Loader2, Copy } from 'lucide-react'

/** Generate a readable 12-char temporary password. */
function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  const arr = new Uint32Array(12)
  crypto.getRandomValues(arr)
  for (let i = 0; i < 12; i++) out += chars[arr[i] % chars.length]
  return out
}

export function CreateUserButton({
  vendorId,
  vendorName,
  createsRole,
}: {
  vendorId: number
  vendorName: string
  createsRole: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const roleLabel =
    createsRole === 'ADMIN' ? 'admin' : createsRole === 'MEMBER' ? 'member' : 'user'

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [tempPassword, setTempPassword] = useState(genPassword())

  function reset() {
    setEmail('')
    setFirstName('')
    setLastName('')
    setTempPassword(genPassword())
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !firstName.trim()) {
      toast.error('Email and first name are required.')
      return
    }
    if (tempPassword.length < 8) {
      toast.error('Temporary password must be at least 8 characters.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          vendorId,
          tempPassword,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Create failed.')
        setSaving(false)
        return
      }
      toast.success(
        `User created. Share the temporary password — they'll be asked to change it on first login.`
      )
      setOpen(false)
      reset()
      router.refresh()
    } catch {
      toast.error('Network error.')
      setSaving(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 active:scale-[0.98]"
      >
        <UserPlus size={15} /> Add {roleLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
          onClick={() => !saving && setOpen(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="mt-16 w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Add {roleLabel}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {createsRole} · scoped to {vendorName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !saving && setOpen(false)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">
                  First name
                </label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  placeholder="Jane"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Last name <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  placeholder="Doe"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  placeholder="jane@vendor.com"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-foreground">
                  Temporary password
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    className="block w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(tempPassword)
                      toast.success('Copied.')
                    }}
                    className="flex items-center gap-1 rounded-md border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Copy size={13} /> Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempPassword(genPassword())}
                    className="rounded-md border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    New
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  The user must change this on first login.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => !saving && setOpen(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Create user
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
