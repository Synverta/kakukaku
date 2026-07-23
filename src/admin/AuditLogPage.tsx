import { useCallback, useEffect, useState } from 'react'
import { fetchAuditLog, type AuditEvent } from '../lib/reports'

const PAGE_SIZE = 50

const ACTION_LABEL: Record<string, string> = {
  report_submit: '提交举报',
  appeal_submit: '提交申诉',
  case_decision: '处理工单',
  case_reopen: '重开工单',
  appeal_decision: '处理申诉',
  admin_promote: '提升管理员',
}

export function AuditLogPage() {
  const [items, setItems] = useState<AuditEvent[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchAuditLog({ page, pageSize: PAGE_SIZE, action: actionFilter || undefined })
      setItems(result.items ?? [])
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message?: unknown }).message ?? '加载失败')
          : '加载失败'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section className="admin-page">
      <header className="admin-page-head">
        <h1>审核日志</h1>
        <p>按时间倒序展示所有审核动作的留痕记录。</p>
      </header>

      <div className="admin-filter-row">
        <label>
          <span>动作</span>
          <select value={actionFilter} onChange={(event) => { setActionFilter(event.target.value); setPage(1) }}>
            <option value="">全部</option>
            {Object.entries(ACTION_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
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
            <th>时间</th>
            <th>动作</th>
            <th>操作人</th>
            <th>对象</th>
            <th>载荷</th>
            <th>IP / UA</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} className="admin-table-empty">
                {loading ? '加载中…' : '暂无记录'}
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id}>
                <td>{new Date(item.createdAt).toLocaleString('zh-CN')}</td>
                <td>{ACTION_LABEL[item.action] ?? item.action}</td>
                <td>
                  {item.actorUsername ?? '系统'} ({item.actorRole})
                </td>
                <td>
                  {item.targetType} {item.targetId}
                </td>
                <td>
                  <code>{JSON.stringify(item.payload)}</code>
                </td>
                <td>
                  <small>{item.ip ?? '-'}</small>
                  <small>{item.userAgent.slice(0, 60) || '-'}</small>
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
        <span>{page}</span>
        <button type="button" disabled={items.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>
          下一页
        </button>
      </div>
    </section>
  )
}