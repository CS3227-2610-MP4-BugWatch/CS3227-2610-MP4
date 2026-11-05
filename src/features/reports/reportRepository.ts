import type { SupabaseClient } from '@supabase/supabase-js'
import { ReportError } from './types'
import type { Report, ReportFieldErrors, ReportHistoryEntry, ReportInput, ReportRepository } from './types'
import { REPORT_UUID, validateReportInput } from './validation'

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

function reportRow(value: unknown): Report {
  const row = record(value)
  const input = Object.fromEntries(Object.entries(reportFields).map(([db, field]) => [field, text(row[db])]))
  const result = validateReportInput(input as unknown as ReportInput)
  if (!result.valid || row.state !== 'Open' || row.assigned_developer_id !== null) fail(null)
  for (const field of Object.values(reportFields)) {
    if (result.value[field] !== input[field]) fail(null)
  }
  return {
    ...result.value,
    id: uuid(row.id),
    reporterId: uuid(row.reporter_id),
    state: row.state,
    assignedDeveloperId: row.assigned_developer_id,
    createdAt: timestamp(row.created_at),
    updatedAt: timestamp(row.updated_at),
    projectName: text(row.project_name),
    projectArchivedAt: row.project_archived_at === null ? null : timestamp(row.project_archived_at),
    reporterUsername: text(row.reporter_username),
    reporterDisplayName: text(row.reporter_display_name),
  }
}

function historyRow(value: unknown): ReportHistoryEntry {
  const row = record(value)
  if (row.event !== 'created') fail(null)
  const source = record(row.changes)
  const changes: ReportHistoryEntry['changes'] = {}
  for (const [databaseField, field] of Object.entries(reportFields)) {
    if (!(databaseField in source)) continue
    const change = record(source[databaseField])
    if (change.before !== null) fail(null)
    changes[field] = { before: null, after: text(change.after) }
  }
  return {
    id: uuid(row.id),
    reportId: uuid(row.report_id),
    actorId: uuid(row.actor_id),
    actorDisplayName: row.actor_display_name === null ? null : text(row.actor_display_name),
    occurredAt: timestamp(row.occurred_at),
    event: row.event,
    changes,
  }
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
    async listReportHistory(id) {
      if (!REPORT_UUID.test(id)) throw new ReportError('not_found', 'The report could not be found.')
      const data = await rpc('get_report_history', { p_report_id: id })
      if (!Array.isArray(data)) fail(null)
      return data.map(historyRow)
    },
  }
}
