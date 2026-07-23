import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  decideCase,
  fetchCaseDetail,
  reopenCase,
  REPORT_REASON_OPTIONS,
  type CaseDetail,
  type PenaltyLevel,
} from '../lib/reports'

const REASON_LABEL = Object.fromEntries(REPORT_REASON_OPTIONS.map((r) => [r.code, r.label])) as Record<
  string,
  string
>

const PENALTY_OPTIONS: { value: PenaltyLevel; label: string }[] = [
  { value: 'warn', label: '警告' },
  { value: 'mute_comment', label: '禁言评论（1 天）' },
  { value: 'mute_post', label: '禁言发布（7 天）' },
  { value: 'post_ban', label: '禁止投稿（30 天）' },
  { value: 'account_suspend', label: '封号' },
]

const CASE_STATUS_LABEL: Record<string, string> = {
  open: '处理中',
  closed_rejected: '已驳回',
  closed_takedown: '已下架',
  closed_merged: '已合并',
}

export function CaseDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const caseId = Number(params.id)
  const [detail, setDetail] = useState<CaseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [decision, setDecision] = useState<'takedown' | 'reject'>('takedown')
  const [decisionReason, setDecisionReason] = useState('')
  const [penalties, setPenalties] = useState<{ userId: string; level: PenaltyLevel; expiresAt: string }[]>([])
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!Number.isFinite(caseId)) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetchCaseDetail(caseId)
      setDetail(result)
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message?: unknown }).message ?? '加载失败')
          : '加载失败'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return
    setActionError(null)
    if (decisionReason.trim().length === 0) {
      setActionError('请填写处理说明')
      return
    }
    const normalizedPenalties = penalties
      .filter((p) => p.userId.trim() !== '' && p.level)
      .map((p) => ({
        userId: Number(p.userId),
        level: p.level,
        expiresAt: p.expiresAt || null,
      }))
      .filter((p) => Number.isFinite(p.userId))
    setSubmitting(true)
    try {
      await decideCase(caseId, { decision, reason: decisionReason.trim(), penalties: normalizedPenalties })
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

  async function handleReopen() {
    setActionError(null)
    try {
      await reopenCase(caseId)
      await load()
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message?: unknown }).message ?? '重开失败')
          : '重开失败'
      setActionError(message)
    }
  }

  if (loading) {
    return <div className="admin-loading">加载中…</div>
  }
  if (error) {
    return (
      <div className="admin-error">
        <p>{error}</p>
        <button type="button" onClick={() => navigate('/admin/cases')}>
          返回列表
        </button>
      </div>
    )
  }
  if (!detail) return null

  return (
    <section className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1>工单 #{detail.case.id}</h1>
          <p>
            状态：{CASE_STATUS_LABEL[detail.case.status] ?? detail.case.status} · 目标：
            {detail.case.targetType} #{detail.case.targetId}
          </p>
        </div>
        <button type="button" onClick={() => navigate('/admin/cases')}>
          返回列表
        </button>
      </header>

      {actionError ? <p className="admin-error">{actionError}</p> : null}

      <section className="admin-section">
        <h2>举报详情</h2>
        <ul className="admin-reports">
          {detail.reports.map((report) => (
            <li key={report.id} className="admin-report">
              <div className="admin-report-head">
                <strong>#{report.id}</strong>
                <span>{REASON_LABEL[report.reasonCode] ?? report.reasonCode}</span>
                <small>{new Date(report.createdAt).toLocaleString('zh-CN')}</small>
              </div>
              <p>{report.reasonText}</p>
              {report.evidence.length > 0 ? (
                <div className="admin-evidence">
                  {report.evidence.map((item, index) => (
                    <a key={`${item.fileUrl}-${index}`} href={item.fileUrl} target="_blank" rel="noopener noreferrer">
                      证据 {index + 1}
                    </a>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {detail.penalties.length > 0 ? (
        <section className="admin-section">
          <h2>关联处罚</h2>
          <ul className="admin-penalties">
            {detail.penalties.map((p) => (
              <li key={p.id}>
                <strong>{p.level}</strong>
                <span>{p.reason}</span>
                <small>
                  {p.startedAt ? new Date(p.startedAt).toLocaleString('zh-CN') : ''}
                  {p.liftedAt ? ` · 已解除于 ${new Date(p.liftedAt).toLocaleString('zh-CN')}` : ''}
                </small>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {detail.appeals.length > 0 ? (
        <section className="admin-section">
          <h2>申诉记录</h2>
          <ul className="admin-appeals">
            {detail.appeals.map((appeal) => (
              <li key={appeal.id}>
                <strong>{appeal.status === 'pending' ? '待复核' : appeal.status === 'accepted' ? '已通过' : '已驳回'}</strong>
                <p>{appeal.reason}</p>
                {appeal.decisionText ? <small>回复：{appeal.decisionText}</small> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {detail.case.status === 'open' ? (
        <section className="admin-section">
          <h2>处理决定</h2>
          <form onSubmit={handleSubmit} className="admin-decision-form">
            <label className="admin-field">
              <span>处理方式</span>
              <select value={decision} onChange={(event) => setDecision(event.target.value as 'takedown' | 'reject')}>
                <option value="takedown">下架内容</option>
                <option value="reject">驳回举报</option>
              </select>
            </label>

            <label className="admin-field">
              <span>处理说明（必填，将同步给举报人和内容作者）</span>
              <textarea
                value={decisionReason}
                onChange={(event) => setDecisionReason(event.target.value)}
                rows={3}
                required
              />
            </label>

            {decision === 'takedown' ? (
              <div className="admin-field">
                <span>附加处罚（可选）</span>
                {penalties.map((p, idx) => (
                  <div key={idx} className="admin-penalty-row">
                    <input
                      type="number"
                      placeholder="用户 ID"
                      value={p.userId}
                      onChange={(event) =>
                        setPenalties((prev) => prev.map((row, i) => (i === idx ? { ...row, userId: event.target.value } : row)))
                      }
                    />
                    <select
                      value={p.level}
                      onChange={(event) =>
                        setPenalties((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, level: event.target.value as PenaltyLevel } : row)),
                        )
                      }
                    >
                      {PENALTY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="datetime-local"
                      value={p.expiresAt}
                      onChange={(event) =>
                        setPenalties((prev) => prev.map((row, i) => (i === idx ? { ...row, expiresAt: event.target.value } : row)))
                      }
                    />
                    <button type="button" onClick={() => setPenalties((prev) => prev.filter((_, i) => i !== idx))}>
                      删除
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="admin-penalty-add"
                  onClick={() => setPenalties((prev) => [...prev, { userId: '', level: 'warn', expiresAt: '' }])}
                >
                  + 添加处罚
                </button>
              </div>
            ) : null}

            <div className="admin-actions">
              <button type="submit" className="admin-primary" disabled={submitting}>
                {submitting ? '提交中…' : decision === 'takedown' ? '下架并处罚' : '驳回举报'}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="admin-section">
          <button type="button" onClick={() => void handleReopen()}>
            重新打开工单
          </button>
        </section>
      )}
    </section>
  )
}