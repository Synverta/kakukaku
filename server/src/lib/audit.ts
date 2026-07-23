import type { Request } from 'express'
import { query } from '../db'
import type { AuthRole } from './jwt'

export type AuditPayload = Record<string, unknown>

function clientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded) {
    return forwarded.split(',')[0]?.trim() || null
  }
  return req.socket?.remoteAddress ?? null
}

export async function logAudit(params: {
  actorId: number | null
  actorRole: AuthRole
  action: string
  targetType?: string
  targetId?: string | number | null
  payload?: AuditPayload
  req?: Request
}) {
  const ip = params.req ? clientIp(params.req) : null
  const ua = params.req?.headers['user-agent']?.toString() ?? ''
  const targetId = params.targetId === undefined || params.targetId === null ? '' : String(params.targetId)
  await query(
    `insert into audit_events
       (actor_id, actor_role, action, target_type, target_id, payload, ip, user_agent)
     values ($1, $2, $3, $4, $5, $6::jsonb, $7::inet, $8)`,
    [
      params.actorId,
      params.actorRole,
      params.action,
      params.targetType ?? '',
      targetId,
      JSON.stringify(params.payload ?? {}),
      ip,
      ua.slice(0, 500),
    ],
  )
}