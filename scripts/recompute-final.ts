/**
 * Recompute final_body for every template = vendor.header + template.body +
 * vendor.footer, with document chrome stripped. Run after changing a vendor's
 * header/footer.
 *
 *   npm run recompute:final
 */
import { authPool, initAuthDB } from '../lib/auth-db'
import { initTemplatesTable } from '../lib/email-templates'
import { composeFinalBody } from '../lib/compose-email'

async function main() {
  await initAuthDB()
  await initTemplatesTable()

  const { rows } = await authPool.query(`
    SELECT t.id, t.body_html, v.header_html, v.footer_html
    FROM notion_sam_email_templates t
    JOIN notion_sam_vendor v ON v.id = t.vendor_id
  `)

  for (const r of rows) {
    const finalBody = composeFinalBody(
      r.header_html || '',
      r.body_html || '',
      r.footer_html || ''
    )
    await authPool.query(
      `UPDATE notion_sam_email_templates SET final_body = $2, updated_at = now() WHERE id = $1`,
      [r.id, finalBody]
    )
    console.log(`  template ${r.id}: final_body ${finalBody.length}b`)
  }

  console.log(`\nRecomputed ${rows.length} template(s).`)
  await authPool.end()
}
main().catch((e) => { console.error(e); process.exit(1) })
