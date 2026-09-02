'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { KeyRound, Loader2, Plus, Copy, Check, Trash2, TriangleAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface ApiKeyView {
  id: number
  api_key: string
  status: string
  label: string | null
  created_at: string
  expires_at: string | null
  last_used_at: string | null
}

interface Props {
  vendorId: number
  vendorName: string
  initialKeys: ApiKeyView[]
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Admin API-key management for a vendor.
 *
 * The secret returned when a key is created is shown exactly once, in a callout
 * the operator must copy before dismissing. Only the public `api_key` and
 * metadata are ever listed afterwards.
 */
export function ApiKeysCard({ vendorId, vendorName, initialKeys }: Props) {
  const [keys, setKeys] = useState<ApiKeyView[]>(initialKeys)
  const [label, setLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [revokingId, setRevokingId] = useState<number | null>(null)
  // The one-time secret + its api_key, held only until the operator dismisses it.
  const [freshSecret, setFreshSecret] = useState<{ apiKey: string; secret: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function createKey() {
    setCreating(true)
    try {
      const res = await fetch(`/api/dashboard/${vendorId}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Create failed.')
        return
      }
      const key = data.key as ApiKeyView & { secret: string }
      setFreshSecret({ apiKey: key.api_key, secret: key.secret })
      setKeys((prev) => [
        {
          id: key.id,
          api_key: key.api_key,
          status: key.status,
          label: key.label,
          created_at: key.created_at,
          expires_at: key.expires_at,
          last_used_at: key.last_used_at,
        },
        ...prev,
      ])
      setLabel('')
      toast.success('API key created. Copy the secret now — it won\u2019t be shown again.')
    } catch {
      toast.error('Network error.')
    } finally {
      setCreating(false)
    }
  }

  async function revokeKey(id: number) {
    setRevokingId(id)
    try {
      const res = await fetch(`/api/dashboard/${vendorId}/api-keys?id=${id}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Revoke failed.')
        return
      }
      setKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, status: 'REVOKED' } : k))
      )
      toast.success('API key revoked.')
    } catch {
      toast.error('Network error.')
    } finally {
      setRevokingId(null)
    }
  }

  async function copySecret() {
    if (!freshSecret) return
    try {
      await navigator.clipboard.writeText(freshSecret.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Could not copy to clipboard.')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound size={16} className="text-muted-foreground" />
            API keys
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Keys for programmatic access on behalf of {vendorName}. The secret is
            shown once at creation.
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* One-time secret callout */}
        {freshSecret && (
          <div className="rounded-lg border border-amber-400/50 bg-amber-50 p-3 dark:bg-amber-950/30">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
              <TriangleAlert size={15} />
              Copy your secret now — it won&rsquo;t be shown again.
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground">Key: </span>
                <code className="break-all font-mono">{freshSecret.apiKey}</code>
              </div>
              <div className="flex items-start gap-2">
                <code className="min-w-0 flex-1 break-all rounded-md border border-border bg-background px-2 py-1.5 font-mono">
                  {freshSecret.secret}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  className="flex shrink-0 items-center gap-1 rounded-md border border-input bg-background px-2 py-1.5 font-medium transition-colors hover:bg-muted"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFreshSecret(null)}
              className="mt-2 text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
            >
              I&rsquo;ve saved it — dismiss
            </button>
          </div>
        )}

        {/* Create */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor="api-key-label" className="text-sm font-medium text-foreground">
              New key label <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="api-key-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Production server"
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <button
            onClick={createKey}
            disabled={creating}
            className="flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Generate key
          </button>
        </div>

        {/* List */}
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Key</th>
                <th className="px-3 py-2 font-medium">Label</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium">Last used</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {keys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                    No API keys yet.
                  </td>
                </tr>
              ) : (
                keys.map((k) => {
                  const revoked = k.status !== 'ACTIVE'
                  return (
                    <tr key={k.id} className="border-t border-border">
                      <td className="px-3 py-2">
                        <code className="font-mono text-xs">{k.api_key}</code>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{k.label || '—'}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            revoked
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          }`}
                        >
                          {k.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDate(k.created_at)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDate(k.last_used_at)}</td>
                      <td className="px-3 py-2 text-right">
                        {!revoked && (
                          <button
                            onClick={() => revokeKey(k.id)}
                            disabled={revokingId === k.id}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                          >
                            {revokingId === k.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
