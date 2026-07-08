import { Link } from 'react-router-dom'
import { AppShell } from '../App'
import {
  crowdfundStats,
  howItWorks,
  costSavingReasons,
  formatTokens,
  type Campaign,
} from '../data/crowdfundData'
import { useAuth } from '../lib/auth'
import { useCampaigns } from './hooks/useCampaigns'

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const progress = Math.min(100, Math.round((campaign.raisedTokens / campaign.goalTokens) * 100))

  return (
    <Link className="cf-campaign-card" to={`/crowdfund/project/${campaign.id}`}>
      <div className="cf-campaign-cover" style={{ background: campaign.cover }}>
        <span className="cf-cover-cat">{campaign.category}</span>
        <span className="cf-cover-days">剩 {campaign.daysLeft} 天</span>
        <span className="cf-cover-title">{campaign.title}</span>
      </div>
      <div className="cf-campaign-body">
        <p>{campaign.summary}</p>
        <div className="cf-campaign-meta">
          <span>by {campaign.creator}</span>
          <span>{campaign.backers.toLocaleString('zh-CN')} 人支持</span>
        </div>
        <div className="cf-funding">
          <div className="cf-funding-rail">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="cf-funding-meta">
            <span>
              已筹 <strong>{formatTokens(campaign.raisedTokens)}</strong> token
            </span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export function CrowdfundHome() {
  const { user } = useAuth()
  const { campaigns, loading, error } = useCampaigns()

  return (
    <AppShell>
      <section className="cf-hero">
        <div className="cf-badge-row">
          <span className="cf-pill">AIGC 共创众筹</span>
          <span className="cf-pill">帮助创作人快速打造 IP</span>
          <span className="cf-pill">共享算力 · 降低 token 成本</span>
        </div>
        <h1>把灵感众筹成 IP，让好创意不再被算力劝退。</h1>
        <p>
          粉丝用 token 众筹支持你心中的 IP，资金汇入共享算力池后批量生成，单次打造的成本显著下降。从角色设定到成片，一个人也能跑完一条 IP 生产线。
        </p>
        <div className="cf-hero-actions">
          <Link className="primary-button" to="/crowdfund">
            浏览众筹项目
          </Link>
          <Link className="ghost-button" to="/ip-studio">
            进入 IP 工坊
          </Link>
        </div>
      </section>

      <section className="cf-stats" style={{ marginTop: '1.5rem' }}>
        {crowdfundStats.map((stat) => (
          <article key={stat.label} className="cf-stat-card">
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
            <p>{stat.detail}</p>
          </article>
        ))}
      </section>

      <section className="section-block" style={{ marginTop: '1.5rem' }}>
        <div className="section-heading">
          <div>
            <span className="section-kicker">正在众筹</span>
            <h2>为你精选的 IP 孵化计划</h2>
          </div>
          <Link className="ghost-button small-button" to="/crowdfund/create">
            {user ? '发起我的 IP 计划' : '登录后发起'}
          </Link>
        </div>
        {loading ? (
          <div className="empty-state"><h3>正在加载众筹项目…</h3></div>
        ) : error ? (
          <div className="empty-state">
            <h3>{error}</h3>
            <p>可能是后端未启动或网络异常。</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="empty-state">
            <h3>暂时还没有众筹项目</h3>
            <p>成为第一个发起 IP 计划的创作人吧。</p>
          </div>
        ) : (
          <div className="cf-campaign-grid">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="section-kicker">如何运作</span>
            <h2>四步把灵感变成可收益的 IP</h2>
          </div>
        </div>
        <div className="cf-steps">
          {howItWorks.map((item) => (
            <article key={item.step} className="cf-step">
              <span>{item.step}</span>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="section-kicker">为什么更省</span>
            <h2>众筹如何降低 token 成本</h2>
          </div>
        </div>
        <div className="cf-reasons">
          {costSavingReasons.map((reason) => (
            <article key={reason.title} className="cf-reason">
              <h3>{reason.title}</h3>
              <p>{reason.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cf-cta-band">
        <div>
          <h2>想好要做什么 IP 了吗？</h2>
          <p>先用 IP 工坊估算 token 预算，再一键发起属于你的众筹计划。</p>
        </div>
        <div className="cf-hero-actions">
          <Link className="primary-button" to="/ip-studio">
            估算我的 IP 预算
          </Link>
          <Link className="ghost-button" to={user ? '/crowdfund/create' : '/login'}>
            {user ? '立即发起众筹' : '登录后发起'}
          </Link>
        </div>
      </section>
    </AppShell>
  )
}
