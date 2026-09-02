'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { X, Search, ChevronDown, ChevronRight, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { Editor } from '@tiptap/react'
import type { Variable } from '@/lib/variables'
import { invalidateVariableCache } from './extensions/VariableSuggestion'

interface VariablePanelProps {
  editor: Editor | null
  open: boolean
  onClose: () => void
  /** Vendor whose variables to load. Null loads the global set only. */
  vendorId?: number | null
  /** Admins can add new variables inline; members only insert existing ones. */
  canManage?: boolean
}

/**
 * Sidebar listing the merge-field variables available to this vendor, loaded
 * from /api/variables (admin-managed, no longer hardcoded).
 *
 * Inserting a variable closes the panel, so the flow returns to the document
 * straight after the token lands. Admins get an inline "add variable" form so
 * a missing token can be created without leaving the editor.
 */
export function VariablePanel({
  editor,
  open,
  onClose,
  vendorId = null,
  canManage = false,
}: VariablePanelProps) {
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [variables, setVariables] = useState<Variable[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ label: '', token: '', group: '', dummy: '' })
  // When the group select is set to "new", this holds the typed group name.
  const [newGroup, setNewGroup] = useState('')

  // Load once the panel is first opened, and again if the vendor changes.
  useEffect(() => {
    if (!open) return
    void refresh()
  }, [open, vendorId]) // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = vendorId != null ? `?vendorId=${vendorId}` : ''
      const r = await fetch(`/api/variables${qs}`)
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setError(d?.error || 'Could not load variables.')
        return
      }
      setVariables(Array.isArray(d.variables) ? d.variables : [])
    } catch {
      setError('Network error loading variables.')
    } finally {
      setLoading(false)
    }
  }, [vendorId])

  const toggleGroup = useCallback((name: string) => {
    setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }))
  }, [])

  const createVariable = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!form.token.trim()) {
        toast.error('A token name is required.')
        return
      }
      // "__new__" means the admin is typing a fresh group name.
      const groupName =
        form.group === '__new__' ? newGroup.trim() : form.group.trim()
      setSaving(true)
      try {
        const res = await fetch('/api/variables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorId,
            token: form.token,
            label: form.label || form.token,
            groupName,
            dummyValue: form.dummy,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(data.error || 'Could not add variable.')
          setSaving(false)
          return
        }
        toast.success('Variable added.')
        invalidateVariableCache()
        setForm({ label: '', token: '', group: '', dummy: '' })
        setNewGroup('')
        setAdding(false)
        await refresh()
        // Drop the new token straight into the document if the editor is ready.
        if (editor && data.variable?.token) {
          editor.chain().focus().insertMergeField(data.variable.token).run()
          onClose()
        }
      } catch {
        toast.error('Network error.')
      } finally {
        setSaving(false)
      }
    },
    [form, newGroup, vendorId, editor, onClose, refresh]
  )

  const insertVariable = useCallback(
    (variable: Variable) => {
      if (!editor) return
      editor.chain().focus().insertMergeField(variable.token).run()
      // Close on insert: the token is placed, so hand focus back to the doc.
      onClose()
    },
    [editor, onClose]
  )

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = q
      ? variables.filter(
          (v) =>
            v.label.toLowerCase().includes(q) ||
            v.token.toLowerCase().includes(q) ||
            v.dummy_value.toLowerCase().includes(q)
        )
      : variables

    const byGroup = new Map<string, Variable[]>()
    for (const v of matches) {
      const list = byGroup.get(v.group_name) ?? []
      list.push(v)
      byGroup.set(v.group_name, list)
    }
    return [...byGroup.entries()].map(([name, vars]) => ({ name, vars }))
  }, [variables, query])

  // Existing group names for the add-form dropdown (unique, alphabetical).
  const groupNames = useMemo(() => {
    const set = new Set<string>()
    for (const v of variables) if (v.group_name) set.add(v.group_name)
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [variables])

  if (!open) return null

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-l border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2.5">
        <span className="text-sm font-semibold text-gray-900">Variables</span>
        <button
          type="button"
          onClick={onClose}
          title="Close"
          aria-label="Close variable panel"
          className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      <div className="border-b border-gray-200 px-3 py-2">
        <label className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2">
          <Search size={13} strokeWidth={1.5} className="shrink-0 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search variables..."
            aria-label="Search variables"
            className="h-7 w-full border-0 bg-transparent text-xs text-gray-800 outline-none placeholder:text-gray-400"
          />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain p-2">
        {loading && (
          <div className="flex items-center justify-center gap-2 px-2 py-8 text-xs text-gray-400">
            <Loader2 size={13} className="animate-spin" />
            Loading variables
          </div>
        )}

        {!loading && error && (
          <p className="px-2 py-6 text-center text-xs text-red-600">{error}</p>
        )}

        {!loading && !error && variables.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-gray-400">
            No variables yet. An admin can add them from the vendor page.
          </p>
        )}

        {!loading && !error && variables.length > 0 && groups.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-gray-400">
            No variables match &ldquo;{query}&rdquo;
          </p>
        )}

        {groups.map((group) => {
          const isCollapsed = collapsed[group.name]
          return (
            <div key={group.name} className="mb-1">
              <button
                type="button"
                onClick={() => toggleGroup(group.name)}
                className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 hover:bg-gray-50"
              >
                {isCollapsed ? (
                  <ChevronRight size={12} strokeWidth={2} />
                ) : (
                  <ChevronDown size={12} strokeWidth={2} />
                )}
                {group.name}
                <span className="ml-auto text-[10px] font-normal text-gray-400">
                  {group.vars.length}
                </span>
              </button>

              {!isCollapsed && (
                <div className="ml-1">
                  {group.vars.map((variable) => (
                    <button
                      key={variable.id}
                      type="button"
                      onClick={() => insertVariable(variable)}
                      title={`Insert #${variable.token}#`}
                      className="flex w-full flex-col rounded-md px-2 py-1.5 text-left transition-colors hover:bg-blue-50"
                    >
                      <span className="text-xs font-medium text-gray-900">
                        {variable.label}
                      </span>
                      <span className="flex items-center gap-2 text-[11px] text-gray-500">
                        <code className="rounded bg-gray-100 px-1 py-px font-mono text-[10px] text-blue-700">
                          #{variable.token}#
                        </code>
                        <span className="truncate">{variable.dummy_value}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {canManage ? (
        <div className="border-t border-gray-200">
          {adding ? (
            <form onSubmit={createVariable} className="space-y-2 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-900">
                  New variable
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false)
                    setNewGroup('')
                  }}
                  className="text-gray-400 hover:text-gray-700"
                  aria-label="Cancel"
                >
                  <X size={13} />
                </button>
              </div>
              <input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Label (e.g. Lead Name)"
                className="block w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <input
                value={form.token}
                onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
                placeholder="TOKEN (e.g. LEAD_NAME)"
                className="block w-full rounded-md border border-gray-200 px-2 py-1.5 font-mono text-xs text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <div className="flex gap-2">
                <select
                  value={form.group}
                  onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))}
                  aria-label="Group"
                  className="block w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">No group (General)</option>
                  {groupNames.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                  <option value="__new__">+ New group…</option>
                </select>
                <input
                  value={form.dummy}
                  onChange={(e) => setForm((f) => ({ ...f, dummy: e.target.value }))}
                  placeholder="Sample"
                  className="block w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              {form.group === '__new__' && (
                <input
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  placeholder="New group name (e.g. Lead)"
                  autoFocus
                  className="block w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              )}
              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Add and insert
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex w-full items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
            >
              <Plus size={13} /> Add a variable
            </button>
          )}
        </div>
      ) : (
        <div className="border-t border-gray-200 px-3 py-2 text-[11px] text-gray-400">
          Click a variable to insert it. Or type{' '}
          <code className="font-mono">#</code> in the document to search inline.
        </div>
      )}
    </div>
  )
}
