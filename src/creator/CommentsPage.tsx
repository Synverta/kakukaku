// 评论管理 — 真实数据 + 置顶/隐藏/删除
import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { formatDate, formatTimeAgo } from './components/format'
import { ContentTable, Pagination } from './components/ContentTable'
import { COMMENT_STATUS_LABELS, type CommentStatus, type CreatorComment } from './types'

const STATUS_FILTERS: { key: 'all' | CommentStatus; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'visible', label: '展示中' },
  { key: 'pinned', label: '已置顶' },
  { key: 'hidden', label: '已隐藏' },
]

const PAGE_SIZE = 15

export function CommentsPage() {
  const [comments, setComments] = useState<CreatorComment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'all' | CommentStatus>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search.trim()) params.set('q', search.trim())
      const result = await api.get<{ comments: CreatorComment[]; total: number }>(
        `/creator/comments?${params.toString()}`,
      )
      setComments(result.comments ?? [])
      setTotal(result.total ?? 0)
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
      setError(message || '加载评论失败')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, search])

  useEffect(() => {
    void load()
  }, [load])

  async function handlePatch(id: number, status: CommentStatus) {
    setActionError(null)
    try {
      await api.patch(`/creator/comments/${id}`, { status })
      void load()
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
      setActionError(message || '操作失败')
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('确定删除这条评论?删除后不可恢复。')) return
    setActionError(null)
    try {
      await api.delete(`/creator/comments/${id}`)
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
          <span className="creator-page-eyebrow">互动</span>
          <h1 className="creator-page-title">评论管理</h1>
          <p className="creator-page-sub">查看、置顶、隐藏或删除你作品下的评论 · 共 {total} 条</p>
        </div>
      </div>

      {actionError ? <div className="creator-error">{actionError}</div> : null}
      {error ? <div className="creator-error">{error}</div> : null}

      <ContentTable
        toolbar={
          <>
            <input
              aria-label="搜索评论"
              className="creator-input"
              placeholder="搜索评论内容…"
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
              <th>评论内容</th>
              <th>视频</th>
              <th>状态</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                  加载中…
                </td>
              </tr>
            ) : comments.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                  暂无评论
                </td>
              </tr>
            ) : (
              comments.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="creator-fan-row">
                      <div className="creator-fan-avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                        {(c.avatarLetter || c.authorName.slice(0, 1)).toUpperCase()}
                      </div>
                      <div className="creator-fan-meta">
                        <strong>{c.authorName}</strong>
                      </div>
                    </div>
                  </td>
                  <td style={{ maxWidth: 360 }}>
                    <p style={{ margin: 0, color: 'var(--text-primary)' }}>{c.content}</p>
                  </td>
                  <td>
                    <span className="cell-muted">{c.videoTitle}</span>
                  </td>
                  <td>
                    <span className={`creator-status-pill ${c.status}`}>
                      {COMMENT_STATUS_LABELS[c.status]}
                    </span>
                  </td>
                  <td className="cell-muted" title={formatDate(c.createdAt)}>
                    {formatTimeAgo(c.createdAt)}
                  </td>
                  <td>
                    <div className="row-actions">
                      {c.status !== 'pinned' ? (
                        <button className="creator-chip" type="button" onClick={() => void handlePatch(c.id, 'pinned')}>
                          置顶
                        </button>
                      ) : null}
                      {c.status !== 'hidden' ? (
                        <button className="creator-chip" type="button" onClick={() => void handlePatch(c.id, 'hidden')}>
                          隐藏
                        </button>
                      ) : (
                        <button className="creator-chip" type="button" onClick={() => void handlePatch(c.id, 'visible')}>
                          恢复
                        </button>
                      )}
                      <button
                        className="creator-chip"
                        style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)' }}
                        type="button"
                        onClick={() => void handleDelete(c.id)}
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
