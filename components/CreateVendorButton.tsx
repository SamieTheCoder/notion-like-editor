'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Plus,
  X,
  Loader2,
  Building2,
  Check,
  ChevronDown,
  Upload,
} from 'lucide-react'

/** Small, tasteful accent set, matching the vendor Branding card. */
const PRESETS = [
  '#4F46E5', // indigo
  '#0EA5E9', // sky
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#EC4899', // pink
  '#8B5CF6', // violet
  '#111827', // near-black
]

const DEFAULT_ACCENT = '#4F46E5'

export function CreateVendorButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [accent, setAccent] = useState(DEFAULT_ACCENT)
  const [head, setHead] = useState('')
  const [footer, setFooter] = useState('')
  const [body, setBody] = useState('')

  const validHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(accent)
  // Preview the derived code the way the API will (uppercase, underscored).
  const derivedCode = (code || name)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  function reset() {
    setName('')
    setCode('')
    setAccent(DEFAULT_ACCENT)
    setHead('')
    setFooter('')
    setBody('')
    setShowAdvanced(false)
  }

  function onUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string) => void,
    label: string
  ) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setter(String(reader.result || ''))
      toast.success(`${label} loaded from ${file.name}.`)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Vendor name is required.')
      return
    }
    if (!validHex) {
      toast.error('Accent color must be a hex value like #4F46E5.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          code,
          primaryColor: accent,
          headHtml: head,
          footerHtml: footer,
          bodyHtml: body,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Create failed.')
        setSaving(false)
        return
      }
      toast.success('Vendor created.')
      setOpen(false)
      reset()
      router.push(`/editor?vendorId=${data.vendorId}`)
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
        className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 active:scale-[0.98]"
      >
        <Plus size={16} />
        New vendor
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
          onClick={() => !saving && setOpen(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="mt-10 mb-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
            style={
              validHex
                ? ({ '--primary': accent, '--ring': accent } as React.CSSProperties)
                : undefined
            }
          >
            {/* Header with a live identity chip, echoing the vendor list card */}
            <div className="flex items-start justify-between gap-4 border-b border-border p-6">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: validHex ? accent : '#999' }}
                >
                  <Building2 size={20} strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-foreground">
                    {name.trim() || 'New vendor'}
                  </h2>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {derivedCode || 'CODE'}
                  </p>
                </div>
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

            <div className="space-y-6 p-6">
              {/* Identity */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-sm font-medium text-foreground">Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                    placeholder="Acme School"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-foreground">
                    Code <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                    placeholder={derivedCode || 'ACME_SCHOOL'}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Derived from the name if left blank. Used in template slugs.
                  </p>
                </div>
              </div>

              {/* Accent, mirroring the Branding card */}
              <div>
                <label className="text-sm font-medium text-foreground">Accent color</label>
                <p className="mb-3 text-xs text-muted-foreground">
                  Themes this vendor&rsquo;s buttons, links, and highlights.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {PRESETS.map((c) => {
                    const active = accent.toLowerCase() === c.toLowerCase()
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setAccent(c)}
                        aria-label={`Use ${c}`}
                        aria-pressed={active}
                        className={`flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 ring-offset-card transition-transform hover:scale-110 ${
                          active ? 'ring-2 ring-foreground' : 'ring-1 ring-black/10'
                        }`}
                        style={{ backgroundColor: c }}
                      >
                        {active && (
                          <Check size={14} className="text-white" strokeWidth={3} />
                        )}
                      </button>
                    )
                  })}

                  <span className="mx-1 h-6 w-px bg-border" />

                  <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full ring-1 ring-black/10">
                    <input
                      type="color"
                      value={validHex ? accent : DEFAULT_ACCENT}
                      onChange={(e) => setAccent(e.target.value)}
                      className="absolute -inset-2 h-12 w-12 cursor-pointer border-0 bg-transparent p-0"
                      aria-label="Custom accent color"
                    />
                  </label>
                  <input
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    spellCheck={false}
                    placeholder="#4F46E5"
                    className={`h-8 w-28 rounded-md border bg-background px-2 font-mono text-xs text-foreground outline-none focus:ring-2 focus:ring-ring/30 ${
                      validHex ? 'border-input focus:border-ring' : 'border-destructive'
                    }`}
                  />
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
                  <span
                    className="rounded-md px-3 py-1.5 text-sm font-semibold text-white"
                    style={{ backgroundColor: validHex ? accent : '#999' }}
                  >
                    Primary button
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: validHex ? accent : undefined }}
                  >
                    A themed link
                  </span>
                </div>
              </div>

              {/* Advanced: optional email chrome, tucked away */}
              <div className="rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-foreground"
                >
                  <span>
                    Header, body, and footer HTML{' '}
                    <span className="text-muted-foreground">(optional)</span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-muted-foreground transition-transform ${
                      showAdvanced ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {showAdvanced && (
                  <div className="space-y-3 border-t border-border p-3">
                    <ModalField label="Header HTML" value={head} onChange={setHead} onUpload={(e) => onUpload(e, setHead, 'Header')} />
                    <ModalField label="Body HTML" value={body} onChange={setBody} onUpload={(e) => onUpload(e, setBody, 'Body')} />
                    <ModalField label="Footer HTML" value={footer} onChange={setFooter} onUpload={(e) => onUpload(e, setFooter, 'Footer')} />
                    <p className="text-xs text-muted-foreground">
                      You can also set these later from the vendor&rsquo;s
                      Header &amp; footer section.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border p-6">
              <button
                type="button"
                onClick={() => !saving && setOpen(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !validHex}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Create vendor
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

function ModalField({
  label,
  value,
  onChange,
  onUpload,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <label className="flex cursor-pointer items-center gap-1 text-xs font-medium text-primary hover:underline">
          <Upload size={12} strokeWidth={2} />
          Upload .html
          <input type="file" accept=".html,text/html" className="hidden" onChange={onUpload} />
        </label>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="block h-24 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        placeholder={`Paste ${label.toLowerCase()}…`}
      />
    </div>
  )
}
