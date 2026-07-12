import { Router } from 'express'
import { query } from '../db'
import { optionalAuth, requireAuth } from '../lib/auth'

type FanRow = {
  id: string
  username: string
  avatar_letter: string
  followed_at: Date
  views: string
  likes: string
  danmaku: string
  comments: string
}

function rowToFan(row: FanRow) {
  return {
    id: Number(row.id),
    username: row.username,
    avatarLetter: row.avatar_letter,
    followedAt: row.followed_at.toISOString(),
    lastActiveAt: row.followed_at.toISOString(),
    engagement: {
      views: Number(row.views ?? 0),
      likes: Number(row.likes ?? 0),
      danmaku: Number(row.danmaku ?? 0),
      comments: Number(row.comments ?? 0),
    },
  }
}

export const fansRouter = Router()

fansRouter.get('/creator/fans', requireAuth, async (req, res) => {
  const userId = req.user!.sub
  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'latest'
  const page = Math.max(1, Number(req.query.page ?? 1))
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 20)))

  const orderBy =
    sort === 'engagement_desc'
      ? '(coalesce(eng.views, 0) + coalesce(eng.likes, 0) * 2 + coalesce(eng.comments, 0) * 3 + coalesce(eng.danmaku, 0) * 2) desc'
      : 'f.created_at desc'

  const countResult = await query<{ c: string }>(
    `select count(*)::text as c from follows where creator_id = $1`,
    [userId],
  )
  const total = Number(countResult.rows[0]?.c ?? 0)

  const result = await query<FanRow>(
    `select u.id, u.username, u.avatar_letter, f.created_at as followed_at,
            coalesce(eng.views, 0)::text as views,
            coalesce(eng.likes, 0)::text as likes,
            coalesce(eng.danmaku, 0)::text as danmaku,
            coalesce(eng.comments, 0)::text as comments
     from follows f
     join users u on u.id = f.follower_id
     left join lateral (
       select sum(views) as views, sum(likes) as likes, sum(danmaku_count) as danmaku, count(c.id) as comments
       from videos v
       left join comments c on c.video_id = v.id and c.user_id = u.id
       where v.creator_id = f.creator_id
     ) eng on true
     where f.creator_id = $1
     order by ${orderBy}
     limit $2 offset $3`,
    [userId, pageSize, (page - 1) * pageSize],
  )

  res.json({ fans: result.rows.map(rowToFan), total, page, pageSize })
})

fansRouter.delete('/creator/fans/:id', requireAuth, async (req, res) => {
  const userId = req.user!.sub
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'invalid_id' })
  }
  const result = await query(
    `delete from follows where creator_id = $1 and follower_id = $2`,
    [userId, id],
  )
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'not_found' })
  }
  // 重新计算粉丝数
  await query(
    `insert into creator_stats (user_id, follower_count, updated_at)
     values ($1, (select count(*) from follows where creator_id = $1), now())
     on conflict (user_id) do update
     set follower_count = excluded.follower_count, updated_at = now()`,
    [userId],
  )
  res.json({ ok: true })
})

// 公共 follow API(可选登录,推动 mission 进度)
fansRouter.post('/follows', optionalAuth, async (req, res) => {
  const body = req.body ?? {}
  const creatorId = Number(body.creatorId)
  const followerId = req.user?.sub
  if (!Number.isFinite(creatorId) || !followerId) {
    return res.status(400).json({ error: 'invalid_payload' })
  }
  if (followerId === creatorId) {
    return res.status(400).json({ error: 'self_follow' })
  }

  await query(
    `insert into follows (follower_id, creator_id) values ($1, $2) on conflict do nothing`,
    [followerId, creatorId],
  )

  await query(
    `insert into creator_stats (user_id, follower_count, updated_at)
     values ($1, (select count(*) from follows where creator_id = $1), now())
     on conflict (user_id) do update
     set follower_count = excluded.follower_count, updated_at = now()`,
    [creatorId],
  )

  // 更新任务进度
  const stats = await query<{ c: string }>(
    `select count(*)::text as c from follows where creator_id = $1`,
    [creatorId],
  )
  const count = Number(stats.rows[0]?.c ?? 0)
  await query(
    `update missions set progress = $2, status = case when progress >= target and status = 'active' then 'done' else status end
     where user_id = $1 and code = 'fans_10'`,
    [creatorId, count],
  )

  res.json({ ok: true, followerCount: count })
})
