/**
 * Verifies the button block's selection UI. Regressions covered:
 *
 *   Selecting a button showed two floating menus at once — the button's own
 *   config panel plus the text-formatting bubble menu, because a NodeSelection
 *   has from !== to and the bubble menu only excluded image/youtube.
 *
 *   The button also showed two selection rings: the global
 *   .ProseMirror-selectednode outline stretched across the full-width block
 *   wrapper, plus the node view's own tight ring around the button.
 *
 * Asserts:
 *   1. a button can be inserted from the slash menu
 *   2. selecting it shows exactly one floating menu (its config panel)
 *   3. the text-formatting bubble menu is not visible
 *   4. only one selection ring is painted (no full-width outline)
 *   5. selecting ordinary text still shows the bubble menu (no over-fix)
 */
import { chromium } from 'playwright'

const URL = process.env.EDITOR_URL ?? 'http://localhost:3000/editor'

type Check = { label: string; ok: boolean; detail: string }
const checks: Check[] = []
const record = (label: string, ok: boolean, detail: string) =>
  checks.push({ label, ok, detail })

// Recent Playwright downloads a separate "headless shell". Fall back to the
// full Chromium build, and if neither works report it as an environment
// problem so a broken install is not mistaken for a failing assertion.
let browser
try {
  browser = await chromium.launch()
} catch {
  try {
    browser = await chromium.launch({ channel: 'chromium' })
  } catch (err) {
    console.error('Could not launch Chromium. Install the browser first:\n')
    console.error('    npx playwright install --force chromium\n')
    console.error(`Underlying error: ${(err as Error).message.split('\n')[0]}`)
    process.exit(2)
  }
}
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForSelector('.tiptap')

/* ------------------------------------------------------- insert the button */

// Start from a fresh trailing line and invoke the slash menu.
await page.locator('.tiptap > p').last().click()
await page.keyboard.press('End')
await page.keyboard.press('Enter')
await page.keyboard.type('/button')
await page.waitForTimeout(300)

const slashOption = page.locator('[role="option"]', { hasText: 'Button' }).first()
const slashVisible = await slashOption.isVisible().catch(() => false)
record('slash menu offers Button', slashVisible, slashVisible ? 'found' : 'not found')

if (slashVisible) await slashOption.click()
else {
  // Fall back to the command so the remaining assertions still run.
  await page.keyboard.press('Escape')
}
await page.waitForTimeout(300)

const buttonNode = page.locator('.tiptap [data-node-type="buttonBlock"]').first()
const inserted = await buttonNode.count()
record('button block inserted', inserted > 0, `${inserted} node(s)`)

/* ------------------------------------------------- select it, inspect menus */

if (inserted > 0) {
  // Click the rendered button to produce a NodeSelection.
  await buttonNode.locator('span', { hasText: /./ }).first().click()
  await page.waitForTimeout(350)

  // The button's own config panel: identified by its link input.
  const configPanel = page.locator('.tiptap input[aria-label="Button link"]')
  const panelVisible = await configPanel.isVisible().catch(() => false)
  record(
    'button config panel visible',
    panelVisible,
    panelVisible ? 'visible' : 'hidden'
  )

  // The text-formatting bubble menu is the dark bar; find it by a control that
  // only it renders.
  const bubble = page.locator('button[aria-label="Clear formatting"]')
  const bubbleVisible = await bubble.isVisible().catch(() => false)
  record(
    'text bubble menu hidden on button',
    !bubbleVisible,
    bubbleVisible ? 'STILL VISIBLE (two menus)' : 'hidden'
  )

  // Count outlines/rings actually painted around the selection.
  const ringInfo = await page.evaluate(() => {
    const wrapper = document.querySelector(
      '.tiptap [data-node-type="buttonBlock"]'
    ) as HTMLElement | null
    if (!wrapper) return { wrapperOutline: 'none', wrapperWidth: 0, inner: 0 }
    const ws = getComputedStyle(wrapper)
    // Any descendant carrying a visible box-shadow ring.
    const inner = Array.from(wrapper.querySelectorAll('*')).filter((el) => {
      const s = getComputedStyle(el as HTMLElement)
      return s.boxShadow && s.boxShadow !== 'none'
    }).length
    return {
      wrapperOutline: ws.outlineStyle,
      wrapperWidth: parseFloat(ws.outlineWidth) || 0,
      inner,
    }
  })

  const noWideOutline =
    ringInfo.wrapperOutline === 'none' || ringInfo.wrapperWidth === 0
  record(
    'no full-width outline on wrapper',
    noWideOutline,
    `outline=${ringInfo.wrapperOutline} width=${ringInfo.wrapperWidth}`
  )
  record(
    'exactly one inner ring',
    ringInfo.inner === 1,
    `${ringInfo.inner} ringed element(s)`
  )
}

/* ------------------------------------- text selection still gets the bubble */

await page.locator('.tiptap h1, .tiptap p').first().click()
await page.keyboard.down('Shift')
for (let i = 0; i < 8; i += 1) await page.keyboard.press('ArrowRight')
await page.keyboard.up('Shift')
await page.waitForTimeout(350)

const bubbleOnText = await page
  .locator('button[aria-label="Clear formatting"]')
  .isVisible()
  .catch(() => false)
record(
  'bubble menu still works on text',
  bubbleOnText,
  bubbleOnText ? 'visible' : 'MISSING (over-fixed)'
)

/* ------------------------------------------------------------------ report */

await browser.close()

let failed = 0
for (const { label, ok, detail } of checks) {
  if (!ok) failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  ${ok ? '' : `-> ${detail}`}`)
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed`)
process.exit(failed === 0 ? 0 : 1)
