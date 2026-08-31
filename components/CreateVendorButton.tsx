'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, X, Loader2 } from 'lucide-react'

export function CreateVendorButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#4F46E5')
  const [head, setHead] = useState('')
  const [footer, setFooter] = useState('')
  const [body, setBody] = useState('')

  function reset() {
    setName('')
    setCode('')
    setPrimaryColor('#4F46E5')
    setHead('')
    setFooter('')
    setBody('')
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

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Vendor name is required.')
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
          primaryColor,
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
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        <Plus size={16} />
        New vendor
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
          onClick={() => !saving && setOpen(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="mt-10 w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">New vendor</h2>
              <button
                type="button"
                onClick={() => !saving && setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Acme School"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Code <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="ACME_SCHOOL"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Primary color</label>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-gray-300"
                />
              </div>
            </div>

            <ModalField label="Header HTML" value={head} onChange={setHead} onUpload={(e) => onUpload(e, setHead)} />
            <ModalField label="Body HTML" value={body} onChange={setBody} onUpload={(e) => onUpload(e, setBody)} />
            <ModalField label="Footer HTML" value={footer} onChange={setFooter} onUpload={(e) => onUpload(e, setFooter)} />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => !saving && setOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Create
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
        className="block h-24 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        placeholder={`Paste ${label.toLowerCase()} (optional)…`}
      />
    </div>
  )
}
