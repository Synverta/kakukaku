import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../App'
import {
  formatTokens,
  type Campaign,
  type PerkTier,
} from '../data/crowdfundData'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { PaymentModal, type CheckoutMethod, type OrderDraft } from './PaymentModal'

export function CampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentDraft, setPaymentDraft] = useState<OrderDraft | null>(null)
  const [provider, setProvider] = useState<CheckoutMethod>('alipay')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!id) return
      setLoading(true)
      setError(null)
      try {
        const result = await api.get<{ campaign: Campaign }>(`/campaigns/${id}`)
        if (!cancelled) setCampaign(result.campaign)
      } catch (err) {
        const message =
          typeof err === 'object' && err && 'message' in err
            ? String((err as { message?: unknown }).message ?? '')
            : ''
        if (!cancelled) setError(message || '项目加载失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  if (!id) return <Navigate to="/crowdfund" replace />

  if (loading && !campaign) {
    return (
      <AppShell>
        <section className="section-block">
          <div className="empty-state"><h3>正在加载项目…</h3></div>
        </section>
      </AppShell>
    )
  }
  if (error && !campaign) {
    return (
      <AppShell>
        <section className="section-block">
          <div className="empty-state">
            <h3>{error}</h3>
            <Link className="ghost-button small-button" to="/crowdfund" style={{ marginTop: '1rem', display: 'inline-block' }}>
              返回共创列表
            </Link>
          </div>
        </section>
      </AppShell>
    )
  }
  if (!campaign) return <Navigate to="/crowdfund" replace />

  const progress = Math.min(100, Math.round((campaign.raisedTokens / campaign.goalTokens) * 100))

  function handleSupport(tier: PerkTier) {
    if (!campaign) return
    if (!user) {
      navigate('/login', { state: { returnTo: `/crowdfund/project/${campaign.id}` } })
      return
    }
    setPaymentDraft({
      campaignId: campaign.id,
      tierId: tier.id,
      tierName: tier.name,
      tokens: tier.tokens,
      provider,
    })
    setPaymentOpen(true)
  }

  async function handlePaid(outTradeNo: string) {
    if (!campaign) return
    try {
      const refreshed = await api.get<{ campaign: Campaign }>(`/campaigns/${campaign.id}`)
      setCampaign(refreshed.campaign)
    } catch {
      /* ignore */
    }
    setTimeout(() => {
      setPaymentOpen(false)
      setPaymentDraft(null)
    }, 800)
    void outTradeNo
  }

  return (
    <AppShell>
      <section className="cf-detail-hero" style={{ background: campaign.cover }}>
        <div className="cf-detail-hero-copy">
          <span className="section-kicker" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
            {campaign.category} · 由 {campaign.creator} 发起
          </span>
          <h1>{campaign.title}</h1>
          <p>{campaign.summary}</p>
        </div>
      </section>

      <div className="content-grid" style={{ marginTop: '1.5rem' }}>
        <section className="section-block">
          <div className="section-heading">
            <div>
              <span className="section-kicker">项目介绍</span>
              <h2>这个 IP 计划要做什么</h2>
            </div>
          </div>
          <p style={{ color: '#5c6478', lineHeight: 1.8 }}>{campaign.description}</p>

          <div className="section-heading top-gap">
            <div>
              <span className="section-kicker">Token 去向</span>
              <h2>共创到的 token 怎么花</h2>
            </div>
          </div>
          <div className="cf-tokenplan">
            {campaign.tokenPlan.map((item) => (
              <div key={item.label} className="cf-tokenplan-row">
                <div className="cf-tokenplan-label">
                  <span>{item.label}</span>
                  <span>{item.percent}%</span>
                </div>
                <div className="cf-tokenplan-rail">
                  <span style={{ width: `${item.percent}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="section-heading top-gap">
            <div>
              <span className="section-kicker">孵化里程碑</span>
              <h2>资金到位后分四步推进</h2>
            </div>
          </div>
          <div className="cf-milestones">
            {campaign.milestones.map((milestone) => (
              <article key={milestone.label} className={`cf-milestone ${milestone.status}`}>
                <span className="cf-milestone-dot" />
                <div>
                  <strong>{milestone.label}</strong>
                  <span>目标 {formatTokens(milestone.tokens)} token</span>
                </div>
                <span className="cf-milestone-status">
                  {milestone.status === 'done' ? '已完成' : milestone.status === 'active' ? '进行中' : '待解锁'}
                </span>
              </article>
            ))}
          </div>
        </section>

        <aside className="sidebar-stack">
          <section className="section-block cf-funding-panel">
            <div className="cf-funding-figure">
              <strong>{formatTokens(campaign.raisedTokens)}</strong>
              <span>/ 目标 {formatTokens(campaign.goalTokens)} token</span>
            </div>
            <div className="cf-funding-rail">
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="cf-funding-stats">
              <div>
                <dt>进度</dt>
                <dd>{progress}%</dd>
              </div>
              <div>
                <dt>支持者</dt>
                <dd>{campaign.backers.toLocaleString('zh-CN')}</dd>
              </div>
              <div>
                <dt>剩余</dt>
                <dd>{campaign.daysLeft} 天</dd>
              </div>
            </div>
            <div className="cf-pill" style={{ justifyContent: 'center' }}>
              平台批量生成预计降低 {campaign.costSavingPercent}% token 成本
            </div>
          </section>

          <section className="section-block">
            <div className="section-heading">
              <div>
                <span className="section-kicker">支付方式</span>
                <h2>用哪个通道支持？</h2>
              </div>
            </div>
            <div className="cf-pay-toggle">
              <button
                type="button"
                className={provider === 'alipay' ? 'active' : ''}
                onClick={() => setProvider('alipay')}
              >
                支付宝
              </button>
              <button
                type="button"
                className={provider === 'wechat' ? 'active' : ''}
                onClick={() => setProvider('wechat')}
              >
                微信支付
              </button>
            </div>
          </section>

          <section className="section-block">
            <div className="section-heading">
              <div>
                <span className="section-kicker">支持档位</span>
                <h2>选一个档位参与共创</h2>
              </div>
            </div>
            <div className="cf-perk-list">
              {campaign.perks.map((tier) => (
                <article key={tier.id} className={`cf-perk${tier.highlight ? ' highlight' : ''}`}>
                  <div className="cf-perk-head">
                    <strong>{tier.name}</strong>
                    <span>{formatTokens(tier.tokens)} token</span>
                  </div>
                  <ul>
                    {tier.perks.map((perk) => (
                      <li key={perk}>{perk}</li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => handleSupport(tier)}>
                    {user ? `用 ${provider === 'alipay' ? '支付宝' : '微信'} 支持` : '登录后支持'}
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="section-block">
            <div className="cf-creator-card">
              <div className="avatar-badge">{campaign.creatorAvatar}</div>
              <div>
                <strong>{campaign.creator}</strong>
                <span>{campaign.category} 区创作者</span>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {paymentDraft ? (
        <PaymentModal
          draft={paymentDraft}
          open={paymentOpen}
          onClose={() => {
            setPaymentOpen(false)
            setPaymentDraft(null)
          }}
          onPaid={handlePaid}
        />
      ) : null}
    </AppShell>
  )
}
