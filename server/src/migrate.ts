import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { pool } from './db'

async function main() {
  const here = dirname(fileURLToPath(import.meta.url))
  const sqlPath = resolve(here, '..', 'sql', 'schema.sql')
  const sql = readFileSync(sqlPath, 'utf8')

  console.log('running schema migration…')
  await pool.query(sql)

  const tables = await pool.query<{ tablename: string }>(
    "select tablename from pg_tables where schemaname='public' order by tablename",
  )
  console.log('tables now in public:', tables.rows.map((r) => r.tablename).join(', '))

  await pool.end()
}

main().catch((error) => {
  console.error('migration failed:', error)
  process.exit(1)
})
