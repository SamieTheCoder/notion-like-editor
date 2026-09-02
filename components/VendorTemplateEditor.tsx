'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Save, Loader2, Upload, Eye, Code2, Monitor, Smartphone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Props {
  vendorId: number
  vendorName: string
  initialHeader: string
  initialFooter: string
}

/** Neutral filler so the preview shows where a template body would sit. */
const BODY_PLACEHOLDER = `
  <div style="padding:24px 0;font:14px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#3f3f46;">
    <p style="margin:0 0 12px;"><strong>Template body</strong></p>
    <p style="margin:0;">Each template's content renders here, between the header above and the footer below.</p>
  </div>
`

/** Edits a vendor's shared header/footer HTML (used by all its templates). */
export function VendorShellEditor({
  vendorId,
  vendorName,
  initialHeader,
  initialFooter,
}: Props) {
  const [header, setHeader] = useState(initialHeader)
  const [footer, setFooter] = useState(initialFooter)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'code' | 'preview'>(
    // Default to preview when there is something to show; new vendors with no
    // header/footer yet start on code so the empty state is not the first thing.
    initialHeader.trim() || initialFooter.trim() ? 'preview' : 'code'
  )
  const [width, setWidth] = useState<'desktop' | 'mobile'>('desktop')

  const hasContent = header.trim().length > 0 || footer.trim().length > 0

  // Assembled document for the preview iframe. Rebuilt only when inputs change.
  const previewDoc = useMemo(
    () =>
      `<!doctype html><html><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<base target="_blank">` +
      `<style>html,body{margin:0;padding:0;background:#ffffff;}</style>` +
      `</head><body>${header}${BODY_PLACEHOLDER}${footer}</body></html>`,
    [header, footer]
  )

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/dashboard/${vendorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headerHtml: header, footerHtml: footer }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) toast.error(data.error || 'Save failed.')
      else toast.success('Header and footer saved.')
    } catch {
      toast.error('Network error.')
    } finally {
      setSaving(false)
    }
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
      setTab('preview')
    }
    reader.onerror = () => toast.error(`Could not read ${file.name}.`)
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="text-base">Shared header and footer</CardTitle>
          <p className="text-sm text-muted-foreground">
            Wrapped around every template body for {vendorName}.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex rounded-md border border-border p-0.5">
            <TabButton
              active={tab === 'code'}
              onClick={() => setTab('code')}
              icon={<Code2 size={14} strokeWidth={1.75} />}
              label="Code"
            />
            <TabButton
              active={tab === 'preview'}
              onClick={() => setTab('preview')}
              icon={<Eye size={14} strokeWidth={1.75} />}
              label="Preview"
            />
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} strokeWidth={1.75} />
            )}
            Save
          </button>
        </div>
      </CardHeader>

      <CardContent>
        {tab === 'code' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Header HTML"
              value={header}
              onChange={setHeader}
              onUpload={(e) => onUpload(e, setHeader, 'Header')}
            />
            <Field
              label="Footer HTML"
              value={footer}
              onChange={setFooter}
              onUpload={(e) => onUpload(e, setFooter, 'Footer')}
            />
          </div>
        ) : hasContent ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Header, a sample body, then footer, exactly how every template is
                assembled for this vendor.
              </p>
              <div className="flex rounded-md border border-border p-0.5">
                <TabButton
                  active={width === 'desktop'}
                  onClick={() => setWidth('desktop')}
                  icon={<Monitor size={14} strokeWidth={1.75} />}
                  label="Desktop"
                />
                <TabButton
                  active={width === 'mobile'}
                  onClick={() => setWidth('mobile')}
                  icon={<Smartphone size={14} strokeWidth={1.75} />}
                  label="Mobile"
                />
              </div>
            </div>

            {/* An email-client-like backdrop: neutral canvas with the message
                floating as a white sheet, so the preview reads as a real inbox
                rather than a raw HTML dump. */}
            <div className="flex justify-center rounded-lg border border-border bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:16px_16px] p-4 dark:bg-muted/40">
              <div
                className={cn(
                  'w-full overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5 transition-[max-width]',
                  width === 'mobile' ? 'max-w-[390px]' : 'max-w-[640px]'
                )}
              >
                <iframe
                  // `sandbox` with no allow-scripts: pasted HTML renders but
                  // cannot execute JavaScript against this origin.
                  sandbox=""
                  title="Header and footer preview"
                  srcDoc={previewDoc}
                  className="h-[560px] w-full bg-white"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border px-6 py-12 text-center">
            <p className="text-sm font-medium text-foreground">Nothing to preview yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Paste or upload header and footer HTML in the Code tab. The preview
              appears here as soon as there is something to show.
            </p>
            <button
              onClick={() => setTab('code')}
              className="mt-4 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Add HTML
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function Field({
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
  const id = label.replace(/\s+/g, '-').toLowerCase()
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <label className="flex cursor-pointer items-center gap-1 text-xs font-medium text-primary hover:underline">
          <Upload size={12} strokeWidth={2} />
          Upload .html
          <input
            type="file"
            accept=".html,text/html"
            className="hidden"
            onChange={onUpload}
          />
        </label>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="block h-40 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        placeholder={`Paste ${label.toLowerCase()} here`}
      />
      <p className="mt-1 text-xs text-muted-foreground">
        {value.trim().length > 0
          ? `${value.length.toLocaleString()} characters`
          : 'Empty'}
      </p>
    </div>
  )
}
