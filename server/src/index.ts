import express from 'express'
import cors from 'cors'
import { pool } from './db'
import { authRouter } from './routes/auth'
import { crowdfundRouter } from './routes/crowdfund'
import { ordersRouter } from './routes/orders'
import { paymentsRouter } from './routes/payments'

const app = express()

app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

app.use('/api/auth', authRouter)
app.use('/api', crowdfundRouter)
app.use('/api', ordersRouter)
app.use('/api', paymentsRouter)

app.use(async (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error('unhandled error:', message)
  res.status(500).json({ error: 'internal_error' })
})

async function shutdown() {
  await pool.end()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

const port = Number(process.env.PORT ?? 3000)
app.listen(port, () => {
  console.log(`kakukaku server listening on http://localhost:${port}`)
})
