import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminCases, type CaseStatus, type ModerationCase, type ReportTargetType } from '../lib/reports'

const STATUS_LABEL: Record<CaseStatus | 'all', string> = {
  all: '全部',
  open: '待处理',
  closed_takedown: '已下架',
  closed_rejected: '审核未通过',
  closed_merged: '已合并',
}

const TARGET_LABEL: Record<ReportTargetType | 'all', string> = {
  all: '全部对象',
  video: '视频',
  comment: '评论',
  danmaku: '弹幕',
  community: '社区内容',
}

const PAGE_SIZE = 20

export function CasesListPage() {
  const [status, setStatus] = useState<CaseStatus | 'all'>('open')
  const [targetType, setTargetType] = useState<ReportTargetType | 'all'>('all')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<ModerationCase[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchAdminCases({ status, targetType, page, pageSize: PAGE_SIZE })
      setItems(result.items ?? [])
      setTotal(result.total ?? 0)
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message?: unknown }).message ?? '加载失败')
          : '加载失败'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [status, targetType, page])

  useEffect(() => {
    void load()
  }, [load])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <section className="admin-page">
      <header className="admin-page-head">
        <h1>举报工单</h1>
        <p>共 {total} 条 · 第 {page} / {totalPages} 页</p>
      </header>

      <div className="admin-filter-row">
        <label>
          <span>状态</span>
          <select value={status} onChange={(event) => { setStatus(event.target.value as CaseStatus | 'all'); setPage(1) }}>
            {(Object.keys(STATUS_LABEL) as (CaseStatus | 'all')[]).map((key) => (
              <option key={key} value={key}>
                {STATUS_LABEL[key]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>对象</span>
          <select value={targetType} onChange={(event) => { setTargetType(event.target.value as ReportTargetType | 'all'); setPage(1) }}>
            {(Object.keys(TARGET_LABEL) as (ReportTargetType | 'all')[]).map((key) => (
              <option key={key} value={key}>
                {TARGET_LABEL[key]}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => void load()} disabled={loading}>
          {loading ? '加载中…' : '刷新'}
        </button>
      </div>

      {error ? <p className="admin-error">{error}</p> : null}

      <table className="admin-table">
        <thead>
          <tr>
            <th>工单</th>
            <th>对象</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>处理时间</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} className="admin-table-empty">
                {loading ? '加载中…' : '暂无工单'}
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id}>
                <td>#{item.id}</td>
                <td>
                  {item.targetType} #{item.targetId}
                </td>
                <td>
                  <span className={`admin-tag tag-${item.status}`}>{STATUS_LABEL[item.status] ?? item.status}</span>
                </td>
                <td>{new Date(item.createdAt).toLocaleString('zh-CN')}</td>
                <td>{item.closedAt ? new Date(item.closedAt).toLocaleString('zh-CN') : '—'}</td>
                <td>
                  <Link to={`/admin/cases/${item.id}`}>详情</Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="admin-pagination">
        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          上一页
        </button>
        <span>
          {page} / {totalPages}
        </span>
        <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
          下一页
        </button>
      </div>
    </section>
  )
}