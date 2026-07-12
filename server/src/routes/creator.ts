import { Router } from 'express'
import { query } from '../db'
import { requireAuth } from '../lib/auth'

type VideoRow = {
  id: string
  creator_id: string
  title: string
  description: string
  category: string
  tags: string[]
  cover: string
  video_src: string
  embed_url: string
  duration: string
  status: string
  views: string
  likes: string
  danmaku_count: string
  reject_reason: string | null
  scheduled_at: Date | null
  published_at: Date | null
  created_at: Date
  updated_at: Date
  content_type: string
  pinned: boolean
}

type CreatorVideo = {
  id: number
  title: string
  description: string
  category: string
  tags: string[]
  cover: string
  videoSrc: string
  embedUrl: string
  duration: string
  status: string
  views: number
  likes: number
  danmakuCount: number
  rejectReason: string | null
  scheduledAt: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  contentType: string
  pinned: boolean
}

function rowToVideo(row: VideoRow): CreatorVideo {
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    category: row.category,
    tags: row.tags ?? [],
    cover: row.cover,
    videoSrc: row.video_src,
    embedUrl: row.embed_url,
    duration: row.duration,
    status: row.status,
    views: Number(row.views),
    likes: Number(row.likes),
    danmakuCount: Number(row.danmaku_count),
    rejectReason: row.reject_reason,
    scheduledAt: row.scheduled_at ? row.scheduled_at.toISOString() : null,
    publishedAt: row.published_at ? row.published_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    contentType: row.content_type,
    pinned: row.pinned,
  }
}

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export const creatorRouter = Router()

creatorRouter.get('/creator/dashboard', requireAuth, async (req, res) => {
  const userId = req.user!.sub

  const videosResult = await query<VideoRow>(
    `select * from videos where creator_id = $1`,
    [userId],
  )
  const videos = videosResult.rows.map(rowToVideo)
  const published = videos.filter((v) => v.status === 'published')

  const totalViews = published.reduce((s, v) => s + v.views, 0)
  const totalLikes = published.reduce((s, v) => s + v.likes, 0)
  const totalDanmaku = published.reduce((s, v) => s + v.danmakuCount, 0)

  const statsResult = await query<{ follower_count: string }>(
    `select follower_count from creator_stats where user_id = $1`,
    [userId],
  )
  const followerCount = statsResult.rows[0] ? Number(statsResult.rows[0].follower_count) : 0

  const pendingCommentsResult = await query<{ c: string }>(
    `select count(*)::text as c from comments
     where status = 'visible' and video_id in (select id from videos where creator_id = $1)`,
    [userId],
  )
  const pendingComments = Number(pendingCommentsResult.rows[0]?.c ?? 0)

  const draftCount = videos.filter((v) => v.status === 'draft').length
  const pendingVideoCount = videos.filter((v) => v.status === 'pending').length
  const scheduledVideoCount = videos.filter((v) => v.scheduledAt && new Date(v.scheduledAt) > new Date()).length

  // 计算 7 日环比(基于已发布作品 updated_at 粗略估算)
  const sevenDaysAgo = daysAgoIso(7)
  const fourteenDaysAgo = daysAgoIso(14)
  const delta7dViews = Math.round(
    published
      .filter((v) => v.updatedAt >= sevenDaysAgo)
      .reduce((s, v) => s + v.views, 0) *
      0.18,
  )
  const prevViews = Math.round(
    published
      .filter((v) => v.updatedAt >= fourteenDaysAgo && v.updatedAt < sevenDaysAgo)
      .reduce((s, v) => s + v.views, 0) *
      0.18,
  )
  const delta7dFollowers = Math.max(0, Math.round(followerCount * 0.06))

  // 更新任务进度(简单聚合)
  const commentsCountResult = await query<{ c: string }>(
    `select count(*)::text as c from comments where video_id in (select id from videos where creator_id = $1)`,
    [userId],
  )
  const totalComments = Number(commentsCountResult.rows[0]?.c ?? 0)

  const danmakuCountResult = await query<{ c: string }>(
    `select count(*)::text as c from danmaku where video_id in (select id from videos where creator_id = $1)`,
    [userId],
  )
  const totalDanmakuAll = Number(danmakuCountResult.rows[0]?.c ?? 0)

  await query(
    `update missions set progress = $2, status = case when progress >= target and status = 'active' then 'done' else status end
     where user_id = $1 and code = 'reply_comments_5'`,
    [userId, totalComments],
  )
  await query(
    `update missions set progress = $2, status = case when progress >= target and status = 'active' then 'done' else status end
     where user_id = $1 and code = 'views_1000'`,
    [userId, totalViews],
  )
  await query(
    `update missions set progress = $2, status = case when progress >= target and status = 'active' then 'done' else status end
     where user_id = $1 and code = 'danmaku_20'`,
    [userId, totalDanmakuAll],
  )
  await query(
    `update missions set progress = $2, status = case when progress >= target and status = 'active' then 'done' else status end
     where user_id = $1 and code = 'publish_1'`,
    [userId, published.length],
  )
  await query(
    `update missions set progress = $2, status = case when progress >= target and status = 'active' then 'done' else status end
     where user_id = $1 and code = 'fans_10'`,
    [userId, followerCount],
  )

  const recentVideos = [...published]
    .sort((a, b) => new Date(b.publishedAt ?? b.createdAt).getTime() - new Date(a.publishedAt ?? a.createdAt).getTime())
    .slice(0, 6)

  res.json({
    stats: {
      totalVideos: videos.length,
      totalViews,
      totalLikes,
      totalDanmaku,
      followerCount,
      delta7dViews: delta7dViews - prevViews,
      delta7dFollowers,
      pendingComments,
      draftCount,
      pendingVideoCount,
      scheduledVideoCount,
    },
    recentVideos,
  })
})

const RANGE_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 }

creatorRouter.get('/creator/stats', requireAuth, async (req, res) => {
  const userId = req.user!.sub
  const range = (typeof req.query.range === 'string' && RANGE_DAYS[req.query.range] ? req.query.range : '7d') as
    | '7d'
    | '30d'
    | '90d'
  const days = RANGE_DAYS[range]!

  const videosResult = await query<VideoRow>(
    `select * from videos where creator_id = $1 and status = 'published'`,
    [userId],
  )
  const videos = videosResult.rows.map(rowToVideo)
  const totalViews = videos.reduce((s, v) => s + v.views, 0)
  const totalLikes = videos.reduce((s, v) => s + v.likes, 0)

  const danmakuCountResult = await query<{ c: string }>(
    `select count(*)::text as c from danmaku where video_id in (select id from videos where creator_id = $1)`,
    [userId],
  )
  const totalDanmaku = Number(danmakuCountResult.rows[0]?.c ?? 0)

  const commentsCountResult = await query<{ c: string }>(
    `select count(*)::text as c from comments where video_id in (select id from videos where creator_id = $1)`,
    [userId],
  )
  const totalComments = Number(commentsCountResult.rows[0]?.c ?? 0)

  // 生成 series(把总播放分摊到 days 天)
  const series: { date: string; views: number; likes: number; danmaku: number; comments: number }[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const day = isoDate(d)
    // 简单线性分布 + 一点扰动
    const portion = i === 0 ? 1 : 0.6 + ((i % 4) * 0.12)
    series.push({
      date: day,
      views: Math.round((totalViews / days) * portion),
      likes: Math.round((totalLikes / days) * portion),
      danmaku: Math.round((totalDanmaku / days) * portion),
      comments: Math.round((totalComments / days) * portion),
    })
  }

  const topVideos = [...videos]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
    .map((v) => ({ id: v.id, title: v.title, views: v.views, likes: v.likes, danmaku: v.danmakuCount, comments: 0 }))

  // 流量来源(模拟分布,基于视频观看来源的合理猜测)
  const trafficSources = [
    { source: '首页推荐', percent: 42 },
    { source: '搜索', percent: 18 },
    { source: '相关推荐', percent: 22 },
    { source: '粉丝动态', percent: 12 },
    { source: '外部分享', percent: 6 },
  ]

  res.json({ range, totalViews, totalLikes, totalDanmaku, totalComments, series, topVideos, trafficSources })
})

creatorRouter.get('/creator/videos', requireAuth, async (req, res) => {
  const userId = req.user!.sub
  const status = typeof req.query.status === 'string' ? req.query.status : null
  const q = typeof req.query.q === 'string' ? req.query.q : null
  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'latest'
  const contentType = typeof req.query.contentType === 'string' ? req.query.contentType : null
  const page = Math.max(1, Number(req.query.page ?? 1))
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 20)))

  const params: unknown[] = [userId]
  let where = 'where creator_id = $1'
  if (status && status !== 'all') {
    params.push(status)
    where += ` and status = $${params.length}`
  }
  if (contentType && contentType !== 'all') {
    params.push(contentType)
    where += ` and content_type = $${params.length}`
  }
  if (q) {
    params.push(`%${q}%`)
    where += ` and (title ilike $${params.length} or description ilike $${params.length})`
  }

  const orderBy =
    sort === 'views_desc'
      ? 'views desc'
      : sort === 'likes_desc'
        ? 'likes desc'
        : sort === 'danmaku_desc'
          ? 'danmaku_count desc'
          : 'created_at desc'

  const countResult = await query<{ c: string }>(
    `select count(*)::text as c from videos ${where}`,
    params,
  )
  const total = Number(countResult.rows[0]?.c ?? 0)

  params.push(pageSize)
  params.push((page - 1) * pageSize)
  const result = await query<VideoRow>(
    `select * from videos ${where} order by ${orderBy} limit $${params.length - 1} offset $${params.length}`,
    params,
  )

  res.json({ videos: result.rows.map(rowToVideo), total, page, pageSize })
})

creatorRouter.get('/creator/videos/:id', requireAuth, async (req, res) => {
  const userId = req.user!.sub
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'invalid_id' })
  }

  const result = await query<VideoRow>(
    `select * from videos where id = $1 and creator_id = $2`,
    [id, userId],
  )
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'not_found' })
  }

  const video = rowToVideo(result.rows[0])
  // 模拟 14 日 daily views
  const dailyViews: { date: string; views: number }[] = []
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const portion = i === 0 ? 1 : 0.4 + ((i % 5) * 0.18)
    dailyViews.push({
      date: isoDate(d),
      views: Math.round((video.views / 14) * portion),
    })
  }

  res.json({ video, dailyViews })
})

creatorRouter.get('/creator/content-types/:type', requireAuth, async (req, res) => {
  const userId = req.user!.sub
  const type = req.params.type
  const result = await query<VideoRow>(
    `select * from videos where creator_id = $1 and content_type = $2 order by created_at desc limit 50`,
    [userId, type],
  )
  res.json({ items: result.rows.map(rowToVideo), total: result.rowCount ?? 0 })
})
