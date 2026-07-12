import { Router } from 'express'
import { query } from '../db'
import { requireAuth } from '../lib/auth'

type MissionRow = {
  id: string
  code: string
  title: string
  reward_text: string
  progress: number
  target: number
  status: string
  expires_at: Date | null
}

const DEFAULT_MISSIONS: { code: string; title: string; rewardText: string; target: number }[] = [
  { code: 'publish_1', title: '发布 1 条视频', rewardText: '新人流量 + 1000', target: 1 },
  { code: 'reply_comments_5', title: '回复 5 条评论', rewardText: '经验值 + 50', target: 5 },
  { code: 'fans_10', title: '新增 10 个粉丝', rewardText: '专属勋章', target: 10 },
  { code: 'views_1000', title: '累计播放破 1000', rewardText: '创作激励 ¥10', target: 1000 },
  { code: 'danmaku_20', title: '收到 20 条弹幕', rewardText: '弹幕红包 ¥5', target: 20 },
]

async function ensureMissions(userId: number) {
  const existing = await query<{ c: string }>(
    `select count(*)::text as c from missions where user_id = $1`,
    [userId],
  )
  if (Number(existing.rows[0]?.c ?? 0) > 0) return

  for (const m of DEFAULT_MISSIONS) {
    await query(
      `insert into missions (user_id, code, title, reward_text, progress, target, status)
       values ($1, $2, $3, $4, 0, $5, 'active')`,
      [userId, m.code, m.title, m.rewardText, m.target],
    )
  }
}

function rowToMission(row: MissionRow) {
  return {
    id: Number(row.id),
    code: row.code,
    title: row.title,
    rewardText: row.reward_text,
    progress: row.progress,
    target: row.target,
    status: row.status,
    expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
  }
}

export const growthRouter = Router()

growthRouter.get('/creator/missions', requireAuth, async (req, res) => {
  const userId = req.user!.sub
  await ensureMissions(userId)
  const result = await query<MissionRow>(
    `select id, code, title, reward_text, progress, target, status, expires_at
     from missions where user_id = $1
     order by case status when 'active' then 1 when 'done' then 2 else 3 end, id`,
    [userId],
  )
  res.json({ missions: result.rows.map(rowToMission) })
})

growthRouter.post('/creator/missions/:id/claim', requireAuth, async (req, res) => {
  const userId = req.user!.sub
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'invalid_id' })
  }
  const result = await query<MissionRow>(
    `update missions set status = 'claimed'
     where id = $1 and user_id = $2 and status = 'done'
     returning id, code, title, reward_text, progress, target, status, expires_at`,
    [id, userId],
  )
  if (result.rowCount === 0) {
    return res.status(400).json({ error: 'not_claimable' })
  }
  res.json({ mission: rowToMission(result.rows[0]) })
})
