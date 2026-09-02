/**
 * Re-inline every template's body from its ProseMirror JSON, then recompose the
 * final body. Fixes templates saved before the email inliner ran, where the
 * stored body still carried raw Tailwind classes (so callout backgrounds, text
 * colors, etc. did not render in email clients).
 *
 *   npm run reinline
 *
 * Only touches rows that have a usable body_json doc; leaves the rest as-is.
 */
import { authPool, initAuthDB, getVendorById } from '../lib/auth-db'
import { initTemplatesTable } from '../lib/email-templates'
import { composeFinalBody } from '../lib/compose-email'
import { renderEmailBody } from '../lib/render-html'
import type { JSONContent } from '@tiptap/core'

async function main() {
  await initAuthDB()
  await initTemplatesTable()

  const { rows } = await authPool.query(`
    SELECT id, vendor_id, body_json
    FROM notion_sam_email_templates
    WHERE body_json IS NOT NULL
  `)

  let fixed = 0
  for (const r of rows) {
    const json = r.body_json as JSONContent
    if (!json || json.type !== 'doc') continue

    let inlinedBody: string
    try {
      inlinedBody = renderEmailBody(json)
    } catch (e) {
      console.log(`  template ${r.id}: skip (render failed: ${(e as Error).message})`)
      continue
    }

    const vendor = r.vendor_id ? await getVendorById(Number(r.vendor_id)) : null
    const finalBody = composeFinalBody(
      vendor?.header_html || '',
      inlinedBody,
      vendor?.footer_html || ''
    )

    await authPool.query(
      `UPDATE notion_sam_email_templates
       SET body_html = $2, final_body = $3, updated_at = now()
       WHERE id = $1`,
      [r.id, inlinedBody, finalBody]
    )
    console.log(`  template ${r.id}: body ${inlinedBody.length}b, final ${finalBody.length}b`)
    fixed++
  }

  console.log(`\nReinlined ${fixed} template(s).`)
  await authPool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
