// 内容类型页 — 共享表 (图文/音频/贴纸/素材/互动视频)
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { formatCompact, formatDate } from './components/format'
import { ContentTable, Pagination } from './components/ContentTable'
import { CONTENT_TYPE_LABELS, VIDEO_STATUS_LABELS, type ContentType, type CreatorVideo } from './types'

const VALID_TYPES: ContentType[] = ['article', 'interactive', 'audio', 'sticker', 'material']

const PAGE_SIZE = 12

const STATUS_FILTERS: { key: 'all' | 'draft' | 'pending' | 'published' | 'rejected'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'draft', label: '草稿' },
  { key: 'pending', label: '审核中' },
  { key: 'published', label: '已发布' },
  { key: 'rejected', label: '未通过' },
]

export function ContentTypePage() {
  const { type } = useParams()
  const navigate = useNavigate()
  const contentType = (type as ContentType) || 'article'

  const [items, setItems] = useState<CreatorVideo[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'pending' | 'published' | 'rejected'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!VALID_TYPES.includes(contentType)) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const result = await api.get<{ items: CreatorVideo[]; total: number }>(
        `/creator/content-types/${contentType}?${params.toString()}`,
      )
      setItems(result.items ?? [])
      setTotal(result.total ?? 0)
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
      setError(message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [contentType, page, statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  if (!VALID_TYPES.includes(contentType)) {
    return (
      <>
        <div className="creator-page-head">
          <div>
            <span className="creator-page-eyebrow">内容管理</span>
            <h1 className="creator-page-title">未知内容类型</h1>
          </div>
        </div>
        <div className="creator-stub-page">
          <h2>未知的内容类型</h2>
          <p>不支持的内容类型:{contentType}</p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="creator-page-head">
        <div>
          <span className="creator-page-eyebrow">内容管理</span>
          <h1 className="creator-page-title">{CONTENT_TYPE_LABELS[contentType]}管理</h1>
          <p className="creator-page-sub">统一管理你的 {CONTENT_TYPE_LABELS[contentType]} 稿件 · 共 {total} 条</p>
        </div>
        <div className="creator-page-actions">
          <a className="primary-button" href="/creator/publish">
            + 新建{CONTENT_TYPE_LABELS[contentType]}
          </a>
        </div>
      </div>

      {error ? <div className="creator-error">{error}</div> : null}

      <ContentTable
        toolbar={
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
              <th>作品</th>
              <th>状态</th>
              <th>分类</th>
              <th>播放</th>
              <th>点赞</th>
              <th>更新</th>
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
                  <p style={{ margin: 0 }}>暂无 {CONTENT_TYPE_LABELS[contentType]} 作品</p>
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem' }}>
                    {contentType === 'sticker' || contentType === 'material'
                      ? '该内容类型暂未开放投稿'
                      : '去投稿台创建第一条作品吧'}
                  </p>
                </td>
              </tr>
            ) : (
              items.map((v) => (
                <tr key={v.id}>
                  <td>
                    <div className="row-cover">
                      <span
                        className="row-cover-thumb"
                        style={{ background: v.cover || 'linear-gradient(135deg,#2868ff 0%,#18b6a0 100%)' }}
                      >
                        <span className="duration">{v.duration || '00:00'}</span>
                      </span>
                      <div>
                        <span className="cell-strong">{v.title}</span>
                        <div className="cell-muted">{v.tags.slice(0, 3).join(' · ') || '无标签'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`creator-status-pill ${v.status}`}>{VIDEO_STATUS_LABELS[v.status]}</span>
                  </td>
                  <td>{v.category}</td>
                  <td className="cell-strong">{formatCompact(v.views)}</td>
                  <td>{formatCompact(v.likes)}</td>
                  <td className="cell-muted">{formatDate(v.updatedAt)}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="creator-chip"
                        type="button"
                        onClick={() => navigate(`/creator/works/${v.id}`)}
                      >
                        详情
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
