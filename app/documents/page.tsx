import Link from 'next/link'
import { redirect } from 'next/navigation'
import { initDB, listDocuments } from '@/lib/db'
import { getSession } from '@/lib/session'
import { FileText } from 'lucide-react'
import { CreateDocButton } from '@/components/CreateDocButton'
import { LogoutButton } from '@/components/LogoutButton'

export const metadata = {
  title: 'Documents',
  description: 'All your documents in one place.',
}

export const dynamic = 'force-dynamic'

export default async function DocumentsPage() {
  const session = await getSession()
  if (!session) {
    redirect('/')
  }

  let documents: Awaited<ReturnType<typeof listDocuments>> = []
  let error: string | null = null

  try {
    await initDB()
    documents = await listDocuments()
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load documents'
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Documents
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {documents.length} document{documents.length !== 1 ? 's' : ''}
              {' · '}
              {session.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CreateDocButton />
            <LogoutButton />
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!error && documents.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <FileText size={24} strokeWidth={1.5} className="text-gray-400" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              No documents yet
            </h2>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              Create your first document to start writing. Documents are saved
              automatically to the database.
            </p>
            <CreateDocButton className="mt-6" />
          </div>
        )}

        {/* Document list */}
        {documents.length > 0 && (
          <div className="grid gap-3">
            {documents.map((doc) => (
              <Link
                key={doc.id}
                href={`/editor/${doc.id}`}
                className="group flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-5 py-4 transition-all hover:border-gray-300 hover:shadow-sm active:scale-[0.995]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
                  <FileText size={20} strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium text-gray-900 group-hover:text-blue-600">
                    {doc.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Updated {formatRelativeDate(doc.updated_at)}
                  </p>
                </div>
                <span className="text-xs text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
                  Open
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
