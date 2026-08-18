/**
 * Verifies the HTML export is actually usable, not just well-formed:
 *
 *  1. `formatHTML` indents the one-line renderer output without changing what
 *     a browser would parse.
 *  2. `wrapStandaloneHTML` produces a document that renders STYLED on its own.
 *     A bare Tailwind fragment renders as unstyled serif text, which is the
 *     failure this script exists to catch.
 *
 * Run with: npm run verify:export
 */
import { chromium } from 'playwright'
import { writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generateHTML } from '@tiptap/html/server'
import { formatHTML, wrapStandaloneHTML } from '../lib/html-export'
import { extensions } from '../lib/tiptap-extensions'

const doc = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Welcome to your editor' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Press ' },
        { type: 'text', marks: [{ type: 'code' }], text: '/' },
        { type: 'text', text: ' to insert a block.' },
      ],
    },
    {
      type: 'callout',
      attrs: { variant: 'info' },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Stored as ProseMirror JSON.' }] }],
    },
    {
      type: 'bulletList',
      content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A bullet' }] }] }],
    },
    {
      type: 'codeBlock',
      attrs: { language: 'typescript' },
      content: [{ type: 'text', text: 'const a = 1\nconst b = 2' }],
    },
    {
      type: 'toggleBlock',
      attrs: { open: true },
      content: [
        { type: 'toggleSummary', content: [{ type: 'text', text: 'Details' }] },
        { type: 'toggleContent', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Body.' }] }] },
      ],
    },
  ],
}

const results: [string, boolean][] = []
const check = (label: string, ok: boolean) => results.push([label, ok])

async function main() {
  const fragment = generateHTML(doc as never, extensions)
  const formatted = formatHTML(fragment)

  /* -- formatting ---------------------------------------------------------- */

  // The renderer emits no layout whitespace. Newlines can still appear inside
  // <pre>, where they are content, so test for indentation between tags.
  check('raw renderer output has no layout indentation', !/\n\s*</.test(fragment))
  check('formatted output is multi-line', formatted.split('\n').length > 5)
  check('formatted output is indented', /\n {2}\S/.test(formatted))

  // Formatting must be presentational only.
  const normalize = (s: string) => s.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim()
  check('formatting preserves parsed markup', normalize(formatted) === normalize(fragment))

  // Code block newlines are content, not layout.
  check('pre content preserved verbatim', formatted.includes('const a = 1\nconst b = 2'))

  // A sentence must never be split across lines.
  check(
    'inline runs stay on one line',
    formatted.includes('<p class="text-base leading-7 mb-2">Press <code')
  )

  /* -- standalone document ------------------------------------------------- */

  const file = join(tmpdir(), `export-verify-${Date.now()}.html`)
  writeFileSync(file, wrapStandaloneHTML(fragment, { title: 'Export verification' }))

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(`file://${file}`)
    // Tailwind's browser build compiles utilities after load.
    await page.waitForFunction(() => document.styleSheets.length > 1, undefined, {
      timeout: 15000,
    })

    const probe = await page.evaluate(
      (selectors: string[]) =>
        selectors.map((sel) => {
          const el = document.querySelector(sel)
          if (!el) return null
          const cs = getComputedStyle(el)
          return {
            fontSize: cs.fontSize,
            fontWeight: cs.fontWeight,
            fontFamily: cs.fontFamily.split(',')[0].replace(/"/g, ''),
            background: cs.backgroundColor,
            paddingLeft: cs.paddingLeft,
          }
        }),
      ['h1', '[data-type="callout"]', '[data-type="toggleBlock"]', 'pre']
    )

    const [h1, callout, toggle, pre] = probe
    const painted = (c?: string) => !!c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent'

    // 36px proves text-4xl applied; an unstyled h1 computes to 32px.
    check('h1 renders at text-4xl (36px), not browser default', parseFloat(h1?.fontSize ?? '0') === 36)
    check('h1 renders bold via font-bold', h1?.fontWeight === '700')
    check('Geist is applied, not a serif fallback', /Geist/i.test(h1?.fontFamily ?? ''))
    check('callout background is painted', painted(callout?.background))
    check('code block background is painted', painted(pre?.background))
    check('toggle px-3 padding applied (12px)', parseFloat(toggle?.paddingLeft ?? '0') === 12)
  } finally {
    await browser.close()
    try {
      unlinkSync(file)
    } catch {
      // Best effort; the temp file is harmless if it survives.
    }
  }

  let failed = 0
  for (const [label, ok] of results) {
    if (!ok) failed++
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
  }
  console.log(`\n${results.length - failed}/${results.length} checks passed`)
  if (failed > 0) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
