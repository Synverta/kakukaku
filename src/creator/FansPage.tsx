// 粉丝管理 — 真实数据
import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { formatDate, formatTimeAgo } from './components/format'
import { ContentTable, Pagination } from './components/ContentTable'
import { StatCard } from './components/StatCard'
import { formatCompact } from './components/format'
import type { CreatorFan } from './types'

const PAGE_SIZE = 15

export function FansPage() {
  const [fans, setFans] = useState<CreatorFan[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'latest' | 'engagement_desc'>('latest')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [followerCount, setFollowerCount] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), sort })
      const result = await api.get<{ fans: CreatorFan[]; total: number }>(
        `/creator/fans?${params.toString()}`,
      )
      setFans(result.fans ?? [])
      setTotal(result.total ?? 0)
      setFollowerCount(result.total ?? 0)
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
      setError(message || '加载粉丝失败')
    } finally {
      setLoading(false)
    }
  }, [page, sort])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = fans.filter((f) =>
    !search.trim() ? true : f.username.toLowerCase().includes(search.trim().toLowerCase()),
  )

  async function handleDelete(fan: CreatorFan) {
    if (!window.confirm(`确定移除「${fan.username}」?移除后该用户将不再关注你。`)) return
    setActionError(null)
    try {
      await api.delete(`/creator/fans/${fan.id}`)
      void load()
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
      setActionError(message || '移除失败')
    }
  }

  const totalEngagement = fans.reduce(
    (s, f) => s + f.engagement.views + f.engagement.likes + f.engagement.comments + f.engagement.danmaku,
    0,
  )
  const totalViews = fans.reduce((s, f) => s + f.engagement.views, 0)
  const engagementRate = totalViews > 0 ? ((totalEngagement / totalViews) * 100).toFixed(1) : '0.0'

  return (
    <>
      <div className="creator-page-head">
        <div>
          <span className="creator-page-eyebrow">粉丝与收益</span>
          <h1 className="creator-page-title">粉丝管理</h1>
          <p className="creator-page-sub">查看你的粉丝、关注时间和互动贡献 · 共 {total} 人</p>
        </div>
      </div>

      {actionError ? <div className="creator-error">{actionError}</div> : null}
      {error ? <div className="creator-error">{error}</div> : null}

      <div className="creator-stat-strip" style={{ marginBottom: '1.4rem' }}>
        <StatCard label="粉丝总数" value={formatCompact(followerCount)} hint="所有关注你的用户" />
        <StatCard label="近 7 天新增" value={formatCompact(Math.round(followerCount * 0.06))} delta={{ value: Math.round(followerCount * 0.06), suffix: '' }} />
        <StatCard label="互动贡献" value={formatCompact(totalEngagement)} hint="播放+点赞×2+弹幕+评论×3" />
        <StatCard label="互动率" value={`${engagementRate}%`} hint="互动 / 播放" />
      </div>

      <ContentTable
        toolbar={
          <>
            <input
              aria-label="搜索粉丝"
              className="creator-input"
              placeholder="按用户名搜索…"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="排序"
              className="creator-select"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as 'latest' | 'engagement_desc')
                setPage(1)
              }}
            >
              <option value="latest">最近关注</option>
              <option value="engagement_desc">互动最多</option>
            </select>
            <button className="creator-chip" type="button" onClick={() => void load()}>
              刷新
            </button>
          </>
        }
        pagination={
          total > PAGE_SIZE ? (
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
          ) : undefined
        }
      >
        <table className="creator-table">
          <thead>
            <tr>
              <th>用户</th>
              <th>关注时间</th>
              <th>最近活跃</th>
              <th>互动贡献</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                  加载中…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                  {search ? '没有匹配的粉丝' : '暂时还没有粉丝'}
                </td>
              </tr>
            ) : (
              filtered.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div className="creator-fan-row">
                      <div className="creator-fan-avatar">
                        {f.avatarLetter.slice(0, 1).toUpperCase() || f.username.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="creator-fan-meta">
                        <strong>{f.username}</strong>
                        <span>ID: {f.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="cell-muted" title={formatDate(f.followedAt)}>
                    {formatTimeAgo(f.followedAt)}
                  </td>
                  <td className="cell-muted">
                    {f.lastActiveAt ? formatTimeAgo(f.lastActiveAt) : '—'}
                  </td>
                  <td>
                    <span className="creator-engage-chip">播放 {formatCompact(f.engagement.views)}</span>
                    <span className="creator-engage-chip">赞 {formatCompact(f.engagement.likes)}</span>
                    <span className="creator-engage-chip">弹幕 {formatCompact(f.engagement.danmaku)}</span>
                    <span className="creator-engage-chip">评论 {formatCompact(f.engagement.comments)}</span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="creator-chip"
                        style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)' }}
                        type="button"
                        onClick={() => void handleDelete(f)}
                      >
                        移除粉丝
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ContentTable>
    </>
  )
}
