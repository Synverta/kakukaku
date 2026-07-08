import { pool } from './db'

async function main() {
  const result = await pool.query<{ db: string }>('select current_database() as db')
  console.log('connected to database:', result.rows[0].db)
  await pool.end()
}

main().catch((error) => {
  console.error('connection failed:', error)
  process.exit(1)
})
