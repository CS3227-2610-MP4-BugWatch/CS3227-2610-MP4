import type { SupabaseClient } from '@supabase/supabase-js'
import { ReportError } from './types.js'
import type { DraftSummary, ReportComment, ReportDraft, ProjectReportSummary, Report, ReportFieldErrors, ReportHistoryEntry, ReportInput, ReportRepository, ReportResolution, ReportSeverity, ResolutionFieldErrors, ResolutionInput } from './types.js'
import { REPORT_SEVERITIES, REPORT_TEXT_FIELDS, REPORT_UUID, validateCommentInput, validateDraftInput, validateReportInput, validateResolutionInput } from './validation.js'

const PROJECT_REPORT_PAGE_SIZE = 100
const DRAFT_PAGE_SIZE = 100
const COMMENT_PAGE_SIZE = 100

const reportFields = {
  project_id: 'projectId',
  title: 'title',
  description: 'description',
  version: 'version',
  reproduction_steps: 'reproductionSteps',
  expected_results: 'expectedResults',
  actual_results: 'actualResults',
  severity: 'severity',
  test_environment: 'testEnvironment',
} as const satisfies Record<string, keyof ReportInput>

const resolutionFields = {
  kind: 'kind', fix_summary: 'fixSummary', affected_version: 'affectedVersion', commit_url: 'commitUrl',
  pull_request_url: 'pullRequestUrl', explanation: 'explanation', canonical_report_id: 'canonicalReportId',
} as const

function fail(error: unknown, status?: number, comment = false): never {
  if (error instanceof ReportError) throw error
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined
  if (status === 401 || ['P2001', 'PGRST301', 'PGRST303'].includes(String(code))) {
    throw new ReportError('unauthenticated', 'Your session has ended. Please log in again.')
  }
  switch (code) {
    case 'P2002':
    case '42501': throw new ReportError('forbidden', 'You do not have permission to perform this report action.')
    case 'P2003': {
      if (comment) throw new ReportError('validation', 'Check your comment and reply reference.')
      const fieldErrors: ReportFieldErrors & ResolutionFieldErrors = {}
      const detail = error && typeof error === 'object' && 'details' in error ? error.details : undefined
      if (typeof detail === 'string' && Object.hasOwn(reportFields, detail)) {
        fieldErrors[reportFields[detail as keyof typeof reportFields]] = 'Check this field.'
      } else if (typeof detail === 'string' && Object.hasOwn(resolutionFields, detail)) {
        fieldErrors[resolutionFields[detail as keyof typeof resolutionFields]] = 'Check this field.'
      }
      throw new ReportError('validation', 'Check the report fields.', fieldErrors)
    }
    case 'P2004': throw new ReportError('archived', comment ? 'This project is archived. Comments are read-only.' : 'That project is archived. Choose another active project.')
    case 'P2005': throw new ReportError('not_found', 'The report or project could not be found.')
    case 'P2006': throw new ReportError('already_assigned', 'This report is already assigned to a Developer.')
    case 'P2007': throw new ReportError('state_conflict', 'The report state has changed. Reload the current report before continuing.')
    default: throw new ReportError('unavailable', 'Report storage is unavailable. Please try again.')
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(null)
  return value as Record<string, unknown>
}

function text(value: unknown): string {
  if (typeof value !== 'string') fail(null)
  return value
}

function uuid(value: unknown): string {
  const id = text(value)
  if (!REPORT_UUID.test(id)) fail(null)
  return id
}

function timestamp(value: unknown): string {
  const date = text(value)
  if (!Number.isFinite(Date.parse(date))) fail(null)
  return date
}

function nullableText(value: unknown): string | null {
  return value === null ? null : text(value)
}

function assignment(row: Record<string, unknown>): Pick<Report, 'state' | 'assignedDeveloperId' | 'assignedDeveloperUsername' | 'assignedDeveloperDisplayName'> {
  const state = row.state
  if (state !== 'Open' && state !== 'Accepted' && state !== 'In progress' && state !== 'Awaiting tester information' && state !== 'Resolved' && state !== 'Closed') fail(null)
  const assignedDeveloperId = row.assigned_developer_id === null ? null : uuid(row.assigned_developer_id)
  const assignedDeveloperUsername = nullableText(row.assigned_developer_username)
  const assignedDeveloperDisplayName = nullableText(row.assigned_developer_display_name)
  if ((state === 'Open') !== (assignedDeveloperId === null)
    || (assignedDeveloperId === null && (assignedDeveloperUsername !== null || assignedDeveloperDisplayName !== null))) fail(null)
  return { state, assignedDeveloperId, assignedDeveloperUsername, assignedDeveloperDisplayName }
}

function resolutionRow(value: unknown): ReportResolution {
  const row = record(value)
  const input: Record<string, unknown> = {}
  const metadata = ['author_id', 'author_username', 'author_display_name', 'resolved_at']
  for (const key of Object.keys(row)) {
    if (Object.hasOwn(resolutionFields, key)) input[resolutionFields[key as keyof typeof resolutionFields]] = row[key]
    else if (!metadata.includes(key)) fail(null)
  }
  const validated = validateResolutionInput(input as ResolutionInput)
  if (!validated.valid) fail(null)
  for (const [key, raw] of Object.entries(input)) {
    if ((validated.value as unknown as Record<string, unknown>)[key] !== raw) fail(null)
  }
  return { ...validated.value, authorId: uuid(row.author_id), authorUsername: nullableText(row.author_username),
    authorDisplayName: nullableText(row.author_display_name), resolvedAt: timestamp(row.resolved_at) }
}

function reportRow(value: unknown): Report {
  const row = record(value)
  const input = Object.fromEntries(Object.entries(reportFields).map(([db, field]) => [field, text(row[db])]))
  const result = validateReportInput(input as unknown as ReportInput)
  if (!result.valid) fail(null)
  const ownership = assignment(row)
  const assignedAt = row.assigned_at === null ? null : timestamp(row.assigned_at)
  if ((ownership.assignedDeveloperId === null) !== (assignedAt === null)) fail(null)
  const resolution = row.resolution === undefined || row.resolution === null ? null : resolutionRow(row.resolution)
  if ((ownership.state === 'Resolved' || ownership.state === 'Closed') !== (resolution !== null)
    || (resolution && resolution.authorId.toLowerCase() !== ownership.assignedDeveloperId?.toLowerCase())) fail(null)
  if (resolution && row.canonical_report === undefined) fail(null)
  let canonicalReport: Report['canonicalReport'] = null
  if (row.canonical_report !== undefined && row.canonical_report !== null) {
    const canonical = record(row.canonical_report)
    const title = text(canonical.title)
    if (!title || title !== title.trim() || Array.from(title).length > REPORT_TEXT_FIELDS.title.limit || Object.keys(canonical).length !== 2) fail(null)
    canonicalReport = { id: uuid(canonical.id), title }
    if (canonicalReport.id.toLowerCase() === uuid(row.id).toLowerCase()) fail(null)
  }
  if (resolution?.kind === 'duplicate' && resolution.canonicalReportId.toLowerCase() === uuid(row.id).toLowerCase()) fail(null)
  if (resolution?.kind === 'duplicate' && !canonicalReport) fail(null)
  for (const field of Object.values(reportFields)) {
    if (result.value[field] !== input[field]) fail(null)
  }
  return {
    ...result.value,
    id: uuid(row.id),
    reporterId: uuid(row.reporter_id),
    ...ownership,
    assignedAt,
    resolution,
    canonicalReport,
    createdAt: timestamp(row.created_at),
    updatedAt: timestamp(row.updated_at),
    projectName: text(row.project_name),
    projectArchivedAt: row.project_archived_at === null ? null : timestamp(row.project_archived_at),
    reporterUsername: text(row.reporter_username),
    reporterDisplayName: text(row.reporter_display_name),
  }
}

function draftSummaryRow(value: unknown): DraftSummary {
  const row = record(value)
  const title = text(row.title)
  if (title !== title.trim() || Array.from(title).length > REPORT_TEXT_FIELDS.title.limit) fail(null)
  return { id: uuid(row.id), projectId: uuid(row.project_id), projectName: text(row.project_name),
    projectArchivedAt: row.project_archived_at === null ? null : timestamp(row.project_archived_at),
    title, updatedAt: timestamp(row.updated_at) }
}

function draftRow(value: unknown): ReportDraft {
  const row = record(value)
  const input = Object.fromEntries(Object.entries(reportFields).map(([db, field]) => [field, text(row[db])]))
  const result = validateDraftInput(input as unknown as ReportInput)
  if (!result.valid) fail(null)
  for (const field of Object.values(reportFields)) if (result.value[field] !== input[field]) fail(null)
  return { ...result.value, ...draftSummaryRow(value) }
}

function historyRow(value: unknown): ReportHistoryEntry {
  const row = record(value)
  const source = record(row.changes)
  const identity = {
    id: uuid(row.id),
    reportId: uuid(row.report_id),
    actorId: uuid(row.actor_id),
    actorDisplayName: row.actor_display_name === null ? null : text(row.actor_display_name),
    actorUsername: row.actor_username === undefined ? undefined : nullableText(row.actor_username),
    occurredAt: timestamp(row.occurred_at),
  }
  if (row.event === 'created') {
    const changes: Extract<ReportHistoryEntry, { event: 'created' }>['changes'] = {}
    for (const [databaseField, field] of Object.entries(reportFields)) {
      if (!(databaseField in source)) continue
      const change = record(source[databaseField])
      if (change.before !== null) fail(null)
      changes[field] = { before: null, after: text(change.after) }
    }
    return { ...identity, event: 'created', changes }
  }
  if (row.event === 'duplicate_linked') {
    const change = record(source.canonical_report_id)
    if (Object.keys(source).length !== 1 || Object.keys(change).length !== 2) fail(null)
    const before = change.before === null ? null : uuid(change.before)
    const after = uuid(change.after)
    if (before?.toLowerCase() === after.toLowerCase() || after.toLowerCase() === identity.reportId.toLowerCase()) fail(null)
    return { ...identity, event: 'duplicate_linked', changes: { canonicalReportId: { before, after } } }
  }
  const state = record(source.state)
  if (row.event === 'resolved') {
    const change = record(source.resolution)
    if (Object.keys(source).length !== 2 || Object.keys(state).length !== 2 || Object.keys(change).length !== 2
      || state.before !== 'In progress' || state.after !== 'Resolved' || change.before !== null) fail(null)
    const resolution = resolutionRow(change.after)
    if (resolution.authorId.toLowerCase() !== identity.actorId.toLowerCase() || resolution.resolvedAt !== identity.occurredAt
      || (resolution.kind === 'duplicate' && resolution.canonicalReportId.toLowerCase() === identity.reportId.toLowerCase())) fail(null)
    return { ...identity, event: 'resolved', changes: { state: { before: 'In progress', after: 'Resolved' }, resolution: { before: null, after: resolution } } }
  }
  if (row.event === 'accepted') {
    const developer = record(source.assigned_developer_id)
    const assignedAt = record(source.assigned_at)
    if (state.before !== 'Open' || state.after !== 'Accepted' || developer.before !== null || assignedAt.before !== null
      || Object.keys(source).length !== 3) fail(null)
    return { ...identity, event: 'accepted',
      assignedDeveloperUsername: row.assigned_developer_username === undefined ? undefined : nullableText(row.assigned_developer_username),
      assignedDeveloperDisplayName: row.assigned_developer_display_name === undefined ? undefined : nullableText(row.assigned_developer_display_name),
      changes: { state: { before: 'Open', after: 'Accepted' },
        assignedDeveloperId: { before: null, after: uuid(developer.after) },
        assignedAt: { before: null, after: timestamp(assignedAt.after) } } }
  }
  if (row.event === 'investigation_started' && state.before === 'Accepted' && state.after === 'In progress'
    && Object.keys(source).length === 1) {
    return { ...identity, event: 'investigation_started', changes: { state: { before: 'Accepted', after: 'In progress' } } }
  }
  if (row.event === 'tester_information_requested' && state.before === 'In progress' && state.after === 'Awaiting tester information'
    && Object.keys(source).length === 1) {
    return { ...identity, event: 'tester_information_requested', changes: { state: { before: 'In progress', after: 'Awaiting tester information' } } }
  }
  if (row.event === 'investigation_resumed' && state.before === 'Awaiting tester information' && state.after === 'In progress'
    && Object.keys(source).length === 1) {
    return { ...identity, event: 'investigation_resumed', changes: { state: { before: 'Awaiting tester information', after: 'In progress' } } }
  }
  return fail(null)
}

function commentRow(value: unknown, expectedReportId: string): ReportComment {
  const row = record(value)
  const id = uuid(row.id)
  const reportId = uuid(row.report_id)
  const body = text(row.body)
  const replyToCommentId = row.reply_to_comment_id === null ? null : uuid(row.reply_to_comment_id)
  const validated = validateCommentInput({ body, replyToCommentId })
  if (reportId.toLowerCase() !== expectedReportId.toLowerCase() || !validated.valid || validated.value.body !== body
    || replyToCommentId?.toLowerCase() === id.toLowerCase()) fail(null)
  return { id, reportId, authorId: uuid(row.author_id), authorUsername: nullableText(row.author_username),
    authorDisplayName: nullableText(row.author_display_name), body, replyToCommentId, createdAt: timestamp(row.created_at) }
}

function summaryRow(value: unknown, expectedProjectId: string) {
  const row = record(value)
  const projectId = uuid(row.project_id)
  const title = text(row.title)
  const severity = text(row.severity)
  if (projectId.toLowerCase() !== expectedProjectId.toLowerCase()
    || !title || title !== title.trim() || Array.from(title).length > REPORT_TEXT_FIELDS.title.limit
    || !Object.hasOwn(REPORT_SEVERITIES, severity)) fail(null)
  const summary: ProjectReportSummary = {
    id: uuid(row.id),
    projectId,
    title,
    projectName: text(row.project_name),
    severity: severity as ReportSeverity,
    ...assignment(row),
    reporterDisplayName: text(row.reporter_display_name),
  }
  return { summary, createdAt: timestamp(row.created_at) }
}

function cursorKey(createdAt: string, id: string) {
  // Date.parse gives milliseconds; retain the extra precision PostgreSQL uses to order ties.
  const fraction = /:\d{2}\.(\d{1,6})(?:Z|[+-]\d{2}:\d{2})$/i.exec(createdAt)?.[1] ?? ''
  const microseconds = BigInt(Date.parse(createdAt)) * 1000n + BigInt(fraction.padEnd(6, '0').slice(3))
  return { microseconds, id: id.toLowerCase() }
}

export function createReportRepository(client: SupabaseClient): ReportRepository {
  async function rpc(operation: string, parameters: Record<string, unknown>, comment = false): Promise<unknown> {
    try {
      const { data, error, status } = await client.rpc(operation, parameters)
      if (error) fail(error, status, comment)
      return data
    } catch (error) { return fail(error, undefined, comment) }
  }

  return {
    async listDrafts() {
      const summaries: DraftSummary[] = []
      const seen = new Set<string>()
      let previous: ReturnType<typeof cursorKey> | undefined
      let parameters: Record<string, unknown> = {}
      for (;;) {
        const page = await rpc('list_report_drafts', parameters)
        if (!Array.isArray(page) || page.length > DRAFT_PAGE_SIZE) fail(null)
        for (const value of page) {
          const summary = draftSummaryRow(value)
          const key = cursorKey(summary.updatedAt, summary.id)
          if (seen.has(key.id) || (previous && (key.microseconds > previous.microseconds
            || (key.microseconds === previous.microseconds && key.id >= previous.id)))) fail(null)
          seen.add(key.id)
          previous = key
          summaries.push(summary)
          parameters = { p_before_updated_at: summary.updatedAt, p_before_id: summary.id }
        }
        if (page.length < DRAFT_PAGE_SIZE) return summaries
      }
    },
    async getDraft(id) {
      if (!REPORT_UUID.test(id)) return null
      const data = await rpc('get_report_draft', { p_draft_id: id })
      return data === null ? null : draftRow(data)
    },
    async saveDraft(input, id) {
      if (id !== undefined && !REPORT_UUID.test(id)) throw new ReportError('not_found', 'The draft could not be found.')
      const result = validateDraftInput(input)
      if (!result.valid) throw new ReportError('validation', 'Check the report fields.', result.errors)
      const parameters = Object.fromEntries(Object.entries(reportFields).map(([db, field]) => [`p_${db}`, result.value[field]]))
      return draftRow(await rpc('save_report_draft', { p_draft_id: id ?? null, ...parameters }))
    },
    async deleteDraft(id) {
      if (!REPORT_UUID.test(id)) throw new ReportError('not_found', 'The draft could not be found.')
      await rpc('delete_report_draft', { p_draft_id: id })
    },
    async submitDraft(id, input) {
      if (!REPORT_UUID.test(id)) throw new ReportError('not_found', 'The draft could not be found.')
      const result = validateReportInput(input)
      if (!result.valid) throw new ReportError('validation', 'Check the report fields.', result.errors)
      const parameters = Object.fromEntries(Object.entries(reportFields).map(([db, field]) => [`p_${db}`, result.value[field]]))
      return reportRow(await rpc('submit_report_draft', { p_draft_id: id, ...parameters }))
    },
    async createReport(input) {
      const result = validateReportInput(input)
      if (!result.valid) throw new ReportError('validation', 'Check the report fields.', result.errors)
      const parameters = Object.fromEntries(
        Object.entries(reportFields).map(([db, field]) => [`p_${db}`, result.value[field]]),
      )
      return reportRow(await rpc('create_report', parameters))
    },
    async getReport(id) {
      if (!REPORT_UUID.test(id)) return null
      const data = await rpc('get_report', { p_report_id: id })
      return data === null ? null : reportRow(data)
    },
    async acceptReport(id) {
      if (!REPORT_UUID.test(id)) throw new ReportError('not_found', 'The report could not be found.')
      return reportRow(await rpc('accept_report', { p_report_id: id }))
    },
    async startInvestigation(id) {
      if (!REPORT_UUID.test(id)) throw new ReportError('not_found', 'The report could not be found.')
      return reportRow(await rpc('start_report_investigation', { p_report_id: id }))
    },
    async awaitTesterInformation(id) {
      if (!REPORT_UUID.test(id)) throw new ReportError('not_found', 'The report could not be found.')
      return reportRow(await rpc('await_tester_information', { p_report_id: id }))
    },
    async resumeInvestigation(id) {
      if (!REPORT_UUID.test(id)) throw new ReportError('not_found', 'The report could not be found.')
      return reportRow(await rpc('resume_report_investigation', { p_report_id: id }))
    },
    async resolveReport(id, input) {
      if (!REPORT_UUID.test(id)) throw new ReportError('not_found', 'The report could not be found.')
      const result = validateResolutionInput(input)
      if (!result.valid) throw new ReportError('validation', 'Check the resolution fields.', result.errors)
      const parameters = Object.fromEntries(Object.entries(resolutionFields)
        .filter(([, field]) => Object.hasOwn(result.value, field))
        .map(([wire, field]) => [wire, (result.value as unknown as Record<string, unknown>)[field]]))
      return reportRow(await rpc('resolve_report', { p_report_id: id, p_resolution: parameters }))
    },
    async linkDuplicate(id, canonicalReportId, expectedCanonicalReportId) {
      if (!REPORT_UUID.test(id)) throw new ReportError('not_found', 'The report could not be found.')
      if (typeof canonicalReportId !== 'string' || !REPORT_UUID.test(canonicalReportId) || canonicalReportId.toLowerCase() === id.toLowerCase()
        || (expectedCanonicalReportId !== null && (typeof expectedCanonicalReportId !== 'string' || !REPORT_UUID.test(expectedCanonicalReportId)))) {
        throw new ReportError('validation', 'Choose a valid canonical report.', { canonicalReportId: 'Choose another report in this project.' })
      }
      return reportRow(await rpc('link_duplicate_report', { p_report_id: id, p_canonical_report_id: canonicalReportId, p_expected_canonical_report_id: expectedCanonicalReportId }))
    },
    async listReportComments(id) {
      if (!REPORT_UUID.test(id)) throw new ReportError('not_found', 'The report could not be found.')
      const comments: ReportComment[] = []
      const seen = new Set<string>()
      let previous: ReturnType<typeof cursorKey> | undefined
      let parameters: Record<string, unknown> = { p_report_id: id }
      for (;;) {
        const page = await rpc('list_report_comments', parameters, true)
        if (!Array.isArray(page) || page.length > COMMENT_PAGE_SIZE) fail(null)
        for (const value of page) {
          const comment = commentRow(value, id)
          const key = cursorKey(comment.createdAt, comment.id)
          if (seen.has(key.id) || (previous && (key.microseconds < previous.microseconds
            || (key.microseconds === previous.microseconds && key.id <= previous.id)))) fail(null)
          seen.add(key.id)
          previous = key
          comments.push(comment)
          parameters = { p_report_id: id, p_after_created_at: comment.createdAt, p_after_id: comment.id }
        }
        if (page.length < COMMENT_PAGE_SIZE) return comments
      }
    },
    async postReportComment(id, input) {
      if (!REPORT_UUID.test(id)) throw new ReportError('not_found', 'The report could not be found.')
      const result = validateCommentInput(input)
      if (!result.valid) throw new ReportError('validation', result.message)
      return commentRow(await rpc('post_report_comment', { p_report_id: id, p_body: result.value.body,
        p_reply_to_comment_id: result.value.replyToCommentId }, true), id)
    },
    async listReportHistory(id) {
      if (!REPORT_UUID.test(id)) throw new ReportError('not_found', 'The report could not be found.')
      const data = await rpc('get_report_history', { p_report_id: id })
      if (!Array.isArray(data)) fail(null)
      return data.map(historyRow)
    },
    async listProjectReports(projectId) {
      if (!REPORT_UUID.test(projectId)) throw new ReportError('not_found', 'The project could not be found.')
      const summaries: ProjectReportSummary[] = []
      const seen = new Set<string>()
      let previous: ReturnType<typeof cursorKey> | undefined
      let parameters: Record<string, unknown> = { p_project_id: projectId }
      for (;;) {
        const page = await rpc('list_project_reports', parameters)
        if (!Array.isArray(page) || page.length > PROJECT_REPORT_PAGE_SIZE) fail(null)
        for (const value of page) {
          const { summary, createdAt } = summaryRow(value, projectId)
          const key = cursorKey(createdAt, summary.id)
          if (seen.has(key.id) || (previous && (key.microseconds > previous.microseconds
            || (key.microseconds === previous.microseconds && key.id >= previous.id)))) fail(null)
          seen.add(key.id)
          previous = key
          summaries.push(summary)
          parameters = { p_project_id: projectId, p_before_created_at: createdAt, p_before_id: summary.id }
        }
        if (page.length < PROJECT_REPORT_PAGE_SIZE) return summaries
      }
    },
  }
}
