'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Palette, ImageIcon, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  vendorId: number
  vendorName: string
  initialAccent: string | null
  initialFavicon: string | null
}

/** A small, tasteful set so most vendors never need the raw picker. */
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

/**
 * Per-vendor branding: an accent color and a favicon. Saving applies the accent
 * live to this vendor's pages (via the --vendor-accent CSS variable set by the
 * layout) after a refresh.
 */
export function VendorSettings({
  vendorId,
  vendorName,
  initialAccent,
  initialFavicon,
}: Props) {
  const router = useRouter()
  const [accent, setAccent] = useState(initialAccent || DEFAULT_ACCENT)
  const [favicon, setFavicon] = useState(initialFavicon || '')
  const [saving, setSaving] = useState(false)

  // Reflect the picked accent immediately in this settings card.
  const previewStyle = { ['--preview-accent' as string]: accent }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/dashboard/${vendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accentColor: accent,
          faviconUrl: favicon.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Save failed.')
        setSaving(false)
        return
      }
      toast.success('Vendor branding saved.')
      // Refresh so the layout re-reads the accent and favicon for this vendor.
      router.refresh()
    } catch {
      toast.error('Network error.')
    } finally {
      setSaving(false)
    }
  }

  const validHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(accent)

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette size={16} className="text-muted-foreground" />
            Branding
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Accent color and favicon for {vendorName}. Applies across this
            vendor&rsquo;s pages.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving || !validHex}
          className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white transition-[background-color,opacity] hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          style={{ backgroundColor: validHex ? accent : undefined }}
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          Save branding
        </button>
      </CardHeader>

      <CardContent className="space-y-6" style={previewStyle}>
        {/* Accent color */}
        <div>
          <label className="text-sm font-medium text-foreground">Accent color</label>
          <p className="mb-3 text-xs text-muted-foreground">
            Used for buttons, links, and highlights on this vendor&rsquo;s pages.
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
                  className={`flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110 ${
                    active ? 'ring-2 ring-foreground' : 'ring-1 ring-black/10'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {active && <Check size={14} className="text-white" strokeWidth={3} />}
                </button>
              )
            })}

            <span className="mx-1 h-6 w-px bg-border" />

            {/* Custom picker + hex input */}
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

          {/* Live sample */}
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <button
              type="button"
              className="rounded-md px-3 py-1.5 text-sm font-semibold text-white"
              style={{ backgroundColor: validHex ? accent : '#999' }}
            >
              Primary button
            </button>
            <a
              className="text-sm font-medium underline-offset-2 hover:underline"
              style={{ color: validHex ? accent : undefined }}
            >
              A themed link
            </a>
            <span
              className="ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: validHex ? `${accent}1a` : undefined,
                color: validHex ? accent : undefined,
              }}
            >
              Badge
            </span>
          </div>
        </div>

        {/* Favicon */}
        <div>
          <label htmlFor="favicon" className="text-sm font-medium text-foreground">
            Favicon
          </label>
          <p className="mb-3 text-xs text-muted-foreground">
            Shown in the browser tab for this vendor&rsquo;s pages. Use an https
            URL or an absolute path to a .ico / .png / .svg.
          </p>

          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
              {favicon.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={favicon}
                  alt=""
                  className="h-6 w-6 object-contain"
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).style.visibility = 'hidden'
                  }}
                />
              ) : (
                <ImageIcon size={16} className="text-muted-foreground" />
              )}
            </span>
            <input
              id="favicon"
              value={favicon}
              onChange={(e) => setFavicon(e.target.value)}
              spellCheck={false}
              placeholder="https://cdn.example.com/favicon.png"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
