// 数据中心 — 范围选择 + sparkline + 流量来源 + Top 5
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { formatCompact } from './components/format'
import { StatCard } from './components/StatCard'
import { Sparkline } from './components/Sparkline'
import { BarChart } from './components/BarChart'
import type { StatsData, StatsRange } from './types'

const RANGE_OPTIONS: { key: StatsRange; label: string }[] = [
  { key: '7d', label: '近 7 天' },
  { key: '30d', label: '近 30 天' },
  { key: '90d', label: '近 90 天' },
]

export function AnalyticsPage() {
  const [range, setRange] = useState<StatsRange>('7d')
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await api.get<StatsData>(`/creator/stats?range=${range}`)
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) {
          const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
          setError(message || '加载数据失败')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [range])

  const viewsPoints = data?.series.map((p) => p.views) ?? []
  const topBarRows = (data?.topVideos ?? []).map((v) => ({ label: v.title, value: v.views }))

  return (
    <>
      <div className="creator-page-head">
        <div>
          <span className="creator-page-eyebrow">数据与运营</span>
          <h1 className="creator-page-title">数据中心</h1>
          <p className="creator-page-sub">查看你的作品在不同时间段的播放、互动和流量来源</p>
        </div>
        <div className="creator-page-actions">
          <div className="creator-chip-group">
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r.key}
                className={`creator-chip${range === r.key ? ' is-active' : ''}`}
                type="button"
                onClick={() => setRange(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? <div className="creator-error">{error}</div> : null}

      {data ? (
        <>
          <div className="creator-stat-strip">
            <StatCard label="累计播放" value={formatCompact(data.totalViews)} hint={`${RANGE_OPTIONS.find((r) => r.key === range)?.label}`} />
            <StatCard label="累计点赞" value={formatCompact(data.totalLikes)} />
            <StatCard label="累计弹幕" value={formatCompact(data.totalDanmaku)} />
            <StatCard label="累计评论" value={formatCompact(data.totalComments)} />
          </div>

          <section className="creator-chart-card" style={{ marginTop: '1.4rem' }}>
            <div className="creator-chart-head">
              <h3>播放趋势</h3>
              <span className="note">按天聚合</span>
            </div>
            {loading ? (
              <div style={{ color: 'var(--text-tertiary)' }}>加载中…</div>
            ) : (
              <Sparkline points={viewsPoints} height={140} />
            )}
          </section>

          <section className="creator-chart-grid two" style={{ marginTop: '1.4rem' }}>
            <div className="creator-chart-card">
              <div className="creator-chart-head">
                <h3>Top 5 作品</h3>
                <span className="note">按播放量排序</span>
              </div>
              {topBarRows.length === 0 ? (
                <div style={{ color: 'var(--text-tertiary)' }}>暂无已发布作品</div>
              ) : (
                <BarChart rows={topBarRows} unit=" 播放" />
              )}
            </div>

            <div className="creator-chart-card">
              <div className="creator-chart-head">
                <h3>流量来源</h3>
                <span className="note">推荐来源占比</span>
              </div>
              <BarChart
                rows={(data.trafficSources ?? []).map((t) => ({ label: t.source, value: t.percent }))}
                unit=" %"
                emptyHint="暂无数据"
              />
            </div>
          </section>
        </>
      ) : null}
    </>
  )
}
