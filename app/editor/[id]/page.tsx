import { notFound } from 'next/navigation'
import { initDB, getDocument } from '@/lib/db'
import { DocEditor } from '@/components/editor/DocEditor'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await initDB()
  const doc = await getDocument(id)
  return {
    title: doc ? `${doc.title} - Editor` : 'Document not found',
  }
}

export default async function EditorDocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await initDB()
  const doc = await getDocument(id)

  if (!doc) notFound()

  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl px-4">
        <DocEditor
          docId={doc.id}
          initialTitle={doc.title}
          initialContent={doc.content}
        />
      </div>
    </main>
  )
}
