// 作品管理页 — 从 /upload WorksTab 迁移并扩展为表格视图
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { formatCompact, formatDate } from './components/format'
import { ContentTable, Pagination } from './components/ContentTable'
import { VIDEO_STATUS_LABELS, type CreatorVideo, type VideoStatus } from './types'

const STATUS_FILTERS: { key: 'all' | VideoStatus; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'draft', label: '草稿' },
  { key: 'pending', label: '审核中' },
  { key: 'published', label: '已发布' },
  { key: 'rejected', label: '未通过' },
]

const SORT_OPTIONS: { key: 'latest' | 'views_desc' | 'likes_desc' | 'danmaku_desc'; label: string }[] = [
  { key: 'latest', label: '最新发布' },
  { key: 'views_desc', label: '播放最多' },
  { key: 'likes_desc', label: '点赞最多' },
  { key: 'danmaku_desc', label: '弹幕最多' },
]

const PAGE_SIZE = 10

export function WorksPage() {
  const navigate = useNavigate()
  const [videos, setVideos] = useState<CreatorVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | VideoStatus>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]['key']>('latest')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.get<{ videos: CreatorVideo[] }>('/videos/mine')
      setVideos(result.videos ?? [])
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
      setError(message || '加载作品失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const lowerQ = search.trim().toLowerCase()
    const matched = videos.filter((v) => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false
      if (lowerQ && !`${v.title} ${v.category} ${v.tags.join(' ')}`.toLowerCase().includes(lowerQ)) return false
      return true
    })
    const sorted = [...matched]
    if (sort === 'views_desc') sorted.sort((a, b) => b.views - a.views)
    else if (sort === 'likes_desc') sorted.sort((a, b) => b.likes - a.likes)
    else if (sort === 'danmaku_desc') sorted.sort((a, b) => b.danmakuCount - a.danmakuCount)
    else sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return sorted
  }, [videos, statusFilter, search, sort])

  const total = filtered.length
  const pageStart = (page - 1) * PAGE_SIZE
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  useEffect(() => {
    if (page > 1 && pageStart >= total) setPage(1)
  }, [page, pageStart, total])

  async function handleStatusChange(video: CreatorVideo, nextStatus: VideoStatus) {
    setActionError(null)
    try {
      await api.patch<{ video: CreatorVideo }>(`/videos/${video.id}`, { status: nextStatus })
      void load()
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
      setActionError(message || '操作失败')
    }
  }

  async function handleDelete(video: CreatorVideo) {
    if (!window.confirm(`确定删除「${video.title}」?删除后不可恢复。`)) return
    setActionError(null)
    try {
      await api.delete(`/videos/${video.id}`)
      void load()
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
      setActionError(message || '删除失败')
    }
  }

  return (
    <>
      <div className="creator-page-head">
        <div>
          <span className="creator-page-eyebrow">内容管理</span>
          <h1 className="creator-page-title">视频管理</h1>
          <p className="creator-page-sub">查看、编辑与提交你的全部视频稿件 · 共 {videos.length} 条</p>
        </div>
        <div className="creator-page-actions">
          <Link className="primary-button" to="/creator/publish">
            + 投稿新视频
          </Link>
        </div>
      </div>

      {actionError ? <div className="creator-error">{actionError}</div> : null}
      {error ? <div className="creator-error">{error}</div> : null}

      <ContentTable
        toolbar={
          <>
            <input
              aria-label="搜索作品"
              className="creator-input"
              placeholder="搜索标题、分类、标签…"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
            <div className="creator-chip-group" role="tablist">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  className={`creator-chip${statusFilter === f.key ? ' is-active' : ''}`}
                  role="tab"
                  type="button"
                  onClick={() => {
                    setStatusFilter(f.key)
                    setPage(1)
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <select
              aria-label="排序"
              className="creator-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as (typeof SORT_OPTIONS)[number]['key'])}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <button className="creator-chip" type="button" onClick={() => void load()}>
              刷新
            </button>
          </>
        }
        pagination={
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onChange={setPage}
          />
        }
      >
        <table className="creator-table">
          <thead>
            <tr>
              <th>作品</th>
              <th>状态</th>
              <th>分类</th>
              <th>播放</th>
              <th>点赞</th>
              <th>弹幕</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                  正在加载…
                </td>
              </tr>
            ) : pageItems.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                  {search || statusFilter !== 'all' ? '没有匹配的作品' : '还没有作品,去「投稿新视频」创建第一条吧'}
                </td>
              </tr>
            ) : (
              pageItems.map((video) => (
                <tr key={video.id}>
                  <td>
                    <div className="row-cover">
                      <span
                        className="row-cover-thumb"
                        style={{ background: video.cover || 'linear-gradient(135deg,#2868ff 0%,#18b6a0 100%)' }}
                      >
                        <span className="duration">{video.duration || '00:00'}</span>
                      </span>
                      <div>
                        <button
                          className="cell-strong"
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                          type="button"
                          onClick={() => navigate(`/creator/works/${video.id}`)}
                        >
                          {video.title}
                        </button>
                        <div className="cell-muted">{video.tags.slice(0, 3).join(' · ') || '无标签'}</div>
                        {video.status === 'rejected' && video.rejectReason ? (
                          <p className="creator-reject-reason">退回原因:{video.rejectReason}</p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`creator-status-pill ${video.status}`}>
                      {VIDEO_STATUS_LABELS[video.status]}
                    </span>
                  </td>
                  <td>{video.category}</td>
                  <td className="cell-strong">{formatCompact(video.views)}</td>
                  <td>{formatCompact(video.likes)}</td>
                  <td>{formatCompact(video.danmakuCount)}</td>
                  <td className="cell-muted">{formatDate(video.updatedAt)}</td>
                  <td>
                    <div className="row-actions">
                      {video.status === 'draft' ? (
                        <button
                          className="creator-chip"
                          type="button"
                          onClick={() => void handleStatusChange(video, 'pending')}
                        >
                          提交审核
                        </button>
                      ) : null}
                      {video.status === 'rejected' ? (
                        <button
                          className="creator-chip"
                          type="button"
                          onClick={() => void handleStatusChange(video, 'pending')}
                        >
                          重新提交
                        </button>
                      ) : null}
                      <button
                        className="creator-chip"
                        type="button"
                        onClick={() => navigate(`/creator/works/${video.id}`)}
                      >
                        编辑
                      </button>
                      <button
                        className="creator-chip"
                        style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)' }}
                        type="button"
                        onClick={() => void handleDelete(video)}
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
