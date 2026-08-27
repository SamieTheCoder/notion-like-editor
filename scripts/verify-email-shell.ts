/**
 * End-to-end check of the stored email shell.
 *
 * Reads the master shell and a body document straight out of Postgres with raw
 * SQL — deliberately not through lib/email-templates, so a bug in that layer
 * cannot hide itself — renders the body, composes the full email and asserts the
 * result is a complete document containing header, body and footer.
 *
 * Writes a preview to /tmp so the result can be opened in a browser.
 *
 *   npx tsx --env-file=.env.local scripts/verify-email-shell.ts
 */
import { writeFileSync } from 'node:fs'
import { Pool } from 'pg'
import { renderEmailBody } from '../lib/render-html'
import { composeEmail } from '../lib/email-shell'

const TEMPLATE_ID = Number(process.env.TEMPLATE_ID ?? 1)
const BODY_TITLE = 'Connect2Excel — New Lead Assigned'
const OUT = '/tmp/connect2excel-preview.html'

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl: false,
})

const count = (haystack: string, needle: string) => haystack.split(needle).length - 1

async function main() {
  /* --------------------------------------------------- read shell from DB */
  const shellRes = await pool.query(
    `SELECT id, slug, name, head_html, footer_html FROM notion_sam_email_templates WHERE id = $1`,
    [TEMPLATE_ID]
  )
  const shell = shellRes.rows[0]
  if (!shell) throw new Error(`No email template with id ${TEMPLATE_ID}`)
  console.log(`Shell: id=${shell.id} slug=${shell.slug} "${shell.name}"`)
  console.log(`  head ${shell.head_html.length} bytes, footer ${shell.footer_html.length} bytes`)

  /* ---------------------------------------------------- read body from DB */
  const bodyRes = await pool.query(
    `SELECT id, title, content, jsonb_array_length(content->'content') AS blocks
     FROM notion_sam_documents WHERE title = $1 LIMIT 1`,
    [BODY_TITLE]
  )
  const bodyDoc = bodyRes.rows[0]
  if (!bodyDoc) throw new Error(`No document titled "${BODY_TITLE}"`)
  console.log(`Body:  ${bodyDoc.id} "${bodyDoc.title}"`)

  /* ---------------------------------------------------------- synthetic body
   * The shell is verified against a body built here, not against a document in
   * the database. A stored document is editable, so asserting on its text would
   * make this check fail whenever someone edits the document — which says
   * nothing about whether the shell is correct.
   */
  const syntheticBody = {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'SHELL_PROBE_GREETING' }] },
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {
                type: 'tableCell',
                attrs: { colspan: 1, rowspan: 1, colwidth: null },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Label' }] }],
              },
              {
                type: 'tableCell',
                attrs: { colspan: 1, rowspan: 1, colwidth: null },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'SHELL_PROBE_VALUE' }] }],
              },
            ],
          },
        ],
      },
    ],
  }

  const bodyHtml = renderEmailBody(syntheticBody as never)
  const email = composeEmail(shell.head_html, bodyHtml, shell.footer_html)
  console.log(`Composed: ${email.length} bytes\n`)

  const balanced = (tag: string) => count(email, `<${tag}`) === count(email, `</${tag}>`)

  const checks: [string, boolean][] = [
    ['doctype first', email.startsWith('<!doctype html>')],
    ['html closed last', email.trimEnd().endsWith('</html>')],
    ['single <head>', count(email, '<head>') === 1],
    ['single <body', count(email, '<body') === 1],
    ['table tags balanced', balanced('table')],
    ['tr tags balanced', balanced('tr')],
    ['td tags balanced', balanced('td')],

    // Shell survived
    ['header banner', email.includes('Email_Header.png')],
    ['footer wave', email.includes('Email_Footer.png')],
    ['blue footer block', email.includes('#3299cd')],
    ['footer divider', email.includes('#6bb4da')],
    ['social icons', ['FB.png', 'Insta.png', 'Web.png', 'Email.png'].every((f) => email.includes(f))],
    ['address', email.includes('Singapore 238164')],
    ['disclaimer', email.includes('Unauthorized use or distribution')],
    ['MSO conditionals', count(email, '<!--[if mso]>') === count(email, '<![endif]-->')],

    // Body survived, in the right place
    ['body paragraph present', email.includes('SHELL_PROBE_GREETING')],
    ['body table present', email.includes('SHELL_PROBE_VALUE')],
    [
      'body sits between header and footer',
      email.indexOf('Email_Header.png') < email.indexOf('SHELL_PROBE_GREETING') &&
        email.indexOf('SHELL_PROBE_GREETING') < email.indexOf('Email_Footer.png'),
    ],

    // Email-client hygiene
    [
      'no stray Tailwind classes',
      !/class="(?!fluid-img|email-wrapper|px|stack|detail-label)/.test(email),
    ],
    ['no leaked theme JSON', !email.includes('rootcss')],
    ['no sendgrid click tracking', !email.includes('ct.sendgrid.net')],
  ]

  let failed = 0
  for (const [label, ok] of checks) {
    if (!ok) failed += 1
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}`)
  }
  console.log(`\n${checks.length - failed}/${checks.length} shell checks passed`)

  /* ------------------------------------------------- preview with real body */
  const realBodyHtml = renderEmailBody(bodyDoc.content)
  const preview = composeEmail(shell.head_html, realBodyHtml, shell.footer_html)
  writeFileSync(OUT, preview, 'utf8')
  console.log(`\nPreview (stored shell + stored body) written to ${OUT}`)
  console.log(`  ${preview.length} bytes, body document has ${bodyDoc.blocks} blocks`)

  // Reported, not asserted: the document is editable, so drift here is a fact
  // about the data rather than a defect in the shell.
  if (!preview.includes('270826000026')) {
    console.log(
      '  note: this document no longer contains the seeded lead data — it has been edited since seeding.'
    )
  }

  await pool.end()
  process.exit(failed === 0 ? 0 : 1)
}

main().catch(async (err) => {
  console.error(err)
  await pool.end().catch(() => {})
  process.exit(1)
})
