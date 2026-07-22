import { Router } from 'express'
import { pool, query } from '../db'
import { optionalAuth, requireAuth } from '../lib/auth'

export const studioRouter = Router()

const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 56) || `ip-${Date.now().toString(36)}`

studioRouter.get('/ips', optionalAuth, async (_req, res) => {
  const rows = await query(`select i.*, u.username as owner_name from ips i left join users u on u.id = i.owner_user_id where i.status <> 'archived' order by i.updated_at desc limit 50`)
  res.json({ ips: rows.rows })
})

studioRouter.get('/ips/:slug', optionalAuth, async (req, res) => {
  const rows = await query(`select i.*, u.username as owner_name from ips i left join users u on u.id = i.owner_user_id where i.slug = $1 and i.status <> 'archived'`, [req.params.slug])
  if (rows.rowCount === 0) return res.status(404).json({ error: 'not_found' })
  res.json({ ip: rows.rows[0] })
})

studioRouter.post('/ips', requireAuth, async (req, res) => {
  const title = clean(req.body?.title, 160)
  if (title.length < 2) return res.status(400).json({ error: 'invalid_title' })
  const slug = /^[a-z0-9-]{3,64}$/.test(clean(req.body?.slug, 64)) ? clean(req.body.slug, 64) : slugify(title)
  const client = await pool.connect()
  try {
    await client.query('begin')
    const created = await client.query<{ id: string }>(
      `insert into ips (slug, owner_user_id, title, summary, description, category, cover) values ($1,$2,$3,$4,$5,$6,$7) returning id`,
      [slug, req.user!.sub, title, clean(req.body?.summary, 280), clean(req.body?.description, 12000), clean(req.body?.category, 60) || '动画', clean(req.body?.cover, 1000)],
    )
    await client.query(`insert into ip_members (ip_id,user_id,role) values ($1,$2,'owner')`, [created.rows[0].id, req.user!.sub])
    const rows = await client.query(`select * from ips where id = $1`, [created.rows[0].id])
    await client.query('commit')
    res.status(201).json({ ip: rows.rows[0] })
  } catch (error) {
    await client.query('rollback')
    if (/duplicate key/.test(error instanceof Error ? error.message : '')) return res.status(409).json({ error: 'slug_taken' })
    res.status(500).json({ error: 'server_error' })
  } finally { client.release() }
})

studioRouter.get('/me/contributions', requireAuth, async (req, res) => {
  const rows = await query(
    `select t.id, p.title, p.body, c.kind, c.status, c.credit_name, c.updated_at, i.slug as ip_slug, i.title as ip_title
       from community_contributions c
       join community_things t on t.id = c.thing_id
       join community_post_things p on p.thing_id = t.id
       join ips i on i.id = c.ip_id
      where t.author_id = $1 order by c.updated_at desc`,
    [req.user!.sub],
  )
  res.json({ contributions: rows.rows })
})

studioRouter.get('/me/entitlements', requireAuth, async (req, res) => {
  const rows = await query(
    `select e.*, c.title as project_title, c.cover,
       coalesce(json_agg(json_build_object('id', d.id, 'title', d.title, 'description', d.description, 'kind', d.kind, 'resourceUrl', d.resource_url, 'status', ed.status, 'releasedAt', d.released_at)) filter (where d.id is not null), '[]') as deliveries
       from entitlements e join campaigns c on c.id = e.campaign_id
       left join entitlement_deliveries ed on ed.entitlement_id = e.id
       left join deliverables d on d.id = ed.deliverable_id
      where e.user_id = $1 group by e.id, c.title, c.cover order by e.granted_at desc`,
    [req.user!.sub],
  )
  res.json({ entitlements: rows.rows })
})

studioRouter.get('/campaigns/:id/production', optionalAuth, async (req, res) => {
  const projects = await query(`select * from production_projects where campaign_id = $1 order by created_at desc limit 1`, [req.params.id])
  if (projects.rowCount === 0) return res.json({ project: null, milestones: [], updates: [], deliverables: [] })
  const project = projects.rows[0] as { id: string }
  const [milestones, updates, deliverables] = await Promise.all([
    query(`select * from production_milestones where production_project_id = $1 order by sequence, id`, [project.id]),
    query(`select * from production_updates where production_project_id = $1 order by created_at desc`, [project.id]),
    query(`select id,title,description,kind,status,released_at from deliverables where production_project_id = $1 and status = 'released' order by released_at desc`, [project.id]),
  ])
  res.json({ project, milestones: milestones.rows, updates: updates.rows, deliverables: deliverables.rows })
})

studioRouter.post('/campaigns/:id/production/updates', requireAuth, async (req, res) => {
  const campaign = await query<{ creator_id: string | null; title: string }>('select creator_id,title from campaigns where id = $1', [req.params.id])
  if (campaign.rowCount === 0) return res.status(404).json({ error: 'not_found' })
  if (Number(campaign.rows[0].creator_id) !== req.user!.sub) return res.status(403).json({ error: 'forbidden' })
  const title = clean(req.body?.title, 160); const body = clean(req.body?.body, 12000); const progress = Math.min(100, Math.max(0, Number(req.body?.progressPercent ?? 0)))
  if (!title || !body) return res.status(400).json({ error: 'invalid_payload' })
  const project = await query<{ id: string }>(
    `insert into production_projects (campaign_id,owner_user_id,title,status,progress_percent) values ($1,$2,$3,'active',$4)
     on conflict do nothing returning id`, [req.params.id, req.user!.sub, campaign.rows[0].title, progress],
  )
  let projectId = project.rows[0]?.id
  if (!projectId) {
    const existing = await query<{ id: string }>('select id from production_projects where campaign_id = $1 order by created_at desc limit 1', [req.params.id])
    projectId = existing.rows[0]?.id
  }
  if (!projectId) return res.status(500).json({ error: 'project_create_failed' })
  await query(`update production_projects set progress_percent=$2,status=case when $2=100 then 'completed' else 'active' end,updated_at=now() where id=$1`, [projectId, progress])
  const update = await query(`insert into production_updates (production_project_id,author_user_id,title,body,progress_percent) values ($1,$2,$3,$4,$5) returning *`, [projectId, req.user!.sub, title, body, progress])
  res.status(201).json({ update: update.rows[0] })
})

studioRouter.post('/production-projects/:id/deliverables', requireAuth, async (req, res) => {
  const project = await query<{ owner_user_id: string }>('select owner_user_id from production_projects where id = $1', [req.params.id])
  if (project.rowCount === 0) return res.status(404).json({ error: 'not_found' })
  if (Number(project.rows[0].owner_user_id) !== req.user!.sub) return res.status(403).json({ error: 'forbidden' })
  const title = clean(req.body?.title, 160); const resourceUrl = clean(req.body?.resourceUrl, 2000)
  if (!title || !resourceUrl) return res.status(400).json({ error: 'invalid_payload' })
  const created = await query<{ id: string }>(`insert into deliverables (production_project_id,title,description,kind,resource_url,status,released_at) values ($1,$2,$3,$4,$5,'released',now()) returning id`, [req.params.id, title, clean(req.body?.description, 4000), clean(req.body?.kind, 16) || 'file', resourceUrl])
  await query(
    `insert into entitlement_deliveries (entitlement_id,deliverable_id)
     select e.id,$1 from entitlements e join production_projects p on p.campaign_id=e.campaign_id where p.id=$2 and e.status in ('active','delivered') on conflict do nothing`,
    [created.rows[0].id, req.params.id],
  )
  res.status(201).json({ id: created.rows[0].id })
})
