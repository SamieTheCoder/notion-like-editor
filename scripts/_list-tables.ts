import { Pool } from 'pg'
const pool = new Pool({host:process.env.DATABASE_HOST,port:+(process.env.DATABASE_PORT||5432),database:process.env.DATABASE_NAME,user:process.env.DATABASE_USER,password:process.env.DATABASE_PASSWORD,ssl:false})
async function main(){
  const { rows } = await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`)
  console.log('Tables in public schema:')
  for (const r of rows) console.log(' ', r.tablename)
  await pool.end()
}
main()
