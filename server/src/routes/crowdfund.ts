import { Router } from 'express'
import { query, pool } from '../db'
import { requireAuth, optionalAuth } from '../lib/auth'
import { campaigns as seedCampaigns, type Campaign } from '../data/crowdfundData.js'

type CampaignRow = {
  id: string
  creator_id: string | null
  creator_name: string
  creator_avatar: string
  title: string
  category: string
  summary: string
  cover: string
  goal_tokens: string
  raised_tokens: string
  backers: number
  days_left: number
  tags: string[]
  description: string
  token_plan: unknown
  perks: unknown
  milestones: unknown
  cost_saving_percent: number
  status: string
  created_at: Date
}

type ProductSeed = { id: string; name: string; tokens: number; perks?: string[]; highlight?: boolean }

function rowToCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    title: row.title,
    creator: row.creator_name,
    creatorAvatar: row.creator_avatar,
    category: row.category,
    summary: row.summary,
    cover: row.cover,
    goalTokens: Number(row.goal_tokens),
    raisedTokens: Number(row.raised_tokens),
    backers: row.backers,
    daysLeft: row.days_left,
    tags: row.tags ?? [],
    description: row.description,
    tokenPlan: row.token_plan as Campaign['tokenPlan'],
    perks: row.perks as Campaign['perks'],
    milestones: row.milestones as Campaign['milestones'],
    costSavingPercent: row.cost_saving_percent,
  }
}

async function ensureSeeded() {
  for (const c of seedCampaigns) {
    await query(
      `insert into campaigns (
        id, creator_name, creator_avatar, title, category, summary, cover,
        goal_tokens, raised_tokens, backers, days_left, tags, description,
        token_plan, perks, milestones, cost_saving_percent, status
      ) values (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,$10,$11,$12::text[],$13,
        $14::jsonb,$15::jsonb,$16::jsonb,$17,'live'
      )
       on conflict (id) do nothing`,
      [
        c.id, c.creator, c.creatorAvatar, c.title, c.category, c.summary, c.cover,
        c.goalTokens, c.raisedTokens, c.backers, c.daysLeft, c.tags, c.description,
        JSON.stringify(c.tokenPlan), JSON.stringify(c.perks), JSON.stringify(c.milestones),
        c.costSavingPercent,
      ],
    )
  }
}

async function syncProducts(campaignId: string, perks: ProductSeed[]) {
  for (const perk of perks) {
    const supportPoints = Math.max(1, Math.round(Number(perk.tokens)))
    await query(
      `insert into digital_products (campaign_id, code, name, description, price_cents, support_points, benefits, active)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb,true)
       on conflict (campaign_id, code) do update set
         name = excluded.name,
         description = excluded.description,
         price_cents = excluded.price_cents,
         support_points = excluded.support_points,
         benefits = excluded.benefits,
         active = true,
         updated_at = now()`,
      [campaignId, perk.id, perk.name, `${perk.name}数字权益`, supportPoints, supportPoints, JSON.stringify(perk.perks ?? [])],
    )
  }
}

export const crowdfundRouter = Router()

crowdfundRouter.get('/campaigns', optionalAuth, async (_req, res) => {
  await ensureSeeded()
  for (const campaign of seedCampaigns) await syncProducts(campaign.id, campaign.perks)
  const rows = await query<CampaignRow>(
    `select * from campaigns order by created_at desc, id asc`,
  )
  res.json({ campaigns: rows.rows.map(rowToCampaign) })
})

crowdfundRouter.get('/campaigns/:id', optionalAuth, async (req, res) => {
  const id = req.params.id
  await ensureSeeded()
  const seed = seedCampaigns.find((campaign) => campaign.id === id)
  if (seed) await syncProducts(seed.id, seed.perks)
  const rows = await query<CampaignRow>('select * from campaigns where id = $1', [id])
  if (rows.rowCount === 0) {
    return res.status(404).json({ error: 'not_found' })
  }
  res.json({ campaign: rowToCampaign(rows.rows[0]) })
})

crowdfundRouter.post('/campaigns', requireAuth, async (req, res) => {
  const body = req.body ?? {}
  const id: string = typeof body.id === 'string' && body.id ? body.id : `user-${Date.now()}`
  const title = String(body.title ?? '').trim() || '未命名 IP 计划'
  const creatorName = String(body.creator ?? '').trim() || '匿名创作人'
  const category = String(body.category ?? '动画')
  const summary = String(body.summary ?? '一个正在共创支持的 AIGC IP 计划。').slice(0, 280)
  const cover = String(body.cover ?? 'linear-gradient(135deg, #2868ff 0%, #18b6a0 100%)')
  const goalTokens = Math.max(1000, Math.round(Number(body.goalTokens ?? 800000)))
  const description = String(body.description ?? summary)
  const tags: string[] = Array.isArray(body.tags) ? body.tags.map(String) : ['新发起']
  const tokenPlan = Array.isArray(body.tokenPlan) ? body.tokenPlan : []
  const perks = Array.isArray(body.perks) ? body.perks : []
  const milestones = Array.isArray(body.milestones) ? body.milestones : []
  const costSavingPercent = Math.max(0, Math.min(90, Math.round(Number(body.costSavingPercent ?? 38))))

  const avatar = creatorName.slice(0, 1).toUpperCase()

  try {
    const inserted = await query<CampaignRow>(
      `insert into campaigns (
        id, creator_id, creator_name, creator_avatar, title, category, summary, cover,
        goal_tokens, tags, description, token_plan, perks, milestones,
        cost_saving_percent, status
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10::text[],$11,$12::jsonb,$13::jsonb,$14::jsonb,
        $15,'live'
      )
      returning *`,
      [
        id, req.user!.sub, creatorName, avatar, title, category, summary, cover,
        goalTokens, tags, description,
        JSON.stringify(tokenPlan), JSON.stringify(perks), JSON.stringify(milestones),
        costSavingPercent,
      ],
    )
    await syncProducts(id, perks as ProductSeed[])
    res.status(201).json({ campaign: rowToCampaign(inserted.rows[0]) })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/duplicate key/.test(message)) {
      return res.status(409).json({ error: 'id_conflict' })
    }
    res.status(500).json({ error: 'server_error', message })
  }
})

crowdfundRouter.post('/campaigns/:id/pledges', requireAuth, async (req, res) => {
  const campaignId = req.params.id
  const { tierId, tokens } = req.body ?? {}

  if (typeof tierId !== 'string' || typeof tokens !== 'number' || tokens <= 0) {
    return res.status(400).json({ error: 'invalid_payload' })
  }

  const client = await pool.connect()
  try {
    await client.query('begin')

    const campaignRows = await client.query<{ goal: string }>(
      `select goal_tokens as goal from campaigns where id = $1 for update`,
      [campaignId],
    )
    if (campaignRows.rowCount === 0) {
      await client.query('rollback')
      return res.status(404).json({ error: 'campaign_not_found' })
    }

    const tierRows = await client.query<{ name: string }>(
      `select tier->>'name' as name
         from campaigns, jsonb_array_elements(perks) as tier
        where campaigns.id = $1 and tier->>'id' = $2
        limit 1`,
      [campaignId, tierId],
    )
    const tierName = tierRows.rows[0]?.name ?? '支持档位'

    const priorRows = await client.query<{ exists: boolean }>(
      `select exists(
         select 1 from pledges where campaign_id = $1 and user_id = $2
       ) as exists`,
      [campaignId, req.user!.sub],
    )
    const isNewBacker = !priorRows.rows[0]?.exists

    await client.query(
      `insert into pledges (campaign_id, user_id, tier_id, tier_name, tokens)
       values ($1, $2, $3, $4, $5)`,
      [campaignId, req.user!.sub, tierId, tierName, tokens],
    )

    await client.query(
      `update campaigns
         set raised_tokens = raised_tokens + $1,
             backers = backers + $2
       where id = $3`,
      [tokens, isNewBacker ? 1 : 0, campaignId],
    )

    const updated = await client.query<CampaignRow>(
      'select * from campaigns where id = $1',
      [campaignId],
    )

    await client.query('commit')

    res.json({ ok: true, campaign: rowToCampaign(updated.rows[0]) })
  } catch (error) {
    await client.query('rollback')
    const message = error instanceof Error ? error.message : String(error)
    res.status(500).json({ error: 'server_error', message })
  } finally {
    client.release()
  }
})
