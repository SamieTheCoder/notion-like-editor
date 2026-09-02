'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Eye, Braces, Code2, Copy, Check, Wand2, Send } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Field {
  token: string // "#TOKEN#"
  label: string
  dummy: string
}

interface Props {
  vendorId: number
  trigger: string
  fields: Field[]
  finalBody: string
  bodyJson: Record<string, unknown> | null
}

/** Client-side mirror of lib/compose-email substituteTokens (for live preview). */
function substitute(
  html: string,
  values: Record<string, string>
): { output: string; missing: string[] } {
  const provided = new Map<string, string>()
  for (const [k, v] of Object.entries(values)) {
    const t = k.replace(/^#+|#+$/g, '').trim().toUpperCase()
    if (t && v !== '') provided.set(t, v)
  }
  const missing = new Set<string>()
  const output = (html || '').replace(/#([A-Z0-9_]+)#/gi, (whole, name: string) => {
    const key = name.toUpperCase()
    if (provided.has(key)) return provided.get(key) as string
    missing.add(`#${name}#`)
    return whole
  })
  return { output, missing: Array.from(missing) }
}

type Tab = 'preview' | 'json' | 'api' | 'response'

export function TemplateTester({ vendorId, trigger, fields, finalBody, bodyJson }: Props) {
  // Pre-fill each input with its sample (dummy) value so the tester lands ready
  // to run. Fall back to empty when a token has no configured sample.
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.token, f.dummy || '']))
  )
  const [tab, setTab] = useState<Tab>('preview')
  const [copied, setCopied] = useState<string | null>(null)
  // "Paste response" workflow: the user pastes an API JSON response and we
  // extract final_body to render as the email.
  const [pasted, setPasted] = useState('')

  // Parse the pasted API response and pull out final_body (if present).
  const pastedResult = useMemo(() => {
    const text = pasted.trim()
    if (!text) return { html: '', error: null as string | null, info: null as string | null }
    try {
      const obj = JSON.parse(text)
      if (typeof obj.final_body === 'string' && obj.final_body) {
        return { html: obj.final_body, error: null, info: null }
      }
      if (Array.isArray(obj.missing_keys) && obj.missing_keys.length) {
        return {
          html: '',
          error: null,
          info: `No final_body — the API reported missing keys: ${obj.missing_keys.join(', ')}`,
        }
      }
      if (typeof obj.error === 'string') {
        return { html: '', error: obj.error, info: null }
      }
      return { html: '', error: 'No "final_body" field found in the pasted JSON.', info: null }
    } catch {
      return { html: '', error: 'Invalid JSON. Paste the full API response.', info: null }
    }
  }, [pasted])

  const { output, missing } = useMemo(
    () => substitute(finalBody, values),
    [finalBody, values]
  )

  const filledCount = fields.filter((f) => (values[f.token] ?? '') !== '').length

  // The exact JSON body the /api/templates/body endpoint expects.
  // `keys` is an ARRAY of { name, value } objects and includes every token the
  // template uses — even the ones left empty — so the caller sees the full set
  // and can iterate: keys.forEach(k => body.replace(k.name, k.value)).
  const apiPayload = useMemo(() => {
    const keys = fields.map((f) => ({ name: f.token, value: values[f.token] ?? '' }))
    return {
      apiKey: 'ak_your_key',
      secret: 'sk_your_secret',
      vendor_id: vendorId,
      trigger,
      keys,
    }
  }, [fields, values, vendorId, trigger])

  function fillDummy() {
    setValues((prev) => {
      const next = { ...prev }
      for (const f of fields) if (f.dummy) next[f.token] = f.dummy
      return next
    })
    toast.success('Filled with sample values.')
  }

  function clearAll() {
    setValues(Object.fromEntries(fields.map((f) => [f.token, ''])))
  }

  async function copy(text: string, which: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(which)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      toast.error('Could not copy.')
    }
  }

  const jsonStr = bodyJson ? JSON.stringify(bodyJson, null, 2) : '// No JSON body stored for this template.'
  const apiStr = JSON.stringify(apiPayload, null, 2)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      {/* Left: variable form */}
      <Card className="h-fit">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Braces size={16} className="text-muted-foreground" /> Variables
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {filledCount}/{fields.length} filled
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fillDummy}
              className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Wand2 size={13} /> Sample
            </button>
            <button
              onClick={clearAll}
              className="rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              This template has no variables.
            </p>
          ) : (
            fields.map((f) => (
              <div key={f.token}>
                <label className="flex items-center justify-between text-sm font-medium text-foreground">
                  <span>{f.label}</span>
                  <code className="font-mono text-[11px] text-muted-foreground">{f.token}</code>
                </label>
                <input
                  value={values[f.token] ?? ''}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [f.token]: e.target.value }))
                  }
                  placeholder={f.dummy || `value for ${f.token}`}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Right: tabs */}
      <Card className="min-w-0">
        <CardHeader className="pb-0">
          <div className="flex flex-wrap items-center gap-1 border-b border-border">
            {(
              [
                { id: 'preview', label: 'Rendered preview', icon: Eye },
                { id: 'json', label: 'JSON body', icon: Code2 },
                { id: 'api', label: 'API request', icon: Braces },
                { id: 'response', label: 'Paste response', icon: Send },
              ] as { id: Tab; label: string; icon: typeof Eye }[]
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  tab === id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {/* Missing-token banner (shown on preview + api tabs) */}
          {(tab === 'preview' || tab === 'api') && missing.length > 0 && (
            <div className="mb-3 rounded-md border border-amber-400/50 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
              {missing.length} unfilled: {missing.join(', ')}
            </div>
          )}
          {(tab === 'preview' || tab === 'api') && missing.length === 0 && fields.length > 0 && (
            <div className="mb-3 rounded-md border border-emerald-400/40 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              All variables filled.
            </div>
          )}

          {tab === 'preview' && (
            <div className="overflow-hidden rounded-lg border border-border bg-white">
              <iframe
                title="rendered-template"
                srcDoc={output}
                className="h-[600px] w-full"
              />
            </div>
          )}

          {tab === 'json' && (
            <div className="relative">
              <button
                onClick={() => copy(jsonStr, 'json')}
                className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                {copied === 'json' ? <Check size={13} /> : <Copy size={13} />}
                {copied === 'json' ? 'Copied' : 'Copy'}
              </button>
              <pre className="max-h-[600px] overflow-auto rounded-lg border border-border bg-muted/40 p-4 text-xs leading-relaxed text-foreground">
                <code>{jsonStr}</code>
              </pre>
            </div>
          )}

          {tab === 'api' && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                POST this body to <code className="font-mono">/api/templates/body</code>. Replace the
                key and secret with a real API key from Settings.
              </p>
              <div className="relative">
                <button
                  onClick={() => copy(apiStr, 'api')}
                  className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                >
                  {copied === 'api' ? <Check size={13} /> : <Copy size={13} />}
                  {copied === 'api' ? 'Copied' : 'Copy'}
                </button>
                <pre className="max-h-[600px] overflow-auto rounded-lg border border-border bg-muted/40 p-4 text-xs leading-relaxed text-foreground">
                  <code>{apiStr}</code>
                </pre>
              </div>
            </div>
          )}

          {tab === 'response' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Paste the JSON response from{' '}
                <code className="font-mono">/api/templates/body</code>. The{' '}
                <code className="font-mono">final_body</code> is extracted and rendered as
                the email below — exactly what the caller receives.
              </p>
              <textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder='{ "id": 22, "final_body": "…", "missing_keys": [] }'
                spellCheck={false}
                className="h-40 w-full resize-y rounded-lg border border-input bg-background p-3 font-mono text-xs text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              {pastedResult.error && (
                <div className="rounded-md border border-red-400/50 bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
                  {pastedResult.error}
                </div>
              )}
              {pastedResult.info && (
                <div className="rounded-md border border-amber-400/50 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                  {pastedResult.info}
                </div>
              )}
              {pastedResult.html && (
                <div className="overflow-hidden rounded-lg border border-border bg-white">
                  <iframe
                    title="pasted-response-email"
                    srcDoc={pastedResult.html}
                    className="h-[560px] w-full"
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
