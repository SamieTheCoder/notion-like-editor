/**
 * Temporary verification script (delete after use).
 *
 * Measures the real rendered geometry of the block drag handle against the
 * blocks it points at, to prove:
 *   1. the handle never horizontally overlaps a list item's bullet marker
 *   2. the handle is vertically centered on the block's first text line
 *   3. the handle stays inside the editor's left gutter (not clipped)
 */
import { chromium } from 'playwright'

const URL = process.env.EDITOR_URL ?? 'http://localhost:3000/editor'

type Check = { label: string; ok: boolean; detail: string }
const checks: Check[] = []
const record = (label: string, ok: boolean, detail: string) =>
  checks.push({ label, ok, detail })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForSelector('.tiptap')

/** Hover a block and return geometry of the handle + the block. */
async function measure(selector: string, nth = 0) {
  const target = page.locator(`.tiptap ${selector}`).nth(nth)
  await target.hover()
  // Handle is portaled and positioned async by floating-ui.
  await page.waitForTimeout(350)

  return page.evaluate(
    ({ sel, index }) => {
      const el = document.querySelectorAll(`.tiptap ${sel}`)[index] as HTMLElement
      // The handle is the portaled element containing the grip button.
      const grip = document.querySelector<HTMLElement>('[aria-label="Block options"]')
      const handle = grip?.closest<HTMLElement>('div[style*="position"]') ?? grip?.parentElement?.parentElement ?? null
      if (!el || !handle) return null

      const blockRect = el.getBoundingClientRect()
      const handleRect = handle.getBoundingClientRect()

      // First line box of the block: use a Range over its first text node so
      // multi-line blocks report the first line, not the whole block.
      let firstLine = { top: blockRect.top, height: blockRect.height }
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      const textNode = walker.nextNode()
      if (textNode && textNode.textContent) {
        const r = document.createRange()
        r.setStart(textNode, 0)
        r.setEnd(textNode, Math.min(1, textNode.textContent.length))
        const rects = r.getClientRects()
        if (rects.length) firstLine = { top: rects[0].top, height: rects[0].height }
      }

      // Marker zone for list items: between the parent list's content edge
      // and the item's own left edge is where `list-outside` paints markers.
      let markerLeft: number | null = null
      const li = el.closest('li')
      if (li) {
        const list = li.parentElement as HTMLElement
        const cs = getComputedStyle(list)
        const listRect = list.getBoundingClientRect()
        markerLeft =
          listRect.left +
          parseFloat(cs.borderLeftWidth || '0') +
          parseFloat(cs.paddingLeft || '0') -
          parseFloat(cs.paddingLeft || '0')
      }

      const editor = document.querySelector('.tiptap') as HTMLElement
      const editorRect = editor.getBoundingClientRect()

      return {
        block: { left: blockRect.left, top: blockRect.top, height: blockRect.height },
        handle: {
          left: handleRect.left,
          right: handleRect.right,
          top: handleRect.top,
          height: handleRect.height,
        },
        firstLine,
        liLeft: li ? li.getBoundingClientRect().left : null,
        markerZoneLeft: markerLeft,
        editorLeft: editorRect.left,
      }
    },
    { sel: selector, index: nth }
  )
}

// ---------------------------------------------------------------- paragraph
const para = await measure('p', 1)
if (!para) {
  record('paragraph: handle found', false, 'handle or block not resolved')
} else {
  const centerDelta = Math.abs(
    para.handle.top + para.handle.height / 2 - (para.firstLine.top + para.firstLine.height / 2)
  )
  record(
    'paragraph: handle vertically centered on first line',
    centerDelta <= 2.5,
    `off by ${centerDelta.toFixed(2)}px`
  )
  record(
    'paragraph: handle left of text, no overlap',
    para.handle.right <= para.block.left + 0.5,
    `handle.right=${para.handle.right.toFixed(1)} block.left=${para.block.left.toFixed(1)}`
  )
  record(
    'paragraph: handle inside editor gutter',
    para.handle.left >= para.editorLeft - 0.5,
    `handle.left=${para.handle.left.toFixed(1)} editor.left=${para.editorLeft.toFixed(1)}`
  )
}

// ------------------------------------------------------------- bullet list
const li = await measure('ul li', 0)
if (!li) {
  record('bullet: handle found', false, 'handle or block not resolved')
} else {
  const centerDelta = Math.abs(
    li.handle.top + li.handle.height / 2 - (li.firstLine.top + li.firstLine.height / 2)
  )
  record(
    'bullet: handle vertically centered on first line',
    centerDelta <= 2.5,
    `off by ${centerDelta.toFixed(2)}px`
  )
  // The bullet marker is painted in the ~24px zone left of the li box.
  const markerZoneStart = (li.liLeft ?? 0) - 24
  record(
    'bullet: handle clears the bullet marker zone',
    li.handle.right <= markerZoneStart + 0.5,
    `handle.right=${li.handle.right.toFixed(1)} markerZoneStart=${markerZoneStart.toFixed(1)}`
  )
  record(
    'bullet: handle inside editor gutter',
    li.handle.left >= li.editorLeft - 0.5,
    `handle.left=${li.handle.left.toFixed(1)} editor.left=${li.editorLeft.toFixed(1)}`
  )
}

// ------------------------------------------------------------------ heading
const h = await measure('h1', 0)
if (!h) {
  record('heading: handle found', false, 'handle or block not resolved')
} else {
  const centerDelta = Math.abs(
    h.handle.top + h.handle.height / 2 - (h.firstLine.top + h.firstLine.height / 2)
  )
  record(
    'heading: handle vertically centered on first line',
    centerDelta <= 3.5,
    `off by ${centerDelta.toFixed(2)}px`
  )
}

// ------------------------------------------------------------------- report
let failed = 0
for (const c of checks) {
  if (!c.ok) failed++
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.label}  (${c.detail})`)
}
console.log(`\n${checks.length - failed}/${checks.length} geometry checks passed`)

await browser.close()
process.exit(failed > 0 ? 1 : 0)
