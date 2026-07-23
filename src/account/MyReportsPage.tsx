import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import {
  fetchMyReports,
  submitAppeal,
  REPORT_REASON_OPTIONS,
  type ModerationCase,
  type Report,
} from '../lib/reports'

const REASON_LABEL = Object.fromEntries(REPORT_REASON_OPTIONS.map((r) => [r.code, r.label])) as Record<
  string,
  string
>

const STATUS_LABEL: Record<string, string> = {
  pending: '审核中',
  merged: '已合并到工单',
  accepted: '已下架',
  rejected: '审核未通过',
}

const CASE_STATUS_LABEL: Record<string, string> = {
  open: '审核中',
  closed_rejected: '审核未通过',
  closed_takedown: '内容已下架',
  closed_merged: '已合并',
}

export function MyReportsPage() {
  const { user, loading } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [cases, setCases] = useState<ModerationCase[]>([])
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [appealOpen, setAppealOpen] = useState<{ caseId: number; targetLabel: string } | null>(null)
  const [appealReason, setAppealReason] = useState('')
  const [appealError, setAppealError] = useState<string | null>(null)
  const [appealSubmitting, setAppealSubmitting] = useState(false)

  const load = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    try {
      const result = await fetchMyReports()
      setReports(result.reports ?? [])
      setCases(result.cases ?? [])
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message?: unknown }).message ?? '加载失败')
          : '加载失败'
      setError(message)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  async function handleSubmitAppeal() {
    if (!appealOpen) return
    if (appealReason.trim().length < 10) {
      setAppealError('请填写至少 10 字的申诉理由')
      return
    }
    setAppealError(null)
    setAppealSubmitting(true)
    try {
      await submitAppeal(appealOpen.caseId, appealReason.trim())
      setAppealOpen(null)
      setAppealReason('')
      await load()
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message?: unknown }).message ?? '申诉失败')
          : '申诉失败'
      setAppealError(message)
    } finally {
      setAppealSubmitting(false)
    }
  }

  if (loading) {
    return <div className="account-loading">加载中…</div>
  }
  if (!user) {
    return <div className="account-empty">请先登录后查看我的举报。</div>
  }

  const caseById = new Map<number, ModerationCase>()
  for (const c of cases) caseById.set(c.id, c)

  return (
    <div className="my-reports-page">
      <header className="my-reports-head">
        <h1>我的举报</h1>
        <button type="button" className="my-reports-refresh" onClick={() => void load()} disabled={refreshing}>
          {refreshing ? '刷新中…' : '刷新'}
        </button>
      </header>

      {error ? <p className="my-reports-error">{error}</p> : null}

      {reports.length === 0 ? (
        <div className="my-reports-empty">你还没有提交过举报。</div>
      ) : (
        <ul className="my-reports-list">
          {reports.map((report) => {
            const linkedCase = report.mergedCaseId ? caseById.get(report.mergedCaseId) : null
            return (
              <li key={report.id} className="my-reports-item">
                <div className="my-reports-item-head">
                  <span className={`my-reports-tag tag-${report.status}`}>
                    {STATUS_LABEL[report.status] ?? report.status}
                  </span>
                  <span className="my-reports-reason">{REASON_LABEL[report.reasonCode] ?? report.reasonCode}</span>
                  <span className="my-reports-target">
                    {report.targetType} #{report.targetId}
                  </span>
                  <span className="my-reports-time">
                    {new Date(report.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <p className="my-reports-text">{report.reasonText}</p>
                {report.evidence.length > 0 ? (
                  <div className="my-reports-evidence">
                    {report.evidence.map((item, index) => (
                      <a key={`${item.fileUrl}-${index}`} href={item.fileUrl} target="_blank" rel="noopener noreferrer">
                        证据 {index + 1}
                      </a>
                    ))}
                  </div>
                ) : null}
                {linkedCase ? (
                  <div className={`my-reports-case case-${linkedCase.status}`}>
                    <strong>
                      审核工单 #{linkedCase.id} · {CASE_STATUS_LABEL[linkedCase.status] ?? linkedCase.status}
                    </strong>
                    {linkedCase.decisionReason ? (
                      <p>管理员反馈：{linkedCase.decisionReason}</p>
                    ) : null}
                    {linkedCase.closedAt ? (
                      <small>处理时间：{new Date(linkedCase.closedAt).toLocaleString('zh-CN')}</small>
                    ) : null}
                    {linkedCase.status !== 'open' ? (
                      <button
                        type="button"
                        className="my-reports-appeal"
                        onClick={() =>
                          setAppealOpen({
                            caseId: linkedCase.id,
                            targetLabel: `${report.targetType} #${linkedCase.targetId}`,
                          })
                        }
                      >
                        对处理结果有异议
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {appealOpen ? (
        <div className="report-dialog-overlay" role="presentation" onClick={() => setAppealOpen(null)}>
          <div className="report-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="report-dialog-close"
              aria-label="关闭"
              onClick={() => setAppealOpen(null)}
            >
              ×
            </button>
            <h2>提交申诉</h2>
            <p className="report-dialog-target">申诉对象：{appealOpen.targetLabel}</p>
            <p className="my-reports-appeal-note">
              申诉将由管理员复核。复核通过后，内容会恢复公开并解除关联处罚。
            </p>
            <label className="report-dialog-field">
              <span>申诉理由（10-1000 字）</span>
              <textarea
                value={appealReason}
                onChange={(event) => setAppealReason(event.target.value)}
                rows={4}
                maxLength={1000}
                required
              />
              <small>{appealReason.length}/1000</small>
            </label>
            {appealError ? <p className="report-dialog-error">{appealError}</p> : null}
            <div className="report-dialog-actions">
              <button type="button" onClick={() => setAppealOpen(null)} disabled={appealSubmitting}>
                取消
              </button>
              <button
                type="button"
                className="report-dialog-primary"
                onClick={() => void handleSubmitAppeal()}
                disabled={appealSubmitting}
              >
                {appealSubmitting ? '提交中…' : '提交申诉'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}