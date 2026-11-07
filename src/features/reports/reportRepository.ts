import type { SupabaseClient } from '@supabase/supabase-js'
import { ReportError } from './types'
import type { DraftSummary, ReportDraft, ProjectReportSummary, Report, ReportFieldErrors, ReportHistoryEntry, ReportInput, ReportRepository, ReportSeverity } from './types'
import { REPORT_SEVERITIES, REPORT_TEXT_FIELDS, REPORT_UUID, validateDraftInput, validateReportInput } from './validation'

const PROJECT_REPORT_PAGE_SIZE = 100
const DRAFT_PAGE_SIZE = 100

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

function fail(error: unknown, status?: number): never {
  if (error instanceof ReportError) throw error
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined
  if (status === 401 || ['P2001', 'PGRST301', 'PGRST303'].includes(String(code))) {
    throw new ReportError('unauthenticated', 'Your session has ended. Please log in again.')
  }
  switch (code) {
    case 'P2002':
    case '42501': throw new ReportError('forbidden', 'You do not have permission to perform this report action.')
    case 'P2003': {
      const fieldErrors: ReportFieldErrors = {}
      const detail = error && typeof error === 'object' && 'details' in error ? error.details : undefined
      if (typeof detail === 'string' && Object.hasOwn(reportFields, detail)) {
        fieldErrors[reportFields[detail as keyof typeof reportFields]] = 'Check this field.'
      }
      throw new ReportError('validation', 'Check the report fields.', fieldErrors)
    }
    case 'P2004': throw new ReportError('archived', 'That project is archived. Choose another active project.')
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
  if (state !== 'Open' && state !== 'Accepted' && state !== 'In progress') fail(null)
  const assignedDeveloperId = row.assigned_developer_id === null ? null : uuid(row.assigned_developer_id)
  const assignedDeveloperUsername = nullableText(row.assigned_developer_username)
  const assignedDeveloperDisplayName = nullableText(row.assigned_developer_display_name)
  if ((state === 'Open') !== (assignedDeveloperId === null)
    || (assignedDeveloperId === null && (assignedDeveloperUsername !== null || assignedDeveloperDisplayName !== null))) fail(null)
  return { state, assignedDeveloperId, assignedDeveloperUsername, assignedDeveloperDisplayName }
}

function reportRow(value: unknown): Report {
  const row = record(value)
  const input = Object.fromEntries(Object.entries(reportFields).map(([db, field]) => [field, text(row[db])]))
  const result = validateReportInput(input as unknown as ReportInput)
  if (!result.valid) fail(null)
  const ownership = assignment(row)
  const assignedAt = row.assigned_at === null ? null : timestamp(row.assigned_at)
  if ((ownership.assignedDeveloperId === null) !== (assignedAt === null)) fail(null)
  for (const field of Object.values(reportFields)) {
    if (result.value[field] !== input[field]) fail(null)
  }
  return {
    ...result.value,
    id: uuid(row.id),
    reporterId: uuid(row.reporter_id),
    ...ownership,
    assignedAt,
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
  const state = record(source.state)
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
  return fail(null)
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
  async function rpc(operation: string, parameters: Record<string, unknown>): Promise<unknown> {
    try {
      const { data, error, status } = await client.rpc(operation, parameters)
      if (error) fail(error, status)
      return data
    } catch (error) { return fail(error) }
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
