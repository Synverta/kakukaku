import { Router } from 'express'
import { query } from '../db'
import { requireAuth } from '../lib/auth'

export type VideoStatus = 'draft' | 'pending' | 'published' | 'rejected'

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
}

export type CreatorVideo = {
  id: number
  title: string
  description: string
  category: string
  tags: string[]
  cover: string
  videoSrc: string
  embedUrl: string
  duration: string
  status: VideoStatus
  views: number
  likes: number
  danmakuCount: number
  rejectReason: string | null
  scheduledAt: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
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
    status: row.status as VideoStatus,
    views: Number(row.views),
    likes: Number(row.likes),
    danmakuCount: Number(row.danmaku_count),
    rejectReason: row.reject_reason,
    scheduledAt: row.scheduled_at ? row.scheduled_at.toISOString() : null,
    publishedAt: row.published_at ? row.published_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

const VALID_STATUSES: VideoStatus[] = ['draft', 'pending', 'published', 'rejected']

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  if (typeof raw === 'string') return raw.split(',').map((t) => t.trim()).filter(Boolean)
  return []
}

export const videosRouter = Router()

videosRouter.get('/videos/mine', requireAuth, async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : null
  const filterStatus = status && VALID_STATUSES.includes(status as VideoStatus) ? status : null

  const params: unknown[] = [req.user!.sub]
  let where = 'where creator_id = $1'
  if (filterStatus) {
    params.push(filterStatus)
    where += ` and status = $${params.length}`
  }

  const result = await query<VideoRow>(
    `select * from videos ${where} order by created_at desc`,
    params,
  )
  res.json({ videos: result.rows.map(rowToVideo) })
})

videosRouter.post('/videos', requireAuth, async (req, res) => {
  const body = req.body ?? {}
  const title = String(body.title ?? '').trim()
  if (!title) {
    return res.status(400).json({ error: 'invalid_title', message: '标题不能为空' })
  }

  const description = String(body.description ?? '')
  const category = String(body.category ?? '动画').trim() || '动画'
  const tags = parseTags(body.tags)
  const cover = String(body.cover ?? '')
  const videoSrc = String(body.videoSrc ?? '')
  const embedUrl = String(body.embedUrl ?? '')
  const duration = String(body.duration ?? '00:00')
  const status: VideoStatus = VALID_STATUSES.includes(body.status) ? body.status : 'draft'
  const scheduledAt = body.scheduledAt ? new Date(String(body.scheduledAt)) : null

  const inserted = await query<VideoRow>(
    `insert into videos (creator_id, title, description, category, tags, cover, video_src, embed_url, duration, status, scheduled_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     returning *`,
    [req.user!.sub, title, description, category, tags, cover, videoSrc, embedUrl, duration, status, scheduledAt],
  )
  res.status(201).json({ video: rowToVideo(inserted.rows[0]) })
})

videosRouter.patch('/videos/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'invalid_id' })
  }

  const body = req.body ?? {}
  const fields: string[] = []
  const params: unknown[] = []
  let idx = 1

  function addField(column: string, value: unknown, transform?: (v: unknown) => unknown) {
    const v = transform ? transform(value) : value
    fields.push(`${column} = $${idx}`)
    params.push(v)
    idx++
  }

  if (body.title !== undefined) addField('title', body.title, (v) => String(v).trim())
  if (body.description !== undefined) addField('description', body.description, (v) => String(v))
  if (body.category !== undefined) addField('category', body.category, (v) => String(v).trim() || '动画')
  if (body.tags !== undefined) addField('tags', body.tags, parseTags)
  if (body.cover !== undefined) addField('cover', body.cover, (v) => String(v))
  if (body.videoSrc !== undefined) addField('video_src', body.videoSrc, (v) => String(v))
  if (body.embedUrl !== undefined) addField('embed_url', body.embedUrl, (v) => String(v))
  if (body.duration !== undefined) addField('duration', body.duration, (v) => String(v))
  if (body.status !== undefined && VALID_STATUSES.includes(body.status)) {
    addField('status', body.status)
    if (body.status === 'published') addField('published_at', new Date())
  }
  if (body.scheduledAt !== undefined) {
    addField('scheduled_at', body.scheduledAt, (v) => (v ? new Date(String(v)) : null))
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'no_fields' })
  }

  fields.push(`updated_at = $${idx}`)
  params.push(new Date())
  idx++
  params.push(id)
  params.push(req.user!.sub)

  const result = await query<VideoRow>(
    `update videos set ${fields.join(', ')} where id = $${idx} and creator_id = $${idx + 1} returning *`,
    params,
  )

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'not_found' })
  }
  res.json({ video: rowToVideo(result.rows[0]) })
})

videosRouter.delete('/videos/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'invalid_id' })
  }

  const result = await query<VideoRow>(
    'delete from videos where id = $1 and creator_id = $2 returning id',
    [id, req.user!.sub],
  )

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'not_found' })
  }
  res.json({ ok: true })
})
