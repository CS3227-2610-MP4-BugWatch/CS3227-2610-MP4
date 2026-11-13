import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { createReportRepository } from '../features/reports/reportRepository'
import type { ReportInput } from '../features/reports/types'

const id = '10000000-0000-4000-8000-000000000001'
const projectId = '20000000-0000-4000-8000-000000000001'
const actorId = '30000000-0000-4000-8000-000000000001'
const requestId = '40000000-0000-4000-8000-000000000001'
const time = '2026-11-12T01:00:00Z'
const input: ReportInput = { projectId, title: 'Error', description: 'Description', version: '1',
  reproductionSteps: 'Open page', expectedResults: 'Opens', actualResults: 'Fails', severity: 'low', testEnvironment: '' }
const row = { id, project_id: projectId, reporter_id: actorId, title: input.title, description: input.description,
  version: input.version, reproduction_steps: input.reproductionSteps, expected_results: input.expectedResults,
  actual_results: input.actualResults, severity: 'low', severity_revision: 0, test_environment: '',
  state: 'Open', assigned_developer_id: null, assigned_at: null, assigned_developer_username: null,
  assigned_developer_display_name: null, created_at: time, updated_at: time, project_name: 'Project',
  project_archived_at: null, resolution: null, canonical_report: null, reporter_username: 'tester', reporter_display_name: 'Tester' }
const request = { input, expectedSeverityRevision: 0, requestId }
function setup(data: unknown = { outcome: 'saved', report: row }, error: unknown = null, status?: number) {
  const rpc = vi.fn().mockResolvedValue({ data, error, status })
  return { rpc, repository: createReportRepository({ rpc } as unknown as SupabaseClient) }
}

describe('submitted report editing adapter', () => {
  it.each(['saved', 'unchanged'] as const)('editReport_%s_returnsCanonicalReportAndRevision', async outcome => {
    const { repository, rpc } = setup({ outcome, report: row })
    await expect(repository.editReport(id, request)).resolves.toMatchObject({ outcome,
      report: { id, severityRevision: 0, reporterId: actorId, ...input } })
    expect(rpc).toHaveBeenCalledExactlyOnceWith('edit_report', { p_report_id: id, p_input: input,
      p_expected_severity_revision: 0, p_request_id: requestId })
  })

  it('editReport_duplicateLinkedMove_mapsProjectValidationWithoutLeakingSql', async () => {
    const { repository } = setup(null, { code: 'P2011', message: 'Private SQL detail' })
    await expect(repository.editReport(id, request)).rejects.toMatchObject({
      code: 'validation',
      message: 'This report is linked to another report as a duplicate and must stay in this project. You can still edit its other fields.',
      fieldErrors: { projectId: 'Duplicate-linked reports must stay in their current project.' },
    })
  })
  it('editReport_extraProtectedProperties_sendsOnlyNormalizedInput', async () => {
    const { repository, rpc } = setup()
    await repository.editReport(id, { ...request, input: { ...input, title: ' \u00a0Error\n',
      reporterId: 'forged', assignedDeveloperId: actorId, state: 'Closed', createdAt: 'forged' } as ReportInput })
    expect(rpc.mock.calls[0][1]).toEqual({ p_report_id: id, p_input: input, p_expected_severity_revision: 0, p_request_id: requestId })
  })

  const limits = [['title', 200], ['description', 5000], ['version', 100], ['reproductionSteps', 5000],
    ['expectedResults', 5000], ['actualResults', 5000], ['testEnvironment', 1000]] as const
  it.each(limits)('editReport_%sUnicodeAtMaximum_normalizesAndSendsCodePoints', async (field, maximum) => {
    const { repository, rpc } = setup()
    const value = '😀'.repeat(maximum)
    await repository.editReport(id, { ...request, input: { ...input, [field]: ` ${value}\n` } })
    expect(rpc.mock.calls[0][1].p_input[field]).toBe(value)
  })
  it.each(limits)('editReport_%sAboveMaximum_rejectsBeforeRpc', async (field, maximum) => {
    const { repository, rpc } = setup()
    await expect(repository.editReport(id, { ...request, input: { ...input, [field]: '😀'.repeat(maximum + 1) } }))
      .rejects.toMatchObject({ code: 'validation', fieldErrors: { [field]: expect.any(String) } })
    expect(rpc).not.toHaveBeenCalled()
  })
  it.each(limits.filter(([field]) => field !== 'testEnvironment'))('editReport_%sWhitespaceOnly_rejectsBeforeRpc', async field => {
    const { repository, rpc } = setup()
    await expect(repository.editReport(id, { ...request, input: { ...input, [field]: ' \u00a0\n' } }))
      .rejects.toMatchObject({ code: 'validation', fieldErrors: { [field]: expect.any(String) } })
    expect(rpc).not.toHaveBeenCalled()
  })
  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('editReport_invalidRevision%s_rejectsBeforeRpc', async expectedSeverityRevision => {
    const { repository, rpc } = setup()
    await expect(repository.editReport(id, { ...request, expectedSeverityRevision })).rejects.toMatchObject({ code: 'validation' })
    expect(rpc).not.toHaveBeenCalled()
  })
  it.each(['', 'invalid'])('editReport_invalidRequestId%j_rejectsBeforeRpc', async invalid => {
    const { repository, rpc } = setup()
    await expect(repository.editReport(id, { ...request, requestId: invalid })).rejects.toMatchObject({ code: 'validation' })
    expect(rpc).not.toHaveBeenCalled()
  })
  it('editReport_invalidReportId_rejectsBeforeRpc', async () => {
    const { repository, rpc } = setup()
    await expect(repository.editReport('invalid', request)).rejects.toMatchObject({ code: 'not_found' })
    expect(rpc).not.toHaveBeenCalled()
  })
  it.each(['developer', 'tester', null] as const)('editReport_severityConflictActor%s_preservesTrustedSnapshot', async actorRole => {
    const severityConflict = { latestSeverity: 'high', latestSeverityRevision: 2, actorRole }
    const { repository } = setup(null, { code: 'P2010', details: JSON.stringify(severityConflict) })
    await expect(repository.editReport(id, request)).rejects.toMatchObject({ code: 'severity_conflict', severityConflict })
  })
  it.each(['not-json', '{}', JSON.stringify({ latestSeverity: 'critical', latestSeverityRevision: 1, actorRole: null }),
    JSON.stringify({ latestSeverity: 'high', latestSeverityRevision: -1, actorRole: null })])(
    'editReport_malformedConflict%j_failsClosed', async details => {
      await expect(setup(null, { code: 'P2010', details }).repository.editReport(id, request)).rejects.toMatchObject({ code: 'unavailable' })
    })
  it.each([['P2001', 'unauthenticated'], ['P2002', 'forbidden'], ['P2003', 'validation'], ['P2004', 'archived'],
    ['P2005', 'not_found'], ['P2007', 'state_conflict'], ['PGRST301', 'unauthenticated'], ['unknown', 'unavailable']])(
    'editReport_databaseError%s_mapsTo%s', async (code, expected) => {
      await expect(setup(null, { code, message: 'Private SQL detail' }).repository.editReport(id, request))
        .rejects.toMatchObject({ code: expected })
    })
  it.each([undefined, -1, 0.5, '0'])('getReport_invalidSeverityRevision%j_refusesUnsafeEditSnapshot', async severity_revision => {
    await expect(setup({ ...row, severity_revision }).repository.getReport(id)).rejects.toMatchObject({ code: 'unavailable' })
  })
  it.each([null, { outcome: 'unknown', report: row }, { outcome: 'saved', report: null }])(
    'editReport_malformedResult%j_rejectsUnavailable', async data => {
      await expect(setup(data).repository.editReport(id, request)).rejects.toMatchObject({ code: 'unavailable' })
    })
  it('editReport_transportThrows_reportsUncertainStorageFailure', async () => {
    const { rpc, repository } = setup()
    rpc.mockRejectedValueOnce(new Error('Network disconnected'))
    await expect(repository.editReport(id, request)).rejects.toMatchObject({ code: 'unavailable' })
  })
  it('listReportHistory_editEvent_mapsOnlyChangedFieldsAndProjectNames', async () => {
    const projectNames = { before: 'Old project', after: 'New project' }
    const { repository } = setup([{ id: requestId, report_id: id, actor_id: actorId, actor_display_name: 'Tester',
      occurred_at: time, event: 'report_edited', project_names: projectNames,
      changes: { title: { before: 'Old', after: 'New' }, project_id: { before: projectId, after: actorId } } }])
    await expect(repository.listReportHistory(id)).resolves.toEqual([expect.objectContaining({ event: 'report_edited', projectNames,
      changes: { title: { before: 'Old', after: 'New' }, projectId: { before: projectId, after: actorId } } })])
  })
  it('listReportHistory_editWithProtectedField_rejectsMalformedHistory', async () => {
    const { repository } = setup([{ id: requestId, report_id: id, actor_id: actorId, actor_display_name: null,
      occurred_at: time, event: 'report_edited', changes: { reporter_id: { before: actorId, after: projectId } } }])
    await expect(repository.listReportHistory(id)).rejects.toMatchObject({ code: 'unavailable' })
  })
})
