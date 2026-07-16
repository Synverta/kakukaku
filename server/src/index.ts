import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { pool } from './db'
import { authRouter } from './routes/auth'
import { crowdfundRouter } from './routes/crowdfund'
import { ordersRouter } from './routes/orders'
import { paymentsRouter } from './routes/payments'
import { videosRouter } from './routes/videos'
import { creatorRouter } from './routes/creator'
import { interactionsRouter } from './routes/interactions'
import { fansRouter } from './routes/fans'
import { revenueRouter } from './routes/revenue'
import { growthRouter } from './routes/growth'
import { rightsRouter } from './routes/rights'
import { communitiesRouter } from './routes/communities'
import { walletRouter } from './routes/wallet'
import { uploadsRouter } from './routes/uploads'

const app = express()

app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads'), {
  fallthrough: true,
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    if (/\.(mp4|webm|mov)$/i.test(filePath)) {
      res.setHeader('Accept-Ranges', 'bytes')
    }
  },
}))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

app.use('/api/auth', authRouter)
app.use('/api', crowdfundRouter)
app.use('/api', ordersRouter)
app.use('/api', paymentsRouter)
app.use('/api', videosRouter)
app.use('/api', creatorRouter)
app.use('/api', interactionsRouter)
app.use('/api', fansRouter)
app.use('/api', revenueRouter)
app.use('/api', growthRouter)
app.use('/api', rightsRouter)
app.use('/api', communitiesRouter)
app.use('/api', walletRouter)
app.use('/api', uploadsRouter)

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

const port = Number(process.env.PORT ?? 6002)
app.listen(port, () => {
  console.log(`kakukaku server listening on http://localhost:${port}`)
})
