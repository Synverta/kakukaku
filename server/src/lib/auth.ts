import type { Request, Response, NextFunction } from 'express'
import { query } from '../db'
import { verifyToken, type AuthPayload, type AuthRole } from './jwt'

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

type DeletedCheckRow = { deleted_at: Date | null; role: AuthRole | null }

const deletedCheckCache = new Map<number, { deletedAt: Date | null; role: AuthRole; checkedAt: number }>()
const DELETED_CHECK_TTL_MS = 60_000

export async function requireActiveUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.sub) return next()
  const uid = Number(req.user.sub)
  const now = Date.now()
  const cached = deletedCheckCache.get(uid)
  let deletedAt: Date | null | undefined
  let role: AuthRole = 'user'
  if (cached && now - cached.checkedAt < DELETED_CHECK_TTL_MS) {
    deletedAt = cached.deletedAt
    role = cached.role
  } else {
    const rows = await query<DeletedCheckRow>(
      `select deleted_at, role from users where id = $1 limit 1`,
      [uid],
    )
    deletedAt = rows.rowCount === 0 ? null : (rows.rows[0].deleted_at ?? null)
    role = rows.rowCount === 0 ? 'user' : ((rows.rows[0].role as AuthRole) ?? 'user')
    deletedCheckCache.set(uid, { deletedAt, role, checkedAt: now })
  }
  if (deletedAt) {
    return res.status(401).json({ error: 'account_deleted', message: '账号已注销' })
  }
  req.user.role = role
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

export function requireRole(...roles: AuthRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.sub) {
      return res.status(401).json({ error: 'missing_token' })
    }
    const uid = Number(req.user.sub)
    const now = Date.now()
    const cached = deletedCheckCache.get(uid)
    let role: AuthRole = 'user'
    let deletedAt: Date | null = null
    if (cached && now - cached.checkedAt < DELETED_CHECK_TTL_MS) {
      role = cached.role
      deletedAt = cached.deletedAt
    } else {
      const rows = await query<DeletedCheckRow>(
        `select deleted_at, role from users where id = $1 limit 1`,
        [uid],
      )
      if (rows.rowCount && rows.rowCount > 0) {
        deletedAt = rows.rows[0].deleted_at ?? null
        role = (rows.rows[0].role as AuthRole) ?? 'user'
      }
      deletedCheckCache.set(uid, { deletedAt, role, checkedAt: now })
    }
    if (deletedAt) {
      return res.status(401).json({ error: 'account_deleted', message: '账号已注销' })
    }
    if (!roles.includes(role)) {
      return res.status(403).json({ error: 'forbidden', message: '需要管理员权限' })
    }
    req.user.role = role
    next()
  }
}

export function clearAuthCache(userId?: number) {
  if (userId !== undefined) {
    deletedCheckCache.delete(userId)
    return
  }
  deletedCheckCache.clear()
}
