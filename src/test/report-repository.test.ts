import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { createReportRepository } from '../features/reports/reportRepository'
import type { Report, ReportInput } from '../features/reports/types'

const id = '10000000-0000-4000-8000-000000000001'
const projectId = '20000000-0000-4000-8000-000000000001'
const reporterId = '30000000-0000-4000-8000-000000000001'
const historyId = '40000000-0000-4000-8000-000000000001'
const time = '2026-11-05T09:30:00+00:00'
const input = {
  projectId, title: 'Error', description: 'A failure', version: '1',
  reproductionSteps: 'Visit page', expectedResults: 'Opens',
  actualResults: 'Fails', severity: 'low', testEnvironment: '',
} satisfies ReportInput
const row = {
  id, project_id: projectId, title: input.title, description: input.description,
  version: input.version, reproduction_steps: input.reproductionSteps,
  expected_results: input.expectedResults, actual_results: input.actualResults,
  severity: input.severity, test_environment: '', reporter_id: reporterId,
  created_at: time, updated_at: time, state: 'Open', assigned_developer_id: null,
  project_name: 'Project', project_archived_at: null,
  reporter_username: 'tester', reporter_display_name: 'Reporter',
}
const report: Report = {
  ...input, id, reporterId, createdAt: time, updatedAt: time,
  state: 'Open', assignedDeveloperId: null, projectName: 'Project',
  projectArchivedAt: null, reporterUsername: 'tester', reporterDisplayName: 'Reporter',
}
const changes = Object.fromEntries(Object.entries({
  project_id: projectId, title: input.title, description: input.description, version: input.version,
  reproduction_steps: input.reproductionSteps, expected_results: input.expectedResults,
  actual_results: input.actualResults, severity: input.severity, test_environment: '',
}).map(([key, after]) => [key, { before: null, after }]))

function setup(data: unknown = null, error: unknown = null, status?: number) {
  const rpc = vi.fn().mockResolvedValue({ data, error, status })
  return { rpc, repository: createReportRepository({ rpc } as unknown as SupabaseClient) }
}

describe('report repository', () => {
  it('createReport_validInput_sendsOnlyNormalizedUserFieldsAndMapsSavedRow', async () => {
    const { rpc, repository } = setup(row)
    const supplied = { ...input, title: ' Error ', reporterId: 'forged', state: 'Closed' }
    await expect(repository.createReport(supplied)).resolves.toEqual(report)
    expect(rpc).toHaveBeenCalledExactlyOnceWith('create_report', {
      p_project_id: projectId, p_title: input.title, p_description: input.description,
      p_version: input.version, p_reproduction_steps: input.reproductionSteps,
      p_expected_results: input.expectedResults, p_actual_results: input.actualResults,
      p_severity: input.severity, p_test_environment: '',
    })
  })

  it('createReport_invalidInput_rejectsWithoutNetworkCall', async () => {
    const { rpc, repository } = setup()
    await expect(repository.createReport({ ...input, title: '' })).rejects.toMatchObject({
      code: 'validation', fieldErrors: { title: expect.any(String) },
    })
    expect(rpc).not.toHaveBeenCalled()
  })

  it.each([
    ['P2001', 'unauthenticated'], ['P2002', 'forbidden'], ['P2003', 'validation'],
    ['P2004', 'archived'], ['P2005', 'not_found'], ['PGRST301', 'unauthenticated'],
    ['unknown', 'unavailable'],
  ])('createReport_databaseError%s_mapsTo%s', async (code, expected) => {
    const { repository } = setup(null, { code, message: 'Private SQL internals' })
    await expect(repository.createReport(input)).rejects.toMatchObject({ code: expected })
    await expect(repository.createReport(input)).rejects.not.toThrow('Private SQL internals')
  })

  it('getReport_http401_requestsAuthentication', async () => {
    await expect(setup(null, { message: 'Unauthorized' }, 401).repository.getReport(id))
      .rejects.toMatchObject({ code: 'unauthenticated' })
  })

  it('getReport_existingReport_readsScopedRow', async () => {
    const { rpc, repository } = setup(row)
    await expect(repository.getReport(id)).resolves.toEqual(report)
    expect(rpc).toHaveBeenCalledExactlyOnceWith('get_report', { p_report_id: id })
  })

  it('getReport_missingReport_returnsNull', async () => {
    await expect(setup().repository.getReport(id)).resolves.toBeNull()
  })

  it('getReport_invalidId_returnsNullWithoutNetworkCall', async () => {
    const { rpc, repository } = setup()
    await expect(repository.getReport('invalid')).resolves.toBeNull()
    expect(rpc).not.toHaveBeenCalled()
  })

  it.each([{ severity: 'critical' }, { created_at: 'invalid' }, { assigned_developer_id: reporterId }])(
    'getReport_malformedRow%j_rejectsUnavailable', async override => {
      await expect(setup({ ...row, ...override }).repository.getReport(id))
        .rejects.toMatchObject({ code: 'unavailable' })
    },
  )

  it('listReportHistory_createdEvent_mapsScopedActorAndChanges', async () => {
    const { rpc, repository } = setup([{
      id: historyId, report_id: id, actor_id: reporterId, actor_display_name: 'Reporter',
      occurred_at: time, event: 'created', changes,
    }])
    await expect(repository.listReportHistory(id)).resolves.toEqual([{
      id: historyId, reportId: id, actorId: reporterId, actorDisplayName: 'Reporter',
      occurredAt: time, event: 'created',
      changes: Object.fromEntries(Object.entries(input).map(([key, after]) => [key, { before: null, after }])),
    }])
    expect(rpc).toHaveBeenCalledExactlyOnceWith('get_report_history', { p_report_id: id })
  })

  it('listReportHistory_invalidId_rejectsWithoutNetworkCall', async () => {
    const { rpc, repository } = setup()
    await expect(repository.listReportHistory('invalid')).rejects.toMatchObject({ code: 'not_found' })
    expect(rpc).not.toHaveBeenCalled()
  })
})

function summaryRow(sequence: number, createdAt = '2026-11-05T09:30:00.000012+00:00') {
  return {
    id: `50000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
    project_id: projectId, title: `Report ${sequence}`, project_name: 'Project',
    severity: 'low', state: 'Open', assigned_developer_id: null, reporter_display_name: 'Reporter',
    created_at: createdAt,
  }
}

const fullPage = Array.from({ length: 100 }, (_, index) => summaryRow(100 - index))

describe('project report listing repository', () => {
  it('listProjectReports_fullPage_usesRawTimestampAndUuidCursorAndMapsAllRows', async () => {
    const last = summaryRow(101, '2026-11-05T09:30:00.000011+00:00')
    const { rpc, repository } = setup(fullPage)
    rpc.mockResolvedValueOnce({ data: fullPage, error: null })
      .mockResolvedValueOnce({ data: [last], error: null })
    const results = await repository.listProjectReports(projectId)
    expect(results.map(result => result.id)).toEqual([...fullPage, last].map(item => item.id))
    expect(results.at(-1)).toEqual({
      id: last.id, projectId, title: last.title, projectName: 'Project', severity: 'low',
      state: 'Open', assignedDeveloperId: null, reporterDisplayName: 'Reporter',
    })
    expect(rpc).toHaveBeenNthCalledWith(1, 'list_project_reports', { p_project_id: projectId })
    expect(rpc).toHaveBeenNthCalledWith(2, 'list_project_reports', {
      p_project_id: projectId, p_before_created_at: fullPage.at(-1)!.created_at, p_before_id: fullPage.at(-1)!.id,
    })
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('listProjectReports_repeatedFullPage_rejectsInsteadOfLooping', async () => {
    const { rpc, repository } = setup(null, { code: 'unexpected_third_call' })
    rpc.mockResolvedValueOnce({ data: fullPage, error: null })
      .mockResolvedValueOnce({ data: fullPage, error: null })
    await expect(repository.listProjectReports(projectId)).rejects.toMatchObject({ code: 'unavailable' })
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['wrong project', { project_id: reporterId }],
    ['invalid timestamp', { created_at: 'bad-date' }],
    ['invalid severity', { severity: 'critical' }],
    ['invalid reporter', { reporter_display_name: null }],
  ] as const)('listProjectReports_%s_rejectsInvalidSummary', async (_label, override) => {
    await expect(setup([{ ...summaryRow(1), ...override }]).repository.listProjectReports(projectId))
      .rejects.toMatchObject({ code: 'unavailable' })
  })

  it('listProjectReports_invalidProjectId_rejectsWithoutRequest', async () => {
    const { rpc, repository } = setup()
    await expect(repository.listProjectReports('not-a-uuid')).rejects.toMatchObject({ code: 'not_found' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('listProjectReports_emptyPage_returnsEmptyList', async () => {
    await expect(setup([]).repository.listProjectReports(projectId)).resolves.toEqual([])
  })
})
