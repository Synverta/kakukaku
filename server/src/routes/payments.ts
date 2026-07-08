import { Router, type Request, type Response } from 'express'
import { query } from '../db'
import { getProvider } from '../payments'
import { reconcile } from './orders'

export const paymentsRouter = Router()

type OrderRow = {
  out_trade_no: string
  user_id: string
  provider: string
  status: string
  amount_cents: number
  tier_name: string
  campaign_id: string
  tokens: string
}

async function loadOrder(outTradeNo: string): Promise<OrderRow | null> {
  const rows = await query<OrderRow>(
    `select out_trade_no, user_id, provider, status, amount_cents,
            tier_name, campaign_id, tokens
       from orders where out_trade_no = $1 limit 1`,
    [outTradeNo],
  )
  return rows.rowCount === 0 ? null : rows.rows[0]
}

async function renderMockAlipay(res: Response, order: OrderRow, subjectHint: string) {
  const total = (order.amount_cents / 100).toFixed(2)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>支付宝模拟收银台 · ${order.out_trade_no}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body { margin:0; font-family: 'PingFang SC','Microsoft YaHei',sans-serif;
           background: #f6f8fc; color:#1b2a55; }
    .wrap { max-width: 540px; margin: 4rem auto; padding: 0 1rem; }
    .card { background: #fff; border-radius: 18px; box-shadow: 0 14px 30px rgba(15,30,60,.08); padding: 2rem; }
    .brand { font-weight: 800; color:#1677ff; font-size: 1.6rem; margin-bottom:.5rem; }
    .badge { display:inline-block; padding: .25rem .65rem; border-radius: 999px;
             background: #e7f1ff; color:#1677ff; font-size:.8rem; }
    table { width:100%; border-collapse: collapse; margin: 1.2rem 0; }
    th, td { padding:.65rem 0; font-size: .92rem; text-align:left;
             border-bottom: 1px dashed #e6ebf5; }
    th { color:#5c6478; font-weight:600; width: 8rem; }
    .amount { font-size: 2.2rem; font-weight: 800; margin: 1.4rem 0 0.4rem; }
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
      <div class="brand">支付宝 · 模拟收银台</div>
      <span class="badge">无真实密钥，已自动跳转 dev-only 沙箱</span>
      <div class="amount">¥ ${total}</div>
      <table>
        <tr><th>订单号</th><td><code>${order.out_trade_no}</code></td></tr>
        <tr><th>商品</th><td>${subjectHint.replace(/</g, '&lt;')}</td></tr>
        <tr><th>用户</th><td>uid ${order.user_id}</td></tr>
        <tr><th>状态</th><td>${order.status === 'paid' ? '已支付' : '待支付'}</td></tr>
      </table>
      <div class="actions">
        <button class="primary" onclick="confirmPay()">确认支付（模拟）</button>
        <button class="ghost" onclick="window.close()">关闭</button>
      </div>
      <div class="note">
        生产环境中此页面是支付宝网关 (openapi.alipay.com 或 openapi.alipaydev.com)。<br>
        模拟确认会调用 reconcile，等价于 Alipay 异步通知的入账动作。<br>
        开发用 mock，请勿用于生产。
      </div>
    </div>
  </div>
  <script>
    async function confirmPay() {
      const params = new URLSearchParams(window.location.search);
      const out = params.get('out_trade_no');
      const btn = document.querySelector('button.primary');
      btn.disabled = true; btn.textContent = '处理中…';
      const r = await fetch('/api/mock/alipay/confirm?out_trade_no=' + encodeURIComponent(out), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade_status: 'TRADE_SUCCESS' })
      });
      const data = await r.json();
      if (!r.ok) { btn.textContent = '失败：' + (data.error || r.status); btn.disabled = false; return; }
      btn.textContent = '支付成功';
      setTimeout(() => { window.location.href = '/crowdfund?order=' + encodeURIComponent(out); }, 800);
    }
  </script>
</body>
</html>`)
}

paymentsRouter.post('/mock/alipay/confirm', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'disabled_in_prod' })
  }
  const outTradeNo = (req.query.out_trade_no ?? req.body?.out_trade_no ?? '').toString()
  if (!outTradeNo) return res.status(400).json({ error: 'missing_out_trade_no' })

  const order = await loadOrder(outTradeNo)
  if (!order) return res.status(404).json({ error: 'order_not_found' })

  await reconcile(outTradeNo)
  res.json({ ok: true, out_trade_no: outTradeNo })
})

paymentsRouter.get('/mock/alipay', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).send('disabled in prod')
  }
  const outTradeNo = (req.query.out_trade_no ?? '').toString()
  if (!outTradeNo) {
    res.status(400).send('missing out_trade_no')
    return
  }
  const order = await loadOrder(outTradeNo)
  if (!order) {
    res.status(404).send('order not found')
    return
  }
  const subjectHint = (req.query.subject ?? '').toString() || order.tier_name
  await renderMockAlipay(res, order, subjectHint)
})

paymentsRouter.post('/notify/alipay', async (req: Request, res: Response) => {
  const provider = getProvider('alipay')
  const result = await provider.verifyNotify({ payload: req.body as Record<string, string> })
  if (!result.ok || !result.outTradeNo) {
    console.warn('[alipay notify] rejected:', result.reason)
    return res.status(400).send('failure')
  }
  await reconcile(result.outTradeNo)
  res.send('success')
})

paymentsRouter.get('/notify/alipay', (_req, res) => {
  res.send('alipay notify endpoint is POST only')
})

async function renderMockWechat(res: Response, order: OrderRow) {
  const total = (order.amount_cents / 100).toFixed(2)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>微信支付模拟 · ${order.out_trade_no}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body { margin:0; font-family: 'PingFang SC','Microsoft YaHei',sans-serif;
           background: #f5f7fa; color:#1b2a55; }
    .wrap { max-width: 540px; margin: 3rem auto; padding: 0 1rem; }
    .card { background: #fff; border-radius: 18px; box-shadow: 0 14px 30px rgba(15,30,60,.08); padding: 2rem; text-align:center; }
    .brand { font-weight: 800; color:#07c160; font-size: 1.6rem; }
    .badge { display:inline-block; padding:.25rem .65rem; border-radius: 999px;
             background: #e6faf0; color:#07c160; font-size:.8rem; margin-top: .5rem; }
    .qr { margin: 1.6rem auto; width: 220px; height: 220px; background:#f3f6fb;
          border-radius: 12px; display:grid; place-items:center; color:#9aa3b2; }
    .amount { font-size: 2rem; font-weight: 800; margin-top: 1rem; }
    .code { font-family: monospace; color: #5c6478; font-size:.85rem; word-break: break-all; padding:.5rem 1rem; background:#f3f6fb; border-radius: 8px; margin: 1rem 0; }
    button { padding:.85rem 1.4rem; border: none; border-radius: 999px;
             font-size: 1rem; cursor: pointer; margin: .25rem; }
    .primary { background: #07c160; color:#fff; }
    .ghost { background:#f1f4fa; color:#5c6478; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="brand">微信支付 · 模拟收银台</div>
      <span class="badge">无真实密钥，dev-only mock</span>
      <div class="qr">[QR code 占位]</div>
      <div class="amount">¥ ${total}</div>
      <div class="code">订单号 ${order.out_trade_no}</div>
      <div>
        <button class="primary" onclick="confirmPay()">确认支付（模拟）</button>
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
      const r = await fetch('/api/mock/wechat/confirm?out_trade_no=' + encodeURIComponent(out), {
        method: 'POST'
      });
      const data = await r.json();
      if (!r.ok) { btn.textContent = '失败：' + (data.error || r.status); btn.disabled = false; return; }
      btn.textContent = '支付成功';
      setTimeout(() => { window.location.href = '/crowdfund?order=' + encodeURIComponent(out); }, 800);
    }
  </script>
</body>
</html>`)
}

paymentsRouter.get('/mock/wechat', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).send('disabled in prod')
  }
  const outTradeNo = (req.query.out_trade_no ?? '').toString()
  if (!outTradeNo) return res.status(400).send('missing out_trade_no')
  const order = await loadOrder(outTradeNo)
  if (!order) return res.status(404).send('order not found')
  await renderMockWechat(res, order)
})

paymentsRouter.post('/mock/wechat/confirm', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'disabled_in_prod' })
  }
  const outTradeNo = (req.query.out_trade_no ?? req.body?.out_trade_no ?? '').toString()
  if (!outTradeNo) return res.status(400).json({ error: 'missing_out_trade_no' })
  const order = await loadOrder(outTradeNo)
  if (!order) return res.status(404).json({ error: 'order_not_found' })
  await reconcile(outTradeNo)
  res.json({ ok: true, out_trade_no: outTradeNo })
})

paymentsRouter.post('/notify/wechat', async (req: Request, res: Response) => {
  const provider = getProvider('wechat')
  const rawBody = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {})
  const result = await provider.verifyNotify({ payload: {}, rawBody })
  if (!result.ok || !result.outTradeNo) {
    console.warn('[wechat notify] rejected:', result.reason)
    return res.status(400).json({ code: 'FAIL', message: result.reason ?? 'rejected' })
  }
  await reconcile(result.outTradeNo)
  res.status(200).json({ code: 'SUCCESS' })
})

paymentsRouter.get('/notify/wechat', (_req, res) => {
  res.json({ code: 'FAIL', message: 'POST only' })
})
