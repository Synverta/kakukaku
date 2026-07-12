import { Router } from 'express'
import { query } from '../db'
import { requireAuth } from '../lib/auth'

type RightRow = {
  id: string
  code: string
  title: string
  detail: string
  enabled: boolean
  granted_at: Date
}

const DEFAULT_RIGHTS: { code: string; title: string; detail: string; enabled: boolean }[] = [
  { code: 'original_cert', title: '原创认证', detail: '完成原创声明后获得,享受站内原创流量扶持。', enabled: true },
  { code: 'brand_deal', title: '商单资格', detail: '累计 1 万粉丝且无违规记录,可开启商单合作。', enabled: true },
  { code: 'academy_pass', title: '创作学院通行证', detail: '解锁全部高级课程与讲师在线答疑。', enabled: true },
  { code: 'promo_credit', title: '必火推广额度', detail: '每月可领取 ¥50 等值推广积分,用于必火推广。', enabled: true },
  { code: 'community', title: '创作者社群', detail: '受邀加入创作者私密社群,与同行交流。', enabled: false },
  { code: 'support_team', title: '专属客服', detail: '资深客服 1v1 答疑,优先处理反馈。', enabled: false },
  { code: 'data_export', title: '数据导出', detail: '支持导出作品播放、收益、粉丝等详细数据。', enabled: true },
]

async function ensureRights(userId: number) {
  const existing = await query<{ c: string }>(
    `select count(*)::text as c from rights_grants where user_id = $1`,
    [userId],
  )
  if (Number(existing.rows[0]?.c ?? 0) > 0) return

  for (const r of DEFAULT_RIGHTS) {
    await query(
      `insert into rights_grants (user_id, code, title, detail, enabled)
       values ($1, $2, $3, $4, $5)`,
      [userId, r.code, r.title, r.detail, r.enabled],
    )
  }
}

function rowToRight(row: RightRow) {
  return {
    id: Number(row.id),
    code: row.code,
    title: row.title,
    detail: row.detail,
    enabled: row.enabled,
    grantedAt: row.granted_at.toISOString(),
  }
}

export const rightsRouter = Router()

rightsRouter.get('/creator/rights', requireAuth, async (req, res) => {
  const userId = req.user!.sub
  await ensureRights(userId)
  const result = await query<RightRow>(
    `select id, code, title, detail, enabled, granted_at
     from rights_grants where user_id = $1
     order by enabled desc, id`,
    [userId],
  )
  res.json({ rights: result.rows.map(rowToRight) })
})
