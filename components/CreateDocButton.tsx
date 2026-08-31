'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Plus } from 'lucide-react'

export function CreateDocButton({ className = '' }: { className?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const create = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '',
          content: { type: 'doc', content: [{ type: 'paragraph' }] },
        }),
      })
      const data = await res.json()
      if (data.document?.id) {
        router.push(`/editor/${data.document.id}`)
      }
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={create}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 active:scale-[0.97] disabled:opacity-50 ${className}`}
    >
      <Plus size={16} strokeWidth={2} />
      {loading ? 'Creating...' : 'New document'}
    </button>
  )
}
