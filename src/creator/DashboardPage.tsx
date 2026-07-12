// 概览页 — 真实数据 + KPI + 趋势 + 待办
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { formatCompact } from './components/format'
import { StatCard } from './components/StatCard'
import { Sparkline } from './components/Sparkline'
import { BarChart } from './components/BarChart'
import { VIDEO_STATUS_LABELS, type CreatorVideo, type DashboardData } from './types'

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [series, setSeries] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await api.get<DashboardData>('/creator/dashboard')
        if (!cancelled) setData(result)
        const stats = await api.get<{ series: { date: string; views: number }[] }>('/creator/stats?range=7d')
        if (!cancelled) setSeries(stats.series.map((p) => p.views))
      } catch (err) {
        if (!cancelled) {
          const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
          setError(message || '加载概览失败')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <>
        <div className="creator-page-head">
          <div>
            <span className="creator-page-eyebrow">数据与运营</span>
            <h1 className="creator-page-title">创作工作台概览</h1>
          </div>
        </div>
        <div className="creator-stub-page">加载中…</div>
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <div className="creator-page-head">
          <div>
            <span className="creator-page-eyebrow">数据与运营</span>
            <h1 className="creator-page-title">创作工作台概览</h1>
          </div>
        </div>
        <div className="creator-error">{error || '数据加载失败'}</div>
      </>
    )
  }

  const s = data.stats
  const topRows = data.recentVideos.slice(0, 5).map((v: CreatorVideo) => ({ label: v.title, value: v.views }))

  return (
    <>
      <div className="creator-hero-banner">
        <div>
          <span className="creator-page-eyebrow">数据与运营</span>
          <h1>欢迎回来,继续你的创作之旅</h1>
          <p>查看你最近的稿件表现、待办事项和平台推荐任务,让运营和创作高效衔接。</p>
        </div>
        <div className="actions">
          <Link className="primary-button" to="/creator/publish">
            + 投稿新作品
          </Link>
          <Link className="ghost-button" to="/creator/analytics">
            查看完整数据
          </Link>
        </div>
      </div>

      <div className="creator-stat-strip">
        <StatCard
          label="累计播放"
          value={formatCompact(s.totalViews)}
          delta={s.delta7dViews === 0 ? null : { value: s.delta7dViews, suffix: '' }}
        />
        <StatCard label="累计点赞" value={formatCompact(s.totalLikes)} hint="全部已发布作品" />
        <StatCard
          label="粉丝数"
          value={formatCompact(s.followerCount)}
          delta={s.delta7dFollowers === 0 ? null : { value: s.delta7dFollowers, suffix: '' }}
        />
        <StatCard
          label="待审评论"
          value={s.pendingComments}
          hint="来自你作品的评论"
        />
        <StatCard label="草稿数" value={s.draftCount} hint="可继续编辑" />
        <StatCard label="定时发布" value={s.scheduledVideoCount} hint="待自动发出" />
      </div>

      <section className="creator-chart-grid two" style={{ marginTop: '1.4rem' }}>
        <div className="creator-chart-card">
          <div className="creator-chart-head">
            <h3>7 日播放趋势</h3>
            <span className="note">基于你最近 7 天的播放量</span>
          </div>
          <Sparkline points={series} height={120} />
        </div>

        <div className="creator-chart-card">
          <div className="creator-chart-head">
            <h3>今日待办</h3>
            <span className="note">平台建议优先处理</span>
          </div>
          <ul className="creator-todo-list">
            {s.draftCount > 0 ? (
              <li>
                <span>还有 {s.draftCount} 条草稿未提交审核</span>
                <Link to="/creator/works?status=draft">去处理 →</Link>
              </li>
            ) : null}
            {s.pendingVideoCount > 0 ? (
              <li>
                <span>{s.pendingVideoCount} 条作品正在审核中</span>
                <Link to="/creator/works?status=pending">查看 →</Link>
              </li>
            ) : null}
            {s.pendingComments > 0 ? (
              <li>
                <span>{s.pendingComments} 条新评论待你查看</span>
                <Link to="/creator/interactions/comments">去审核 →</Link>
              </li>
            ) : null}
            {s.scheduledVideoCount > 0 ? (
              <li>
                <span>{s.scheduledVideoCount} 条作品已设置定时发布</span>
                <Link to="/creator/works?status=scheduled">查看 →</Link>
              </li>
            ) : null}
            {s.draftCount === 0 && s.pendingVideoCount === 0 && s.pendingComments === 0 && s.scheduledVideoCount === 0 ? (
              <li>
                <span>暂无待办 · {s.totalVideos > 0 ? '继续保持创作节奏' : '去发布你的第一支作品'}</span>
                <Link to="/creator/publish">{s.totalVideos > 0 ? '继续投稿 →' : '立即开始 →'}</Link>
              </li>
            ) : null}
          </ul>
        </div>
      </section>

      <section className="creator-chart-card" style={{ marginTop: '1.4rem' }}>
        <div className="creator-chart-head">
          <h3>最近发布 Top 5</h3>
          <span className="note">按播放量排序</span>
        </div>
        {topRows.length === 0 ? (
          <div style={{ color: 'var(--text-tertiary)', padding: '1rem 0' }}>还没有发布过作品 · <Link to="/creator/publish">立即创建 →</Link></div>
        ) : (
          <BarChart rows={topRows} unit=" 播放" />
        )}
      </section>
    </>
  )
}
