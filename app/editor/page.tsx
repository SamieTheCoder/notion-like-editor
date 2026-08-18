import { TiptapEditor } from '@/components/editor/TiptapEditor'
import Link from 'next/link'

export const metadata = {
  title: 'Editor Demo',
  description: 'A block-based editor that exports Tailwind-styled HTML.',
}

export default function EditorPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl px-4">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Editor Demo
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Standalone demo. Press{' '}
              <kbd className="rounded border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-xs">
                /
              </kbd>{' '}
              to insert a block.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            All documents
          </Link>
        </header>

        <TiptapEditor />
      </div>
    </main>
  )
}
