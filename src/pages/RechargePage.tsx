import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

type RechargePackage = {
  id: string
  name: string
  desc: string
  amountCents: number
  tokens: number
  bonusTokens: number
}

type RechargeOrder = {
  id: number
  outTradeNo: string
  packageId: string
  tokens: number
  bonusTokens: number
  totalTokens: number
  amountCents: number
  currency: string
  provider: string
  status: string
  paidAt: string | null
  createdAt: string
}

type BalanceInfo = {
  balanceTokens: number
  totalRecharged: number
  totalConsumed: number
}

const PROVIDER_LABEL: Record<string, string> = {
  alipay: '支付宝',
  wechat: '微信支付',
}

const STATUS_LABEL: Record<string, string> = {
  pending: '待支付',
  paid: '已入账',
  closed: '已关闭',
  refunded: '已退款',
}

function formatCents(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`
}

function formatTokens(tokens: number): string {
  return tokens.toLocaleString('zh-CN')
}

function timeAgo(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const diff = Math.max(0, Date.now() - t)
  const min = Math.floor(diff / 60_000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} 天前`
  return new Date(t).toLocaleDateString('zh-CN')
}

function PackageCard({
  pkg,
  selected,
  onSelect,
}: {
  pkg: RechargePackage
  selected: boolean
  onSelect: () => void
}) {
  const total = pkg.tokens + pkg.bonusTokens
  return (
    <button
      type="button"
      className={`recharge-card${selected ? ' is-selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <div className="recharge-card-head">
        <strong>{pkg.name}</strong>
        {pkg.bonusTokens > 0 ? (
          <span className="recharge-card-bonus">+ 送 {pkg.bonusTokens}</span>
        ) : null}
      </div>
      <div className="recharge-card-amount">{formatCents(pkg.amountCents)}</div>
      <div className="recharge-card-tokens">
        <strong>{formatTokens(total)}</strong>
        <span>酷币</span>
      </div>
      <p>{pkg.desc}</p>
    </button>
  )
}

export function RechargePage() {
  const { user, loading: authLoading } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [packages, setPackages] = useState<RechargePackage[]>([])
  const [balance, setBalance] = useState<BalanceInfo | null>(null)
  const [orders, setOrders] = useState<RechargeOrder[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [provider, setProvider] = useState<'alipay' | 'wechat'>('alipay')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  async function load() {
    try {
      const [pkgRes, balRes, orderRes] = await Promise.all([
        api.get<{ packages: RechargePackage[] }>('/wallet/packages'),
        api.get<BalanceInfo>('/wallet/balance'),
        api.get<{ orders: RechargeOrder[] }>('/wallet/recharge/list'),
      ])
      setPackages(pkgRes.packages)
      setBalance(balRes)
      setOrders(orderRes.orders)
      if (!selectedId && pkgRes.packages[0]) setSelectedId(pkgRes.packages[0].id)
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err
        ? String((err as { message?: unknown }).message ?? '')
        : ''
      setFeedback({ kind: 'err', text: message || '加载失败' })
    }
  }

  useEffect(() => {
    if (!user) return
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (searchParams.get('recharged')) {
      setFeedback({ kind: 'ok', text: `充值成功！订单 ${searchParams.get('recharged')} 已入账` })
      void load()
      const next = new URLSearchParams(searchParams)
      next.delete('recharged')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function handleRecharge() {
    if (!selectedId) {
      setFeedback({ kind: 'err', text: '请先选择充值套餐' })
      return
    }
    setSubmitting(true)
    setFeedback(null)
    try {
      const result = await api.post<{ payUrl: string; codeUrl: string | null; provider: string; note: string }>(
        '/wallet/recharge',
        { packageId: selectedId, provider },
      )
      if (result.payUrl) {
        window.location.href = result.payUrl
      } else if (result.codeUrl) {
        window.location.href = result.codeUrl
      } else {
        setFeedback({ kind: 'err', text: '未获取到支付链接' })
      }
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err
        ? String((err as { message?: unknown }).message ?? '')
        : ''
      const error = typeof err === 'object' && err && 'error' in err
        ? String((err as { error?: unknown }).error ?? '')
        : ''
      setFeedback({ kind: 'err', text: message || error || '创建订单失败' })
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="recharge-page">
        <p className="recharge-loading">加载中…</p>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />

  const selectedPkg = packages.find((p) => p.id === selectedId) ?? null
  const totalTokensSelected = selectedPkg ? selectedPkg.tokens + selectedPkg.bonusTokens : 0

  return (
    <div className="recharge-page">
      <section className="recharge-hero">
        <div className="recharge-hero-copy">
          <span className="eyebrow">酷币钱包</span>
          <h1>用账户余额支持你喜欢的 IP 计划</h1>
          <p>
            酷币用于站内一切支持行为：共创档位、付费视频、创作激励。充值享套餐赠送，多充多送。
          </p>
        </div>
        <div className="recharge-balance-card">
          <span>当前余额</span>
          <strong>{balance ? formatTokens(balance.balanceTokens) : '0'}</strong>
          <em>酷币</em>
          <ul>
            <li>
              <span>累计充值</span>
              <strong>{balance ? formatTokens(balance.totalRecharged) : '0'}</strong>
            </li>
            <li>
              <span>累计消费</span>
              <strong>{balance ? formatTokens(balance.totalConsumed) : '0'}</strong>
            </li>
          </ul>
        </div>
      </section>

      <section className="recharge-packages-block">
        <div className="section-heading">
          <div>
            <span className="section-kicker">选择套餐</span>
            <h2>充值卡</h2>
          </div>
          <span className="section-note">点选套餐后选择支付方式</span>
        </div>
        <div className="recharge-grid">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              selected={pkg.id === selectedId}
              onSelect={() => setSelectedId(pkg.id)}
            />
          ))}
        </div>

        <div className="recharge-checkout">
          <div className="recharge-paymethod">
            <span className="recharge-paymethod-label">支付方式</span>
            <div className="recharge-paymethod-options">
              <button
                type="button"
                className={`recharge-paymethod-chip${provider === 'alipay' ? ' is-active' : ''}`}
                onClick={() => setProvider('alipay')}
              >
                支付宝
              </button>
              <button
                type="button"
                className={`recharge-paymethod-chip${provider === 'wechat' ? ' is-active' : ''}`}
                onClick={() => setProvider('wechat')}
              >
                微信支付
              </button>
            </div>
          </div>

          <div className="recharge-summary">
            {selectedPkg ? (
              <>
                <span>将支付 <strong>{formatCents(selectedPkg.amountCents)}</strong>，获得 <strong>{formatTokens(totalTokensSelected)}</strong> 酷币</span>
              </>
            ) : (
              <span>请选择充值套餐</span>
            )}
            <button
              type="button"
              className="primary-button recharge-pay"
              disabled={submitting || !selectedPkg}
              onClick={() => void handleRecharge()}
            >
              {submitting ? '正在创建订单…' : '立即充值'}
            </button>
          </div>

          {feedback ? (
            <div className={`recharge-feedback ${feedback.kind === 'ok' ? 'is-ok' : 'is-err'}`}>
              {feedback.text}
            </div>
          ) : null}
        </div>
      </section>

      <section className="recharge-history-block">
        <div className="section-heading">
          <div>
            <span className="section-kicker">最近充值</span>
            <h2>充值记录</h2>
          </div>
          <button type="button" className="creator-chip" onClick={() => void load()}>
            刷新
          </button>
        </div>
        {orders.length === 0 ? (
          <div className="empty-state recharge-empty">
            <h3>暂无充值记录</h3>
            <p>完成首次充值后，订单会出现在这里。</p>
          </div>
        ) : (
          <table className="recharge-table">
            <thead>
              <tr>
                <th>订单号</th>
                <th>套餐</th>
                <th>金额</th>
                <th>酷币</th>
                <th>支付方式</th>
                <th>状态</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="recharge-trade">
                    <code>{o.outTradeNo.slice(-12)}</code>
                  </td>
                  <td>{o.packageId}</td>
                  <td>{formatCents(o.amountCents)}</td>
                  <td className="recharge-tokens-cell">{formatTokens(o.totalTokens)}</td>
                  <td>{PROVIDER_LABEL[o.provider] ?? o.provider}</td>
                  <td>
                    <span className={`recharge-status recharge-status-${o.status}`}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="recharge-time">{timeAgo(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}