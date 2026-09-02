/**
 * Migrate the previously hardcoded variable registry into the database as
 * global variables (vendor_id NULL), so every vendor keeps the tokens that
 * existing templates already reference.
 *
 *   npm run seed:variables
 *
 * Idempotent: upserts by token, so re-running refreshes labels and dummy
 * values without creating duplicates.
 */
import { authPool } from '../lib/auth-db'
import { initVariablesTable, normalizeToken } from '../lib/variables'
import { VARIABLE_GROUPS } from '../lib/variable-registry'

async function main() {
  console.log('Creating variables table...')
  await initVariablesTable()

  let inserted = 0
  let updated = 0

  for (const group of VARIABLE_GROUPS) {
    let order = 0
    for (const v of group.variables) {
      const token = normalizeToken(v.token)
      const { rows } = await authPool.query<{ id: number; existed: boolean }>(
        `INSERT INTO notion_sam_variables
           (vendor_id, group_name, token, label, dummy_value, sort_order)
         VALUES (NULL, $1, $2, $3, $4, $5)
         ON CONFLICT (token) WHERE vendor_id IS NULL
         DO UPDATE SET
           group_name  = EXCLUDED.group_name,
           label       = EXCLUDED.label,
           dummy_value = EXCLUDED.dummy_value,
           sort_order  = EXCLUDED.sort_order,
           updated_at  = now()
         RETURNING id, (xmax <> 0) AS existed`,
        [group.name, token, v.label, v.dummyValue, order++]
      )
      if (rows[0]?.existed) updated++
      else inserted++
    }
  }

  const { rows: count } = await authPool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM notion_sam_variables WHERE vendor_id IS NULL`
  )

  console.log(`\nInserted: ${inserted}, updated: ${updated}`)
  console.log(`Global variables now in DB: ${count[0].n}`)
  await authPool.end()
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
