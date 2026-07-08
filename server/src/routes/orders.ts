import { Router } from 'express'
import { query, pool } from '../db'
import { requireAuth } from '../lib/auth'
import { getProvider, type CheckoutMethod } from '../payments'

type OrderRow = {
  id: string
  out_trade_no: string
  user_id: string
  campaign_id: string
  tier_id: string
  tier_name: string
  tokens: string
  amount_cents: number
  currency: string
  provider: string
  status: string
  reconciled: boolean
  created_at: Date
  paid_at: Date | null
  closed_at: Date | null
  refunded_at: Date | null
  refund_reason: string | null
}

function rowToOrder(row: OrderRow) {
  return {
    id: row.id,
    outTradeNo: row.out_trade_no,
    campaignId: row.campaign_id,
    tierId: row.tier_id,
    tierName: row.tier_name,
    tokens: Number(row.tokens),
    amountCents: row.amount_cents,
    currency: row.currency,
    provider: row.provider,
    status: row.status,
    reconciled: row.reconciled,
    createdAt: row.created_at.toISOString(),
    paidAt: row.paid_at?.toISOString() ?? null,
    closedAt: row.closed_at?.toISOString() ?? null,
    refundedAt: row.refunded_at?.toISOString() ?? null,
    refundReason: row.refund_reason,
  }
}

function generateOutTradeNo(userId: number): string {
  const ts = Date.now().toString(36)
  const rand = Math.floor(Math.random() * 1e6).toString(36).padStart(4, '0')
  return `${ts}${userId}${rand}`
}

export const ordersRouter = Router()

ordersRouter.post('/orders', requireAuth, async (req, res) => {
  const { campaignId, tierId, tierName, tokens, provider, amountCents: clientAmountCents } = req.body ?? {}

  if (
    typeof campaignId !== 'string' ||
    typeof tierId !== 'string' ||
    typeof tierName !== 'string' ||
    typeof tokens !== 'number' ||
    tokens <= 0
  ) {
    return res.status(400).json({ error: 'invalid_payload' })
  }

  const providerName: 'alipay' | 'wechat' = provider === 'wechat' ? 'wechat' : 'alipay'
  const amountCents = typeof clientAmountCents === 'number' && clientAmountCents > 0
    ? Math.round(clientAmountCents)
    : Math.max(1, Math.round(tokens))

  const outTradeNo = generateOutTradeNo(req.user!.sub)
  const providerImpl = getProvider(providerName)

  const created = await providerImpl.createOrder({
    outTradeNo,
    amountCents,
    subject: `[${tierName}] ${campaignId} 支持 ${tokens} token`,
    body: `${tierName} for ${campaignId} - ${tokens} tokens`,
  })

  const inserted = await query<OrderRow>(
    `insert into orders (
       out_trade_no, user_id, campaign_id, tier_id, tier_name,
       tokens, amount_cents, currency, provider, status
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
     returning *`,
    [
      outTradeNo,
      req.user!.sub,
      campaignId,
      tierId,
      tierName,
      tokens,
      amountCents,
      'CNY',
      providerName,
    ],
  )

  const order = rowToOrder(inserted.rows[0])

  res.status(201).json({
    order,
    provider: providerName,
    providerDisplayName: providerImpl.displayName,
    payUrl: created.payUrl,
    codeUrl: created.codeUrl,
    note: created.providerNote,
  })
})

ordersRouter.get('/orders/list', requireAuth, async (req, res) => {
  const rows = await query<OrderRow>(
    `select * from orders where user_id = $1 order by created_at desc limit 50`,
    [req.user!.sub],
  )
  res.json({ orders: rows.rows.map(rowToOrder) })
})

ordersRouter.get('/orders/by-trade/:outTradeNo', requireAuth, async (req, res) => {
  const rows = await query<OrderRow>(
    `select * from orders where out_trade_no = $1 and user_id = $2 limit 1`,
    [req.params.outTradeNo, req.user!.sub],
  )
  if (rows.rowCount === 0) return res.status(404).json({ error: 'not_found' })
  res.json({ order: rowToOrder(rows.rows[0]) })
})

ordersRouter.post('/orders/by-trade/:outTradeNo/dev-confirm', requireAuth, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'disabled_in_prod' })
  }
  const rows = await query<OrderRow>(
    `select * from orders where out_trade_no = $1 and user_id = $2 limit 1`,
    [req.params.outTradeNo, req.user!.sub],
  )
  if (rows.rowCount === 0) return res.status(404).json({ error: 'not_found' })
  const order = rowToOrder(rows.rows[0])
  if (order.status === 'paid') {
    return res.json({ order, note: '已经入账' })
  }
  await reconcile(order.outTradeNo)
  const refreshed = await query<OrderRow>(
    `select * from orders where out_trade_no = $1 limit 1`,
    [order.outTradeNo],
  )
  res.json({ order: rowToOrder(refreshed.rows[0]), note: 'mock 收银台入账完成' })
})

export async function reconcile(outTradeNo: string): Promise<{
  status: 'reconciled' | 'already_paid' | 'order_missing'
}> {
  const client = await pool.connect()
  try {
    await client.query('begin')

    const orderRows = await client.query<OrderRow>(
      `select * from orders where out_trade_no = $1 for update`,
      [outTradeNo],
    )
    if (orderRows.rowCount === 0) {
      await client.query('rollback')
      return { status: 'order_missing' }
    }
    const order = orderRows.rows[0]

    if (order.status === 'paid' || order.reconciled) {
      await client.query('commit')
      return { status: 'already_paid' }
    }

    const prior = await client.query<{ exists: boolean }>(
      `select exists(
         select 1 from pledges where out_trade_no = $1
       ) as exists`,
      [outTradeNo],
    )

    if (!prior.rows[0].exists) {
      const isNewBackerQuery = await client.query<{ exists: boolean }>(
        `select exists(
           select 1 from pledges where campaign_id = $1 and user_id = $2
         ) as exists`,
        [order.campaign_id, Number(order.user_id)],
      )
      const isNewBacker = !isNewBackerQuery.rows[0].exists

      await client.query(
        `insert into pledges (campaign_id, user_id, tier_id, tier_name, tokens, out_trade_no, order_id)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [order.campaign_id, Number(order.user_id), order.tier_id, order.tier_name, Number(order.tokens), order.out_trade_no, Number(order.id)],
      )

      await client.query(
        `update campaigns
           set raised_tokens = raised_tokens + $1,
               backers = backers + $2
         where id = $3`,
        [Number(order.tokens), isNewBacker ? 1 : 0, order.campaign_id],
      )
    }

    await client.query(
      `update orders
         set status = 'paid', reconciled = true, paid_at = now()
       where out_trade_no = $1`,
      [outTradeNo],
    )

    await client.query('commit')
    return { status: 'reconciled' }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

type CloseResult =
  | { status: 'closed'; order: ReturnType<typeof rowToOrder> }
  | { status: 'already_closed' | 'already_paid' | 'already_refunded' | 'order_missing' }

type RefundResult =
  | { status: 'refunded'; order: ReturnType<typeof rowToOrder> }
  | { status: 'already_refunded' | 'not_paid' | 'order_missing' }

export async function closePendingOrderForUser(userId: number, outTradeNo: string): Promise<CloseResult> {
  const client = await pool.connect()
  try {
    await client.query('begin')

    const orderRows = await client.query<OrderRow>(
      `select * from orders where out_trade_no = $1 and user_id = $2 for update`,
      [outTradeNo, userId],
    )
    if (orderRows.rowCount === 0) {
      await client.query('rollback')
      return { status: 'order_missing' }
    }
    const order = orderRows.rows[0]

    if (order.status === 'closed') {
      await client.query('commit')
      return { status: 'already_closed' }
    }
    if (order.status === 'paid') {
      await client.query('commit')
      return { status: 'already_paid' }
    }
    if (order.status === 'refunded') {
      await client.query('commit')
      return { status: 'already_refunded' }
    }

    await client.query(
      `update orders set status = 'closed', closed_at = now() where out_trade_no = $1`,
      [outTradeNo],
    )

    const refreshed = await client.query<OrderRow>(
      `select * from orders where out_trade_no = $1`,
      [outTradeNo],
    )
    await client.query('commit')
    return { status: 'closed', order: rowToOrder(refreshed.rows[0]) }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

type RefundOrchestratorResult =
  | { status: 'refunded'; order: ReturnType<typeof rowToOrder>; outRefundNo: string; providerNote: string }
  | { status: 'already_refunded'; outRefundNo?: string }
  | { status: 'pending_exists'; outRefundNo: string }
  | { status: 'provider_failed'; outRefundNo: string; error: string; note: string }
  | { status: 'not_paid' }
  | { status: 'order_missing' }

function generateOutRefundNo(outTradeNo: string): string {
  const ts = Date.now().toString(36)
  const rand = Math.floor(Math.random() * 1e5).toString(36).padStart(4, '0')
  return `${outTradeNo}-R${ts}${rand}`
}

export async function refundPaidOrderForUser(
  userId: number,
  outTradeNo: string,
  reason: string | null,
): Promise<RefundOrchestratorResult> {
  let outRefundNo: string
  let orderId: number
  let provider: CheckoutMethod
  let amountCents: number
  let totalCents: number
  let orderCampaignId: string
  let orderUserId: number
  let orderTokens: number
  let orderOutTradeNo: string

  const phase1 = await (async () => {
    const client = await pool.connect()
    try {
      await client.query('begin')

      const orderRows = await client.query<OrderRow>(
        `select * from orders where out_trade_no = $1 and user_id = $2 for update`,
        [outTradeNo, userId],
      )
      if (orderRows.rowCount === 0) {
        await client.query('rollback')
        return { status: 'order_missing' as const }
      }
      const order = orderRows.rows[0]

      if (order.status === 'refunded') {
        await client.query('commit')
        return { status: 'already_refunded' as const }
      }
      if (order.status !== 'paid') {
        await client.query('commit')
        return { status: 'not_paid' as const }
      }

      const pending = await client.query<{ out_refund_no: string }>(
        `select out_refund_no from refund_attempts where order_id = $1 and status = 'pending' limit 1`,
        [order.id],
      )
      if (pending.rowCount && pending.rowCount > 0) {
        await client.query('commit')
        return { status: 'pending_exists' as const, outRefundNo: pending.rows[0].out_refund_no }
      }

      outRefundNo = generateOutRefundNo(outTradeNo)
      await client.query(
        `insert into refund_attempts (
           out_refund_no, order_id, out_trade_no, user_id, campaign_id, provider,
           amount_cents, status, reason
         ) values ($1,$2,$3,$4,$5,$6,$7,'pending',$8)`,
        [
          outRefundNo,
          order.id,
          order.out_trade_no,
          order.user_id,
          order.campaign_id,
          order.provider,
          order.amount_cents,
          reason,
        ],
      )

      await client.query('commit')

      return {
        status: 'pending' as const,
        context: {
          outRefundNo,
          orderId: Number(order.id),
          provider: order.provider as CheckoutMethod,
          amountCents: order.amount_cents,
          totalCents: order.amount_cents,
          orderCampaignId: order.campaign_id,
          orderUserId: Number(order.user_id),
          orderTokens: Number(order.tokens),
          orderOutTradeNo: order.out_trade_no,
        },
      }
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  })()

  if (phase1.status === 'order_missing' || phase1.status === 'not_paid' || phase1.status === 'already_refunded') {
    return phase1
  }
  if (phase1.status === 'pending_exists') {
    return { status: 'pending_exists', outRefundNo: phase1.outRefundNo }
  }

  outRefundNo = phase1.context.outRefundNo
  orderId = phase1.context.orderId
  provider = phase1.context.provider
  amountCents = phase1.context.amountCents
  totalCents = phase1.context.totalCents
  orderCampaignId = phase1.context.orderCampaignId
  orderUserId = phase1.context.orderUserId
  orderTokens = phase1.context.orderTokens
  orderOutTradeNo = phase1.context.orderOutTradeNo

  const providerImpl = getProvider(provider)
  let providerResult
  try {
    providerResult = await providerImpl.refund({
      outRefundNo,
      outTradeNo: orderOutTradeNo,
      amountCents,
      totalCents,
      reason: reason ?? undefined,
    })
  } catch (error) {
    providerResult = {
      method: provider,
      status: 'failed' as const,
      error: error instanceof Error ? error.message : String(error),
      note: 'provider.refund() 抛错',
    }
  }

  if (providerResult.status !== 'success') {
    await query(
      `update refund_attempts
          set status = 'failed', error_message = $2, provider_response = $3, settled_at = now()
        where out_refund_no = $1`,
      [outRefundNo, providerResult.error ?? 'unknown', JSON.stringify(providerResult.raw ?? null)],
    )
    return {
      status: 'provider_failed',
      outRefundNo,
      error: providerResult.error ?? 'unknown',
      note: providerResult.note ?? '原路退款未成功',
    }
  }

  const client = await pool.connect()
  try {
    await client.query('begin')

    const orderRows = await client.query<OrderRow>(
      `select * from orders where id = $1 for update`,
      [orderId],
    )
    if (orderRows.rowCount === 0) {
      await client.query('rollback')
      return { status: 'order_missing' }
    }
    const order = orderRows.rows[0]

    if (order.status === 'refunded') {
      await client.query('commit')
      return { status: 'already_refunded' }
    }
    if (order.status !== 'paid') {
      await client.query('rollback')
      return { status: 'not_paid' }
    }

    const pledgeRows = await client.query<{ id: string }>(
      `select id from pledges where out_trade_no = $1 limit 1`,
      [outTradeNo],
    )
    if (pledgeRows.rowCount === 0) {
      await client.query('rollback')
      return { status: 'not_paid' }
    }
    const pledgeId = pledgeRows.rows[0].id

    const isLast = await client.query<{ count: string }>(
      `select count(*)::int as count
         from pledges
        where campaign_id = $1
          and user_id = $2
          and id <> $3
          and refunded = false`,
      [order.campaign_id, Number(order.user_id), pledgeId],
    )
    const backersDelta = Number(isLast.rows[0].count) === 0 ? -1 : 0

    await client.query(`update pledges set refunded = true, refunded_at = now() where id = $1`, [pledgeId])

    await client.query(
      `update campaigns
         set raised_tokens = greatest(0, raised_tokens - $1),
             backers = greatest(0, backers + $2)
       where id = $3`,
      [Number(order.tokens), backersDelta, order.campaign_id],
    )

    await client.query(
      `update orders set status = 'refunded', refunded_at = now(), refund_reason = $2 where out_trade_no = $1`,
      [outTradeNo, reason],
    )

    await client.query(
      `update refund_attempts
          set status = 'success', settled_at = now(), provider_refund_id = $2, provider_response = $3
        where out_refund_no = $1`,
      [outRefundNo, providerResult.providerRefundId ?? null, JSON.stringify(providerResult.raw ?? null)],
    )

    const refreshed = await client.query<OrderRow>(
      `select * from orders where out_trade_no = $1`,
      [outTradeNo],
    )
    await client.query('commit')
    return {
      status: 'refunded',
      order: rowToOrder(refreshed.rows[0]),
      outRefundNo,
      providerNote: providerResult.note,
    }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

ordersRouter.post('/orders/by-trade/:outTradeNo/close', requireAuth, async (req, res) => {
  const result = await closePendingOrderForUser(req.user!.sub, req.params.outTradeNo)
  switch (result.status) {
    case 'closed':
    case 'already_closed':
      res.json({ ok: true, status: result.status, order: 'order' in result ? result.order : undefined })
      return
    case 'already_paid':
      res.status(409).json({ error: 'cannot_close_paid_order', message: '已入账的订单请走退款流程' })
      return
    case 'already_refunded':
      res.status(409).json({ error: 'already_refunded' })
      return
    case 'order_missing':
      res.status(404).json({ error: 'not_found' })
      return
  }
})

ordersRouter.post('/orders/by-trade/:outTradeNo/refund', requireAuth, async (req, res) => {
  const reasonRaw = (req.body?.reason ?? req.body?.refund_reason ?? '').toString().trim()
  const reason = reasonRaw.length > 0 ? reasonRaw.slice(0, 240) : null
  const result = await refundPaidOrderForUser(req.user!.sub, req.params.outTradeNo, reason)
  switch (result.status) {
    case 'refunded':
      res.json({
        ok: true,
        status: 'refunded',
        outRefundNo: result.outRefundNo,
        providerNote: result.providerNote,
        order: result.order,
      })
      return
    case 'already_refunded':
      res.json({ ok: true, status: 'already_refunded' })
      return
    case 'pending_exists':
      res.status(409).json({
        error: 'refund_pending',
        outRefundNo: result.outRefundNo,
        message: '已有进行中的退款请求，请稍候',
      })
      return
    case 'provider_failed':
      res.status(502).json({
        error: 'refund_provider_failed',
        outRefundNo: result.outRefundNo,
        providerError: result.error,
        message: result.note,
      })
      return
    case 'not_paid':
      res.status(409).json({ error: 'not_paid', message: '只有 paid 状态的订单可以退款' })
      return
    case 'order_missing':
      res.status(404).json({ error: 'not_found' })
      return
  }
})
