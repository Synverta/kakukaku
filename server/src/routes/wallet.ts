import { Router, type Request, type Response } from 'express'
import { query, pool } from '../db'
import { requireAuth } from '../lib/auth'
import { getProvider, type CheckoutMethod } from '../payments'

export const walletRouter = Router()

type RechargePackage = {
  id: string
  name: string
  desc: string
  amountCents: number
  tokens: number
  bonusTokens: number
}

const RECHARGE_PACKAGES: RechargePackage[] = [
  { id: 'r10',   name: '体验卡',  desc: '10元 = 100 酷币',         amountCents: 1000,   tokens: 100,   bonusTokens: 0 },
  { id: 'r50',   name: '标准卡',  desc: '50元 = 550 酷币(送50)',   amountCents: 5000,   tokens: 500,   bonusTokens: 50 },
  { id: 'r100',  name: '进阶卡',  desc: '100元 = 1150 酷币(送150)', amountCents: 10000,  tokens: 1000,  bonusTokens: 150 },
  { id: 'r500',  name: '企业卡',  desc: '500元 = 6000 酷币(送1000)', amountCents: 50000,  tokens: 5000,  bonusTokens: 1000 },
  { id: 'r1000', name: '旗舰卡',  desc: '1000元 = 13000 酷币(送3000)', amountCents: 100000, tokens: 10000, bonusTokens: 3000 },
]

function getPackage(id: unknown): RechargePackage | null {
  if (typeof id !== 'string') return null
  return RECHARGE_PACKAGES.find((p) => p.id === id) ?? null
}

function generateOutTradeNo(userId: number): string {
  const ts = Date.now().toString(36)
  const rand = Math.floor(Math.random() * 1e6).toString(36).padStart(4, '0')
  return `RCH${ts}${userId}${rand}`
}

type RechargeRow = {
  id: string
  out_trade_no: string
  user_id: string
  package_id: string
  tokens: string
  bonus_tokens: string
  total_tokens: string
  amount_cents: number
  currency: string
  provider: string
  status: string
  reconciled: boolean
  paid_at: Date | null
  closed_at: Date | null
  refunded_at: Date | null
  created_at: Date
}

function rowToRecharge(row: RechargeRow) {
  return {
    id: Number(row.id),
    outTradeNo: row.out_trade_no,
    packageId: row.package_id,
    tokens: Number(row.tokens),
    bonusTokens: Number(row.bonus_tokens),
    totalTokens: Number(row.total_tokens),
    amountCents: row.amount_cents,
    currency: row.currency,
    provider: row.provider,
    status: row.status,
    reconciled: row.reconciled,
    paidAt: row.paid_at?.toISOString() ?? null,
    closedAt: row.closed_at?.toISOString() ?? null,
    refundedAt: row.refunded_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  }
}

function getBaseUrl(): string {
  const fromEnv = (process.env.MOCK_CHECKOUT_BASE_URL ?? '').trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  const port = Number(process.env.PORT ?? 6002)
  return `http://localhost:${port}`
}

function buildWalletMockUrl(provider: CheckoutMethod, outTradeNo: string, amountCents: number, subject: string): string {
  const base = getBaseUrl()
  const path = provider === 'alipay' ? '/api/wallet/mock/alipay' : '/api/wallet/mock/wechat'
  const url = new URL(path, base)
  url.searchParams.set('out_trade_no', outTradeNo)
  url.searchParams.set('total', (amountCents / 100).toFixed(2))
  url.searchParams.set('subject', subject)
  return url.toString()
}

walletRouter.get('/wallet/packages', (_req, res) => {
  res.json({ packages: RECHARGE_PACKAGES })
})

walletRouter.get('/wallet/balance', requireAuth, async (req, res) => {
  const result = await query<{ balance_tokens: string; total_recharged: string; total_consumed: string }>(
    `select balance_tokens, total_recharged, total_consumed from wallet_balances where user_id = $1`,
    [req.user!.sub],
  )
  if (result.rowCount === 0) {
    res.json({ balanceTokens: 0, totalRecharged: 0, totalConsumed: 0, updatedAt: null })
    return
  }
  const row = result.rows[0]
  res.json({
    balanceTokens: Number(row.balance_tokens),
    totalRecharged: Number(row.total_recharged),
    totalConsumed: Number(row.total_consumed),
  })
})

walletRouter.post('/wallet/recharge', requireAuth, async (req, res) => {
  const { packageId, provider } = req.body ?? {}
  const pkg = getPackage(packageId)
  if (!pkg) {
    return res.status(404).json({ error: 'package_not_found', message: '充值卡不存在' })
  }
  const providerName: CheckoutMethod = provider === 'wechat' ? 'wechat' : 'alipay'

  const outTradeNo = generateOutTradeNo(req.user!.sub)
  const providerImpl = getProvider(providerName)
  const subject = `[酷币充值] ${pkg.name} - ${pkg.desc}`

  let payUrl: string | null = null
  let codeUrl: string | null = null
  let providerNote = ''

  try {
    const created = await providerImpl.createOrder({
      outTradeNo,
      amountCents: pkg.amountCents,
      subject,
      body: `${pkg.desc}; user=${req.user!.sub}`,
    })
    payUrl = created.payUrl
    codeUrl = created.codeUrl
    providerNote = created.providerNote
  } catch {
    payUrl = buildWalletMockUrl(providerName, outTradeNo, pkg.amountCents, subject)
    codeUrl = null
    providerNote = '本地 mock 收银台(无 provider 凭据)，点击确认后会调用充值入账'
  }

  if (payUrl && payUrl.includes('/api/mock/alipay')) {
    payUrl = payUrl.replace('/api/mock/alipay', '/api/wallet/mock/alipay')
  }
  if (codeUrl && codeUrl.includes('/api/mock/wechat')) {
    codeUrl = codeUrl.replace('/api/mock/wechat', '/api/wallet/mock/wechat')
  }

  const totalTokens = pkg.tokens + pkg.bonusTokens
  const inserted = await query<RechargeRow>(
    `insert into recharge_orders (
       out_trade_no, user_id, package_id, tokens, bonus_tokens, total_tokens,
       amount_cents, currency, provider, status
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
     returning *`,
    [
      outTradeNo,
      req.user!.sub,
      pkg.id,
      pkg.tokens,
      pkg.bonusTokens,
      totalTokens,
      pkg.amountCents,
      'CNY',
      providerName,
    ],
  )

  res.status(201).json({
    order: rowToRecharge(inserted.rows[0]),
    package: pkg,
    provider: providerName,
    providerDisplayName: providerImpl.displayName,
    payUrl,
    codeUrl,
    note: providerNote,
  })
})

walletRouter.get('/wallet/recharge/list', requireAuth, async (req, res) => {
  const result = await query<RechargeRow>(
    `select * from recharge_orders where user_id = $1 order by created_at desc limit 50`,
    [req.user!.sub],
  )
  res.json({ orders: result.rows.map(rowToRecharge), packages: RECHARGE_PACKAGES })
})

walletRouter.get('/wallet/recharge/by-trade/:outTradeNo', requireAuth, async (req, res) => {
  const result = await query<RechargeRow>(
    `select * from recharge_orders where out_trade_no = $1 and user_id = $2 limit 1`,
    [req.params.outTradeNo, req.user!.sub],
  )
  if (result.rowCount === 0) return res.status(404).json({ error: 'not_found' })
  res.json({ order: rowToRecharge(result.rows[0]) })
})

walletRouter.post('/wallet/recharge/by-trade/:outTradeNo/dev-confirm', requireAuth, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'disabled_in_prod' })
  }
  const result = await reconcileRecharge(req.user!.sub, req.params.outTradeNo)
  if (result.status === 'order_missing') {
    return res.status(404).json({ error: 'not_found' })
  }
  if (result.status === 'already_paid') {
    res.json({ ok: true, status: 'already_paid' })
    return
  }
  res.json({ ok: true, status: 'reconciled' })
})

async function renderMockAlipayCheckout(res: Response, order: RechargeRow, subjectHint: string) {
  const total = (order.amount_cents / 100).toFixed(2)
  const tokens = order.total_tokens
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>酷币充值 · 支付宝模拟收银台</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body { margin:0; font-family: 'PingFang SC','Microsoft YaHei',sans-serif;
           background: #f6f8fc; color:#1b2a55; }
    .wrap { max-width: 540px; margin: 4rem auto; padding: 0 1rem; }
    .card { background: #fff; border-radius: 18px; box-shadow: 0 14px 30px rgba(15,30,60,.08); padding: 2rem; }
    .brand { font-weight: 800; color:#1677ff; font-size: 1.6rem; margin-bottom:.5rem; }
    .badge { display:inline-block; padding: .25rem .65rem; border-radius: 999px;
             background: #fff3e0; color:#ef6c00; font-size:.8rem; }
    .amount { font-size: 2.2rem; font-weight: 800; margin: 1.4rem 0 0.4rem; color:#ef6c00; }
    .amount small { font-size:1rem; color:#5c6478; margin-left:.5rem; }
    table { width:100%; border-collapse: collapse; margin: 1.2rem 0; }
    th, td { padding:.65rem 0; font-size: .92rem; text-align:left;
             border-bottom: 1px dashed #e6ebf5; }
    th { color:#5c6478; font-weight:600; width: 8rem; }
    .actions { display:flex; gap:.8rem; margin-top: 1.6rem; }
    button { padding:.85rem 1.4rem; border: none; border-radius: 999px;
             font-size: 1rem; cursor: pointer; }
    .primary { background: #1677ff; color:#fff; }
    .ghost { background:#f1f4fa; color:#5c6478; }
    .note { color:#9aa3b2; font-size:.85rem; margin-top:1.2rem; line-height:1.6; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="brand">💰 酷币充值 · 支付宝收银台</div>
      <span class="badge">dev-only mock</span>
      <div class="amount">¥ ${total} <small>→ ${tokens} 酷币</small></div>
      <table>
        <tr><th>订单号</th><td><code>${order.out_trade_no}</code></td></tr>
        <tr><th>商品</th><td>${subjectHint.replace(/</g, '&lt;')}</td></tr>
        <tr><th>用户</th><td>uid ${order.user_id}</td></tr>
        <tr><th>状态</th><td>${order.status === 'paid' ? '已支付，已入账' : '待支付'}</td></tr>
      </table>
      <div class="actions">
        <button class="primary" onclick="confirmPay()">确认支付(模拟)</button>
        <button class="ghost" onclick="window.close()">关闭</button>
      </div>
      <div class="note">
        模拟确认会调用 <code>reconcileRecharge</code>：写入 wallet_balances / wallet_transactions，并把订单标记为 paid。<br>
        生产请走支付宝网关(openapi.alipay.com / openapi.alipaydev.com)的 <code>trade.page.pay</code> + 异步通知。
      </div>
    </div>
  </div>
  <script>
    async function confirmPay() {
      const params = new URLSearchParams(window.location.search);
      const out = params.get('out_trade_no');
      const btn = document.querySelector('button.primary');
      btn.disabled = true; btn.textContent = '处理中…';
      const r = await fetch('/api/wallet/mock/alipay/confirm?out_trade_no=' + encodeURIComponent(out), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade_status: 'TRADE_SUCCESS' })
      });
      const data = await r.json();
      if (!r.ok) { btn.textContent = '失败：' + (data.error || r.status); btn.disabled = false; return; }
      btn.textContent = '充值成功，' + (data.totalTokens || '') + ' 酷币已入账';
      setTimeout(() => { window.location.href = '/profile?recharged=' + encodeURIComponent(out); }, 1200);
    }
  </script>
</body>
</html>`)
}

async function renderMockWechatCheckout(res: Response, order: RechargeRow) {
  const total = (order.amount_cents / 100).toFixed(2)
  const tokens = order.total_tokens
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>酷币充值 · 微信支付</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body { margin:0; font-family: 'PingFang SC','Microsoft YaHei',sans-serif;
           background: #f5f7fa; color:#1b2a55; }
    .wrap { max-width: 540px; margin: 3rem auto; padding: 0 1rem; }
    .card { background: #fff; border-radius: 18px; box-shadow: 0 14px 30px rgba(15,30,60,.08);
            padding: 2rem; text-align:center; }
    .brand { font-weight: 800; color:#07c160; font-size: 1.6rem; }
    .qr { margin: 1.6rem auto; width: 220px; height: 220px; background:#f3f6fb;
          border-radius: 12px; display:grid; place-items:center; color:#9aa3b2; }
    .amount { font-size: 2rem; font-weight: 800; margin-top: 1rem; color:#07c160; }
    .amount small { font-size:1rem; color:#5c6478; margin-left:.5rem; }
    .code { font-family: monospace; color:#5c6478; font-size:.85rem;
            word-break: break-all; padding:.5rem 1rem; background:#f3f6fb;
            border-radius: 8px; margin: 1rem 0; }
    button { padding:.85rem 1.4rem; border: none; border-radius: 999px;
             font-size: 1rem; cursor: pointer; margin: .25rem; }
    .primary { background: #07c160; color:#fff; }
    .ghost { background:#f1f4fa; color:#5c6478; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="brand">💰 酷币充值 · 微信支付</div>
      <div class="qr">[QR code 占位]</div>
      <div class="amount">¥ ${total} <small>→ ${tokens} 酷币</small></div>
      <div class="code">订单号 ${order.out_trade_no}</div>
      <div>
        <button class="primary" onclick="confirmPay()">确认支付(模拟)</button>
        <button class="ghost" onclick="window.close()">关闭</button>
      </div>
    </div>
  </div>
  <script>
    async function confirmPay() {
      const params = new URLSearchParams(window.location.search);
      const out = params.get('out_trade_no');
      const btn = document.querySelector('button.primary');
      btn.disabled = true; btn.textContent = '处理中…';
      const r = await fetch('/api/wallet/mock/wechat/confirm?out_trade_no=' + encodeURIComponent(out), {
        method: 'POST'
      });
      const data = await r.json();
      if (!r.ok) { btn.textContent = '失败：' + (data.error || r.status); btn.disabled = false; return; }
      btn.textContent = '充值成功';
      setTimeout(() => { window.location.href = '/profile?recharged=' + encodeURIComponent(out); }, 1200);
    }
  </script>
</body>
</html>`)
}

async function loadRecharge(outTradeNo: string): Promise<RechargeRow | null> {
  const rows = await query<RechargeRow>(
    `select * from recharge_orders where out_trade_no = $1 limit 1`,
    [outTradeNo],
  )
  return rows.rowCount === 0 ? null : rows.rows[0]
}

walletRouter.get('/wallet/mock/alipay', async (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).send('disabled in prod')
  const out = (req.query.out_trade_no ?? '').toString()
  if (!out) return res.status(400).send('missing out_trade_no')
  const order = await loadRecharge(out)
  if (!order) return res.status(404).send('order not found')
  const subject = (req.query.subject ?? '').toString() || `[酷币充值] ${order.package_id}`
  await renderMockAlipayCheckout(res, order, subject)
})

walletRouter.post('/wallet/mock/alipay/confirm', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ error: 'disabled_in_prod' })
  const out = (req.query.out_trade_no ?? req.body?.out_trade_no ?? '').toString()
  if (!out) return res.status(400).json({ error: 'missing_out_trade_no' })
  const result = await reconcileRecharge(Number(req.body?.userId ?? 0) || 0, out, { skipOwnerCheck: true })
  if (result.status === 'order_missing') return res.status(404).json({ error: 'order_not_found' })
  res.json({ ok: true, out_trade_no: out, status: result.status, totalTokens: result.totalTokens })
})

walletRouter.get('/wallet/mock/wechat', async (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).send('disabled in prod')
  const out = (req.query.out_trade_no ?? '').toString()
  if (!out) return res.status(400).send('missing out_trade_no')
  const order = await loadRecharge(out)
  if (!order) return res.status(404).send('order not found')
  await renderMockWechatCheckout(res, order)
})

walletRouter.post('/wallet/mock/wechat/confirm', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ error: 'disabled_in_prod' })
  const out = (req.query.out_trade_no ?? req.body?.out_trade_no ?? '').toString()
  if (!out) return res.status(400).json({ error: 'missing_out_trade_no' })
  const result = await reconcileRecharge(0, out, { skipOwnerCheck: true })
  if (result.status === 'order_missing') return res.status(404).json({ error: 'order_not_found' })
  res.json({ ok: true, out_trade_no: out, status: result.status, totalTokens: result.totalTokens })
})

walletRouter.post('/wallet/notify/alipay', async (req: Request, res: Response) => {
  const provider = getProvider('alipay')
  const result = await provider.verifyNotify({ payload: req.body as Record<string, string> })
  if (!result.ok || !result.outTradeNo) {
    return res.status(400).send('failure')
  }
  const recon = await reconcileRecharge(0, result.outTradeNo, { skipOwnerCheck: true })
  if (recon.status === 'order_missing') return res.status(404).send('failure')
  res.send('success')
})

walletRouter.post('/wallet/notify/wechat', async (req: Request, res: Response) => {
  const provider = getProvider('wechat')
  const rawBody = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {})
  const result = await provider.verifyNotify({ payload: {}, rawBody })
  if (!result.ok || !result.outTradeNo) {
    return res.status(400).json({ code: 'FAIL', message: result.reason ?? 'rejected' })
  }
  const recon = await reconcileRecharge(0, result.outTradeNo, { skipOwnerCheck: true })
  if (recon.status === 'order_missing') return res.status(404).json({ code: 'FAIL', message: 'order_missing' })
  res.status(200).json({ code: 'SUCCESS' })
})

export type ReconcileStatus = 'reconciled' | 'already_paid' | 'order_missing'

type ReconcileOptions = {
  skipOwnerCheck?: boolean
}

export async function reconcileRecharge(
  userId: number,
  outTradeNo: string,
  options: ReconcileOptions = {},
): Promise<{ status: ReconcileStatus; totalTokens?: number }> {
  const client = await pool.connect()
  try {
    await client.query('begin')

    const orders = await client.query<RechargeRow & { paid_by_user_id: number }>(
      `select * from recharge_orders where out_trade_no = $1 for update`,
      [outTradeNo],
    )
    if (orders.rowCount === 0) {
      await client.query('rollback')
      return { status: 'order_missing' }
    }
    const order = orders.rows[0]

    if (!options.skipOwnerCheck && Number(order.user_id) !== Number(userId)) {
      await client.query('rollback')
      return { status: 'order_missing' }
    }

    if (order.status === 'paid' || order.reconciled) {
      await client.query('commit')
      return { status: 'already_paid' }
    }
    if (order.status !== 'pending') {
      await client.query('rollback')
      return { status: 'order_missing' }
    }

    const alreadyExists = await client.query<{ exists: boolean }>(
      `select exists(select 1 from wallet_transactions where out_trade_no = $1) as exists`,
      [outTradeNo],
    )
    if (alreadyExists.rows[0].exists) {
      await client.query(
        `update recharge_orders set status='paid', reconciled=true, paid_at=now() where out_trade_no=$1`,
        [outTradeNo],
      )
      await client.query('commit')
      return { status: 'already_paid' }
    }

    await client.query(
      `insert into wallet_balances (user_id, balance_tokens, total_recharged, updated_at)
       values ($1, $2, $2, now())
       on conflict (user_id)
       do update set balance_tokens = wallet_balances.balance_tokens + excluded.balance_tokens,
                     total_recharged = wallet_balances.total_recharged + excluded.balance_tokens,
                     updated_at = now()`,
      [Number(order.user_id), Number(order.tokens)],
    )

    if (Number(order.bonus_tokens) > 0) {
      await client.query(
        `update wallet_balances
           set balance_tokens = balance_tokens + $2,
               total_recharged = total_recharged + $2,
               updated_at = now()
         where user_id = $1`,
        [Number(order.user_id), Number(order.bonus_tokens)],
      )
      await client.query(
        `insert into wallet_transactions (user_id, out_trade_no, kind, tokens, memo)
         values ($1, $2, 'bonus', $3, '充值赠送')`,
        [Number(order.user_id), outTradeNo, Number(order.bonus_tokens)],
      )
    }

    await client.query(
      `insert into wallet_transactions (user_id, out_trade_no, kind, tokens, memo)
       values ($1, $2, 'recharge', $3, '账户充值入账')`,
      [Number(order.user_id), outTradeNo, Number(order.tokens)],
    )

    await client.query(
      `update recharge_orders set status='paid', reconciled=true, paid_at=now() where out_trade_no=$1`,
      [outTradeNo],
    )

    await client.query('commit')
    return { status: 'reconciled', totalTokens: Number(order.total_tokens) }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}
