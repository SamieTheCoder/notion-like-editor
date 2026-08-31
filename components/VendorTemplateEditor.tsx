'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'

interface Props {
  vendorId: number
  vendorName: string
  initialHeader: string
  initialFooter: string
}

/** Edits a vendor's shared header/footer HTML (used by all its templates). */
export function VendorShellEditor({
  vendorId,
  initialHeader,
  initialFooter,
}: Props) {
  const [header, setHeader] = useState(initialHeader)
  const [footer, setFooter] = useState(initialFooter)
  const [saving, setSaving] = useState(false)

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
      else toast.success('Header & footer saved.')
    } catch {
      toast.error('Network error.')
    } finally {
      setSaving(false)
    }
  }

  function onUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string) => void
  ) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setter(String(reader.result || ''))
    reader.readAsText(file)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Shared header & footer
          </h2>
          <p className="text-xs text-gray-400">
            Applied around every template body for this vendor.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Header HTML" value={header} onChange={setHeader} onUpload={(e) => onUpload(e, setHeader)} />
        <Field label="Footer HTML" value={footer} onChange={setFooter} onUpload={(e) => onUpload(e, setFooter)} />
      </div>
    </div>
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
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <label className="cursor-pointer text-xs text-blue-600 hover:underline">
          Upload .html
          <input type="file" accept=".html,text/html" className="hidden" onChange={onUpload} />
        </label>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="block h-40 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        placeholder={`Paste ${label.toLowerCase()} here…`}
      />
    </div>
  )
}
