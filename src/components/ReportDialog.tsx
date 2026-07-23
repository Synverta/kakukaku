import { useCallback, useRef, useState } from 'react'
import {
  REPORT_REASON_OPTIONS,
  submitReport,
  uploadEvidenceFile,
  type ReportEvidenceItem,
  type ReportReasonCode,
  type ReportTargetType,
} from '../lib/reports'

export type ReportDialogProps = {
  targetType: ReportTargetType
  targetId: string
  targetLabel?: string
  open: boolean
  onClose: () => void
  onSubmitted?: (result: { reportId: number; mergedCaseId: number | null }) => void
}

const MAX_EVIDENCE = 4

export function ReportDialog({ targetType, targetId, targetLabel, open, onClose, onSubmitted }: ReportDialogProps) {
  const [reasonCode, setReasonCode] = useState<ReportReasonCode>('pornographic')
  const [reasonText, setReasonText] = useState('')
  const [evidence, setEvidence] = useState<ReportEvidenceItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ reportId: number; mergedCaseId: number | null } | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const reset = useCallback(() => {
    setReasonCode('pornographic')
    setReasonText('')
    setEvidence([])
    setError(null)
    setSuccess(null)
    setSubmitting(false)
  }, [])

  function handleClose() {
    if (submitting) return
    reset()
    onClose()
  }

  async function handleFile(file: File) {
    setError(null)
    try {
      const item = await uploadEvidenceFile(file)
      setEvidence((prev) => (prev.length >= MAX_EVIDENCE ? prev : [...prev, item]))
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message?: unknown }).message ?? '上传失败')
          : '上传失败'
      setError(message)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return
    setError(null)
    if (reasonText.trim().length < 10) {
      setError('请填写至少 10 字的举报说明')
      return
    }
    if (reasonText.length > 1000) {
      setError('举报说明不能超过 1000 字')
      return
    }
    setSubmitting(true)
    try {
      const result = await submitReport({
        targetType,
        targetId,
        reasonCode,
        reasonText: reasonText.trim(),
        evidence,
      })
      setSuccess(result)
      onSubmitted?.(result)
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message?: unknown }).message ?? '提交失败')
          : '提交失败'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="report-dialog-overlay" role="presentation" onClick={handleClose}>
      <div
        className="report-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="report-dialog-close" aria-label="关闭" onClick={handleClose}>
          ×
        </button>
        <h2 id="report-dialog-title">提交举报</h2>
        <p className="report-dialog-target">
          举报对象：{targetLabel ?? `${targetType} #${targetId}`}
        </p>

        {success ? (
          <div className="report-dialog-success">
            <strong>举报已提交</strong>
            <p>编号 #{success.reportId}</p>
            <p className="report-dialog-hint">
              我们将在 24 小时内由审核员处理。处理结果会通过站内通知提醒你。
            </p>
            <button type="button" className="report-dialog-primary" onClick={handleClose}>
              我知道了
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="report-dialog-form">
            <fieldset>
              <legend>举报原因</legend>
              <div className="report-dialog-reasons">
                {REPORT_REASON_OPTIONS.map((option) => (
                  <label key={option.code} className={`report-dialog-reason${reasonCode === option.code ? ' is-active' : ''}`}>
                    <input
                      type="radio"
                      name="reason"
                      value={option.code}
                      checked={reasonCode === option.code}
                      onChange={() => setReasonCode(option.code)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="report-dialog-field">
              <span>详细说明（10-1000 字）</span>
              <textarea
                value={reasonText}
                onChange={(event) => setReasonText(event.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="请描述具体违规内容、位置与时间，便于审核员快速判断。"
                required
              />
              <small>{reasonText.length}/1000</small>
            </label>

            <div className="report-dialog-field">
              <span>证据截图（可选，最多 {MAX_EVIDENCE} 张，单张 ≤ 8MB）</span>
              <div className="report-dialog-evidence">
                {evidence.map((item, index) => (
                  <div className="report-dialog-evidence-item" key={`${item.fileUrl}-${index}`}>
                    <a href={item.fileUrl} target="_blank" rel="noopener noreferrer">
                      {item.fileName || `证据 ${index + 1}`}
                    </a>
                    <button
                      type="button"
                      aria-label="移除证据"
                      onClick={() => setEvidence((prev) => prev.filter((_, i) => i !== index))}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {evidence.length < MAX_EVIDENCE ? (
                  <button
                    type="button"
                    className="report-dialog-upload"
                    onClick={() => fileRef.current?.click()}
                  >
                    + 上传截图
                  </button>
                ) : null}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void handleFile(file)
                    event.target.value = ''
                  }}
                />
              </div>
            </div>

            {error ? <p className="report-dialog-error">{error}</p> : null}

            <div className="report-dialog-actions">
              <button type="button" onClick={handleClose} disabled={submitting}>
                取消
              </button>
              <button type="submit" className="report-dialog-primary" disabled={submitting}>
                {submitting ? '提交中…' : '提交举报'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}