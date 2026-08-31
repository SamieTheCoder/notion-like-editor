/**
 * Seed the default platform vendor and a super admin user.
 *
 * Run with:
 *   npm run seed:auth
 *
 * Idempotent: re-running updates the existing rows (by vendor code / user email)
 * rather than creating duplicates.
 *
 * Override defaults via env vars:
 *   PLATFORM_VENDOR_NAME  (default "Platform")
 *   PLATFORM_VENDOR_CODE  (default "platform")
 *   SUPER_ADMIN_EMAIL     (default "admin@platform.local")
 *   SUPER_ADMIN_PASSWORD  (default "admin123")
 *   SUPER_ADMIN_NAME      (default "Super Admin")
 */
import bcrypt from 'bcryptjs'
import {
  initAuthDB,
  findVendorByCode,
  findUserByEmail,
  createVendor,
  createUser,
  authPool,
  VENDOR_TABLE,
  USER_TABLE,
} from '../lib/auth-db'

const VENDOR_NAME = process.env.PLATFORM_VENDOR_NAME || 'Platform'
const VENDOR_CODE = process.env.PLATFORM_VENDOR_CODE || 'platform'
const ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@platform.local'
const ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'admin123'
const ADMIN_NAME = process.env.SUPER_ADMIN_NAME || 'Super Admin'

async function main() {
  console.log('Initializing auth tables...')
  await initAuthDB()

  // 1. Default platform vendor (upsert by code)
  let vendor = await findVendorByCode(VENDOR_CODE)
  if (vendor) {
    console.log(`Vendor "${VENDOR_CODE}" already exists (id=${vendor.id}).`)
  } else {
    vendor = await createVendor({
      name: VENDOR_NAME,
      code: VENDOR_CODE,
      status: 'ACTIVE',
    })
    console.log(`Created vendor "${VENDOR_NAME}" (id=${vendor.id}).`)
  }

  // 2. Super admin user (upsert by email)
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)
  const existing = await findUserByEmail(ADMIN_EMAIL)

  if (existing) {
    await authPool.query(
      `UPDATE ${USER_TABLE}
       SET password_hash = $2, role = 'SUPER_ADMIN', status = 'ACTIVE',
           vendor_id = $3, first_name = $4, updated_at = now()
       WHERE lower(email) = lower($1)`,
      [ADMIN_EMAIL, passwordHash, vendor.id, ADMIN_NAME]
    )
    console.log(`Updated super admin "${ADMIN_EMAIL}" (id=${existing.id}).`)
  } else {
    const user = await createUser({
      vendor_id: vendor.id,
      email: ADMIN_EMAIL,
      password_hash: passwordHash,
      first_name: ADMIN_NAME,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    })
    console.log(`Created super admin "${ADMIN_EMAIL}" (id=${user.id}).`)
  }

  console.log('\nSeed complete.')
  console.log(`  Vendor:   ${VENDOR_NAME} (${VENDOR_CODE})`)
  console.log(`  Login:    ${ADMIN_EMAIL}`)
  console.log(`  Password: ${ADMIN_PASSWORD}`)
  console.log(`  Tables:   ${VENDOR_TABLE}, ${USER_TABLE}`)

  await authPool.end()
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
