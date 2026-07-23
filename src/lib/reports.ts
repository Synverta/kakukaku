import { api } from './api'

export type ReportTargetType = 'video' | 'comment' | 'danmaku' | 'community'

export type ReportReasonCode =
  | 'pornographic'
  | 'violent'
  | 'political'
  | 'copyright'
  | 'spam'
  | 'minor'
  | 'defamation'
  | 'illegal'
  | 'ai_violation'
  | 'other'

export type ReportReasonOption = { code: ReportReasonCode; label: string }

export type ReportEvidenceItem = {
  fileUrl: string
  fileName?: string
  sizeBytes?: number
  mimeType?: string
}

export type ReportStatus = 'pending' | 'merged' | 'accepted' | 'rejected'
export type CaseStatus = 'open' | 'closed_rejected' | 'closed_takedown' | 'closed_merged'
export type PenaltyLevel = 'warn' | 'mute_comment' | 'mute_post' | 'post_ban' | 'account_suspend'

export type Report = {
  id: number
  reporterId: number | null
  targetType: ReportTargetType
  targetId: string
  reasonCode: ReportReasonCode
  reasonText: string
  status: ReportStatus
  createdAt: string
  handledAt: string | null
  handlerId: number | null
  resolution: string
  mergedCaseId: number | null
  evidence: ReportEvidenceItem[]
}

export type ModerationCase = {
  id: number
  primaryReportId: number
  relatedReportIds: number[]
  targetType: ReportTargetType
  targetId: string
  status: CaseStatus
  assignedTo: number | null
  decisionReason: string
  createdAt: string
  closedAt: string | null
  closedBy: number | null
}

export type Penalty = {
  id: number
  userId: number
  level: PenaltyLevel
  reason: string
  caseId: number | null
  startedAt: string
  expiresAt: string | null
  liftedAt: string | null
  liftedBy: number | null
}

export type Appeal = {
  id: number
  caseId: number
  appellantId: number
  reason: string
  status: 'pending' | 'accepted' | 'rejected'
  decisionText: string
  deciderId: number | null
  createdAt: string
  decidedAt: string | null
  username?: string
}

export type ReportSubmitResult = { reportId: number; mergedCaseId: number | null }

export type AuditEvent = {
  id: number
  actorId: number | null
  actorRole: string
  actorUsername: string | null
  action: string
  targetType: string
  targetId: string
  payload: Record<string, unknown>
  ip: string | null
  userAgent: string
  createdAt: string
}

export type CaseDetail = {
  case: ModerationCase
  reports: Report[]
  reporters: { id: number; username: string }[]
  penalties: Penalty[]
  appeals: Appeal[]
}

export const REPORT_REASON_OPTIONS: ReportReasonOption[] = [
  { code: 'pornographic', label: '色情低俗' },
  { code: 'violent', label: '暴力血腥' },
  { code: 'political', label: '政治敏感' },
  { code: 'copyright', label: '侵权盗版' },
  { code: 'spam', label: '广告骚扰' },
  { code: 'minor', label: '未成年人不当' },
  { code: 'defamation', label: '造谣诽谤' },
  { code: 'illegal', label: '违法违规' },
  { code: 'ai_violation', label: 'AI 生成违规' },
  { code: 'other', label: '其他' },
]

export async function fetchReportReasons(): Promise<ReportReasonOption[]> {
  const result = await api.get<{ reasons: ReportReasonOption[] }>('/reports/reasons')
  return result.reasons ?? []
}

export async function submitReport(input: {
  targetType: ReportTargetType
  targetId: string
  reasonCode: ReportReasonCode
  reasonText: string
  evidence?: ReportEvidenceItem[]
}): Promise<ReportSubmitResult> {
  return api.post<ReportSubmitResult>('/reports', input)
}

export async function fetchMyReports(): Promise<{ reports: Report[]; cases: ModerationCase[] }> {
  return api.get<{ reports: Report[]; cases: ModerationCase[] }>('/reports/mine')
}

export async function submitAppeal(caseId: number, reason: string): Promise<{ appealId: number }> {
  return api.post<{ appealId: number }>(`/reports/${caseId}/appeal`, { reason })
}

export async function uploadEvidenceFile(file: File): Promise<ReportEvidenceItem> {
  const formData = new FormData()
  formData.append('file', file)
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('kakukaku-token') : null
  const response = await fetch('/api/uploads/cover', {
    method: 'POST',
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!response.ok) {
    let body: { error?: string; message?: string } = {}
    try {
      body = await response.json()
    } catch {
      /* 响应不是 JSON，保留默认空对象 */
    }
    throw { status: response.status, error: body.error ?? 'upload_failed', message: body.message }
  }
  const json = (await response.json()) as {
    url: string
    fileName: string
    size: number
    mimeType: string
  }
  return {
    fileUrl: json.url,
    fileName: json.fileName,
    sizeBytes: json.size,
    mimeType: json.mimeType,
  }
}

export async function fetchAdminCases(params: {
  status?: string
  targetType?: string
  page?: number
  pageSize?: number
}): Promise<{ items: ModerationCase[]; total: number; page: number; pageSize: number }> {
  const search = new URLSearchParams()
  if (params.status) search.set('status', params.status)
  if (params.targetType) search.set('targetType', params.targetType)
  if (params.page) search.set('page', String(params.page))
  if (params.pageSize) search.set('pageSize', String(params.pageSize))
  return api.get<{ items: ModerationCase[]; total: number; page: number; pageSize: number }>(
    `/admin/cases?${search.toString()}`,
  )
}

export async function fetchCaseDetail(id: number): Promise<CaseDetail> {
  return api.get<CaseDetail>(`/admin/cases/${id}`)
}

export async function decideCase(
  id: number,
  body: { decision: 'takedown' | 'reject'; reason: string; penalties: { userId: number; level: PenaltyLevel; expiresAt?: string | null }[] },
): Promise<{ ok: true }> {
  return api.post<{ ok: true }>(`/admin/cases/${id}/decision`, body)
}

export async function reopenCase(id: number): Promise<{ ok: true }> {
  return api.post<{ ok: true }>(`/admin/cases/${id}/reopen`)
}

export async function fetchAdminAppeals(status: 'pending' | 'accepted' | 'rejected' = 'pending'): Promise<{ items: Appeal[] }> {
  return api.get<{ items: Appeal[] }>(`/admin/appeals?status=${status}`)
}

export async function decideAppeal(id: number, body: { decision: 'accept' | 'reject'; reason: string }): Promise<{ ok: true }> {
  return api.post<{ ok: true }>(`/admin/appeals/${id}/decide`, body)
}

export async function fetchAuditLog(params: {
  page?: number
  pageSize?: number
  action?: string
  actorId?: number
} = {}): Promise<{ items: AuditEvent[]; page: number; pageSize: number }> {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.pageSize) search.set('pageSize', String(params.pageSize))
  if (params.action) search.set('action', params.action)
  if (params.actorId) search.set('actorId', String(params.actorId))
  return api.get<{ items: AuditEvent[]; page: number; pageSize: number }>(`/admin/audit?${search.toString()}`)
}