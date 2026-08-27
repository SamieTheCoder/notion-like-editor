/**
 * Verifies the drag handle for blocks nested inside a decorated container
 * (callout, quote). Regression covered:
 *
 *   Hovering a paragraph inside a callout showed a handle, but moving the
 *   pointer left toward it swapped the target to the whole callout — the
 *   line's handle vanished and the callout's handle appeared instead.
 *
 * Asserts, while walking the pointer from the text out to the gutter:
 *   1. the handle stays locked to the hovered line (no jump to the container)
 *   2. the handle never overlaps the container's tinted background
 *   3. the handle stays visible for the whole approach
 *   4. the container itself is still reachable via its first line
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

/* ---------------------------------------------------------------- fixtures */

// The demo callout ships with a single paragraph. Add a second one so there is
// a nested block that is not the container's first line.
const calloutPara = page.locator('.tiptap [data-type="callout"] p').first()
await calloutPara.click()
await page.keyboard.press('End')
await page.keyboard.press('Enter')
await page.keyboard.type('Second line inside the callout')

// Build a quote with two paragraphs on the trailing empty line.
await page.locator('.tiptap > p').last().click()
await page.keyboard.press('End')
await page.keyboard.type('> Quote line one')
await page.keyboard.press('Enter')
await page.keyboard.type('Quote line two')

await page.waitForTimeout(200)

/* ----------------------------------------------------------------- helpers */

type Box = { left: number; right: number; top: number; bottom: number; height: number }

/** Rect of a block plus the rect of its first line of text. */
async function boxes(selector: string, nth: number) {
  return page.evaluate(
    ({ sel, index }) => {
      const el = document.querySelectorAll<HTMLElement>(sel)[index]
      if (!el) return null
      const r = el.getBoundingClientRect()
      const box = { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height }

      let line = box
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      for (let t = walker.nextNode(); t; t = walker.nextNode()) {
        if (!t.textContent?.trim()) continue
        const range = document.createRange()
        range.setStart(t, 0)
        range.setEnd(t, 1)
        const lr = range.getClientRects()[0]
        if (lr && lr.height > 0) {
          line = { left: lr.left, right: lr.right, top: lr.top, bottom: lr.bottom, height: lr.height }
          break
        }
      }
      return { box, line }
    },
    { sel: selector, index: nth }
  ) as Promise<{ box: Box; line: Box } | null>
}

/** Current handle rect + visibility. */
async function handleState() {
  return page.evaluate(() => {
    const grip = document.querySelector<HTMLElement>('[aria-label="Block options"]')
    const handle = grip?.closest<HTMLElement>('div[style*="position"]')
    if (!handle) return null
    const r = handle.getBoundingClientRect()
    return {
      left: r.left,
      right: r.right,
      top: r.top,
      bottom: r.bottom,
      height: r.height,
      visible: getComputedStyle(handle).visibility !== 'hidden',
    }
  })
}

const center = (b: { top: number; height: number }) => b.top + b.height / 2

/**
 * Walk the pointer from inside the text out to the gutter, sampling the handle
 * at every step. Returns the worst deviation seen.
 */
async function approach(startX: number, y: number, endX: number) {
  const samples: { x: number; centerDelta: number; right: number; visible: boolean }[] = []
  for (let x = startX; x >= endX; x -= 4) {
    await page.mouse.move(x, y)
    await page.waitForTimeout(40)
    const h = await handleState()
    if (!h) {
      samples.push({ x, centerDelta: Number.POSITIVE_INFINITY, right: Number.NaN, visible: false })
      continue
    }
    samples.push({ x, centerDelta: Math.abs(center(h) - y), right: h.right, visible: h.visible })
  }
  return samples
}

/* -------------------------------------------------- nested block: callout */

const callout = await boxes('.tiptap [data-type="callout"]', 0)
const nested = await boxes('.tiptap [data-type="callout"] p', 1)

if (!callout || !nested) {
  record('callout: fixture built', false, 'callout or nested paragraph not found')
} else {
  const lineY = center(nested.line)
  const samples = await approach(nested.box.left + 60, lineY, callout.box.left - 16)

  const worst = samples.reduce((a, b) => (b.centerDelta > a.centerDelta ? b : a))
  record(
    'callout: handle stays on the hovered line while the pointer approaches',
    worst.centerDelta <= 3,
    `worst drift ${worst.centerDelta.toFixed(2)}px at x=${worst.x} (callout first line is ${Math.abs(lineY - center(callout.line)).toFixed(0)}px away)`
  )

  const hidden = samples.filter((s) => !s.visible)
  record(
    'callout: handle never disappears during the approach',
    hidden.length === 0,
    `${hidden.length}/${samples.length} samples hidden`
  )

  const overlapping = samples.filter((s) => s.right > callout.box.left + 0.5)
  record(
    'callout: handle sits in the gutter, never over the tinted background',
    overlapping.length === 0,
    `${overlapping.length}/${samples.length} samples overlap (callout.left=${callout.box.left.toFixed(1)})`
  )
}

/* ---------------------------------------------------- container reachable */

if (callout) {
  const first = await boxes('.tiptap [data-type="callout"] p', 0)
  if (!first) {
    record('callout: first line measurable', false, 'not found')
  } else {
    await page.mouse.move(first.box.left + 60, center(first.line))
    await page.waitForTimeout(120)
    const h = await handleState()
    record(
      'callout: hovering its first line targets the whole callout',
      !!h && Math.abs(center(h) - center(first.line)) <= 3,
      h ? `handle center off by ${Math.abs(center(h) - center(first.line)).toFixed(2)}px` : 'no handle'
    )
    record(
      'callout: container handle is centered on the first line, not the box top',
      !!h && Math.abs(center(h) - center(callout.box)) > 4,
      h
        ? `handle center=${center(h).toFixed(1)} box center=${center(callout.box).toFixed(1)}`
        : 'no handle'
    )
  }
}

/* ---------------------------------------------------- nested block: quote */

const quote = await boxes('.tiptap blockquote', 0)
const quoteNested = await boxes('.tiptap blockquote p', 1)

if (!quote || !quoteNested) {
  record('quote: fixture built', false, 'blockquote or second paragraph not found')
} else {
  const lineY = center(quoteNested.line)
  const samples = await approach(quoteNested.box.left + 60, lineY, quote.box.left - 16)

  const worst = samples.reduce((a, b) => (b.centerDelta > a.centerDelta ? b : a))
  record(
    'quote: handle stays on the hovered line while the pointer approaches',
    worst.centerDelta <= 3,
    `worst drift ${worst.centerDelta.toFixed(2)}px at x=${worst.x}`
  )

  const hidden = samples.filter((s) => !s.visible)
  record(
    'quote: handle never disappears during the approach',
    hidden.length === 0,
    `${hidden.length}/${samples.length} samples hidden`
  )

  const overlapping = samples.filter((s) => s.right > quote.box.left + 0.5)
  record(
    'quote: handle clears the quote border and indent',
    overlapping.length === 0,
    `${overlapping.length}/${samples.length} samples overlap (quote.left=${quote.box.left.toFixed(1)})`
  )
}

/* ------------------------------------------------------------- actual drag */

// Proves the nested target is still draggable, i.e. the handle points at the
// paragraph and not at the callout when the drag starts.
{
  const before = await page.evaluate(
    () => document.querySelectorAll('.tiptap [data-type="callout"] p').length
  )
  const nestedNow = await boxes('.tiptap [data-type="callout"] p', 1)
  const last = await boxes('.tiptap > p', 0)

  if (!nestedNow || !last || before !== 2) {
    record('drag: fixture ready', false, `callout paragraphs=${before}`)
  } else {
    await page.mouse.move(nestedNow.box.left + 60, center(nestedNow.line))
    await page.waitForTimeout(120)
    const grip = page.locator('[aria-label="Block options"]')
    const gripBox = await grip.boundingBox()
    if (!gripBox) {
      record('drag: handle present', false, 'no grip box')
    } else {
      await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(last.box.left + 30, last.box.bottom - 2, { steps: 12 })
      await page.mouse.up()
      await page.waitForTimeout(250)

      const after = await page.evaluate(
        () => document.querySelectorAll('.tiptap [data-type="callout"] p').length
      )
      record(
        'drag: the nested paragraph, not the whole callout, is what moves',
        after === before - 1,
        `callout paragraphs ${before} -> ${after}`
      )
      record(
        'drag: the callout itself survives',
        await page.evaluate(
          () => document.querySelectorAll('.tiptap [data-type="callout"]').length === 1
        ),
        'callout count'
      )
    }
  }
}

/* ----------------------------------------------- table / toggle regressions */

// `edgeDetection: 'none'` removed the mechanism that let a pointer near a
// cell's left edge grab the whole table, so a rule now excludes cell content.
async function insertBlock(query: string) {
  await page.locator('.tiptap > p').last().click()
  await page.keyboard.press('End')
  await page.keyboard.type(`/${query}`)
  await page.waitForTimeout(350)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(350)
}

await page.locator('.tiptap').click()
await page.keyboard.press('Meta+End')
await page.keyboard.press('Enter')
await insertBlock('Table')

const table = await boxes('.tiptap table', 0)
if (!table) {
  record('table: inserted', false, 'no table')
} else {
  const cell = await boxes('.tiptap table th, .tiptap table td', 0)
  if (!cell) {
    record('table: cell measurable', false, 'no cell')
  } else {
    await page.mouse.move(cell.box.left + 20, center(cell.box))
    await page.waitForTimeout(150)
    const h = await handleState()
    record(
      'table: hovering a cell still targets the whole table',
      !!h && h.right <= table.box.left + 0.5 && Math.abs(h.top - table.box.top) < 24,
      h ? `handle.right=${h.right.toFixed(1)} table.left=${table.box.left.toFixed(1)} handle.top-table.top=${(h.top - table.box.top).toFixed(1)}` : 'no handle'
    )
  }
}

await page.keyboard.press('Meta+End')
await page.keyboard.press('Enter')
await insertBlock('toggle')
await page.keyboard.type('Toggle title')

const toggle = await boxes('.tiptap [data-type="toggleBlock"]', 0)
const summary = await boxes('.tiptap [data-type="toggleBlock"] summary', 0)
if (!toggle || !summary) {
  record('toggle: inserted', false, 'no toggle / summary')
} else {
  await page.mouse.move(summary.box.left + 40, center(summary.line))
  await page.waitForTimeout(150)
  const h = await handleState()
  record(
    'toggle: hovering the title targets the toggle, not the summary node',
    !!h && h.right <= toggle.box.left + 0.5 && Math.abs(center(h) - center(summary.line)) <= 4,
    h ? `handle.right=${h.right.toFixed(1)} toggle.left=${toggle.box.left.toFixed(1)} center off ${Math.abs(center(h) - center(summary.line)).toFixed(2)}` : 'no handle'
  )
}

/* ------------------------------------------------------------------ report */

let failed = 0
for (const c of checks) {
  if (!c.ok) failed++
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.label}  (${c.detail})`)
}
console.log(`\n${checks.length - failed}/${checks.length} nested handle checks passed`)

await browser.close()
process.exit(failed > 0 ? 1 : 0)
