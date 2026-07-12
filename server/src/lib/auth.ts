import type { Request, Response, NextFunction } from 'express'
import { query } from '../db'
import { verifyToken, type AuthPayload } from './jwt'

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthPayload
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'missing_token' })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return res.status(401).json({ error: 'invalid_token' })
  }

  req.user = payload
  next()
}

type DeletedCheckRow = { deleted_at: Date | null }

const deletedCheckCache = new Map<number, { deletedAt: Date | null; checkedAt: number }>()
const DELETED_CHECK_TTL_MS = 60_000

export async function requireActiveUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.sub) return next()
  const uid = Number(req.user.sub)
  const now = Date.now()
  const cached = deletedCheckCache.get(uid)
  let deletedAt: Date | null | undefined
  if (cached && now - cached.checkedAt < DELETED_CHECK_TTL_MS) {
    deletedAt = cached.deletedAt
  } else {
    const rows = await query<DeletedCheckRow>(
      `select deleted_at from users where id = $1 limit 1`,
      [uid],
    )
    deletedAt = rows.rowCount === 0 ? null : (rows.rows[0].deleted_at ?? null)
    deletedCheckCache.set(uid, { deletedAt, checkedAt: now })
  }
  if (deletedAt) {
    return res.status(401).json({ error: 'account_deleted', message: '账号已注销' })
  }
  next()
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (token) {
    const payload = verifyToken(token)
    if (payload) {
      req.user = payload
    }
  }
  next()
}
