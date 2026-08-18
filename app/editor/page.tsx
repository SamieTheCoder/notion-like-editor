import { TiptapEditor } from '@/components/editor/TiptapEditor'

export const metadata = {
  title: 'Editor — Notion-like Editor',
  description: 'A block-based editor that exports Tailwind-styled HTML.',
}

export default function EditorPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl px-4">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Notion-like Editor
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Block editor storing ProseMirror JSON and exporting HTML with
            Tailwind classes. Press{' '}
            <kbd className="rounded border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-xs">
              /
            </kbd>{' '}
            to insert a block.
          </p>
        </header>

        <TiptapEditor />
      </div>
    </main>
  )
}
