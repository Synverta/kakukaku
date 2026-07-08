import 'dotenv/config'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill in your credentials.')
}

const connectionStringWithoutSslMode = connectionString.replace(/[?&]sslmode=[^&]*/g, '')

export const pool = new Pool({
  connectionString: connectionStringWithoutSslMode,
  max: 5,
  idleTimeoutMillis: 30000,
  ssl: { rejectUnauthorized: false },
})

export async function query<T = unknown>(text: string, params?: unknown[]) {
  const client = await pool.connect()
  try {
    const result = await client.query<T>(text, params)
    return result
  } finally {
    client.release()
  }
}
