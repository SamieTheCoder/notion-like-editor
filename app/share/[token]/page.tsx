import { notFound } from 'next/navigation'
import { Mail, Eye, Calendar, Building2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface SharePageProps {
  params: Promise<{ token: string }>
}

async function getSharedTemplate(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/share/${token}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.success ? data.data : null
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params
  const data = await getSharedTemplate(token)

  if (!data) {
    notFound()
  }

  const { template, org } = data

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-white">
      {/* Header Bar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Mail size={14} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-800">{template.title}</h1>
              <p className="text-[11px] text-gray-400">
                Shared by {org.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Eye size={12} /> {template.viewCount || 0} views
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={12} /> {new Date(template.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </header>

      {/* Template Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {template.description && (
          <p className="text-sm text-gray-500 mb-6 bg-white rounded-xl border border-gray-100 px-5 py-3">
            {template.description}
          </p>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Template preview area */}
          <div className="p-8 min-h-[400px]">
            {template.content ? (
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-500 text-center">
                  Email template preview
                </p>
                {/* In a full implementation, this would render the ProseMirror JSON to HTML */}
                <pre className="text-xs bg-gray-50 rounded-lg p-4 overflow-auto max-h-[500px]">
                  {JSON.stringify(template.content, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">This template has no content yet.</p>
              </div>
            )}
          </div>

          {/* Variables used */}
          {template.variables && template.variables.length > 0 && (
            <div className="border-t border-gray-100 px-8 py-4">
              <h3 className="text-xs font-semibold text-gray-500 mb-2">Variables Used:</h3>
              <div className="flex flex-wrap gap-1.5">
                {template.variables.map((v: string) => (
                  <span key={v} className="text-[11px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100 font-mono">
                    #{v}#
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            Created with MailCraft — Email Template Editor
          </p>
        </div>
      </main>
    </div>
  )
}
