import { Router } from 'express'
import { pool, query } from '../db'
import { optionalAuth, requireAuth } from '../lib/auth'

type CommunityRow = {
  id: string; slug: string; name: string; description: string; category: string; icon_text: string; accent: string; banner: string
  creator_id: string | null; member_count: string; post_count: string; is_featured: boolean; created_at: Date; joined: boolean; weekly_posts: string; ip_id?: string | null
}

type PostRow = {
  id: string; fullname: string; community_id: string; community_slug: string; community_name: string; author_id: string; author_name: string; author_avatar: string
  title: string; body: string; category: string; tags: string[]; status: string; is_pinned: boolean; is_featured: boolean; adoption_status: string; adoption_note: string
  score: number; comment_count: number; child_count: number; created_at: Date; updated_at: Date; viewer_vote: number
}

type CommentRow = {
  id: string; fullname: string; post_id: string; parent_thing_id: string; depth: number; tree_path: string; author_id: string; author_name: string; author_avatar: string
  body: string; status: string; score: number; child_count: number; created_at: Date; viewer_vote: number
}

const seedCommunities = [
  ['mist-harbor', '雾港计划', '一起搭建一部发生在雾港的原创悬疑动画。', '动画', '雾', 'linear-gradient(135deg, #17364d, #d47b57)', true],
  ['shanhai-files', '山海档案局', '东方奇幻世界观、妖怪图鉴与主线任务的共创基地。', '游戏', '山', 'linear-gradient(135deg, #1f5d50, #e2a85f)', true],
  ['orbit-cinema', '轨道放映厅', '从一张概念图出发，共同孵化近未来太空歌剧。', '科幻', 'O', 'linear-gradient(135deg, #24234f, #798bd3)', true],
  ['paper-city', '纸上城建局', '城市、建筑与小人物的故事，在纸上慢慢长出来。', '小说', '城', 'linear-gradient(135deg, #8d5848, #e6bd84)', false],
  ['noiseroom', '失真房间', '独立音乐人的采样交换、概念专辑和声音实验。', '音乐', '♪', 'linear-gradient(135deg, #392746, #dd7596)', false],
  ['weekday-supper', '晚餐以后', '关于都市生活、下班后创作与微小快乐的共创日记。', '生活方式', '晚', 'linear-gradient(135deg, #8a5740, #e5ac72)', false],
  ['mecha-garden', '机甲花园', '机械设计、驾驶员角色与废土生态的多人接力创作。', '动画', '甲', 'linear-gradient(135deg, #31535d, #77b4a7)', true],
  ['cyber-tales', '霓虹短篇集', '每周一个命题，48 小时完成一篇赛博短篇故事。', '科幻', 'N', 'linear-gradient(135deg, #242047, #d164b1)', false],
] as const

function toCommunity(row: CommunityRow) {
  return { id: Number(row.id), slug: row.slug, name: row.name, description: row.description, category: row.category, iconText: row.icon_text, accent: row.accent, banner: row.banner, creatorId: row.creator_id ? Number(row.creator_id) : null, ipId: row.ip_id ? Number(row.ip_id) : null, memberCount: Number(row.member_count), postCount: Number(row.post_count), weeklyPosts: Number(row.weekly_posts), isFeatured: row.is_featured, joined: row.joined, createdAt: row.created_at.toISOString() }
}

function toPost(row: PostRow) {
  return { id: Number(row.id), fullname: row.fullname, communityId: Number(row.community_id), community: { slug: row.community_slug, name: row.community_name }, author: { id: Number(row.author_id), name: row.author_name, avatarLetter: row.author_avatar }, title: row.title, body: row.body, category: row.category, tags: row.tags ?? [], status: row.status, pinned: row.is_pinned, featured: row.is_featured, adoptionStatus: row.adoption_status, adoptionNote: row.adoption_note, voteScore: row.score, commentCount: row.comment_count, childCount: row.child_count, viewerVote: row.viewer_vote, createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString() }
}

function toComment(row: CommentRow) {
  return { id: Number(row.id), fullname: row.fullname, postId: Number(row.post_id), parentId: Number(row.parent_thing_id), depth: row.depth, path: row.tree_path, author: { id: Number(row.author_id), name: row.author_name, avatarLetter: row.author_avatar }, body: row.body, status: row.status, voteScore: row.score, childCount: row.child_count, viewerVote: row.viewer_vote, createdAt: row.created_at.toISOString() }
}

function cleanText(value: unknown, maxLength: number) { return typeof value === 'string' ? value.trim().slice(0, maxLength) : '' }
function makeSlug(name: string) { const latin = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); return latin.length >= 3 ? latin.slice(0, 42) : `community-${Date.now().toString(36)}` }
function treeSegment(id: string | number) { return String(id).padStart(13, '0') }

async function ensureCommunitySeeds() {
  for (const [slug, name, description, category, iconText, accent, featured] of seedCommunities) {
    await query(`insert into communities (slug, name, description, category, icon_text, accent, is_featured) values ($1,$2,$3,$4,$5,$6,$7) on conflict (slug) do nothing`, [slug, name, description, category, iconText, accent, featured])
  }
}

function communitySelect(viewerParam = '$1') {
  return `select c.id, c.slug, c.name, c.description, c.category, c.icon_text, c.accent, c.banner, c.creator_id, c.ip_id, c.member_count, c.post_count, c.is_featured, c.created_at,
    exists(select 1 from community_members cm where cm.community_id = c.id and cm.user_id = ${viewerParam}) as joined,
    (select count(*) from community_things t where t.community_id = c.id and t.kind = 'post' and t.status = 'visible' and t.created_at >= now() - interval '7 days') as weekly_posts
    from communities c`
}

function postSelect(viewerParam = '$1') {
  return `select t.id, t.fullname, t.community_id, c.slug as community_slug, c.name as community_name, t.author_id, u.username as author_name, u.avatar_letter as author_avatar,
    p.title, p.body, p.category, p.tags, t.status, p.is_pinned, p.is_featured, p.adoption_status, p.adoption_note,
    t.score, t.comment_count, t.child_count, t.created_at, t.updated_at,
    coalesce((select v.direction from community_thing_votes v where v.thing_id = t.id and v.user_id = ${viewerParam}), 0)::int as viewer_vote
    from community_things t join community_post_things p on p.thing_id = t.id join communities c on c.id = t.community_id join users u on u.id = t.author_id`
}

function commentSelect(viewerParam = '$1') {
  return `select t.id, t.fullname, t.root_post_id as post_id, t.parent_thing_id, t.depth, t.tree_path, t.author_id, u.username as author_name, u.avatar_letter as author_avatar,
    d.body, t.status, t.score, t.child_count, t.created_at,
    coalesce((select v.direction from community_thing_votes v where v.thing_id = t.id and v.user_id = ${viewerParam}), 0)::int as viewer_vote
    from community_things t join community_comment_things d on d.thing_id = t.id join users u on u.id = t.author_id`
}

async function loadDirectComments(viewerId: number | null, postId: number, parentId: number, limit: number, sort: 'best' | 'new' | 'old') {
  const orderBy = sort === 'new' ? 't.created_at desc, t.id desc' : sort === 'old' ? 't.created_at asc, t.id asc' : 't.score desc, t.created_at asc, t.id asc'
  const rows = await query<CommentRow>(`${commentSelect('$1')} where t.root_post_id = $2 and t.parent_thing_id = $3 and t.status = 'visible' order by ${orderBy} limit $4`, [viewerId, postId, parentId, limit + 1])
  const hasMore = rows.rows.length > limit
  return { comments: rows.rows.slice(0, limit).map(toComment), nextCursor: hasMore ? String(rows.rows[limit - 1].id) : null }
}

export const communitiesRouter = Router()

communitiesRouter.get('/communities', optionalAuth, async (req, res) => {
  await ensureCommunitySeeds()
  const category = cleanText(req.query.category, 32); const q = cleanText(req.query.q, 80); const sort = req.query.sort === 'new' || req.query.sort === 'active' ? req.query.sort : 'popular'; const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 24)))
  const params: unknown[] = [req.user?.sub ?? null]; const where = ['c.is_archived = false']
  if (category) { params.push(category); where.push(`c.category = $${params.length}`) }
  if (q) { params.push(`%${q}%`); where.push(`(c.name ilike $${params.length} or c.description ilike $${params.length})`) }
  params.push(limit)
  const orderBy = sort === 'new' ? 'c.created_at desc' : sort === 'active' ? 'weekly_posts desc, c.member_count desc' : 'c.member_count desc, weekly_posts desc, c.created_at desc'
  const result = await query<CommunityRow>(`${communitySelect()} where ${where.join(' and ')} order by ${orderBy} limit $${params.length}`, params)
  res.json({ communities: result.rows.map(toCommunity) })
})

communitiesRouter.get('/communities/mine', requireAuth, async (req, res) => {
  const result = await query<CommunityRow>(`${communitySelect()} join community_members mine on mine.community_id = c.id and mine.user_id = $1 where c.is_archived = false order by mine.joined_at desc`, [req.user!.sub])
  res.json({ communities: result.rows.map(toCommunity) })
})

communitiesRouter.post('/communities', requireAuth, async (req, res) => {
  const name = cleanText(req.body?.name, 60); const description = cleanText(req.body?.description, 280); const category = cleanText(req.body?.category, 32) || '其他'; const requestedSlug = cleanText(req.body?.slug, 48).toLowerCase(); const slug = /^[a-z0-9-]{3,48}$/.test(requestedSlug) ? requestedSlug : makeSlug(name); const iconText = cleanText(req.body?.iconText, 4) || name.slice(0, 1); const accent = cleanText(req.body?.accent, 320) || 'linear-gradient(135deg, #385f87, #cf8464)'
  if (name.length < 2 || description.length < 8) return res.status(400).json({ error: 'invalid_payload', message: '社区名称至少 2 字，描述至少 8 字。' })
  const client = await pool.connect()
  try {
    await client.query('begin')
    const created = await client.query<{ id: string }>(`insert into communities (slug,name,description,category,icon_text,accent,creator_id,member_count) values ($1,$2,$3,$4,$5,$6,$7,1) returning id`, [slug, name, description, category, iconText, accent, req.user!.sub])
    const id = created.rows[0].id
    await client.query(`insert into community_members (community_id,user_id,role) values ($1,$2,'owner')`, [id, req.user!.sub])
    const result = await client.query<CommunityRow>(`${communitySelect('$1')} where c.id = $2`, [req.user!.sub, id])
    await client.query('commit')
    res.status(201).json({ community: toCommunity(result.rows[0]) })
  } catch (error) {
    await client.query('rollback')
    if (/duplicate key/.test(error instanceof Error ? error.message : '')) return res.status(409).json({ error: 'slug_taken', message: '这个社区地址已被使用。' })
    res.status(500).json({ error: 'server_error' })
  } finally { client.release() }
})

communitiesRouter.get('/communities/:slug', optionalAuth, async (req, res) => {
  await ensureCommunitySeeds()
  const result = await query<CommunityRow>(`${communitySelect()} where c.slug = $2 and c.is_archived = false`, [req.user?.sub ?? null, req.params.slug])
  if (result.rowCount === 0) return res.status(404).json({ error: 'not_found' })
  res.json({ community: toCommunity(result.rows[0]) })
})

communitiesRouter.post('/communities/:slug/memberships', requireAuth, async (req, res) => {
  const community = await query<{ id: string }>('select id from communities where slug = $1 and is_archived = false', [req.params.slug])
  if (community.rowCount === 0) return res.status(404).json({ error: 'not_found' })
  const id = community.rows[0].id
  await query(`insert into community_members (community_id,user_id) values ($1,$2) on conflict do nothing`, [id, req.user!.sub])
  await query(`update communities set member_count = (select count(*) from community_members where community_id = $1), updated_at = now() where id = $1`, [id])
  const result = await query<CommunityRow>(`${communitySelect('$1')} where c.id = $2`, [req.user!.sub, id])
  res.json({ community: toCommunity(result.rows[0]) })
})

communitiesRouter.delete('/communities/:slug/memberships', requireAuth, async (req, res) => {
  const deleted = await query<{ community_id: string }>(`delete from community_members cm using communities c where cm.community_id = c.id and c.slug = $1 and cm.user_id = $2 and cm.role <> 'owner' returning cm.community_id`, [req.params.slug, req.user!.sub])
  if (deleted.rowCount === 0) return res.status(404).json({ error: 'membership_not_found' })
  await query(`update communities set member_count = (select count(*) from community_members where community_id = $1), updated_at = now() where id = $1`, [deleted.rows[0].community_id])
  res.json({ ok: true })
})

communitiesRouter.get('/communities/:slug/posts', optionalAuth, async (req, res) => {
  const sort = req.query.sort === 'new' || req.query.sort === 'top' ? req.query.sort : 'hot'; const category = cleanText(req.query.category, 32); const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 30)))
  const params: unknown[] = [req.user?.sub ?? null, req.params.slug]; let where = `where c.slug = $2 and t.kind = 'post' and t.status = 'visible'`
  if (req.user?.role !== 'admin') where += ' and t.takedown_at is null'
  if (category) { params.push(category); where += ` and p.category = $${params.length}` }
  params.push(limit)
  const orderBy = sort === 'new' ? 'p.is_pinned desc, t.created_at desc' : sort === 'top' ? 'p.is_pinned desc, t.score desc, t.created_at desc' : 'p.is_pinned desc, (t.score + t.comment_count * 3) desc, t.created_at desc'
  const result = await query<PostRow>(`${postSelect()} ${where} order by ${orderBy} limit $${params.length}`, params)
  res.json({ posts: result.rows.map(toPost) })
})

communitiesRouter.post('/communities/:slug/posts', requireAuth, async (req, res) => {
  const title = cleanText(req.body?.title, 160); const body = cleanText(req.body?.body, 12000); const category = cleanText(req.body?.category, 32) || '灵感征集'; const tags = Array.isArray(req.body?.tags) ? req.body.tags.map((tag: unknown) => cleanText(tag, 24)).filter(Boolean).slice(0, 8) : []
  if (title.length < 4 || body.length < 4) return res.status(400).json({ error: 'invalid_payload', message: '标题和内容至少 4 个字符。' })
  const client = await pool.connect()
  try {
    await client.query('begin')
    const community = await client.query<{ id: string }>('select id from communities where slug = $1 and is_archived = false for update', [req.params.slug])
    if (community.rowCount === 0) { await client.query('rollback'); return res.status(404).json({ error: 'not_found' }) }
    const communityId = community.rows[0].id
    await client.query(`insert into community_members (community_id,user_id) values ($1,$2) on conflict do nothing`, [communityId, req.user!.sub])
    const thing = await client.query<{ id: string }>(`insert into community_things (kind,community_id,author_id,parent_thing_id,root_post_id,depth,tree_path) values ('post',$1,$2,null,null,0,'') returning id`, [communityId, req.user!.sub])
    const thingId = thing.rows[0].id
    await client.query(`update community_things set root_post_id = id, tree_path = $1, fullname = $2 where id = $3`, [treeSegment(thingId), `t3_${Number(thingId).toString(36)}`, thingId])
    await client.query(`insert into community_post_things (thing_id,title,body,category,tags) values ($1,$2,$3,$4,$5::text[])`, [thingId, title, body, category, tags])
    await client.query(`update communities set post_count = post_count + 1, member_count = (select count(*) from community_members where community_id = $1), updated_at = now() where id = $1`, [communityId])
    const result = await client.query<PostRow>(`${postSelect('$1')} where t.id = $2`, [req.user!.sub, thingId])
    await client.query('commit')
    res.status(201).json({ post: toPost(result.rows[0]) })
  } catch { await client.query('rollback'); res.status(500).json({ error: 'server_error' }) } finally { client.release() }
})

communitiesRouter.post('/communities/:slug/contributions', requireAuth, async (req, res) => {
  const title = cleanText(req.body?.title, 160); const body = cleanText(req.body?.body, 12000); const kind = cleanText(req.body?.kind, 24) || 'idea'
  if (title.length < 4 || body.length < 4) return res.status(400).json({ error: 'invalid_payload' })
  const client = await pool.connect()
  try {
    await client.query('begin')
    const community = await client.query<{ id: string; ip_id: string | null }>('select id,ip_id from communities where slug=$1 and is_archived=false for update', [req.params.slug])
    if (community.rowCount === 0 || !community.rows[0].ip_id) { await client.query('rollback'); return res.status(409).json({ error: 'community_not_linked_to_ip' }) }
    const communityId = community.rows[0].id
    const thing = await client.query<{ id: string }>(`insert into community_things (kind,community_id,author_id,depth,tree_path) values ('post',$1,$2,0,'') returning id`, [communityId, req.user!.sub])
    const thingId = thing.rows[0].id
    await client.query(`update community_things set root_post_id=id,tree_path=$1,fullname=$2 where id=$3`, [treeSegment(thingId), `t3_${Number(thingId).toString(36)}`, thingId])
    await client.query(`insert into community_post_things (thing_id,title,body,category,tags) values ($1,$2,$3,'共创提案','{}')`, [thingId, title, body])
    await client.query(`insert into community_contributions (thing_id,ip_id,kind,credit_name) values ($1,$2,$3,$4)`, [thingId, community.rows[0].ip_id, kind, cleanText(req.body?.creditName, 80)])
    await client.query(`update communities set post_count=post_count+1,updated_at=now() where id=$1`, [communityId])
    await client.query('commit')
    res.status(201).json({ thingId: Number(thingId), status: 'submitted' })
  } catch { await client.query('rollback'); res.status(500).json({ error: 'server_error' }) } finally { client.release() }
})

communitiesRouter.get('/community-contributions/:id', optionalAuth, async (req, res) => {
  const rows = await query(
    `select c.*, p.title,p.body,t.author_id,u.username as author_name,i.title as ip_title,i.slug as ip_slug
       from community_contributions c join community_post_things p on p.thing_id=c.thing_id
       join community_things t on t.id=c.thing_id join users u on u.id=t.author_id join ips i on i.id=c.ip_id where c.thing_id=$1`, [req.params.id],
  )
  if (rows.rowCount === 0) return res.status(404).json({ error: 'not_found' })
  const events = await query(`select e.*,u.username as actor_name from contribution_events e join users u on u.id=e.actor_user_id where e.contribution_thing_id=$1 order by e.created_at desc`, [req.params.id])
  res.json({ contribution: rows.rows[0], events: events.rows })
})

communitiesRouter.post('/community-contributions/:id/adoption-events', requireAuth, async (req, res) => {
  const status = cleanText(req.body?.status, 24); const allowed = ['reviewing','adopted','in_production','declined']
  if (!allowed.includes(status)) return res.status(400).json({ error: 'invalid_status' })
  const current = await query<{ status: string; owner_user_id: string | null; creator_id: string | null }>(
    `select cc.status,i.owner_user_id,cm.creator_id from community_contributions cc join ips i on i.id=cc.ip_id join community_things t on t.id=cc.thing_id join communities cm on cm.id=t.community_id where cc.thing_id=$1`, [req.params.id],
  )
  if (current.rowCount === 0) return res.status(404).json({ error: 'not_found' })
  const canManage = [current.rows[0].owner_user_id, current.rows[0].creator_id].some((id) => Number(id) === req.user!.sub)
  if (!canManage) return res.status(403).json({ error: 'forbidden' })
  const note = cleanText(req.body?.note, 2000)
  await query(`insert into contribution_events (contribution_thing_id,actor_user_id,from_status,to_status,note) values ($1,$2,$3,$4,$5)`, [req.params.id, req.user!.sub, current.rows[0].status, status, note])
  await query(`update community_contributions set status=$2,updated_at=now() where thing_id=$1`, [req.params.id, status])
  await query(`update community_post_things set adoption_status=$2,adoption_note=$3 where thing_id=$1`, [req.params.id, status, note])
  res.json({ thingId: Number(req.params.id), status, note })
})

communitiesRouter.get('/community-posts/:id', optionalAuth, async (req, res) => {
  const id = Number(req.params.id); if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'invalid_id' })
  const takedownFilter = req.user?.role === 'admin' ? '' : ' and t.takedown_at is null'
  const result = await query<PostRow>(`${postSelect()} where t.id = $2 and t.kind = 'post' and t.status <> 'deleted'${takedownFilter}`, [req.user?.sub ?? null, id])
  if (result.rowCount === 0) return res.status(404).json({ error: 'not_found' })
  res.json({ post: toPost(result.rows[0]) })
})

async function voteThing(thingId: number, userId: number, direction: number) {
  const client = await pool.connect()
  try {
    await client.query('begin')
    const thing = await client.query<{ id: string }>(`select id from community_things where id = $1 and status = 'visible' for update`, [thingId])
    if (thing.rowCount === 0) {
      await client.query('rollback')
      return { notFound: true } as const
    }
    const existing = await client.query<{ direction: number }>(`select direction from community_thing_votes where thing_id = $1 and user_id = $2 for update`, [thingId, userId])
    const prior = existing.rows[0]?.direction ?? 0; const next = prior === direction ? 0 : direction
    if (next === 0) await client.query(`delete from community_thing_votes where thing_id = $1 and user_id = $2`, [thingId, userId])
    else await client.query(`insert into community_thing_votes (thing_id,user_id,direction) values ($1,$2,$3) on conflict (thing_id,user_id) do update set direction = excluded.direction, updated_at = now()`, [thingId, userId, next])
    const updated = await client.query<{ score: number }>(`update community_things set score = score + $1, updated_at = now() where id = $2 returning score`, [next - prior, thingId])
    await client.query('commit')
    return { notFound: false, viewerVote: next, voteScore: updated.rows[0].score } as const
  } catch (error) { await client.query('rollback'); throw error } finally { client.release() }
}

function registerVote(path: '/community-posts/:id/vote' | '/community-things/:id/vote') {
  communitiesRouter.post(path, requireAuth, async (req, res) => {
    const id = Number(req.params.id); const direction = Number(req.body?.direction)
    if (!Number.isSafeInteger(id) || (direction !== 1 && direction !== -1)) return res.status(400).json({ error: 'invalid_payload' })
    try { const result = await voteThing(id, req.user!.sub, direction); if (result.notFound) return res.status(404).json({ error: 'not_found' }); res.json({ thingId: id, ...result }) } catch { res.status(500).json({ error: 'server_error' }) }
  })
}
registerVote('/community-posts/:id/vote')
registerVote('/community-things/:id/vote')

communitiesRouter.get('/community-posts/:id/comments', optionalAuth, async (req, res) => {
  const postId = Number(req.params.id); const parentId = req.query.parentId ? Number(req.query.parentId) : postId; const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 25))); const sort = req.query.sort === 'new' || req.query.sort === 'old' ? req.query.sort : 'best'
  if (!Number.isSafeInteger(postId) || !Number.isSafeInteger(parentId)) return res.status(400).json({ error: 'invalid_id' })
  const post = await query<{ id: string }>(`select id from community_things where id = $1 and kind = 'post' and status <> 'deleted'`, [postId])
  if (post.rowCount === 0) return res.status(404).json({ error: 'not_found' })
  const result = await loadDirectComments(req.user?.sub ?? null, postId, parentId, limit, sort)
  res.json({ parentId, ...result })
})

communitiesRouter.get('/community-things/:id/replies', optionalAuth, async (req, res) => {
  const parentId = Number(req.params.id); const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 25))); const sort = req.query.sort === 'new' || req.query.sort === 'old' ? req.query.sort : 'best'
  if (!Number.isSafeInteger(parentId)) return res.status(400).json({ error: 'invalid_id' })
  const parent = await query<{ root_post_id: string; kind: string }>(`select root_post_id, kind from community_things where id = $1 and status = 'visible'`, [parentId])
  if (parent.rowCount === 0) return res.status(404).json({ error: 'not_found' })
  const postId = Number(parent.rows[0].root_post_id)
  const result = await loadDirectComments(req.user?.sub ?? null, postId, parentId, limit, sort)
  res.json({ parentId, ...result })
})

communitiesRouter.post('/community-posts/:id/comments', requireAuth, async (req, res) => {
  const postId = Number(req.params.id); const parentId = req.body?.parentId == null ? postId : Number(req.body.parentId); const body = cleanText(req.body?.body, 4000)
  if (!Number.isSafeInteger(postId) || !Number.isSafeInteger(parentId) || !body) return res.status(400).json({ error: 'invalid_payload' })
  const client = await pool.connect()
  try {
    await client.query('begin')
    const post = await client.query<{ id: string; community_id: string; tree_path: string }>(`select id, community_id, tree_path from community_things where id = $1 and kind = 'post' and status = 'visible' for update`, [postId])
    if (post.rowCount === 0) { await client.query('rollback'); return res.status(404).json({ error: 'not_found' }) }
    const parent = await client.query<{ id: string; depth: number; tree_path: string }>(`select id, depth, tree_path from community_things where id = $1 and root_post_id = $2 and status = 'visible' for update`, [parentId, postId])
    if (parent.rowCount === 0) { await client.query('rollback'); return res.status(400).json({ error: 'invalid_parent_id' }) }
    const parentRow = parent.rows[0]
    if (parentRow.depth >= 64) { await client.query('rollback'); return res.status(400).json({ error: 'max_comment_depth' }) }
    const thing = await client.query<{ id: string }>(`insert into community_things (kind,community_id,author_id,parent_thing_id,root_post_id,depth,tree_path) values ('comment',$1,$2,$3,$4,$5,'') returning id`, [post.rows[0].community_id, req.user!.sub, parentId, postId, parentRow.depth + 1])
    const thingId = thing.rows[0].id
    await client.query(`update community_things set tree_path = $1, fullname = $2 where id = $3`, [`${parentRow.tree_path}.${treeSegment(thingId)}`, `t1_${Number(thingId).toString(36)}`, thingId])
    await client.query(`insert into community_comment_things (thing_id,body) values ($1,$2)`, [thingId, body])
    await client.query(`update community_things set comment_count = comment_count + 1, updated_at = now() where id = $1`, [postId])
    await client.query(`update community_things set child_count = child_count + 1, updated_at = now() where id = $1`, [parentId])
    const result = await client.query<CommentRow>(`${commentSelect('$1')} where t.id = $2`, [req.user!.sub, thingId])
    await client.query('commit')
    res.status(201).json({ comment: toComment(result.rows[0]) })
  } catch { await client.query('rollback'); res.status(500).json({ error: 'server_error' }) } finally { client.release() }
})
