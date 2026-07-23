import { Router, type Request } from 'express'
import { query, pool } from '../db'
import { requireAuth, requireRole } from '../lib/auth'
import { logAudit } from '../lib/audit'
import {
  TAKEDOWN_TARGETS,
  takedownContent,
  liftTakedown,
  getContentOwnerId,
  type TakedownTargetType,
} from '../lib/takedown'

export const reportsRouter = Router()

const REPORT_REASONS = [
  'pornographic',
  'violent',
  'political',
  'copyright',
  'spam',
  'minor',
  'defamation',
  'illegal',
  'ai_violation',
  'other',
] as const

type ReportReason = (typeof REPORT_REASONS)[number]

const PENALTY_LEVELS = ['warn', 'mute_comment', 'mute_post', 'post_ban', 'account_suspend'] as const
type PenaltyLevel = (typeof PENALTY_LEVELS)[number]

type ReportRow = {
  id: string
  reporter_id: string | null
  target_type: string
  target_id: string
  reason_code: string
  reason_text: string
  status: string
  created_at: Date
  handled_at: Date | null
  handler_id: string | null
  resolution: string
  merged_case_id: string | null
}

type CaseRow = {
  id: string
  primary_report_id: string
  related_report_ids: string[]
  target_type: string
  target_id: string
  status: string
  assigned_to: string | null
  decision_reason: string
  created_at: Date
  closed_at: Date | null
  closed_by: string | null
}

type EvidenceRow = {
  id: string
  report_id: string
  file_url: string
  file_name: string
  size_bytes: string
  mime_type: string
  created_at: Date
}

type PenaltyRow = {
  id: string
  user_id: string
  level: string
  reason: string
  case_id: string | null
  started_at: Date
  expires_at: Date | null
  lifted_at: Date | null
  lifted_by: string | null
}

type AppealRow = {
  id: string
  case_id: string
  appellant_id: string
  reason: string
  status: string
  decision_text: string
  decider_id: string | null
  created_at: Date
  decided_at: Date | null
}

function rowToReport(row: ReportRow) {
  return {
    id: Number(row.id),
    reporterId: row.reporter_id ? Number(row.reporter_id) : null,
    targetType: row.target_type,
    targetId: row.target_id,
    reasonCode: row.reason_code,
    reasonText: row.reason_text,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    handledAt: row.handled_at?.toISOString() ?? null,
    handlerId: row.handler_id ? Number(row.handler_id) : null,
    resolution: row.resolution,
    mergedCaseId: row.merged_case_id ? Number(row.merged_case_id) : null,
  }
}

function rowToCase(row: CaseRow) {
  return {
    id: Number(row.id),
    primaryReportId: Number(row.primary_report_id),
    relatedReportIds: (row.related_report_ids ?? []).map((id) => Number(id)),
    targetType: row.target_type,
    targetId: row.target_id,
    status: row.status,
    assignedTo: row.assigned_to ? Number(row.assigned_to) : null,
    decisionReason: row.decision_reason,
    createdAt: row.created_at.toISOString(),
    closedAt: row.closed_at?.toISOString() ?? null,
    closedBy: row.closed_by ? Number(row.closed_by) : null,
  }
}

function rowToEvidence(row: EvidenceRow) {
  return {
    id: Number(row.id),
    reportId: Number(row.report_id),
    fileUrl: row.file_url,
    fileName: row.file_name,
    sizeBytes: Number(row.size_bytes ?? 0),
    mimeType: row.mime_type,
    createdAt: row.created_at.toISOString(),
  }
}

function rowToPenalty(row: PenaltyRow) {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    level: row.level,
    reason: row.reason,
    caseId: row.case_id ? Number(row.case_id) : null,
    startedAt: row.started_at.toISOString(),
    expiresAt: row.expires_at?.toISOString() ?? null,
    liftedAt: row.lifted_at?.toISOString() ?? null,
    liftedBy: row.lifted_by ? Number(row.lifted_by) : null,
  }
}

function rowToAppeal(row: AppealRow) {
  return {
    id: Number(row.id),
    caseId: Number(row.case_id),
    appellantId: Number(row.appellant_id),
    reason: row.reason,
    status: row.status,
    decisionText: row.decision_text,
    deciderId: row.decider_id ? Number(row.decider_id) : null,
    createdAt: row.created_at.toISOString(),
    decidedAt: row.decided_at?.toISOString() ?? null,
  }
}

async function findOpenCase(targetType: string, targetId: string): Promise<CaseRow | null> {
  const rows = await query<CaseRow>(
    `select id, primary_report_id, related_report_ids, target_type, target_id, status,
            assigned_to, decision_reason, created_at, closed_at, closed_by
       from moderation_cases
      where target_type = $1 and target_id = $2 and status = 'open'
      order by created_at desc
      limit 1`,
    [targetType, targetId],
  )
  return rows.rowCount === 0 ? null : rows.rows[0]
}

async function loadReportsWithExtras(rows: ReportRow[]) {
  if (rows.length === 0) return []
  const ids = rows.map((r) => Number(r.id))
  const evidence = await query<EvidenceRow>(
    `select id, report_id, file_url, file_name, size_bytes, mime_type, created_at
       from report_evidence where report_id = any($1::bigint[])`,
    [ids],
  )
  const evidenceByReport = new Map<number, EvidenceRow[]>()
  for (const ev of evidence.rows) {
    const rid = Number(ev.report_id)
    const list = evidenceByReport.get(rid) ?? []
    list.push(ev)
    evidenceByReport.set(rid, list)
  }
  return rows.map((row) => ({
    ...rowToReport(row),
    evidence: (evidenceByReport.get(Number(row.id)) ?? []).map(rowToEvidence),
  }))
}

async function notify(params: {
  userId: number
  type: string
  title: string
  body: string
  payload?: Record<string, unknown>
}) {
  await query(
    `insert into notifications (user_id, type, title, body, payload)
     values ($1, $2, $3, $4, $5::jsonb)`,
    [params.userId, params.type, params.title.slice(0, 160), params.body, JSON.stringify(params.payload ?? {})],
  )
}

// =========================================================
// 公共：提交举报 + 我的举报
// =========================================================

reportsRouter.get('/reports/reasons', (_req, res) => {
  res.json({
    reasons: [
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
    ],
  })
})

reportsRouter.post('/reports', requireAuth, async (req, res) => {
  const { targetType, targetId, reasonCode, reasonText, evidence } = req.body ?? {}

  if (typeof targetType !== 'string' || !TAKEDOWN_TARGETS.includes(targetType as TakedownTargetType)) {
    return res.status(400).json({ error: 'invalid_target_type' })
  }
  if (typeof targetId !== 'string' || targetId.length === 0 || targetId.length > 200) {
    return res.status(400).json({ error: 'invalid_target_id' })
  }
  if (typeof reasonCode !== 'string' || !REPORT_REASONS.includes(reasonCode as ReportReason)) {
    return res.status(400).json({ error: 'invalid_reason_code' })
  }
  if (typeof reasonText !== 'string' || reasonText.trim().length < 10 || reasonText.length > 1000) {
    return res.status(400).json({ error: 'invalid_reason_text', message: '请填写 10-1000 字的举报说明' })
  }
  const evidenceArr = Array.isArray(evidence) ? evidence : []
  if (evidenceArr.length > 6) {
    return res.status(400).json({ error: 'too_much_evidence', message: '证据最多 6 张' })
  }

  const reporterId = req.user!.sub
  const client = await pool.connect()
  let reportId: number
  let mergedCaseId: number | null = null

  try {
    await client.query('begin')
    const openCase = await findOpenCase(targetType, targetId)
    const initialStatus = openCase ? 'merged' : 'pending'

    const inserted = await client.query<{ id: string }>(
      `insert into reports (reporter_id, target_type, target_id, reason_code, reason_text, status)
       values ($1, $2, $3, $4, $5, $6) returning id`,
      [reporterId, targetType, targetId, reasonCode, reasonText.trim(), initialStatus],
    )
    reportId = Number(inserted.rows[0].id)

    for (const ev of evidenceArr) {
      if (!ev || typeof ev !== 'object') continue
      const fileUrl = typeof (ev as { fileUrl?: unknown }).fileUrl === 'string'
        ? (ev as { fileUrl: string }).fileUrl
        : null
      if (!fileUrl) continue
      const fileName = typeof (ev as { fileName?: unknown }).fileName === 'string'
        ? (ev as { fileName: string }).fileName
        : ''
      const sizeBytes = Number((ev as { sizeBytes?: unknown }).sizeBytes ?? 0) || 0
      const mimeType = typeof (ev as { mimeType?: unknown }).mimeType === 'string'
        ? (ev as { mimeType: string }).mimeType
        : ''
      await client.query(
        `insert into report_evidence (report_id, file_url, file_name, size_bytes, mime_type)
         values ($1, $2, $3, $4, $5)`,
        [reportId, fileUrl.slice(0, 500), fileName.slice(0, 200), sizeBytes, mimeType.slice(0, 100)],
      )
    }

    if (openCase) {
      mergedCaseId = Number(openCase.id)
      const related = Array.from(new Set([...(openCase.related_report_ids ?? []).map(Number), reportId]))
      await client.query(
        `update moderation_cases set related_report_ids = $1::bigint[] where id = $2`,
        [related, openCase.id],
      )
      await client.query(
        `update reports set merged_case_id = $1 where id = $2`,
        [openCase.id, reportId],
      )
    } else {
      const created = await client.query<{ id: string }>(
        `insert into moderation_cases (primary_report_id, related_report_ids, target_type, target_id, status)
         values ($1, $2::bigint[], $3, $4, 'open') returning id`,
        [reportId, [reportId], targetType, targetId],
      )
      mergedCaseId = Number(created.rows[0].id)
    }

    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    console.error('submit report failed:', error)
    return res.status(500).json({ error: 'submit_failed' })
  } finally {
    client.release()
  }

  await logAudit({
    actorId: reporterId,
    actorRole: req.user!.role ?? 'user',
    action: 'report_submit',
    targetType,
    targetId,
    payload: { reportId, reasonCode, mergedCaseId },
    req,
  })

  res.status(201).json({ reportId, mergedCaseId })
})

reportsRouter.get('/reports/mine', requireAuth, async (req, res) => {
  const userId = req.user!.sub
  const rows = await query<ReportRow>(
    `select id, reporter_id, target_type, target_id, reason_code, reason_text, status,
            created_at, handled_at, handler_id, resolution, merged_case_id
       from reports
      where reporter_id = $1
      order by created_at desc
      limit 100`,
    [userId],
  )
  const items = await loadReportsWithExtras(rows.rows)

  const caseIds = Array.from(
    new Set(
      rows.rows
        .map((r) => (r.merged_case_id ? Number(r.merged_case_id) : null))
        .filter((id): id is number => id !== null),
    ),
  )
  let cases: ReturnType<typeof rowToCase>[] = []
  if (caseIds.length > 0) {
    const caseRows = await query<CaseRow>(
      `select id, primary_report_id, related_report_ids, target_type, target_id, status,
              assigned_to, decision_reason, created_at, closed_at, closed_by
         from moderation_cases
        where id = any($1::bigint[])`,
      [caseIds],
    )
    cases = caseRows.rows.map(rowToCase)
  }

  res.json({ reports: items, cases })
})

reportsRouter.post('/reports/:id/appeal', requireAuth, async (req, res) => {
  const caseIdRaw = req.params.id
  const caseId = Number(caseIdRaw)
  if (!Number.isFinite(caseId)) {
    return res.status(400).json({ error: 'invalid_case_id' })
  }
  const { reason } = req.body ?? {}
  if (typeof reason !== 'string' || reason.trim().length < 10 || reason.length > 1000) {
    return res.status(400).json({ error: 'invalid_reason', message: '请填写 10-1000 字的申诉理由' })
  }

  const userId = req.user!.sub
  const rows = await query<CaseRow>(
    `select id, primary_report_id, related_report_ids, target_type, target_id, status,
            assigned_to, decision_reason, created_at, closed_at, closed_by
       from moderation_cases where id = $1 limit 1`,
    [caseId],
  )
  if (rows.rowCount === 0) {
    return res.status(404).json({ error: 'case_not_found' })
  }
  const caseRow = rows.rows[0]
  const ownerId = await getContentOwnerId(caseRow.target_type as TakedownTargetType, caseRow.target_id)
  if (ownerId !== userId) {
    return res.status(403).json({ error: 'not_owner' })
  }
  if (caseRow.status === 'open') {
    return res.status(400).json({ error: 'case_not_closed' })
  }

  const existing = await query<{ id: string }>(
    `select id from appeals where case_id = $1 and appellant_id = $2 and status = 'pending' limit 1`,
    [caseId, userId],
  )
  if (existing.rowCount && existing.rowCount > 0) {
    return res.status(409).json({ error: 'appeal_pending' })
  }

  const inserted = await query<{ id: string }>(
    `insert into appeals (case_id, appellant_id, reason) values ($1, $2, $3) returning id`,
    [caseId, userId, reason.trim()],
  )

  await logAudit({
    actorId: userId,
    actorRole: req.user!.role ?? 'user',
    action: 'appeal_submit',
    targetType: 'case',
    targetId: caseId,
    payload: { appealId: Number(inserted.rows[0].id) },
    req,
  })

  res.status(201).json({ appealId: Number(inserted.rows[0].id) })
})

// =========================================================
// 通知
// =========================================================

reportsRouter.get('/notifications', requireAuth, async (req, res) => {
  const rows = await query<{
    id: string
    type: string
    title: string
    body: string
    payload: Record<string, unknown>
    read_at: Date | null
    created_at: Date
  }>(
    `select id, type, title, body, payload, read_at, created_at
       from notifications
      where user_id = $1
      order by created_at desc
      limit 100`,
    [req.user!.sub],
  )
  const items = rows.rows.map((row) => ({
    id: Number(row.id),
    type: row.type,
    title: row.title,
    body: row.body,
    payload: row.payload ?? {},
    readAt: row.read_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  }))
  const unread = items.filter((n) => n.readAt === null).length
  res.json({ items, unread })
})

reportsRouter.post('/notifications/:id/read', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'invalid_id' })
  }
  await query(
    `update notifications set read_at = coalesce(read_at, now()) where id = $1 and user_id = $2`,
    [id, req.user!.sub],
  )
  res.json({ ok: true })
})

reportsRouter.post('/notifications/read-all', requireAuth, async (req, res) => {
  await query(
    `update notifications set read_at = now() where user_id = $1 and read_at is null`,
    [req.user!.sub],
  )
  res.json({ ok: true })
})

// =========================================================
// 管理员：审核后台
// =========================================================

reportsRouter.get('/admin/cases', requireAuth, requireRole('admin'), async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : null
  const targetType = typeof req.query.targetType === 'string' ? req.query.targetType : null
  const page = Math.max(1, Number(req.query.page ?? 1))
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 20)))
  const offset = (page - 1) * pageSize

  const params: unknown[] = []
  let where = 'where 1=1'
  if (status && status !== 'all') {
    params.push(status)
    where += ` and c.status = $${params.length}`
  }
  if (targetType && targetType !== 'all') {
    params.push(targetType)
    where += ` and c.target_type = $${params.length}`
  }

  params.push(pageSize, offset)
  const rows = await query<CaseRow>(
    `select c.id, c.primary_report_id, c.related_report_ids, c.target_type, c.target_id, c.status,
            c.assigned_to, c.decision_reason, c.created_at, c.closed_at, c.closed_by
       from moderation_cases c
       ${where}
       order by c.created_at desc
       limit $${params.length - 1} offset $${params.length}`,
    params,
  )
  const countRows = await query<{ count: string }>(
    `select count(*)::text as count from moderation_cases c ${where}`,
    params.slice(0, params.length - 2),
  )
  res.json({
    items: rows.rows.map(rowToCase),
    page,
    pageSize,
    total: Number(countRows.rows[0]?.count ?? 0),
  })
})

reportsRouter.get('/admin/cases/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid_id' })

  const rows = await query<CaseRow & { reporter_username: string | null }>(
    `select c.id, c.primary_report_id, c.related_report_ids, c.target_type, c.target_id, c.status,
            c.assigned_to, c.decision_reason, c.created_at, c.closed_at, c.closed_by,
            u.username as reporter_username
       from moderation_cases c
       left join reports r on r.id = c.primary_report_id
       left join users u on u.id = r.reporter_id
      where c.id = $1 limit 1`,
    [id],
  )
  if (rows.rowCount === 0) return res.status(404).json({ error: 'not_found' })
  const caseRow = rows.rows[0]
  const reportIds = Array.from(new Set([Number(caseRow.primary_report_id), ...(caseRow.related_report_ids ?? []).map(Number)]))

  const reportsData = await query<ReportRow>(
    `select id, reporter_id, target_type, target_id, reason_code, reason_text, status,
            created_at, handled_at, handler_id, resolution, merged_case_id
       from reports where id = any($1::bigint[]) order by created_at asc`,
    [reportIds],
  )
  const reports = await loadReportsWithExtras(reportsData.rows)

  const reporterIds = Array.from(
    new Set(reportsData.rows.map((r) => r.reporter_id).filter((v): v is string => Boolean(v)).map(Number)),
  )
  let reporters: { id: number; username: string }[] = []
  if (reporterIds.length > 0) {
    const u = await query<{ id: string; username: string }>(
      `select id, username from users where id = any($1::bigint[])`,
      [reporterIds],
    )
    reporters = u.rows.map((row) => ({ id: Number(row.id), username: row.username }))
  }

  const penaltiesData = await query<PenaltyRow>(
    `select id, user_id, level, reason, case_id, started_at, expires_at, lifted_at, lifted_by
       from user_penalties where case_id = $1 order by started_at asc`,
    [id],
  )

  const appealsData = await query<AppealRow>(
    `select id, case_id, appellant_id, reason, status, decision_text, decider_id, created_at, decided_at
       from appeals where case_id = $1 order by created_at asc`,
    [id],
  )

  res.json({
    case: rowToCase(caseRow),
    reports,
    reporters,
    penalties: penaltiesData.rows.map(rowToPenalty),
    appeals: appealsData.rows.map(rowToAppeal),
  })
})

reportsRouter.post('/admin/cases/:id/decision', requireAuth, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid_id' })
  const { decision, reason, penalties } = req.body ?? {}
  if (decision !== 'takedown' && decision !== 'reject') {
    return res.status(400).json({ error: 'invalid_decision' })
  }
  if (typeof reason !== 'string' || reason.trim().length === 0 || reason.length > 1000) {
    return res.status(400).json({ error: 'invalid_reason' })
  }
  const penaltyArr = Array.isArray(penalties) ? penalties : []
  if (penaltyArr.length > 5) {
    return res.status(400).json({ error: 'too_much_penalties' })
  }

  const adminId = req.user!.sub
  const rows = await query<CaseRow>(
    `select id, primary_report_id, related_report_ids, target_type, target_id, status,
            assigned_to, decision_reason, created_at, closed_at, closed_by
       from moderation_cases where id = $1 limit 1`,
    [id],
  )
  if (rows.rowCount === 0) return res.status(404).json({ error: 'not_found' })
  const caseRow = rows.rows[0]
  if (caseRow.status !== 'open') {
    return res.status(400).json({ error: 'case_closed' })
  }

  const reportIds = Array.from(new Set([Number(caseRow.primary_report_id), ...(caseRow.related_report_ids ?? []).map(Number)]))
  const targetType = caseRow.target_type as TakedownTargetType
  const targetIdNum = Number(caseRow.target_id)
  const contentOwnerId = await getContentOwnerId(targetType, targetIdNum)

  const client = await pool.connect()
  let appliedPenalties: ReturnType<typeof rowToPenalty>[] = []
  try {
    await client.query('begin')

    if (decision === 'takedown') {
      await takedownContent({
        targetType,
        targetId: targetIdNum,
        reason: reason.trim(),
        adminId,
      })
    }

    for (const p of penaltyArr) {
      if (!p || typeof p !== 'object') continue
      const userId = Number((p as { userId?: unknown }).userId)
      const level = (p as { level?: unknown }).level
      if (!Number.isFinite(userId)) continue
      if (typeof level !== 'string' || !PENALTY_LEVELS.includes(level as PenaltyLevel)) continue
      const expiresRaw = (p as { expiresAt?: unknown }).expiresAt
      const expiresAt = typeof expiresRaw === 'string' ? expiresRaw : null
      const inserted = await client.query<PenaltyRow>(
        `insert into user_penalties (user_id, level, reason, case_id, started_at, expires_at)
         values ($1, $2, $3, $4, now(), $5)
         returning id, user_id, level, reason, case_id, started_at, expires_at, lifted_at, lifted_by`,
        [userId, level, reason.trim().slice(0, 500), id, expiresAt],
      )
      appliedPenalties.push(rowToPenalty(inserted.rows[0]))
    }

    const finalStatus = decision === 'takedown' ? 'closed_takedown' : 'closed_rejected'
    await client.query(
      `update moderation_cases
          set status = $1, decision_reason = $2, closed_at = now(), closed_by = $3, assigned_to = coalesce(assigned_to, $3)
        where id = $4`,
      [finalStatus, reason.trim().slice(0, 1000), adminId, id],
    )

    await client.query(
      `update reports
          set status = $1, handled_at = now(), handler_id = $2, resolution = $3
        where id = any($4::bigint[])`,
      [decision === 'takedown' ? 'accepted' : 'rejected', adminId, reason.trim().slice(0, 1000), reportIds],
    )

    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    console.error('case decision failed:', error)
    return res.status(500).json({ error: 'decision_failed' })
  } finally {
    client.release()
  }

  // 通知 + 审计
  for (const reportId of reportIds) {
    const reporter = await query<{ reporter_id: string | null }>(
      `select reporter_id from reports where id = $1 limit 1`,
      [reportId],
    )
    if (reporter.rowCount && reporter.rows[0].reporter_id) {
      await notify({
        userId: Number(reporter.rows[0].reporter_id),
        type: 'report_handled',
        title: decision === 'takedown' ? '举报已处理：内容已下架' : '举报已审核',
        body: reason.trim().slice(0, 200),
        payload: { reportId, caseId: id, decision },
      })
    }
  }

  for (const pen of appliedPenalties) {
    await notify({
      userId: pen.userId,
      type: 'penalty_applied',
      title: '你收到了平台处罚',
      body: pen.reason || '管理员已对你做出处罚决定',
      payload: { penaltyId: pen.id, level: pen.level, caseId: id },
    })
  }

  if (decision === 'takedown' && contentOwnerId) {
    await notify({
      userId: contentOwnerId,
      type: 'case_decision',
      title: '你的内容已被下架',
      body: reason.trim().slice(0, 200),
      payload: { caseId: id, targetType, targetId: caseRow.target_id },
    })
  }

  await logAudit({
    actorId: adminId,
    actorRole: 'admin',
    action: 'case_decision',
    targetType: 'case',
    targetId: id,
    payload: { decision, reason: reason.trim(), penaltyCount: appliedPenalties.length },
    req,
  })

  res.json({ ok: true, decision, penalties: appliedPenalties })
})

reportsRouter.post('/admin/cases/:id/reopen', requireAuth, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid_id' })
  const rows = await query<CaseRow>(
    `select id, primary_report_id, related_report_ids, target_type, target_id, status,
            assigned_to, decision_reason, created_at, closed_at, closed_by
       from moderation_cases where id = $1 limit 1`,
    [id],
  )
  if (rows.rowCount === 0) return res.status(404).json({ error: 'not_found' })
  const caseRow = rows.rows[0]
  if (caseRow.status === 'open') return res.json({ ok: true })

  await query(
    `update moderation_cases
        set status = 'open', closed_at = null, closed_by = null, decision_reason = ''
      where id = $1`,
    [id],
  )

  await logAudit({
    actorId: req.user!.sub,
    actorRole: 'admin',
    action: 'case_reopen',
    targetType: 'case',
    targetId: id,
    req,
  })

  res.json({ ok: true })
})

reportsRouter.get('/admin/appeals', requireAuth, requireRole('admin'), async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : 'pending'
  const rows = await query<AppealRow & { username: string }>(
    `select a.id, a.case_id, a.appellant_id, a.reason, a.status, a.decision_text, a.decider_id,
            a.created_at, a.decided_at, u.username
       from appeals a
       left join users u on u.id = a.appellant_id
      where a.status = $1
      order by a.created_at asc
      limit 100`,
    [status],
  )
  res.json({
    items: rows.rows.map((row) => ({
      ...rowToAppeal(row),
      username: row.username,
    })),
  })
})

reportsRouter.post('/admin/appeals/:id/decide', requireAuth, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid_id' })
  const { decision, reason } = req.body ?? {}
  if (decision !== 'accept' && decision !== 'reject') {
    return res.status(400).json({ error: 'invalid_decision' })
  }
  if (typeof reason !== 'string' || reason.trim().length === 0 || reason.length > 1000) {
    return res.status(400).json({ error: 'invalid_reason' })
  }

  const adminId = req.user!.sub
  const rows = await query<AppealRow>(
    `select id, case_id, appellant_id, reason, status, decision_text, decider_id, created_at, decided_at
       from appeals where id = $1 limit 1`,
    [id],
  )
  if (rows.rowCount === 0) return res.status(404).json({ error: 'not_found' })
  const appealRow = rows.rows[0]
  if (appealRow.status !== 'pending') {
    return res.status(400).json({ error: 'appeal_closed' })
  }

  const caseRows = await query<CaseRow>(
    `select id, primary_report_id, related_report_ids, target_type, target_id, status,
            assigned_to, decision_reason, created_at, closed_at, closed_by
       from moderation_cases where id = $1 limit 1`,
    [appealRow.case_id],
  )
  if (caseRows.rowCount === 0) return res.status(404).json({ error: 'case_not_found' })
  const caseRow = caseRows.rows[0]

  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query(
      `update appeals set status = $1, decision_text = $2, decider_id = $3, decided_at = now() where id = $4`,
      [decision === 'accept' ? 'accepted' : 'rejected', reason.trim().slice(0, 1000), adminId, id],
    )

    if (decision === 'accept') {
      await liftTakedown({
        targetType: caseRow.target_type as TakedownTargetType,
        targetId: Number(caseRow.target_id),
      })
      await client.query(
        `update user_penalties set lifted_at = now(), lifted_by = $1
          where case_id = $2 and lifted_at is null`,
        [adminId, caseRow.id],
      )
    }
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    console.error('appeal decide failed:', error)
    return res.status(500).json({ error: 'decide_failed' })
  } finally {
    client.release()
  }

  await notify({
    userId: Number(appealRow.appellant_id),
    type: 'appeal_decided',
    title: decision === 'accept' ? '你的申诉已通过' : '你的申诉被驳回',
    body: reason.trim().slice(0, 200),
    payload: { appealId: id, caseId: caseRow.id, decision },
  })

  await logAudit({
    actorId: adminId,
    actorRole: 'admin',
    action: 'appeal_decision',
    targetType: 'appeal',
    targetId: id,
    payload: { decision, caseId: caseRow.id },
    req,
  })

  res.json({ ok: true })
})

reportsRouter.get('/admin/audit', requireAuth, requireRole('admin'), async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1))
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 50)))
  const offset = (page - 1) * pageSize
  const action = typeof req.query.action === 'string' ? req.query.action : null
  const actorId = typeof req.query.actorId === 'string' && req.query.actorId ? Number(req.query.actorId) : null

  const params: unknown[] = []
  let where = 'where 1=1'
  if (action) {
    params.push(action)
    where += ` and a.action = $${params.length}`
  }
  if (actorId) {
    params.push(actorId)
    where += ` and a.actor_id = $${params.length}`
  }
  params.push(pageSize, offset)

  const rows = await query<{
    id: string
    actor_id: string | null
    actor_role: string
    action: string
    target_type: string
    target_id: string
    payload: Record<string, unknown>
    ip: string | null
    user_agent: string
    created_at: Date
    username: string | null
  }>(
    `select a.id, a.actor_id, a.actor_role, a.action, a.target_type, a.target_id, a.payload,
            host(a.ip) as ip, a.user_agent, a.created_at, u.username
       from audit_events a
       left join users u on u.id = a.actor_id
       ${where}
       order by a.created_at desc
       limit $${params.length - 1} offset $${params.length}`,
    params,
  )
  const items = rows.rows.map((row) => ({
    id: Number(row.id),
    actorId: row.actor_id ? Number(row.actor_id) : null,
    actorRole: row.actor_role,
    actorUsername: row.username,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    payload: row.payload ?? {},
    ip: row.ip,
    userAgent: row.user_agent,
    createdAt: row.created_at.toISOString(),
  }))
  res.json({ items, page, pageSize })
})