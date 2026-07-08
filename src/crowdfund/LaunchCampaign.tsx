import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AppShell } from '../App'
import { categories } from '../data/siteData'
import type { Campaign, PerkTier } from '../data/crowdfundData'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { clearDraft, getDraft } from './store'

const COVER_PALETTE = [
  'linear-gradient(135deg, rgba(40,104,255,0.95) 0%, rgba(24,182,160,0.92) 100%)',
  'linear-gradient(135deg, rgba(255,122,89,0.95) 0%, rgba(255,71,126,0.92) 100%)',
  'linear-gradient(135deg, rgba(131,56,236,0.95) 0%, rgba(255,119,199,0.9) 100%)',
  'linear-gradient(135deg, rgba(6,214,160,0.95) 0%, rgba(76,201,240,0.92) 100%)',
]

const DEFAULT_TOKEN_PLAN = [
  { label: '角色与设定生成', percent: 40 },
  { label: '短片 / 分镜生成', percent: 32 },
  { label: '语音与音色合成', percent: 18 },
  { label: '社区共创素材', percent: 10 },
]

function buildPerks(goal: number): PerkTier[] {
  const tier1 = Math.max(500, Math.round((goal * 0.02) / 100) * 100)
  const tier2 = Math.max(2000, Math.round((goal * 0.15) / 100) * 100)
  const tier3 = Math.max(5000, Math.round((goal * 0.4) / 100) * 100)

  return [
    {
      id: 'tier-1',
      name: '抢先体验官',
      tokens: tier1,
      perks: ['抢先看到早期形象', '片尾鸣谢', '共创者徽章'],
    },
    {
      id: 'tier-2',
      name: '设定共创官',
      tokens: tier2,
      perks: ['投票决定角色 / 剧情走向', '专属表情包', '试看提前 7 天'],
      highlight: true,
    },
    {
      id: 'tier-3',
      name: 'IP 出品人',
      tokens: tier3,
      perks: ['定制专属形象', 'IP 衍生收益分成', '主创线上共创会'],
    },
  ]
}

export function LaunchCampaign() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [creator, setCreator] = useState('')
  const [category, setCategory] = useState('动画')
  const [goalTokens, setGoalTokens] = useState(800000)
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [createdCampaign, setCreatedCampaign] = useState<Campaign | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const draft = getDraft()
    if (!draft) return
    if (draft.title) setTitle(draft.title)
    if (draft.creator) setCreator(draft.creator)
    if (draft.category) setCategory(draft.category)
    if (typeof draft.goalTokens === 'number' && draft.goalTokens > 0) setGoalTokens(draft.goalTokens)
    if (draft.summary) setSummary(draft.summary)
    if (draft.description) setDescription(draft.description)
  }, [])

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (createdCampaign) {
    return (
      <AppShell>
        <section className="cf-success">
          <h2>IP 计划已发起！</h2>
          <p>它已经出现在众筹列表里，粉丝可以用 token 支持你，平台批量生成会帮你把成本降下来。</p>
          <div className="cf-hero-actions" style={{ justifyContent: 'center' }}>
            <Link className="primary-button" to={`/crowdfund/project/${createdCampaign.id}`}>
              查看我的计划
            </Link>
            <Link className="ghost-button" to="/crowdfund">
              回到众筹列表
            </Link>
          </div>
        </section>
      </AppShell>
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return

    const safeGoal = Math.max(1000, Math.round(Number(goalTokens) || 0))
    setSubmitting(true)
    setError(null)

    try {
      const result = await api.post<{ campaign: Campaign }>('/campaigns', {
        title: title.trim() || '未命名 IP 计划',
        creator: creator.trim() || user.username,
        category,
        summary: summary.trim() || '一个正在众筹支持的 AIGC IP 计划。',
        cover: COVER_PALETTE[Math.floor(Math.random() * COVER_PALETTE.length)],
        goalTokens: safeGoal,
        description: description.trim() || summary.trim() || '这个 IP 计划还在起步阶段，欢迎用 token 支持它长大。',
        tags: ['新发起'],
        tokenPlan: DEFAULT_TOKEN_PLAN,
        perks: buildPerks(safeGoal),
        milestones: [
          { label: '概念设定', tokens: Math.round(safeGoal * 0.15), status: 'active' },
          { label: '基座模型 / 素材生成', tokens: Math.round(safeGoal * 0.6), status: 'upcoming' },
          { label: '成片 / 上线', tokens: safeGoal, status: 'upcoming' },
        ],
        costSavingPercent: 38,
      })

      clearDraft()
      setCreatedCampaign(result.campaign)
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err
        ? String((err as { message?: unknown }).message ?? '')
        : ''
      const code = typeof err === 'object' && err && 'error' in err
        ? String((err as { error?: unknown }).error ?? '')
        : ''
      setError(message || code || '发起失败，请稍后再试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell>
      <section className="section-block">
        <span className="section-kicker">发起众筹</span>
        <h1 style={{ margin: '0.6rem 0', fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', color: '#16182f' }}>
          发起你的 AIGC IP 计划
        </h1>
        <p style={{ margin: 0, color: '#5c6478', lineHeight: 1.7, maxWidth: '64ch' }}>
          填好下面的信息，我们会自动生成支持档位与孵化里程碑。发起后粉丝就能用 token 支持你，平台共享算力池帮你降低生成成本。
        </p>
      </section>

      <div className="content-grid" style={{ marginTop: '1.5rem', alignItems: 'start' }}>
        <section className="section-block">
          <form className="cf-form-grid" onSubmit={handleSubmit}>
            <label className="full-span">
              计划名称
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：星轨猫娘偶像企划" />
            </label>
            <label>
              创作人昵称
              <input value={creator} onChange={(event) => setCreator(event.target.value)} placeholder={user.username} />
            </label>
            <label>
              分类
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories
                  .filter((item) => !['为你推荐', '热门'].includes(item.name))
                  .map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="full-span">
              目标 token 数
              <input
                type="number"
                min={1000}
                step={1000}
                value={goalTokens}
                onChange={(event) => setGoalTokens(Number(event.target.value))}
              />
            </label>
            <label className="full-span">
              一句话简介
              <input value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="用一句话讲清这个 IP 是什么" />
            </label>
            <label className="full-span">
              计划介绍
              <textarea
                rows={5}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="想做成什么、token 会花在哪、支持者能得到什么。"
              />
            </label>
            {error ? <div className="auth-error">{error}</div> : null}
            <div className="full-span cf-publish-row">
              <button type="submit" className="primary" disabled={submitting}>
                {submitting ? '正在发起…' : '发起众筹计划'}
              </button>
              <button type="button" className="ghost" onClick={() => navigate('/crowdfund')}>
                取消
              </button>
            </div>
          </form>
        </section>

        <aside className="sidebar-stack">
          <section className="section-block compact-block">
            <div className="section-heading">
              <div>
                <span className="section-kicker">发起后</span>
                <h2>会自动生成</h2>
              </div>
            </div>
            <div className="quick-link-list">
              <article className="quick-link-card static-card">
                <strong>3 档支持档位</strong>
                <span>按目标 token 自动拆成体验 / 共创 / 出品三档。</span>
              </article>
              <article className="quick-link-card static-card">
                <strong>孵化里程碑</strong>
                <span>概念设定 → 素材生成 → 成片上线，随资金解锁。</span>
              </article>
              <article className="quick-link-card static-card">
                <strong>成本节省标识</strong>
                <span>标注平台批量生成预计降低约 38% token 成本。</span>
              </article>
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}
