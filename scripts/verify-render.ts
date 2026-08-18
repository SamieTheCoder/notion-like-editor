/**
 * Verifies that every node/mark in the shared schema renders to Tailwind-classed
 * HTML through the same `generateHTML` path the API route uses.
 * Run with: npx tsx scripts/verify-render.ts
 */
import { generateHTML } from '@tiptap/html/server'
import { extensions } from '../lib/tiptap-extensions'

const doc = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'H1' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'H2' }] },
    { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'H3' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', marks: [{ type: 'bold' }], text: 'bold' },
        { type: 'text', text: ' ' },
        { type: 'text', marks: [{ type: 'italic' }], text: 'italic' },
        { type: 'text', text: ' ' },
        { type: 'text', marks: [{ type: 'underline' }], text: 'underline' },
        { type: 'text', text: ' ' },
        { type: 'text', marks: [{ type: 'strike' }], text: 'strike' },
        { type: 'text', text: ' ' },
        { type: 'text', marks: [{ type: 'code' }], text: 'code' },
        { type: 'text', text: ' ' },
        { type: 'text', marks: [{ type: 'highlight', attrs: { color: '#fef08a' } }], text: 'highlight' },
        { type: 'text', text: ' ' },
        { type: 'text', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }], text: 'link' },
        { type: 'text', text: ' ' },
        { type: 'text', marks: [{ type: 'subscript' }], text: 'sub' },
        { type: 'text', marks: [{ type: 'superscript' }], text: 'sup' },
      ],
    },
    {
      type: 'bulletList',
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'bullet' }] }] },
      ],
    },
    {
      type: 'orderedList',
      attrs: { start: 1 },
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'ordered' }] }] },
      ],
    },
    {
      type: 'taskList',
      content: [
        {
          type: 'taskItem',
          attrs: { checked: true },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'done' }] }],
        },
        {
          type: 'taskItem',
          attrs: { checked: false },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'todo' }] }],
        },
      ],
    },
    { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'quote' }] }] },
    {
      type: 'callout',
      attrs: { variant: 'warning' },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'careful' }] }],
    },
    {
      type: 'toggleBlock',
      attrs: { open: true },
      content: [
        { type: 'toggleSummary', content: [{ type: 'text', text: 'Summary' }] },
        { type: 'toggleContent', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hidden' }] }] },
      ],
    },
    {
      type: 'codeBlock',
      attrs: { language: 'typescript' },
      content: [{ type: 'text', text: 'const x: number = 1' }],
    },
    { type: 'horizontalRule' },
    { type: 'image', attrs: { src: 'https://example.com/a.png', alt: 'a', align: 'center' } },
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            { type: 'tableHeader', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Head' }] }] },
          ],
        },
        {
          type: 'tableRow',
          content: [
            { type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Cell' }] }] },
          ],
        },
      ],
    },
    { type: 'paragraph', attrs: { textAlign: 'center' }, content: [{ type: 'text', text: 'centered' }] },
  ],
}

const html = generateHTML(doc as never, extensions)

// Each entry: a human label plus a substring that must appear in the output.
const checks: [string, string][] = [
  ['h1 tailwind', 'text-4xl font-bold'],
  ['h2 tailwind', 'text-3xl font-bold'],
  ['h3 tailwind', 'text-2xl font-semibold'],
  ['paragraph', 'text-base leading-7'],
  ['bold', 'font-bold'],
  ['italic', '<em class="italic"'],
  ['underline', 'underline underline-offset-2'],
  ['strike', 'line-through'],
  ['inline code', 'text-pink-600'],
  ['highlight', '<mark'],
  ['link', 'text-blue-600 underline'],
  ['subscript', '<sub'],
  ['superscript', '<sup'],
  ['bullet list', 'list-disc'],
  ['ordered list', 'list-decimal'],
  ['task list', 'data-type="taskList"'],
  ['task checkbox', 'type="checkbox"'],
  ['task checked strike', 'line-through text-gray-400'],
  ['blockquote', 'border-l-4'],
  ['callout warning', 'bg-amber-50'],
  ['toggle details', '<details'],
  ['toggle summary', '<summary'],
  ['code block', 'bg-gray-900'],
  ['code language class', 'language-typescript'],
  ['horizontal rule', '<hr class="my-6'],
  ['image figure', '<figure'],
  ['image rounded', 'rounded-lg max-w-full'],
  ['table wrapper', 'overflow-x-auto'],
  ['table border', 'border-collapse'],
  ['table header', 'bg-gray-50'],
  ['table cell', 'px-3 py-2 align-top'],
  ['text align', 'text-align: center'],
]

let failed = 0
for (const [label, needle] of checks) {
  const ok = html.includes(needle)
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  ${ok ? '' : `(missing: ${needle})`}`)
}

console.log(`\n${checks.length - failed}/${checks.length} checks passed`)

if (failed > 0) {
  console.log('\n--- generated HTML ---\n')
  console.log(html)
  process.exit(1)
}
