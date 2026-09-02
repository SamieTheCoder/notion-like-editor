/**
 * Seed vendor-3-scoped sample (dummy) values for the PARENT_DETAILS_FROM_REGISTRAION
 * template's merge fields, so its test page lands pre-filled with real details.
 *
 * Vendor-scoped rows override the global defaults for this vendor only.
 * Run: npx tsx --env-file=.env.local scripts/seed-vendor3-samples.ts
 */
import {
  initVariablesTable,
  listVariablesByScope,
  createVariable,
  updateVariable,
} from '../lib/variables'
import { authPool } from '../lib/auth-db'

const VENDOR_ID = 3

const SAMPLES: Record<string, { label: string; value: string }> = {
  EMAIL_HEADER_SUBJECT: { label: 'Email Subject', value: 'New Lead Assigned' },
  LEAD_PARENT_NAME: { label: 'Parent/Guardian', value: 'Mr. Samie' },
  CHILD_NAME: { label: 'Child Name', value: 'Keren Smith' },
  LEAD_EMAIL: { label: 'Lead Email', value: 'samie@platfrom.local' },
  REGISTRATION_NO: { label: 'Registration No', value: '3453245623532' },
  SCHOOL_NAME: { label: 'School Name', value: 'Connec2Excel' },
}

async function main() {
  await initVariablesTable()
  const existing = await listVariablesByScope(VENDOR_ID)
  const byToken = new Map(existing.map((v) => [v.token.toUpperCase(), v]))

  for (const [token, { label, value }] of Object.entries(SAMPLES)) {
    const row = byToken.get(token)
    if (row) {
      await updateVariable({
        id: row.id,
        groupName: row.group_name,
        token,
        label,
        dummyValue: value,
      })
      console.log(`updated  ${token} -> "${value}"`)
    } else {
      await createVariable({
        vendorId: VENDOR_ID,
        groupName: 'Lead',
        token,
        label,
        dummyValue: value,
      })
      console.log(`created  ${token} -> "${value}"`)
    }
  }

  await authPool.end()
  console.log('done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
