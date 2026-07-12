import { Router } from 'express'
import { query } from '../db'
import { requireAuth } from '../lib/auth'

type RevenueRow = {
  id: string
  source: string
  amount_cents: number
  memo: string
  occurred_on: Date
  created_at: Date
}

const SOURCE_LABELS: Record<string, string> = {
  views: '创作激励',
  charging: '用户充电',
  brand: '商单合作',
  activity: '活动奖励',
}

const RANGE_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 }

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function ensureSeed(userId: number) {
  // 仅在没有数据时填充模拟记录
  const existing = await query<{ c: string }>(
    `select count(*)::text as c from revenue_entries where user_id = $1`,
    [userId],
  )
  if (Number(existing.rows[0]?.c ?? 0) > 0) return

  // 生成 30 天的模拟数据
  const rows: { source: string; amount_cents: number; memo: string; occurred_on: string }[] = []
  for (let i = 0; i < 30; i += 1) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const day = isoDate(d)
    rows.push({ source: 'views', amount_cents: Math.round(3000 + Math.random() * 4000), memo: '播放激励', occurred_on: day })
    if (i % 4 === 0) rows.push({ source: 'charging', amount_cents: Math.round(2000 + Math.random() * 6000), memo: '充电收入', occurred_on: day })
    if (i % 7 === 0) rows.push({ source: 'brand', amount_cents: Math.round(50000 + Math.random() * 80000), memo: '商单合作', occurred_on: day })
    if (i % 10 === 0) rows.push({ source: 'activity', amount_cents: 10000, memo: '活动奖励', occurred_on: day })
  }

  for (const row of rows) {
    await query(
      `insert into revenue_entries (user_id, source, amount_cents, memo, occurred_on)
       values ($1, $2, $3, $4, $5)`,
      [userId, row.source, row.amount_cents, row.memo, row.occurred_on],
    )
  }
}

export const revenueRouter = Router()

revenueRouter.get('/creator/revenue', requireAuth, async (req, res) => {
  const userId = req.user!.sub
  const range = (typeof req.query.range === 'string' && RANGE_DAYS[req.query.range] ? req.query.range : '30d') as
    | '7d'
    | '30d'
    | '90d'
  const days = RANGE_DAYS[range]!

  await ensureSeed(userId)

  const totalResult = await query<{ amount_cents: string }>(
    `select coalesce(sum(amount_cents), 0)::text as amount_cents from revenue_entries
     where user_id = $1 and occurred_on >= (current_date - $2::int)`,
    [userId, days],
  )
  const totalCents = Number(totalResult.rows[0]?.amount_cents ?? 0)

  // 上一周期
  const prevResult = await query<{ amount_cents: string }>(
    `select coalesce(sum(amount_cents), 0)::text as amount_cents from revenue_entries
     where user_id = $1 and occurred_on >= (current_date - ($2 * 2)::int) and occurred_on < (current_date - $2::int)`,
    [userId, days],
  )
  const prevCents = Number(prevResult.rows[0]?.amount_cents ?? 0)

  const bySourceResult = await query<{ source: string; amount_cents: string }>(
    `select source, coalesce(sum(amount_cents), 0)::text as amount_cents from revenue_entries
     where user_id = $1 and occurred_on >= (current_date - $2::int)
     group by source`,
    [userId, days],
  )
  const bySource = bySourceResult.rows.map((r) => ({
    source: r.source,
    label: SOURCE_LABELS[r.source] ?? r.source,
    amountCents: Number(r.amount_cents),
    percent: totalCents > 0 ? Math.round((Number(r.amount_cents) / totalCents) * 100) : 0,
  }))

  const trendResult = await query<{ occurred_on: Date; amount_cents: string }>(
    `select occurred_on, coalesce(sum(amount_cents), 0)::text as amount_cents from revenue_entries
     where user_id = $1 and occurred_on >= (current_date - $2::int)
     group by occurred_on order by occurred_on`,
    [userId, days],
  )
  const trend = trendResult.rows.map((r) => ({
    date: isoDate(r.occurred_on),
    amountCents: Number(r.amount_cents),
  }))

  const entriesResult = await query<RevenueRow>(
    `select id, source, amount_cents, memo, occurred_on, created_at
     from revenue_entries where user_id = $1
     order by occurred_on desc, created_at desc limit 30`,
    [userId],
  )
  const entries = entriesResult.rows.map((r) => ({
    id: Number(r.id),
    source: r.source,
    amountCents: r.amount_cents,
    memo: r.memo,
    occurredOn: isoDate(r.occurred_on),
    createdAt: r.created_at.toISOString(),
  }))

  res.json({
    totalCents,
    prevCents,
    currency: 'CNY' as const,
    bySource,
    trend,
    entries,
  })
})
