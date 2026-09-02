/**
 * Seed vendors and their email templates (header + footer + body) for the
 * dashboard.
 *
 *   npm run seed:dashboard
 *
 * Vendors (upsert by code):
 *   1. PLATFORM             — default vendor for the super admin. Fresh "Admin"
 *                             header/footer written in lib/admin-shell.ts.
 *   2. CONNECT2EXCEL        — uses the current header/footer from the editor
 *                             (CONNECT2EXCEL_SHELL rendered via email-shell).
 *   3. INTERNATIONAL_SCHOOLING — branding only; header/footer empty (upload later).
 *
 * Each vendor gets one row in notion_sam_email_templates (slug = vendor code,
 * lowercased) holding head_html + footer_html + body_html + vendor_id.
 */
import {
  initAuthDB,
  findVendorByCode,
  createVendor,
  authPool,
  VENDOR_TABLE,
  type Vendor,
} from '../lib/auth-db'
import {
  initTemplatesTable,
  upsertTemplate,
  closeTemplatesPool,
} from '../lib/email-templates'
import {
  CONNECT2EXCEL_SHELL,
  buildHeadHtml,
  buildFooterHtml,
  type EmailShellConfig,
} from '../lib/email-shell'
import {
  ADMIN_HEADER_HTML,
  ADMIN_FOOTER_HTML,
  ADMIN_BODY_HTML,
} from '../lib/admin-shell'

interface VendorSeed {
  name: string
  code: string
  primary?: string
  secondary?: string
  tertiary?: string
  logoUrl?: string
  faviconUrl?: string
  headHtml: string
  footerHtml: string
  bodyHtml: string
}

const C2E_HEAD = buildHeadHtml(CONNECT2EXCEL_SHELL)
const C2E_FOOTER = buildFooterHtml(CONNECT2EXCEL_SHELL)

const VENDORS: VendorSeed[] = [
  {
    name: 'Platform',
    code: 'PLATFORM',
    primary: '#4F46E5',
    headHtml: ADMIN_HEADER_HTML,
    footerHtml: ADMIN_FOOTER_HTML,
    bodyHtml: ADMIN_BODY_HTML,
  },
  {
    name: 'Connect2excel',
    code: 'CONNECT2EXCEL',
    primary: '#57B03C',
    secondary: '#3399CC',
    tertiary: '#ffffff',
    headHtml: C2E_HEAD,
    footerHtml: C2E_FOOTER,
    bodyHtml:
      '<p style="margin:0 0 16px;">Edit this body content in the dashboard editor. The header and footer above are the ones currently used by the editor.</p>',
  },
  {
    name: 'International Schooling',
    code: 'INTERNATIONAL_SCHOOLING',
    primary: '#3B82F6',
    secondary: '#10B981',
    tertiary: '#F59E0B',
    headHtml: '',
    footerHtml: '',
    bodyHtml: '',
  },
]

async function upsertVendor(seed: VendorSeed): Promise<Vendor> {
  const existing = await findVendorByCode(seed.code)
  if (existing) {
    const { rows } = await authPool.query<Vendor>(
      `UPDATE ${VENDOR_TABLE}
       SET name = $2, primary_color = $3, secondary_color = $4,
           tertiary_color = $5, logo_url = $6, favicon_url = $7, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        existing.id,
        seed.name,
        seed.primary ?? null,
        seed.secondary ?? null,
        seed.tertiary ?? null,
        seed.logoUrl ?? null,
        seed.faviconUrl ?? null,
      ]
    )
    console.log(`  vendor updated: ${seed.name} (id=${existing.id})`)
    return rows[0]
  }
  const created = await createVendor({ name: seed.name, code: seed.code })
  const { rows } = await authPool.query<Vendor>(
    `UPDATE ${VENDOR_TABLE}
     SET primary_color = $2, secondary_color = $3, tertiary_color = $4,
         logo_url = $5, favicon_url = $6
     WHERE id = $1 RETURNING *`,
    [
      created.id,
      seed.primary ?? null,
      seed.secondary ?? null,
      seed.tertiary ?? null,
      seed.logoUrl ?? null,
      seed.faviconUrl ?? null,
    ]
  )
  console.log(`  vendor created: ${seed.name} (id=${created.id})`)
  return rows[0]
}

async function main() {
  console.log('Initializing tables...')
  await initAuthDB()
  await initTemplatesTable()

  for (const seed of VENDORS) {
    const vendor = await upsertVendor(seed)
    const tpl = await upsertTemplate({
      slug: seed.code.toLowerCase(),
      name: `${seed.name} Template`,
      headHtml: seed.headHtml,
      footerHtml: seed.footerHtml,
      bodyHtml: seed.bodyHtml,
      config: {} as EmailShellConfig,
      vendorId: vendor.id,
    })
    console.log(
      `    template id=${tpl.id} vendor_name=${tpl.vendor_name} ` +
        `(head ${seed.headHtml.length}b, footer ${seed.footerHtml.length}b, body ${seed.bodyHtml.length}b)`
    )
  }

  console.log('\nDashboard seed complete.')
  await closeTemplatesPool()
  await authPool.end()
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
