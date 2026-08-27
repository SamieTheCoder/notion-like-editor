/**
 * Seeds the Connect2Excel "new lead assigned" email as an ordinary editor
 * document, then saves it to the database.
 *
 * Everything here uses nodes the editor already ships — image, paragraph,
 * heading, table, horizontalRule — plus the bold / italic / link marks. There
 * are no new extensions, so the result opens and edits like any other document.
 *
 * Run with the env file so the pg pool picks up DATABASE_*:
 *   npx tsx --env-file=.env.local scripts/seed-lead-email.ts
 */
import { getSchema } from '@tiptap/core'
import { Node as PMNode } from '@tiptap/pm/model'
import { generateHTML } from '@tiptap/html/server'
import { extensions } from '../lib/tiptap-extensions'
import { renderEmailHTML } from '../lib/render-html'
import { saveDocument, initDB, getDocument, listDocuments } from '../lib/db'

const HEADER_IMG =
  'https://staging.connect2excel.org/static/theme2/images/template/Email_Header.png'
const FOOTER_IMG =
  'https://staging.connect2excel.org/static/theme2/images/template/Email_Footer.png'

const BRAND_GREEN = '#57B03C'
const LABEL_GREY = '#666666'
const BODY_DARK = '#333333'

/* ----------------------------------------------------------------- helpers */

type Node = Record<string, unknown>

/** Plain text run, optionally with marks. */
const text = (value: string, marks?: Node[]): Node =>
  marks && marks.length ? { type: 'text', text: value, marks } : { type: 'text', text: value }

const bold = (value: string) => text(value, [{ type: 'bold' }])
const italic = (value: string) => text(value, [{ type: 'italic' }])

const link = (value: string, href: string, color = BRAND_GREEN) =>
  text(value, [
    { type: 'link', attrs: { href } },
    { type: 'textStyle', attrs: { color } },
  ])

const coloured = (value: string, color: string) =>
  text(value, [{ type: 'textStyle', attrs: { color } }])

/** Paragraph. Pass `align` to mirror the email's text-align. */
const p = (content: Node[], align?: 'left' | 'center' | 'right'): Node => ({
  type: 'paragraph',
  ...(align ? { attrs: { textAlign: align } } : {}),
  content,
})

const br = (): Node => ({ type: 'hardBreak' })

/** A table cell holding a single paragraph. */
const cell = (content: Node[]): Node => ({
  type: 'tableCell',
  attrs: { colspan: 1, rowspan: 1, colwidth: null },
  content: [{ type: 'paragraph', content }],
})

/**
 * One label/value row of the details block. The email renders labels in grey
 * regular and values in dark bold, so that pairing is reproduced with marks.
 */
const detailRow = (label: string, value: Node[]): Node => ({
  type: 'tableRow',
  content: [cell([coloured(label, LABEL_GREY)]), cell(value)],
})

const valueBold = (value: string) => [
  text(value, [{ type: 'bold' }, { type: 'textStyle', attrs: { color: BODY_DARK } }]),
]

/* -------------------------------------------------------------- the details */

// Sample values from the original email. Edit these — or the JSON in the
// editor — to produce a different lead.
const DETAILS: [string, Node[]][] = [
  ['Lead Number', valueBold('270826000026')],
  ['Type', valueBold('Appointment (Meeting)')],
  ['Date & Time', valueBold('Sep 2, 2026 at 03:30 PM | India | Asia/Kolkata (UTC +05:30)')],
  ['Parent/Guardian Name', valueBold('Mr. Samie student')],
  ['Email', [link('samie.3773@deriindia.org', 'mailto:samie.3773@deriindia.org')]],
  ['Phone', valueBold('+65 27847842')],
  ['Relation with Child', valueBold('Parent')],
  ["Child's Name", valueBold('keren smith')],
  ['Grade', valueBold('Grade 9')],
  ['Message', [coloured('testing', BODY_DARK)]],
  ['Country | City', valueBold('India | Nāngloi Jāt')],
  ['IP', valueBold('125.16.48.26')],
  ['URL', valueBold('NA')],
  ['Source', valueBold('NA')],
  ['Campaign', valueBold('NA')],
  ['Ad Set', valueBold('NA')],
  ['Lead Type', valueBold('Fresh')],
]

/* ------------------------------------------------------------ the document */

const doc = {
  type: 'doc',
  content: [
    // Header banner
    {
      type: 'image',
      attrs: { src: HEADER_IMG, alt: 'Connect2Excel International School', align: 'center' },
    },

    // Greeting
    p([coloured('Dear School Administration,', BODY_DARK)]),
    p([coloured('Greetings from Connect2Excel International School!', BODY_DARK)]),
    p([coloured('You have been assigned a new lead.', BODY_DARK)]),

    // Lead details
    { type: 'table', content: DETAILS.map(([label, value]) => detailRow(label, value)) },

    // Call to action
    p([
      coloured('Kindly navigate to ', BODY_DARK),
      bold('Leads'),
      coloured(' in your dashboard for more details.', BODY_DARK),
    ]),

    // Sign-off
    p([
      coloured('Thanks & Regards,', BODY_DARK),
      br(),
      coloured('Connect2Excel International School', BODY_DARK),
      br(),
      italic('Connect. Learn. Excel.'),
    ]),

    // Footer wave
    { type: 'image', attrs: { src: FOOTER_IMG, alt: '', align: 'center' } },

    // Footer links
    p(
      [
        link('Visit Website', 'https://www.connect2excel.org'),
        coloured('   |   ', LABEL_GREY),
        link('Email Us', 'mailto:support@connect2excel.org'),
      ],
      'center'
    ),

    // Address
    p([coloured('111 Somerset Road, Tripleone Somerset, Singapore 238164', LABEL_GREY)], 'center'),

    { type: 'horizontalRule' },

    // Disclaimer
    p([
      bold('Disclaimer: '),
      coloured(
        'This email and its attachments are confidential and intended only for the recipient. ' +
          'If received in error, please delete it and notify the sender. Unauthorized use or ' +
          'distribution is strictly prohibited.',
        LABEL_GREY
      ),
    ]),
  ],
}

/* ------------------------------------------------------------------- write */

const TITLE = 'Connect2Excel — New Lead Assigned'

/**
 * Parsing through the real schema fails loudly on anything the editor could not
 * open — a wrong mark name, a cell in the wrong place. Better to catch that
 * here than to store a document that throws when someone clicks it.
 */
function assertValid() {
  const schema = getSchema(extensions)
  const parsed = PMNode.fromJSON(schema, doc)
  parsed.check()
  return parsed
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const parsed = assertValid()
  console.log(`Schema check: OK (${parsed.childCount} top-level blocks)`)

  // Rendering here catches anything that parses but blows up on output.
  const tailwindHtml = generateHTML(doc as never, extensions)
  const emailHtml = renderEmailHTML(doc as never)
  console.log(`Tailwind HTML: ${tailwindHtml.length} bytes`)
  console.log(`Email HTML:    ${emailHtml.length} bytes`)

  // Spot-check that the pieces that matter actually survived.
  const expectations: [string, boolean][] = [
    ['header image', emailHtml.includes('Email_Header.png')],
    ['footer image', emailHtml.includes('Email_Footer.png')],
    ['lead number', emailHtml.includes('270826000026')],
    ['mailto link', emailHtml.includes('mailto:samie.3773@deriindia.org')],
    ['details table', emailHtml.includes('<table')],
    ['sign-off', emailHtml.includes('Connect. Learn. Excel.')],
    ['disclaimer', emailHtml.includes('Unauthorized use')],
    ['no leftover classes', !emailHtml.includes('class="')],
  ]
  let bad = 0
  for (const [label, ok] of expectations) {
    if (!ok) bad += 1
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}`)
  }
  if (bad) {
    console.error(`\n${bad} content check(s) failed; not writing to the database.`)
    process.exit(1)
  }

  if (dryRun) {
    console.log('\n--dry-run: nothing written to the database.')
    process.exit(0)
  }

  await initDB()

  // Idempotent: reuse the document with this title if the seed already ran,
  // so repeated runs update in place instead of piling up duplicates.
  const existing = (await listDocuments()).find((d) => d.title === TITLE)
  const saved = await saveDocument(existing?.id ?? null, TITLE, doc)
  console.log(`\n${existing ? 'Updated' : 'Created'} document ${saved.id}`)
  console.log(`  title: ${saved.title}`)

  // Read it straight back so the assertion covers the real round-trip rather
  // than the object we happened to send.
  const fetched = await getDocument(saved.id)
  if (!fetched) throw new Error('Document was not readable after saving')

  // JSONB does not preserve key order, so compare canonically rather than by
  // raw string. Keys are sorted on both sides before stringifying.
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical)
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => [k, canonical(v)])
      )
    }
    return value
  }

  if (JSON.stringify(canonical(doc)) !== JSON.stringify(canonical(fetched.content))) {
    console.error('Round-trip mismatch: stored JSON differs structurally from what was sent.')
    process.exit(1)
  }

  // The assertion that actually matters: the stored document renders to the
  // same email as the one built here.
  const storedEmail = renderEmailHTML(fetched.content as never)
  if (storedEmail !== emailHtml) {
    console.error('Round-trip mismatch: stored document renders different HTML.')
    process.exit(1)
  }

  const blocks = (fetched.content as { content: unknown[] }).content.length
  console.log(`  round-trip: OK (${blocks} top-level blocks, ${DETAILS.length} detail rows)`)
  console.log(`  stored document renders byte-identical email HTML`)
  console.log(`\nOpen it at /editor/${saved.id}`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
