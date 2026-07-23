import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { decideAppeal, fetchAdminAppeals, type Appeal } from '../lib/reports'

export function AppealsPage() {
  const [status, setStatus] = useState<'pending' | 'accepted' | 'rejected'>('pending')
  const [items, setItems] = useState<Appeal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [decision, setDecision] = useState<'accept' | 'reject'>('accept')
  const [decisionReason, setDecisionReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchAdminAppeals(status)
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
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSubmit() {
    if (activeId === null) return
    if (decisionReason.trim().length === 0) {
      setActionError('请填写处理说明')
      return
    }
    setActionError(null)
    setSubmitting(true)
    try {
      await decideAppeal(activeId, { decision, reason: decisionReason.trim() })
      setActiveId(null)
      setDecisionReason('')
      await load()
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message?: unknown }).message ?? '处理失败')
          : '处理失败'
      setActionError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="admin-page">
      <header className="admin-page-head">
        <h1>申诉队列</h1>
        <div className="admin-tabs">
          {(['pending', 'accepted', 'rejected'] as const).map((key) => (
            <button
              key={key}
              type="button"
              className={`admin-tab${status === key ? ' is-active' : ''}`}
              onClick={() => setStatus(key)}
            >
              {key === 'pending' ? '待处理' : key === 'accepted' ? '已通过' : '已驳回'}
            </button>
          ))}
        </div>
      </header>

      {error ? <p className="admin-error">{error}</p> : null}

      <ul className="admin-appeals-list">
        {items.length === 0 ? (
          <li className="admin-empty">{loading ? '加载中…' : '暂无数据'}</li>
        ) : (
          items.map((appeal) => (
            <li key={appeal.id} className="admin-appeal-card">
              <div className="admin-appeal-head">
                <strong>#{appeal.id}</strong>
                <span>{appeal.username ?? `用户 ${appeal.appellantId}`}</span>
                <small>{new Date(appeal.createdAt).toLocaleString('zh-CN')}</small>
                <Link to={`/admin/cases/${appeal.caseId}`}>查看工单</Link>
              </div>
              <p>{appeal.reason}</p>
              {status === 'pending' ? (
                <button type="button" className="admin-primary" onClick={() => setActiveId(appeal.id)}>
                  处理
                </button>
              ) : appeal.decisionText ? (
                <small>回复：{appeal.decisionText}</small>
              ) : null}
            </li>
          ))
        )}
      </ul>

      {activeId !== null ? (
        <div className="report-dialog-overlay" role="presentation" onClick={() => setActiveId(null)}>
          <div className="report-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="report-dialog-close" aria-label="关闭" onClick={() => setActiveId(null)}>
              ×
            </button>
            <h2>处理申诉 #{activeId}</h2>
            <label className="report-dialog-field">
              <span>决定</span>
              <select value={decision} onChange={(event) => setDecision(event.target.value as 'accept' | 'reject')}>
                <option value="accept">接受（恢复内容并解除处罚）</option>
                <option value="reject">驳回</option>
              </select>
            </label>
            <label className="report-dialog-field">
              <span>说明</span>
              <textarea
                value={decisionReason}
                onChange={(event) => setDecisionReason(event.target.value)}
                rows={3}
                required
              />
            </label>
            {actionError ? <p className="report-dialog-error">{actionError}</p> : null}
            <div className="report-dialog-actions">
              <button type="button" onClick={() => setActiveId(null)} disabled={submitting}>
                取消
              </button>
              <button type="button" className="report-dialog-primary" disabled={submitting} onClick={() => void handleSubmit()}>
                {submitting ? '提交中…' : '提交决定'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}