import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { createReportRepository } from '../features/reports/reportRepository'
import type { ResolutionInput } from '../features/reports/types'

const id = '10000000-0000-4000-8000-000000000001'
const target = '10000000-0000-4000-8000-000000000002'
const otherTarget = '10000000-0000-4000-8000-000000000003'
const projectId = '20000000-0000-4000-8000-000000000001'
const developerId = '30000000-0000-4000-8000-000000000001'
const time = '2026-11-08T09:30:00.000012+00:00'
const fixed: ResolutionInput = { kind: 'fixed', fixSummary: ' Fix ', affectedVersion: ' 1.2 ', commitUrl: ' https://git.example/commit/abc ', pullRequestUrl: ' http://other.example/pr/1 ' }
const fixedWire = { kind: 'fixed', fix_summary: 'Fix', affected_version: '1.2', commit_url: 'https://git.example/commit/abc', pull_request_url: 'http://other.example/pr/1' }
const metadata = { author_id: developerId, author_username: 'dev', author_display_name: '<b>Developer</b>', resolved_at: time }
const resolution = { ...fixedWire, ...metadata }
const input = { projectId, title: 'Crash', description: 'Failure', version: '1', reproductionSteps: 'Open', expectedResults: 'Works', actualResults: 'Fails', severity: 'low' as const, testEnvironment: '' }
const progress = { id, project_id: projectId, reporter_id: developerId, title: input.title, description: input.description, version: '1', reproduction_steps: 'Open', expected_results: 'Works', actual_results: 'Fails', severity: 'low', test_environment: '', created_at: time, updated_at: time, state: 'In progress', assigned_developer_id: developerId, assigned_at: time, assigned_developer_username: 'dev', assigned_developer_display_name: 'Developer', project_name: 'Project', project_archived_at: null, reporter_username: 'tester', reporter_display_name: 'Tester' }
const resolved = { ...progress, state: 'Resolved', resolution, canonical_report: null }
function setup(data: unknown = resolved) {
  const rpc = vi.fn().mockResolvedValue({ data, error: null })
  return { rpc, repository: createReportRepository({ rpc } as unknown as SupabaseClient) }
}
const history = { id, report_id: id, actor_id: developerId, actor_username: 'dev', actor_display_name: 'Developer', occurred_at: time }

describe('resolution repository mutations', () => {
  it('resolveReport_fixed_sendsOnlyNormalizedAllowedFieldsAndReadsServerMetadata', async () => {
    const { repository, rpc } = setup()
    const report = await repository.resolveReport(id, fixed)
    expect(rpc).toHaveBeenCalledExactlyOnceWith('resolve_report', { p_report_id: id, p_resolution: fixedWire })
    expect(report).toMatchObject({ state: 'Resolved', version: '1', resolution: { kind: 'fixed', fixSummary: 'Fix', affectedVersion: '1.2', commitUrl: fixedWire.commit_url, pullRequestUrl: fixedWire.pull_request_url, authorId: developerId, authorUsername: 'dev', authorDisplayName: '<b>Developer</b>', resolvedAt: time }, canonicalReport: null, assignedDeveloperId: developerId, assignedAt: time })
  })
  it.each(['invalid', 'cannot_reproduce', 'will_not_fix'] as const)('resolveReport_%s_omitsFixFields', async kind => {
    const { repository, rpc } = setup({ ...resolved, resolution: { kind, explanation: 'Reason', ...metadata } })
    await expect(repository.resolveReport(id, { kind, explanation: ' Reason ' })).resolves.toMatchObject({ resolution: { kind, explanation: 'Reason' } })
    expect(rpc).toHaveBeenCalledExactlyOnceWith('resolve_report', { p_report_id: id, p_resolution: { kind, explanation: 'Reason' } })
  })
  it('resolveReport_duplicate_sendsExpectedSavedLinkAndKeepsCurrentLinkSeparateFromSnapshot', async () => {
    const { repository, rpc } = setup({ ...resolved, canonical_report: { id: otherTarget, title: 'Changed target' }, resolution: { kind: 'duplicate', explanation: 'Same issue', canonical_report_id: target, ...metadata } })
    const result = await repository.resolveReport(id, { kind: 'duplicate', explanation: ' Same issue ', canonicalReportId: target })
    expect(result).toMatchObject({ resolution: { canonicalReportId: target }, canonicalReport: { id: otherTarget, title: 'Changed target' } })
    expect(rpc).toHaveBeenCalledExactlyOnceWith('resolve_report', { p_report_id: id, p_resolution: { kind: 'duplicate', explanation: 'Same issue', canonical_report_id: target } })
  })
  it.each([null, target])('linkDuplicate_expectedTarget%j_sendsExactRpcPayload', async expected => {
    const { repository, rpc } = setup({ ...progress, resolution: null, canonical_report: { id: target, title: 'Canonical' } })
    await expect(repository.linkDuplicate(id, target, expected)).resolves.toMatchObject({ state: 'In progress', resolution: null, canonicalReport: { id: target, title: 'Canonical' } })
    expect(rpc).toHaveBeenCalledExactlyOnceWith('link_duplicate_report', { p_report_id: id, p_canonical_report_id: target, p_expected_canonical_report_id: expected })
  })
  it.each(['resolve', 'link'] as const)('%s_malformedSource_rejectsLocally', async method => {
    const { repository, rpc } = setup()
    await expect(method === 'resolve' ? repository.resolveReport('bad', fixed) : repository.linkDuplicate('bad', target, null)).rejects.toMatchObject({ code: 'not_found' })
    expect(rpc).not.toHaveBeenCalled()
  })
  it.each(['bad', ''])('linkDuplicate_malformedTarget%j_rejectsLocally', async value => {
    const { repository, rpc } = setup()
    await expect(repository.linkDuplicate(id, value, null)).rejects.toMatchObject({ code: 'validation' })
    expect(rpc).not.toHaveBeenCalled()
  })
  it.each([{ ...fixed, authorId: developerId }, { ...fixed, explanation: 'hidden' }, { kind: 'invalid', explanation: 'Reason', commitUrl: 'https://git.example/a' }])('resolveReport_forgedOrInapplicableInput%j_rejectsBeforeRpc', async input => {
    const { repository, rpc } = setup()
    await expect(repository.resolveReport(id, input as ResolutionInput)).rejects.toMatchObject({ code: 'validation' })
    expect(rpc).not.toHaveBeenCalled()
  })
  it.each([['P2001', 'unauthenticated'], ['P2002', 'forbidden'], ['P2003', 'validation'], ['P2004', 'archived'], ['P2005', 'not_found'], ['P2007', 'state_conflict'], ['XX000', 'unavailable']])('mutations_%s_mapsTo%sWithoutRetryOrLeakingSql', async (code, expected) => {
    for (const method of ['resolve', 'link']) {
      const { repository, rpc } = setup()
      rpc.mockResolvedValue({ data: null, error: { code, message: 'private SQL details', details: 'canonical_report_id' } })
      const error = await (method === 'resolve' ? repository.resolveReport(id, fixed) : repository.linkDuplicate(id, target, null)).catch(error => error)
      expect(error).toMatchObject({ code: expected })
      expect(error.message).not.toContain('private SQL')
      expect(rpc).toHaveBeenCalledOnce()
    }
  })
  it('mutations_transportFailure_doesNotRetry', async () => {
    for (const method of ['resolve', 'link']) {
      const { repository, rpc } = setup()
      rpc.mockRejectedValue(new Error('Network failed'))
      await expect(method === 'resolve' ? repository.resolveReport(id, fixed) : repository.linkDuplicate(id, target, null)).rejects.toMatchObject({ code: 'unavailable' })
      expect(rpc).toHaveBeenCalledOnce()
    }
  })
  it('mutations_uppercaseUuidIdentity_acceptsEquivalentUuidSpelling', async () => {
    const upperId = 'ABCDEFAB-0000-4000-8000-000000000001'
    const upperTarget = 'ABCDEFAB-0000-4000-8000-000000000002'
    const { repository, rpc } = setup({ ...progress, id: upperId.toLowerCase(), canonical_report: { id: upperTarget.toLowerCase(), title: 'Target' }, resolution: null })
    await repository.linkDuplicate(upperId, upperTarget, null)
    expect(rpc).toHaveBeenCalledExactlyOnceWith('link_duplicate_report', { p_report_id: upperId, p_canonical_report_id: upperTarget, p_expected_canonical_report_id: null })
  })
})

describe('resolution wire decoding and compatibility', () => {
  it.each(['Open', 'Accepted', 'In progress', 'Awaiting tester information'])('getReport_legacy%s_decodesMissingNewFieldsAsNull', async state => {
    const row = state === 'Open' ? { ...progress, state, assigned_developer_id: null, assigned_at: null, assigned_developer_username: null, assigned_developer_display_name: null } : { ...progress, state }
    await expect(setup(row).repository.getReport(id)).resolves.toMatchObject({ state, resolution: null, canonicalReport: null })
  })
  it.each(['Resolved', 'Closed'])('getReport_%s_requiresAndReadsValidResolution', async state => {
    await expect(setup({ ...resolved, state }).repository.getReport(id)).resolves.toMatchObject({ state, resolution: { kind: 'fixed' } })
    await expect(setup({ ...progress, state }).repository.getReport(id)).rejects.toMatchObject({ code: 'unavailable' })
  })
  it.each([
    { resolution: null }, { resolution: { ...resolution, author_id: 'bad' } }, { resolution: { ...resolution, resolved_at: 'bad' } },
    { resolution: { ...resolution, commit_url: 'javascript:alert(1)' } }, { resolution: { ...resolution, explanation: 'hidden' } },
    { resolution: { ...resolution, author_username: 42 } }, { resolution: { kind: 'invalid', explanation: '', ...metadata } },
    { resolution: { kind: 'duplicate', explanation: 'Reason', canonical_report_id: 'bad', ...metadata } },
    { resolution: { kind: 'unknown', explanation: 'Reason', ...metadata } }, { state: 'In progress' },
    { assigned_developer_id: null }, { canonical_report: { id: 'bad', title: 'Target' } }, { canonical_report: { id: target, title: 42 } },
    { canonical_report: undefined }, { canonical_report: { id: target, title: 'Target', hidden: 'unexpected' } },
    { resolution: { ...resolution, author_id: target } }, { resolution: { ...resolution, state: 'Closed' } },
    { resolution: { kind: 'duplicate', explanation: 'Reason', canonical_report_id: target, ...metadata }, canonical_report: null },
  ])('getReport_malformedResolution%j_rejectsUnavailable', async override => {
    await expect(setup({ ...resolved, ...override }).repository.getReport(id)).rejects.toMatchObject({ code: 'unavailable' })
  })
  it('submitDraft_consumedReceipt_readsPersistedResolvedReport', async () => {
    await expect(setup().repository.submitDraft(id, input)).resolves.toMatchObject({ id, state: 'Resolved', resolution: { kind: 'fixed' } })
  })
  it.each(['Resolved', 'Closed'])('listProjectReports_%sSummary_retainsAssignment', async state => {
    await expect(setup([{ ...progress, state }]).repository.listProjectReports(projectId)).resolves.toMatchObject([{ id, state, assignedDeveloperId: developerId }])
  })
  it('listReportHistory_resolutionAndLinkEvents_decodeAlongsideOldCreatedHistory', async () => {
    const rows = [
      { ...history, event: 'created', changes: { title: { before: null, after: 'Original title' } } },
      { ...history, event: 'resolved', changes: { state: { before: 'In progress', after: 'Resolved' }, resolution: { before: null, after: resolution } } },
      { ...history, event: 'duplicate_linked', changes: { canonical_report_id: { before: null, after: target } } },
      { ...history, event: 'duplicate_linked', changes: { canonical_report_id: { before: target, after: otherTarget } } },
    ]
    const entries = await setup(rows).repository.listReportHistory(id)
    expect(entries).toMatchObject([
      { event: 'created', changes: { title: { after: 'Original title' } } },
      { event: 'resolved', changes: { state: { before: 'In progress', after: 'Resolved' }, resolution: { before: null, after: { kind: 'fixed', fixSummary: 'Fix', authorId: developerId } } } },
      { event: 'duplicate_linked', changes: { canonicalReportId: { before: null, after: target } } },
      { event: 'duplicate_linked', changes: { canonicalReportId: { before: target, after: otherTarget } } },
    ])
  })
  it.each([
    { event: 'resolved', changes: { state: { before: 'Accepted', after: 'Resolved' }, resolution: { before: null, after: resolution } } },
    { event: 'resolved', changes: { state: { before: 'In progress', after: 'Closed' }, resolution: { before: null, after: resolution } } },
    { event: 'resolved', changes: { state: { before: 'In progress', after: 'Resolved' }, resolution: { before: {}, after: resolution } } },
    { event: 'resolved', changes: { state: { before: 'In progress', after: 'Resolved' }, resolution: { before: null, after: null } } },
    { event: 'resolved', changes: { state: { before: 'In progress', after: 'Resolved' }, resolution: { before: null, after: { ...resolution, author_id: target } } } },
    { event: 'resolved', changes: { state: { before: 'In progress', after: 'Resolved' }, resolution: { before: null, after: { ...resolution, resolved_at: '2026-11-09T09:30:00Z' } } } },
    { event: 'duplicate_linked', changes: { canonical_report_id: { before: null, after: 'bad' } } },
    { event: 'duplicate_linked', changes: { canonical_report_id: { before: target, after: null } } },
    { event: 'duplicate_linked', changes: { canonical_report_id: { before: 'bad', after: target } } },
    { event: 'duplicate_linked', changes: { canonical_report_id: { before: target, after: target } } },
  ])('listReportHistory_malformedNewEvent%j_rejectsUnavailable', async row => {
    await expect(setup([{ ...history, ...row }]).repository.listReportHistory(id)).rejects.toMatchObject({ code: 'unavailable' })
  })
})
