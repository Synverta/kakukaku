import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { AppShell } from '../App'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

type Order = {
  id: string
  outTradeNo: string
  campaignId: string
  tierId: string
  tierName: string
  tokens: number
  amountCents: number
  currency: string
  provider: string
  status: string
  reconciled: boolean
  createdAt: string
  paidAt: string | null
  closedAt: string | null
  refundedAt: string | null
  refundReason: string | null
}

function statusBadge(order: Order): { text: string; tone: 'pending' | 'paid' | 'closed' | 'refunded' } {
  switch (order.status) {
    case 'paid': return { text: '已支付', tone: 'paid' }
    case 'closed': return { text: '已关闭', tone: 'closed' }
    case 'refunded': return { text: '已退款', tone: 'refunded' }
    default: return { text: '待支付', tone: 'pending' }
  }
}

export function MyOrders() {
  const { user, loading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyOut, setBusyOut] = useState<string | null>(null)
  const [reasonByOut, setReasonByOut] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setFetching(true)
    setError(null)
    try {
      const result = await api.get<{ orders: Order[] }>('/orders/list')
      setOrders(result.orders)
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message?: unknown }).message ?? '')
          : ''
      setError(message || '加载订单失败')
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    load()
  }, [user, load])

  if (loading) {
    return (
      <AppShell>
        <section className="section-block">
          <div className="empty-state"><h3>正在读取账号…</h3></div>
        </section>
      </AppShell>
    )
  }
  if (!user) return <Navigate to="/login" replace />

  async function handleClose(outTradeNo: string) {
    if (busyOut) return
    setBusyOut(outTradeNo)
    setError(null)
    try {
      await api.post(`/orders/by-trade/${outTradeNo}/close`)
      await load()
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message?: unknown }).message ?? '')
          : ''
      const code =
        typeof err === 'object' && err && 'error' in err
          ? String((err as { error?: unknown }).error ?? '')
          : ''
      setError(message || code || '关闭订单失败')
    } finally {
      setBusyOut(null)
    }
  }

  async function handleRefund(outTradeNo: string) {
    if (busyOut) return
    const reason = (reasonByOut[outTradeNo] ?? '').trim()
    setBusyOut(outTradeNo)
    setError(null)
    try {
      await api.post(`/orders/by-trade/${outTradeNo}/refund`, reason ? { reason } : {})
      await load()
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message?: unknown }).message ?? '')
          : ''
      const code =
        typeof err === 'object' && err && 'error' in err
          ? String((err as { error?: unknown }).error ?? '')
          : ''
      setError(message || code || '退款失败')
    } finally {
      setBusyOut(null)
    }
  }

  return (
    <AppShell>
      <section className="section-block">
        <span className="section-kicker">我的订单</span>
        <h1 style={{ margin: '0.6rem 0', fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', color: '#16182f' }}>
          众筹订单与退款
        </h1>
        <p style={{ margin: 0, color: '#5c6478', lineHeight: 1.7, maxWidth: '64ch' }}>
          关闭未支付订单、退款已支付订单。退款会同步把 Pledge 与项目累积分成退回。
        </p>
      </section>

      {error ? (
        <section className="section-block" style={{ marginTop: '1rem' }}>
          <div className="auth-error">{error}</div>
        </section>
      ) : null}

      <section className="section-block" style={{ marginTop: '1rem' }}>
        {fetching ? (
          <div className="empty-state"><h3>订单加载中…</h3></div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <h3>你还没有订单</h3>
            <p>去 <Link to="/crowdfund">众筹列表</Link> 支持一个 IP 计划吧。</p>
          </div>
        ) : (
          <div className="cf-order-list">
            {orders.map((order) => {
              const badge = statusBadge(order)
              const canClose = order.status === 'pending'
              const canRefund = order.status === 'paid'
              const total = (order.amountCents / 100).toFixed(2)
              return (
                <article key={order.outTradeNo} className={`cf-order cf-order-${badge.tone}`}>
                  <div className="cf-order-head">
                    <span className={`cf-order-badge cf-order-badge-${badge.tone}`}>{badge.text}</span>
                    <span className="cf-order-id"><code>{order.outTradeNo}</code></span>
                  </div>
                  <div className="cf-order-main">
                    <Link className="cf-order-title" to={`/crowdfund/project/${order.campaignId}`}>
                      {order.tierName} · {order.tokens.toLocaleString('zh-CN')} token
                    </Link>
                    <p>
                      ¥ {total} · {order.provider === 'alipay' ? '支付宝' : '微信支付'} · 创建于 {new Date(order.createdAt).toLocaleString('zh-CN')}
                    </p>
                    {order.refundReason ? (
                      <p className="cf-order-meta">退款原因：{order.refundReason}</p>
                    ) : null}
                    {order.paidAt ? <p className="cf-order-meta">支付于 {new Date(order.paidAt).toLocaleString('zh-CN')}</p> : null}
                    {order.closedAt ? <p className="cf-order-meta">关闭于 {new Date(order.closedAt).toLocaleString('zh-CN')}</p> : null}
                    {order.refundedAt ? <p className="cf-order-meta">退款于 {new Date(order.refundedAt).toLocaleString('zh-CN')}</p> : null}
                  </div>
                  <div className="cf-order-actions">
                    {canClose ? (
                      <button
                        type="button"
                        disabled={busyOut === order.outTradeNo}
                        onClick={() => handleClose(order.outTradeNo)}
                      >
                        关闭订单
                      </button>
                    ) : null}
                    {canRefund ? (
                      <div className="cf-order-refund">
                        <input
                          aria-label="退款原因"
                          maxLength={240}
                          placeholder="退款原因（可选）"
                          value={reasonByOut[order.outTradeNo] ?? ''}
                          onChange={(event) =>
                            setReasonByOut((current) => ({ ...current, [order.outTradeNo]: event.target.value }))
                          }
                        />
                        <button
                          type="button"
                          className="refund-button"
                          disabled={busyOut === order.outTradeNo}
                          onClick={() => handleRefund(order.outTradeNo)}
                        >
                          申请退款
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </AppShell>
  )
}
