import { Router } from 'express'
import { query } from '../db'
import { requireAuth } from '../lib/auth'

type CommentRow = {
  id: string
  video_id: string
  user_id: string
  author_name: string
  avatar_letter: string
  content: string
  status: string
  created_at: Date
  video_title: string
}

type DanmakuRow = {
  id: string
  video_id: string
  user_id: string
  author_name: string
  text: string
  mode: string
  color: string
  time_seconds: number
  hidden: boolean
  created_at: Date
  video_title: string
}

function rowToComment(row: CommentRow) {
  return {
    id: Number(row.id),
    videoId: Number(row.video_id),
    videoTitle: row.video_title,
    authorName: row.author_name,
    avatarLetter: row.avatar_letter,
    content: row.content,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  }
}

function rowToDanmaku(row: DanmakuRow) {
  return {
    id: Number(row.id),
    videoId: Number(row.video_id),
    videoTitle: row.video_title,
    authorName: row.author_name,
    text: row.text,
    mode: row.mode,
    color: row.color,
    timeSeconds: row.time_seconds,
    hidden: row.hidden,
    createdAt: row.created_at.toISOString(),
  }
}

export const interactionsRouter = Router()

interactionsRouter.get('/creator/comments', requireAuth, async (req, res) => {
  const userId = req.user!.sub
  const status = typeof req.query.status === 'string' ? req.query.status : null
  const q = typeof req.query.q === 'string' ? req.query.q : null
  const videoId = typeof req.query.videoId === 'string' ? req.query.videoId : null
  const page = Math.max(1, Number(req.query.page ?? 1))
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 20)))

  const params: unknown[] = [userId]
  let where = `where c.video_id in (select id from videos where creator_id = $1)`
  if (status && status !== 'all') {
    params.push(status)
    where += ` and c.status = $${params.length}`
  }
  if (videoId && videoId !== 'all') {
    params.push(videoId)
    where += ` and c.video_id = $${params.length}`
  }
  if (q) {
    params.push(`%${q}%`)
    where += ` and c.content ilike $${params.length}`
  }

  const countResult = await query<{ c: string }>(
    `select count(*)::text as c from comments c ${where}`,
    params,
  )
  const total = Number(countResult.rows[0]?.c ?? 0)

  params.push(pageSize)
  params.push((page - 1) * pageSize)
  const result = await query<CommentRow>(
    `select c.*, v.title as video_title from comments c
     join videos v on v.id = c.video_id
     ${where}
     order by c.created_at desc
     limit $${params.length - 1} offset $${params.length}`,
    params,
  )

  res.json({ comments: result.rows.map(rowToComment), total, page, pageSize })
})

interactionsRouter.patch('/creator/comments/:id', requireAuth, async (req, res) => {
  const userId = req.user!.sub
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'invalid_id' })
  }
  const body = req.body ?? {}
  const status = body.status
  if (status !== 'visible' && status !== 'hidden' && status !== 'pinned') {
    return res.status(400).json({ error: 'invalid_status' })
  }

  const result = await query<CommentRow>(
    `update comments c set status = $1
     from videos v
     where c.id = $2 and c.video_id = v.id and v.creator_id = $3
     returning c.*, v.title as video_title`,
    [status, id, userId],
  )
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'not_found' })
  }
  res.json({ comment: rowToComment(result.rows[0]) })
})

interactionsRouter.delete('/creator/comments/:id', requireAuth, async (req, res) => {
  const userId = req.user!.sub
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'invalid_id' })
  }
  const result = await query(
    `delete from comments c using videos v
     where c.id = $1 and c.video_id = v.id and v.creator_id = $2`,
    [id, userId],
  )
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'not_found' })
  }
  res.json({ ok: true })
})

interactionsRouter.get('/creator/danmaku', requireAuth, async (req, res) => {
  const userId = req.user!.sub
  const videoId = typeof req.query.videoId === 'string' ? req.query.videoId : null
  const q = typeof req.query.q === 'string' ? req.query.q : null
  const page = Math.max(1, Number(req.query.page ?? 1))
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 20)))

  const params: unknown[] = [userId]
  let where = `where d.video_id in (select id from videos where creator_id = $1)`
  if (videoId && videoId !== 'all') {
    params.push(videoId)
    where += ` and d.video_id = $${params.length}`
  }
  if (q) {
    params.push(`%${q}%`)
    where += ` and d.text ilike $${params.length}`
  }

  const countResult = await query<{ c: string }>(
    `select count(*)::text as c from danmaku d ${where}`,
    params,
  )
  const total = Number(countResult.rows[0]?.c ?? 0)

  params.push(pageSize)
  params.push((page - 1) * pageSize)
  const result = await query<DanmakuRow>(
    `select d.*, v.title as video_title from danmaku d
     join videos v on v.id = d.video_id
     ${where}
     order by d.created_at desc
     limit $${params.length - 1} offset $${params.length}`,
    params,
  )

  res.json({ danmaku: result.rows.map(rowToDanmaku), total, page, pageSize })
})

interactionsRouter.patch('/creator/danmaku/:id', requireAuth, async (req, res) => {
  const userId = req.user!.sub
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'invalid_id' })
  }
  const body = req.body ?? {}
  const hidden = Boolean(body.hidden)

  const result = await query<DanmakuRow>(
    `update danmaku d set hidden = $1
     from videos v
     where d.id = $2 and d.video_id = v.id and v.creator_id = $3
     returning d.*, v.title as video_title`,
    [hidden, id, userId],
  )
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'not_found' })
  }
  res.json({ danmaku: rowToDanmaku(result.rows[0]) })
})

interactionsRouter.delete('/creator/danmaku/:id', requireAuth, async (req, res) => {
  const userId = req.user!.sub
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'invalid_id' })
  }
  const result = await query(
    `delete from danmaku d using videos v
     where d.id = $1 and d.video_id = v.id and v.creator_id = $2`,
    [id, userId],
  )
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'not_found' })
  }
  res.json({ ok: true })
})
