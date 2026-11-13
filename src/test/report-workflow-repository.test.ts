import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { createReportRepository } from '../features/reports/reportRepository'

const id = '10000000-0000-4000-8000-000000000001'
const projectId = '20000000-0000-4000-8000-000000000001'
const developerId = '30000000-0000-4000-8000-000000000001'
const time = '2026-11-07T09:30:00.000012+00:00'
const input = { projectId, title: 'Crash', description: 'Failure', version: '1', reproductionSteps: 'Open', expectedResults: 'Works', actualResults: 'Fails', severity: 'low' as const, testEnvironment: '' }
const open = {
  id, project_id: projectId, reporter_id: developerId, title: input.title, description: input.description,
  version: '1', reproduction_steps: 'Open', expected_results: 'Works', actual_results: 'Fails', severity: 'low', test_environment: '',
  state: 'Open', assigned_developer_id: null, assigned_at: null, assigned_developer_username: null,
  assigned_developer_display_name: null, created_at: time, updated_at: time, project_name: 'Project',
  project_archived_at: null, reporter_username: 'tester', reporter_display_name: 'Tester',
}
const accepted = { ...open, state: 'Accepted', assigned_developer_id: developerId, assigned_at: time, assigned_developer_username: 'dev', assigned_developer_display_name: 'Developer' }
function setup(data: unknown = accepted, error: unknown = null, status?: number) {
  const rpc = vi.fn().mockResolvedValue({ data, error, status })
  return { rpc, repository: createReportRepository({ rpc } as unknown as SupabaseClient) }
}
const methods = [['acceptReport', 'accept_report'], ['startInvestigation', 'start_report_investigation'], ['awaitTesterInformation', 'await_tester_information'], ['resumeInvestigation', 'resume_report_investigation']] as const

describe('report workflow repository', () => {
  it.each(methods)('%s_validId_sendsOnlyReportIdAndReturnsPersistedFields', async (method, operation) => {
    const row = { ...accepted, state: method === 'acceptReport' ? 'Accepted' : method === 'awaitTesterInformation' ? 'Awaiting tester information' : 'In progress' }
    const { rpc, repository } = setup(row)
    await expect(repository[method](id)).resolves.toMatchObject({ id, state: row.state, assignedDeveloperId: developerId, assignedAt: time, assignedDeveloperUsername: 'dev', assignedDeveloperDisplayName: 'Developer' })
    expect(rpc).toHaveBeenCalledExactlyOnceWith(operation, { p_report_id: id })
  })
  for (const [method] of methods) {
    it.each(['', 'invalid', `${id} `, '10000000-0000-4000-8000-00000000000'])(`${method}_malformedId%s_rejectsWithoutRpc`, async value => {
      const { rpc, repository } = setup()
      await expect(repository[method](value)).rejects.toMatchObject({ code: 'not_found' })
      expect(rpc).not.toHaveBeenCalled()
    })
    it.each([
      ['P2001', 'unauthenticated'], ['P2002', 'forbidden'], ['42501', 'forbidden'], ['P2003', 'validation'],
      ['P2004', 'archived'], ['P2005', 'not_found'], ['P2006', 'already_assigned'], ['P2007', 'state_conflict'],
      ['PGRST301', 'unauthenticated'], ['PGRST303', 'unauthenticated'], ['unknown', 'unavailable'],
    ])(`${method}_error%s_mapsTo%sWithoutSqlLeak`, async (code, expected) => {
      const { repository } = setup(null, { code, message: 'Private SQL internals' })
      await expect(repository[method](id)).rejects.toMatchObject({ code: expected })
      await expect(repository[method](id)).rejects.not.toThrow('Private SQL internals')
    })
    it(`${method}_http401_mapsToUnauthenticated`, async () => {
      await expect(setup(null, { message: 'Private' }, 401).repository[method](id)).rejects.toMatchObject({ code: 'unauthenticated' })
    })
    it(`${method}_networkRejection_doesNotRetry`, async () => {
      const { rpc, repository } = setup()
      rpc.mockRejectedValueOnce(new TypeError('Network lost'))
      await expect(repository[method](id)).rejects.toMatchObject({ code: 'unavailable' })
      expect(rpc).toHaveBeenCalledOnce()
    })
  }
  it.each([open, accepted, { ...accepted, state: 'In progress' }, { ...accepted, state: 'Awaiting tester information' }])('getReport_supportedState$state_decodesAssignment', async row => {
    await expect(setup(row).repository.getReport(id)).resolves.toMatchObject({ state: row.state, assignedDeveloperId: row.assigned_developer_id, assignedAt: row.assigned_at })
  })
  it.each([
    { state: 'Closed' }, { assigned_developer_id: null }, { assigned_developer_id: 'invalid' },
    { assigned_at: null }, { assigned_at: 'invalid' }, { assigned_at: undefined },
    { assigned_developer_username: 3 }, { assigned_developer_display_name: {} },
    { state: 'Open' }, { state: 'Open', assigned_developer_id: null, assigned_at: null },
  ])('getReport_inconsistentAssignment%j_rejectsUnavailable', async override => {
    await expect(setup({ ...accepted, ...override }).repository.getReport(id)).rejects.toMatchObject({ code: 'unavailable' })
  })
  it.each([
    { assigned_at: time }, { assigned_developer_username: 'dev' }, { assigned_developer_display_name: 'Developer' },
  ])('getReport_openWithAssignmentMetadata%j_rejectsUnavailable', async override => {
    await expect(setup({ ...open, ...override }).repository.getReport(id)).rejects.toMatchObject({ code: 'unavailable' })
  })
  it.each(['', '<img src=x onerror=alert(1)>'])('getReport_label%s_preservesPlainText', async label => {
    await expect(setup({ ...accepted, assigned_developer_display_name: label }).repository.getReport(id)).resolves.toMatchObject({ assignedDeveloperDisplayName: label })
  })
  it.each(['Accepted', 'In progress', 'Awaiting tester information'])('submitDraft_oldReceiptNow%s_decodesProgressedReport', async state => {
    const { rpc, repository } = setup({ ...accepted, state })
    await expect(repository.submitDraft(id, input)).resolves.toMatchObject({ id, state, assignedAt: time })
    expect(rpc).toHaveBeenCalledOnce()
    expect(rpc.mock.calls[0][0]).toBe('submit_report_draft')
  })
  it('listProjectReports_assignedRows_preservesScopedLabelsAndRawCursorPrecision', async () => {
    const page = Array.from({ length: 100 }, (_, index) => ({ ...accepted, id: `50000000-0000-4000-8000-${String(200 - index).padStart(12, '0')}` }))
    const tail = { ...accepted, id, state: 'In progress', created_at: '2026-11-07T09:30:00.000011+00:00' }
    const { rpc, repository } = setup()
    rpc.mockResolvedValueOnce({ data: page, error: null }).mockResolvedValueOnce({ data: [tail], error: null })
    const rows = await repository.listProjectReports(projectId)
    expect(rows).toHaveLength(101)
    expect(rows.at(-1)).toMatchObject({ state: 'In progress', assignedDeveloperId: developerId, assignedDeveloperUsername: 'dev', assignedDeveloperDisplayName: 'Developer' })
    expect(rpc).toHaveBeenNthCalledWith(2, 'list_project_reports', { p_project_id: projectId, p_before_created_at: time, p_before_id: page.at(-1)!.id })
  })
})

const baseHistory = { id, report_id: id, actor_id: developerId, actor_display_name: '', actor_username: 'dev', occurred_at: time }
const acceptanceChanges = { state: { before: 'Open', after: 'Accepted' }, assigned_developer_id: { before: null, after: developerId }, assigned_at: { before: null, after: time } }
describe('report workflow history decoding', () => {
  it('listReportHistory_allEvents_preservesCreatedAndMapsWorkflowChanges', async () => {
    const { repository } = setup([
      { ...baseHistory, event: 'created', changes: { title: { before: null, after: 'Crash' } } },
      { ...baseHistory, event: 'accepted', assigned_developer_username: 'dev', assigned_developer_display_name: '<b>Dev</b>', changes: acceptanceChanges },
      { ...baseHistory, event: 'investigation_started', changes: { state: { before: 'Accepted', after: 'In progress' } } },
      { ...baseHistory, event: 'tester_information_requested', changes: { state: { before: 'In progress', after: 'Awaiting tester information' } } },
      { ...baseHistory, event: 'investigation_resumed', changes: { state: { before: 'Awaiting tester information', after: 'In progress' } } },
    ])
    const entries = await repository.listReportHistory(id)
    expect(entries[0]).toMatchObject({ event: 'created', changes: { title: { before: null, after: 'Crash' } } })
    expect(entries[1]).toMatchObject({ event: 'accepted', actorUsername: 'dev', assignedDeveloperDisplayName: '<b>Dev</b>', changes: { state: { before: 'Open', after: 'Accepted' }, assignedDeveloperId: { before: null, after: developerId }, assignedAt: { before: null, after: time } } })
    expect(entries[2]).toMatchObject({ event: 'investigation_started', changes: { state: { before: 'Accepted', after: 'In progress' } } })
    expect(entries[3]).toMatchObject({ event: 'tester_information_requested', changes: { state: { before: 'In progress', after: 'Awaiting tester information' } } })
    expect(entries[4]).toMatchObject({ event: 'investigation_resumed', changes: { state: { before: 'Awaiting tester information', after: 'In progress' } } })
  })
  it.each([
    { event: 'unknown', changes: {} },
    { event: 'tester_information_requested', changes: { state: { before: 'Accepted', after: 'Awaiting tester information' } } },
    { event: 'investigation_resumed', changes: { state: { before: 'In progress', after: 'Awaiting tester information' } } },
    { event: 'accepted', changes: {} },
    { event: 'accepted', changes: { ...acceptanceChanges, assigned_developer_id: { before: null, after: 'invalid' } } },
    { event: 'accepted', changes: { ...acceptanceChanges, assigned_at: { before: null, after: 'invalid' } } },
    { event: 'accepted', changes: { ...acceptanceChanges, state: { before: 'Accepted', after: 'Open' } } },
    { event: 'investigation_started', changes: { state: { before: 'Open', after: 'In progress' } } },
    { event: 'created', changes: { title: { before: 'old', after: 'new' } } },
  ])('listReportHistory_malformedEvent%j_rejectsUnavailable', async row => {
    await expect(setup([{ ...baseHistory, ...row }]).repository.listReportHistory(id)).rejects.toMatchObject({ code: 'unavailable' })
  })
})
