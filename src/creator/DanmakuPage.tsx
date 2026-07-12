// 弹幕管理 — 真实数据 + 隐藏/恢复/删除 + 导出
import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { formatDate, formatSeconds, formatTimeAgo } from './components/format'
import { ContentTable, Pagination } from './components/ContentTable'
import type { CreatorDanmaku } from './types'

const MODE_LABELS: Record<CreatorDanmaku['mode'], string> = {
  scroll: '滚动',
  top: '顶部',
  bottom: '底部',
}

const PAGE_SIZE = 15

export function DanmakuPage() {
  const [items, setItems] = useState<CreatorDanmaku[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [videoId, setVideoId] = useState<string>('all')
  const [videos, setVideos] = useState<{ id: number; title: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // 加载创作者作品列表(用于按视频筛选)
  useEffect(() => {
    let cancelled = false
    async function loadVideos() {
      try {
        const result = await api.get<{ videos: { id: number; title: string }[] }>('/videos/mine')
        if (!cancelled) setVideos(result.videos ?? [])
      } catch {
        // ignore
      }
    }
    void loadVideos()
    return () => {
      cancelled = true
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
      if (search.trim()) params.set('q', search.trim())
      if (videoId !== 'all') params.set('videoId', videoId)
      const result = await api.get<{ danmaku: CreatorDanmaku[]; total: number }>(
        `/creator/danmaku?${params.toString()}`,
      )
      setItems(result.danmaku ?? [])
      setTotal(result.total ?? 0)
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
      setError(message || '加载弹幕失败')
    } finally {
      setLoading(false)
    }
  }, [page, search, videoId])

  useEffect(() => {
    void load()
  }, [load])

  async function handlePatch(id: number, hidden: boolean) {
    setActionError(null)
    try {
      await api.patch(`/creator/danmaku/${id}`, { hidden })
      void load()
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
      setActionError(message || '操作失败')
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('确定删除这条弹幕?删除后不可恢复。')) return
    setActionError(null)
    try {
      await api.delete(`/creator/danmaku/${id}`)
      void load()
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
      setActionError(message || '删除失败')
    }
  }

  function handleExport() {
    if (typeof window === 'undefined') return
    const payload = items.map((d) => ({
      id: d.id,
      videoId: d.videoId,
      videoTitle: d.videoTitle,
      author: d.authorName,
      text: d.text,
      mode: d.mode,
      color: d.color,
      timeSeconds: d.timeSeconds,
      hidden: d.hidden,
      createdAt: d.createdAt,
    }))
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `creator-danmaku-${Date.now()}.json`
    document.body.append(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="creator-page-head">
        <div>
          <span className="creator-page-eyebrow">互动</span>
          <h1 className="creator-page-title">弹幕管理</h1>
          <p className="creator-page-sub">查看、隐藏或删除你作品下的弹幕 · 共 {total} 条</p>
        </div>
        <div className="creator-page-actions">
          <button className="creator-chip" type="button" onClick={handleExport}>
            导出当前筛选
          </button>
        </div>
      </div>

      {actionError ? <div className="creator-error">{actionError}</div> : null}
      {error ? <div className="creator-error">{error}</div> : null}

      <ContentTable
        toolbar={
          <>
            <input
              aria-label="搜索弹幕"
              className="creator-input"
              placeholder="搜索弹幕内容…"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
            <select
              aria-label="按视频筛选"
              className="creator-select"
              value={videoId}
              onChange={(e) => {
                setVideoId(e.target.value)
                setPage(1)
              }}
            >
              <option value="all">全部视频</option>
              {videos.map((v) => (
                <option key={v.id} value={String(v.id)}>
                  {v.title}
                </option>
              ))}
            </select>
            <button className="creator-chip" type="button" onClick={() => void load()}>
              刷新
            </button>
          </>
        }
        pagination={
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
        }
      >
        <table className="creator-table">
          <thead>
            <tr>
              <th>用户</th>
              <th>弹幕</th>
              <th>时间点</th>
              <th>模式</th>
              <th>视频</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                  加载中…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                  暂无弹幕
                </td>
              </tr>
            ) : (
              items.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="creator-fan-row">
                      <div className="creator-fan-avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                        {d.authorName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="creator-fan-meta">
                        <strong>{d.authorName}</strong>
                      </div>
                    </div>
                  </td>
                  <td style={{ maxWidth: 360 }}>
                    <p style={{ margin: 0, color: d.hidden ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: d.color, marginRight: 6, verticalAlign: 'middle' }} />
                      {d.text}
                    </p>
                  </td>
                  <td className="cell-strong">{formatSeconds(d.timeSeconds)}</td>
                  <td>
                    <span className="creator-status-pill visible">{MODE_LABELS[d.mode]}</span>
                  </td>
                  <td className="cell-muted">{d.videoTitle}</td>
                  <td className="cell-muted" title={formatDate(d.createdAt)}>
                    {formatTimeAgo(d.createdAt)}
                  </td>
                  <td>
                    <div className="row-actions">
                      {d.hidden ? (
                        <button className="creator-chip" type="button" onClick={() => void handlePatch(d.id, false)}>
                          恢复
                        </button>
                      ) : (
                        <button className="creator-chip" type="button" onClick={() => void handlePatch(d.id, true)}>
                          隐藏
                        </button>
                      )}
                      <button
                        className="creator-chip"
                        style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)' }}
                        type="button"
                        onClick={() => void handleDelete(d.id)}
                      >
                        删除
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
