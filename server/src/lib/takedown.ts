import { query } from '../db'

export type TakedownTargetType = 'video' | 'comment' | 'danmaku' | 'community'

export const TAKEDOWN_TARGETS: TakedownTargetType[] = ['video', 'comment', 'danmaku', 'community']

function tableFor(type: TakedownTargetType): { table: string; idCol: string } {
  switch (type) {
    case 'video':
      return { table: 'videos', idCol: 'id' }
    case 'comment':
      return { table: 'comments', idCol: 'id' }
    case 'danmaku':
      return { table: 'danmaku', idCol: 'id' }
    case 'community':
      return { table: 'community_things', idCol: 'id' }
  }
}

export async function takedownContent(params: {
  targetType: TakedownTargetType
  targetId: string | number
  reason: string
  adminId: number
  source?: string
}) {
  const { table, idCol } = tableFor(params.targetType)
  const value = Number(params.targetId)
  if (!Number.isFinite(value)) {
    throw new Error('invalid_target_id')
  }
  await query(
    `update ${table}
        set takedown_at = now(),
            takedown_reason = $1,
            takedown_by = $2,
            takedown_source = $3
      where ${idCol} = $4`,
    [params.reason.slice(0, 500), params.adminId, params.source ?? 'admin_takedown', value],
  )
}

export async function liftTakedown(params: { targetType: TakedownTargetType; targetId: string | number }) {
  const { table, idCol } = tableFor(params.targetType)
  const value = Number(params.targetId)
  if (!Number.isFinite(value)) {
    throw new Error('invalid_target_id')
  }
  await query(
    `update ${table}
        set takedown_at = null,
            takedown_reason = '',
            takedown_by = null,
            takedown_source = 'admin_takedown'
      where ${idCol} = $1`,
    [value],
  )
}

export async function isTakedDown(targetType: TakedownTargetType, targetId: string | number): Promise<boolean> {
  const { table, idCol } = tableFor(targetType)
  const value = Number(targetId)
  if (!Number.isFinite(value)) return false
  const rows = await query<{ takedown_at: Date | null }>(
    `select takedown_at from ${table} where ${idCol} = $1 limit 1`,
    [value],
  )
  if (rows.rowCount === 0) return false
  return Boolean(rows.rows[0].takedown_at)
}

export async function getContentOwnerId(
  targetType: TakedownTargetType,
  targetId: string | number,
): Promise<number | null> {
  const { table, idCol } = tableFor(targetType)
  const value = Number(targetId)
  if (!Number.isFinite(value)) return null
  const ownerCol = targetType === 'community' ? 'author_id' : targetType === 'video' ? 'creator_id' : 'user_id'
  const rows = await query<{ owner: string | number | null }>(
    `select ${ownerCol} as owner from ${table} where ${idCol} = $1 limit 1`,
    [value],
  )
  if (rows.rowCount === 0) return null
  const raw = rows.rows[0].owner
  if (raw === null || raw === undefined) return null
  const num = typeof raw === 'string' ? Number(raw) : raw
  return Number.isFinite(num) ? num : null
}