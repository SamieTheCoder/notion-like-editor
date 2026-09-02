/**
 * Seeds the Connect2Excel master email shell (head + footer) into the database.
 *
 * The body is not part of the shell — it gets composed in later. To check the
 * shell in isolation this script renders it around a placeholder body and
 * asserts the result is a balanced, complete email document.
 *
 *   npx tsx scripts/seed-email-shell.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/seed-email-shell.ts
 */
import {
  CONNECT2EXCEL_SHELL,
  buildHeadHtml,
  buildFooterHtml,
  composeEmail,
} from '../lib/email-shell'
import {
  initTemplatesTable,
  upsertTemplate,
  getTemplateById,
  closeTemplatesPool,
} from '../lib/email-templates'

const SLUG = 'connect2excel'
const NAME = 'Connect2Excel International School'

const config = CONNECT2EXCEL_SHELL
const headHtml = buildHeadHtml(config)
const footerHtml = buildFooterHtml(config)

/* ------------------------------------------------------------- assertions */

type Check = [string, boolean]

/** Counts non-overlapping occurrences of a literal. */
const count = (haystack: string, needle: string) =>
  haystack.split(needle).length - 1

function checkShell(): Check[] {
  const composed = composeEmail(headHtml, '<p>BODY_PLACEHOLDER</p>', footerHtml)
  const c = config.colors

  // Tag balance across the whole document. The shell opens tables/rows/cells in
  // the head and closes them in the footer, so only the composed output can be
  // meaningfully balanced — this is the check that catches a dropped </table>.
  const balanced = (tag: string) =>
    count(composed, `<${tag}`) === count(composed, `</${tag}>`)

  return [
    ['doctype present', composed.startsWith('<!doctype html>')],
    ['closes html', composed.trimEnd().endsWith('</html>')],
    ['table tags balanced', balanced('table')],
    ['tr tags balanced', balanced('tr')],
    ['td tags balanced', balanced('td')],
    ['tbody tags balanced', balanced('tbody')],

    ['Outlook vml namespace', composed.includes('urn:schemas-microsoft-com:vml')],
    ['MSO conditional opens', composed.includes('<!--[if mso]>')],
    ['MSO conditional closes', composed.includes('<![endif]-->')],
    ['MSO blocks paired', count(composed, '<!--[if mso]>') === count(composed, '<![endif]-->')],

    ['600px wrapper', composed.includes('max-width:600px')],
    ['mobile media query', composed.includes('@media only screen and (max-width:600px)')],
    ['fluid-img class used', composed.includes('class="fluid-img"')],

    ['subject token in title', composed.includes(`<title>${config.subject}</title>`)],
    ['preheader hidden', composed.includes('mso-hide:all')],
    ['favicon token', composed.includes(config.faviconUrl)],
    ['header image', composed.includes('Email_Header.png')],
    ['footer wave image', composed.includes('Email_Footer.png')],

    ['footer blue background', composed.includes(`background-color:${c.footer}`)],
    ['footer table background', composed.includes(`background:${c.footer}`)],
    ['footer divider colour', composed.includes(`background-color:${c.footerDivider}`)],
    ['page background', composed.includes(`background-color:${c.page}`)],

    ['facebook icon', composed.includes('FB.png')],
    ['instagram icon', composed.includes('Insta.png')],
    ['website icon', composed.includes('Web.png')],
    ['email icon', composed.includes('Email.png')],
    ['address icon', composed.includes('Address.png')],
    ['all four social anchors', count(composed, 'vertical-align:middle; margin:0 8px;') === 4],
    ['Visit Website label', composed.includes('>Visit Website</span>')],
    ['Email Us label', composed.includes('>Email Us</span>')],
    ['support mailto', composed.includes('mailto:support@connect2excel.org')],

    ['address text', composed.includes('Singapore 238164')],
    ['disclaimer label', composed.includes('Disclaimer:')],
    ['disclaimer body', composed.includes('Unauthorized use or distribution')],

    ['body placeholder survived', composed.includes('BODY_PLACEHOLDER')],
    // The internal theme JSON that leaks into the production template's <style>
    // must not be reproduced here.
    ['no leaked rootcss blob', !composed.includes('rootcss')],
    // Click-tracking links are injected per send, not baked into a template.
    ['no sendgrid click tracking', !composed.includes('ct.sendgrid.net')],
  ]
}

/* ------------------------------------------------------------------- main */

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  console.log(`head:   ${headHtml.length} bytes`)
  console.log(`footer: ${footerHtml.length} bytes\n`)

  const checks = checkShell()
  let failed = 0
  for (const [label, ok] of checks) {
    if (!ok) failed += 1
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}`)
  }
  console.log(`\n${checks.length - failed}/${checks.length} shell checks passed`)

  if (failed) {
    console.error('Shell is not valid; nothing written to the database.')
    process.exit(1)
  }

  if (dryRun) {
    console.log('--dry-run: nothing written to the database.')
    process.exit(0)
  }

  await initTemplatesTable()
  const saved = await upsertTemplate({
    slug: SLUG,
    name: NAME,
    headHtml,
    footerHtml,
    config,
  })
  console.log(`\nSaved template id=${saved.id} vendor_name=${saved.vendor_name}`)

  // Read back and confirm the stored fragments are byte-identical.
  const fetched = await getTemplateById(saved.id)
  if (!fetched) throw new Error('Template not readable after saving')

  if (fetched.head_html !== headHtml) {
    console.error('Stored head_html differs from what was generated.')
    process.exit(1)
  }
  if (fetched.footer_html !== footerHtml) {
    console.error('Stored footer_html differs from what was generated.')
    process.exit(1)
  }
  if (fetched.config.colors.footer !== config.colors.footer) {
    console.error('Stored config did not round-trip.')
    process.exit(1)
  }

  console.log('  head_html:   byte-identical round-trip')
  console.log('  footer_html: byte-identical round-trip')
  console.log(`  config:      round-trip OK (footer ${fetched.config.colors.footer})`)

  await closeTemplatesPool()
  process.exit(0)
}

main().catch(async (err) => {
  console.error(err)
  process.exit(1)
})
