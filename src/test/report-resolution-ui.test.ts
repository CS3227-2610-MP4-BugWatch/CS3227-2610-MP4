// @vitest-environment jsdom
import { MantineProvider } from '@mantine/core'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ReportDetailsPage } from '../features/reports/ReportDetailsPage'
import { ReportError, type Report, type ReportComment, type ReportHistoryEntry, type ReportRepository, type ReportResolution, type ResolutionInput } from '../features/reports/types'
import type { SessionUser } from '../shared/types/session'

Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: (query: string) => ({ matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false }) })
const developer: SessionUser = { id: '10000000-0000-4000-8000-000000000001', role: 'developer', username: 'dev', displayName: 'Developer' }
const tester: SessionUser = { ...developer, id: '10000000-0000-4000-8000-000000000002', role: 'tester', username: 'tester', displayName: 'Tester' }
const other = { ...developer, id: '10000000-0000-4000-8000-000000000003' }
const id = '20000000-0000-4000-8000-000000000001'
const targetId = '20000000-0000-4000-8000-000000000002'
const otherTargetId = '20000000-0000-4000-8000-000000000003'
const time = '2026-11-08T10:00:00Z'
const report: Report = { id, projectId: '30000000-0000-4000-8000-000000000001', title: 'Resolution report', description: 'Original description', version: 'Original 1.0', reproductionSteps: 'Open', expectedResults: 'Works', actualResults: 'Fails', severity: 'high', testEnvironment: '', severityRevision: 0, reporterId: tester.id, reporterUsername: 'tester', reporterDisplayName: 'Tester', projectName: 'Project', projectArchivedAt: null, state: 'In progress', resolution: null, canonicalReport: null, assignedDeveloperId: developer.id, assignedAt: time, assignedDeveloperUsername: 'dev', assignedDeveloperDisplayName: 'Developer', createdAt: time, updatedAt: time }
const fixed = { kind: 'fixed', fixSummary: 'Fixed <script>literal()</script>', affectedVersion: 'Affected 1.1', commitUrl: 'https://git.example/commit/abc', pullRequestUrl: 'http://other.example/pr/1' } satisfies ResolutionInput
const metadata = { authorId: developer.id, authorUsername: 'dev', authorDisplayName: '<img src=x>', resolvedAt: time }
const resolution: ReportResolution = { ...fixed, ...metadata }
const resolved: Report = { ...report, state: 'Resolved', resolution }
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function setup(initial = report, user = developer) {
  const repository = {
    listDrafts: vi.fn(), getDraft: vi.fn(), saveDraft: vi.fn(), deleteDraft: vi.fn(), submitDraft: vi.fn(), editReport: vi.fn(), createReport: vi.fn(),
    getReport: vi.fn().mockResolvedValue(initial), listReportHistory: vi.fn().mockResolvedValue([]),
    listProjectReports: vi.fn().mockResolvedValue([report, { ...report, id: targetId, title: 'Canonical target', state: 'Resolved' }, { ...report, id: otherTargetId, title: 'Closed target', state: 'Closed' }]),
    resolveReport: vi.fn().mockResolvedValue(resolved), linkDuplicate: vi.fn().mockResolvedValue({ ...initial, canonicalReport: { id: targetId, title: 'Canonical target' } }),
    acceptReport: vi.fn(), startInvestigation: vi.fn(), awaitTesterInformation: vi.fn(), resumeInvestigation: vi.fn(),
    listReportComments: vi.fn().mockResolvedValue([]), postReportComment: vi.fn().mockResolvedValue({ id: targetId, reportId: id, authorId: tester.id, authorUsername: 'tester', authorDisplayName: 'Tester', body: 'Still discussing', replyToCommentId: null, createdAt: time } satisfies ReportComment),
  } satisfies ReportRepository
  const router = createMemoryRouter([{ path: '/reports/:reportId', element: createElement(ReportDetailsPage, { reportRepository: repository, user }) }], { initialEntries: [`/reports/${id}`] })
  const view = render(createElement(MantineProvider, { env: 'test' }, createElement(RouterProvider, { router })))
  return { repository, router, view }
}
const field = (label: string) => screen.getByLabelText(new RegExp(`^${label}\\b`), { selector: 'input,textarea,select' }) as HTMLInputElement
function change(label: string, value: string) { fireEvent.change(field(label), { target: { value } }) }
async function open() { fireEvent.click(await screen.findByRole('button', { name: 'Resolve report' })); await screen.findByRole('form', { name: 'Resolve report' }) }
function fillFixed() { for (const [label, value] of [['Fix summary', fixed.fixSummary], ['Affected version', fixed.affectedVersion], ['Commit URL', fixed.commitUrl], ['Pull request URL', fixed.pullRequestUrl]]) change(label, value) }
async function openDuplicate() { await open(); change('Resolution outcome', 'duplicate'); await screen.findByLabelText('Canonical report') }
function save() { fireEvent.click(screen.getByRole('button', { name: 'Save resolution' })) }
afterEach(cleanup)

describe('resolution form and permissions', () => {
  it('canonicalField_onlyDuplicateResolution_exposesSelectionInsideTheResolutionForm', async () => {
    const { repository } = setup()
    await screen.findByRole('heading', { name: report.title })
    expect(screen.queryByLabelText('Canonical report')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Save canonical link' })).toBeNull()
    await open()
    for (const kind of ['fixed', 'invalid', 'cannot_reproduce', 'will_not_fix']) {
      change('Resolution outcome', kind)
      expect(screen.queryByLabelText('Canonical report')).toBeNull()
      expect(screen.queryByRole('button', { name: 'Save canonical link' })).toBeNull()
    }
    change('Resolution outcome', 'duplicate')
    const select = await screen.findByLabelText('Canonical report')
    const form = screen.getByRole('form', { name: 'Resolve report' })
    expect(select.closest('form')).toBe(form)
    expect(form.querySelector('form')).toBeNull()
    expect(within(form).getByRole('button', { name: 'Save canonical link' }).getAttribute('type')).toBe('button')
    change('Resolution outcome', 'fixed')
    expect(screen.queryByLabelText('Canonical report')).toBeNull()
    change('Resolution outcome', 'duplicate')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel resolution' }))
    expect(screen.queryByLabelText('Canonical report')).toBeNull()
    expect(repository.linkDuplicate).not.toHaveBeenCalled()
  })
  it('resolution_openFixed_prefillsEditableVersionAndCancelDoesNotSave', async () => {
    const { repository } = setup()
    await open()
    expect(field('Affected version').value).toBe(report.version)
    expect(field('Resolution outcome').value).toBe('fixed')
    expect(screen.queryByLabelText(/fixed version/i)).toBeNull()
    expect(screen.queryByLabelText(/^Explanation/)).toBeNull()
    change('Affected version', 'Edited')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel resolution' }))
    expect(screen.queryByRole('form', { name: 'Resolve report' })).toBeNull()
    expect(repository.resolveReport).not.toHaveBeenCalled()
  })
  it('resolution_fixed_sendsApplicableFieldsAndRefreshesReportHistory', async () => {
    const { repository } = setup()
    await open()
    fillFixed()
    repository.getReport.mockResolvedValue(resolved)
    save()
    await screen.findByRole('heading', { name: 'Resolution' })
    expect(repository.resolveReport).toHaveBeenCalledExactlyOnceWith(id, fixed)
    expect(repository.getReport).toHaveBeenCalledTimes(2)
    expect(repository.listReportHistory).toHaveBeenCalledTimes(2)
    expect(screen.getByText(report.version)).toBeTruthy()
    expect(screen.getByText(/original Tester must retest/)).toBeTruthy()
  })
  it.each(['invalid', 'cannot_reproduce', 'will_not_fix', 'duplicate'] as const)('resolution_%s_showsOnlyExplanationAndSendsNoHiddenFixFields', async kind => {
    const current = { ...report, canonicalReport: { id: targetId, title: 'Canonical target' } }
    const { repository } = setup(current)
    await open()
    fillFixed()
    change('Resolution outcome', kind)
    expect(screen.queryByLabelText(/^Fix summary/)).toBeNull()
    expect(screen.queryByLabelText(/^Affected version/)).toBeNull()
    change('Explanation', 'Reason')
    const input: ResolutionInput = kind === 'duplicate' ? { kind, explanation: 'Reason', canonicalReportId: targetId } : { kind, explanation: 'Reason' }
    repository.getReport.mockResolvedValue({ ...current, state: 'Resolved', resolution: { ...input, ...metadata } })
    save()
    await screen.findByRole('heading', { name: 'Resolution' })
    expect(repository.resolveReport).toHaveBeenCalledExactlyOnceWith(id, input)
    expect(screen.getByText(/No retest is required/)).toBeTruthy()
  })
  it('resolution_duplicateWithoutSavedLink_rejectsAndRetainsExplanation', async () => {
    const { repository } = setup()
    await open()
    change('Resolution outcome', 'duplicate')
    change('Explanation', 'Reason retained')
    save()
    await waitFor(() => expect(screen.getAllByText(/canonical report/i).length).toBeGreaterThan(0))
    expect(field('Explanation').value).toBe('Reason retained')
    expect(repository.resolveReport).not.toHaveBeenCalled()
  })
  it.each([tester, other])('resolution_$roleNonAssignee_hidesMutationControls', async user => {
    setup(report, user)
    await screen.findByRole('heading', { name: report.title })
    expect(screen.queryByRole('button', { name: 'Resolve report' })).toBeNull()
    expect(screen.queryByLabelText(/^Canonical report/)).toBeNull()
  })
  it.each(['Open', 'Accepted', 'Awaiting tester information', 'Resolved', 'Closed'] as const)('resolution_%sState_hidesResolveAndUnavailableLifecycleControls', async state => {
    setup({ ...report, state })
    await screen.findByRole('heading', { name: report.title })
    expect(screen.queryByRole('button', { name: 'Resolve report' })).toBeNull()
    expect(screen.queryByLabelText('Canonical report')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Save canonical link' })).toBeNull()
    expect(screen.queryByRole('button', { name: /close|reopen|retest/i })).toBeNull()
  })
  it('resolution_archived_hidesAllMutationControlsButKeepsResolutionReadable', async () => {
    setup({ ...resolved, projectArchivedAt: time })
    await screen.findByRole('heading', { name: 'Resolution' })
    expect(screen.queryByRole('button', { name: 'Resolve report' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Save canonical link' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Post comment' })).toBeNull()
  })
})

describe('independent canonical linking and shared readback', () => {
  it('link_selector_excludesSourceAndIncludesResolvedClosedTargetsWithIds', async () => {
    const { repository } = setup()
    await openDuplicate()
    const select = screen.getByLabelText('Canonical report')
    expect(within(select).queryByRole('option', { name: `${report.title} (${id})` })).toBeNull()
    expect(within(select).getByRole('option', { name: `Canonical target (${targetId})` })).toBeTruthy()
    expect(within(select).getByRole('option', { name: `Closed target (${otherTargetId})` })).toBeTruthy()
    expect(repository.listProjectReports).toHaveBeenCalledExactlyOnceWith(report.projectId)
  })
  it('link_save_refreshesIndependentlyAndPreservesResolutionInputAndState', async () => {
    const { repository } = setup()
    await open()
    change('Resolution outcome', 'duplicate')
    change('Explanation', 'Unsent reason')
    change('Canonical report', targetId)
    repository.getReport.mockResolvedValue({ ...report, canonicalReport: { id: targetId, title: 'Canonical target' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save canonical link' }))
    await waitFor(() => expect(repository.getReport).toHaveBeenCalledTimes(2))
    await waitFor(() => expect((screen.getByRole('button', { name: 'Save resolution' }) as HTMLButtonElement).disabled).toBe(false))
    expect(repository.linkDuplicate).toHaveBeenCalledExactlyOnceWith(id, targetId, null)
    expect(repository.resolveReport).not.toHaveBeenCalled()
    expect(field('Explanation').value).toBe('Unsent reason')
    expect(field('Resolution outcome').value).toBe('duplicate')
    expect(screen.getByText('In progress')).toBeTruthy()
  })
  it('link_replacement_sendsLoadedExpectedTarget', async () => {
    const { repository } = setup({ ...report, canonicalReport: { id: targetId, title: 'Canonical target' } })
    await openDuplicate()
    change('Canonical report', otherTargetId)
    fireEvent.click(screen.getByRole('button', { name: 'Save canonical link' }))
    await waitFor(() => expect(repository.linkDuplicate).toHaveBeenCalledExactlyOnceWith(id, otherTargetId, targetId))
  })
  it.each([tester, developer])('resolution_$roleReload_displaysSafeFixedValuesAndGuidance', async user => {
    const { view } = setup(resolved, user)
    await screen.findByRole('heading', { name: 'Resolution' })
    expect(screen.getByText(fixed.fixSummary)).toBeTruthy()
    expect(screen.getByText(metadata.authorDisplayName)).toBeTruthy()
    expect(view.container.querySelector('img,script')).toBeNull()
    expect(screen.getByRole('link', { name: fixed.commitUrl }).getAttribute('href')).toBe(fixed.commitUrl)
    expect(screen.getByRole('link', { name: fixed.pullRequestUrl }).getAttribute('href')).toBe(fixed.pullRequestUrl)
    expect(screen.getByText(/original Tester must retest/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /close|reopen|retest/i })).toBeNull()
    expect(screen.getByRole('button', { name: 'Post comment' })).toBeTruthy()
  })
  it('resolution_duplicateChangedLink_displaysCurrentAndImmutableCapturedTargetsSeparately', async () => {
    setup({ ...resolved, canonicalReport: { id: otherTargetId, title: 'Changed current target' }, resolution: { kind: 'duplicate', explanation: 'Same issue', canonicalReportId: targetId, ...metadata } }, tester)
    await screen.findByRole('heading', { name: 'Resolution' })
    expect(screen.getByText(/Current canonical report/)).toBeTruthy()
    expect(screen.getByText(/Canonical report at resolution/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /Changed current target/ }).getAttribute('href')).toBe(`/reports/${otherTargetId}`)
    expect(screen.getByRole('link', { name: targetId }).getAttribute('href')).toBe(`/reports/${targetId}`)
  })
  it('activity_mixedEditingResolutionAndLinkEvents_disclosesEachRecordedChange', async () => {
    const { repository } = setup(resolved)
    const history: ReportHistoryEntry[] = [
      { id: 'edit', reportId: id, actorId: tester.id, actorDisplayName: 'Tester', occurredAt: time, event: 'report_edited', projectNames: { before: 'Earlier project', after: 'Current project' }, changes: { title: { before: 'Earlier title', after: 'Edited title' }, projectId: { before: targetId, after: report.projectId } } },
      { id: 'resolution', reportId: id, actorId: developer.id, actorDisplayName: 'Developer', occurredAt: time, event: 'resolved', changes: { state: { before: 'In progress', after: 'Resolved' }, resolution: { before: null, after: resolution } } },
      { id: 'link', reportId: id, actorId: developer.id, actorDisplayName: 'Developer', occurredAt: time, event: 'duplicate_linked', changes: { canonicalReportId: { before: targetId, after: otherTargetId } } },
    ]
    repository.listReportHistory.mockResolvedValue(history)
    await screen.findByRole('heading', { name: 'Resolution' })
    fireEvent.click(screen.getByRole('tab', { name: 'Activity' }))
    const disclosures = await screen.findAllByText('Recorded changes', { selector: 'summary' })
    expect(disclosures).toHaveLength(3)
    for (const summary of disclosures) { expect(summary.closest('details')!.open).toBe(false); fireEvent.click(summary) }
    expect(within(disclosures[0].closest('details')!).getByText('Earlier title → Edited title')).toBeTruthy()
    expect(within(disclosures[0].closest('details')!).getByText('Earlier project → Current project')).toBeTruthy()
    expect(within(disclosures[1].closest('details')!).getByText(fixed.fixSummary)).toBeTruthy()
    expect(within(disclosures[2].closest('details')!).getByRole('link', { name: targetId }).getAttribute('href')).toBe(`/reports/${targetId}`)
  })
  it('link_loadFailureAndRetry_preservesReadableReportAndUnsavedResolution', async () => {
    const { repository } = setup()
    repository.listProjectReports.mockRejectedValueOnce(new Error('Offline'))
    await open()
    change('Fix summary', 'Unsent summary')
    change('Resolution outcome', 'duplicate')
    const retry = await screen.findByRole('button', { name: 'Retry canonical reports' })
    expect(screen.getByRole('heading', { name: report.title })).toBeTruthy()
    repository.listProjectReports.mockResolvedValue([])
    fireEvent.click(retry)
    await screen.findByText(/No other reports/)
    change('Resolution outcome', 'fixed')
    expect(field('Fix summary').value).toBe('Unsent summary')
    expect(repository.getReport).toHaveBeenCalledOnce()
  })
})

describe('resolution guards and recoverable outcomes', () => {
  it('resolution_invalidFields_associatesFeedbackAndRetainsTypedInput', async () => {
    const { repository } = setup()
    await open()
    change('Fix summary', 'Keep summary')
    save()
    expect(repository.resolveReport).not.toHaveBeenCalled()
    expect(field('Fix summary').value).toBe('Keep summary')
    expect(field('Commit URL').getAttribute('aria-invalid')).toBe('true')
    const feedbackId = field('Commit URL').getAttribute('aria-describedby')
    expect(feedbackId).toBeTruthy()
    expect(feedbackId!.split(' ').some(id => document.getElementById(id)?.textContent)).toBe(true)
  })
  it.each(['resolution', 'link', 'comment'] as const)('pending_%s_blocksAllOverlappingLocalMutations', async method => {
    const { repository } = setup({ ...report, canonicalReport: { id: targetId, title: 'Canonical target' } })
    const pending = deferred<Report>()
    const commentPending = deferred<ReportComment>()
    repository.resolveReport.mockReturnValueOnce(pending.promise)
    repository.linkDuplicate.mockReturnValueOnce(pending.promise)
    repository.postReportComment.mockReturnValueOnce(commentPending.promise)
    await openDuplicate()
    change('Explanation', 'Unsent reason')
    change('Canonical report', targetId)
    change('Comment', 'Question')
    if (method === 'resolution') save()
    if (method === 'link') fireEvent.click(screen.getByRole('button', { name: 'Save canonical link' }))
    if (method === 'comment') fireEvent.click(screen.getByRole('button', { name: 'Post comment' }))
    save()
    fireEvent.click(screen.getByRole('button', { name: 'Save canonical link' }))
    fireEvent.click(screen.getByRole('button', { name: 'Post comment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Await tester information' }))
    expect(repository.resolveReport).toHaveBeenCalledTimes(method === 'resolution' ? 1 : 0)
    expect(repository.linkDuplicate).toHaveBeenCalledTimes(method === 'link' ? 1 : 0)
    expect(repository.postReportComment).toHaveBeenCalledTimes(method === 'comment' ? 1 : 0)
    expect(repository.awaitTesterInformation).not.toHaveBeenCalled()
    await act(async () => { pending.resolve(report); commentPending.resolve({ id: targetId, reportId: id, authorId: tester.id, authorUsername: 'tester', authorDisplayName: 'Tester', body: 'Saved', replyToCommentId: null, createdAt: time }) })
  })
  it.each(['resolution', 'link'] as const)('%s_validationFailure_retainsInputAndAllowsCorrection', async method => {
    const { repository } = setup({ ...report, canonicalReport: { id: targetId, title: 'Canonical target' } })
    repository.resolveReport.mockRejectedValueOnce(new ReportError('validation', 'Check resolution'))
    repository.linkDuplicate.mockRejectedValueOnce(new ReportError('validation', 'Check canonical selection'))
    await openDuplicate()
    change('Explanation', 'Unsent reason')
    change('Canonical report', targetId)
    if (method === 'resolution') save(); else fireEvent.click(screen.getByRole('button', { name: 'Save canonical link' }))
    expect((await screen.findAllByText(method === 'resolution' ? 'Check resolution' : 'Check canonical selection')).length).toBeGreaterThan(0)
    expect(field('Explanation').value).toBe('Unsent reason')
    expect((screen.getByRole('button', { name: 'Save resolution' }) as HTMLButtonElement).disabled).toBe(false)
  })
  it.each(['resolution', 'link'] as const)('%s_stateConflict_refreshesAuthoritativeDataWithoutRetry', async method => {
    const { repository } = setup({ ...report, canonicalReport: { id: targetId, title: 'Canonical target' } })
    repository.resolveReport.mockRejectedValueOnce(new ReportError('state_conflict', 'State changed'))
    repository.linkDuplicate.mockRejectedValueOnce(new ReportError('state_conflict', 'State changed'))
    await openDuplicate()
    change('Explanation', 'Unsent reason')
    change('Canonical report', targetId)
    repository.getReport.mockResolvedValue({ ...report, state: 'Awaiting tester information' })
    if (method === 'resolution') save(); else fireEvent.click(screen.getByRole('button', { name: 'Save canonical link' }))
    await screen.findByText('Awaiting tester information')
    expect(repository.getReport).toHaveBeenCalledTimes(2)
    expect(method === 'resolution' ? repository.resolveReport : repository.linkDuplicate).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Resolve report' })).toBeNull()
  })
  it.each(['resolution', 'link'] as const)('%s_uncertainMutation_requiresReadOnlyReloadAndRetainsInput', async method => {
    const { repository } = setup({ ...report, canonicalReport: { id: targetId, title: 'Canonical target' } })
    repository.resolveReport.mockRejectedValueOnce(new ReportError('unavailable', 'Offline'))
    repository.linkDuplicate.mockRejectedValueOnce(new ReportError('unavailable', 'Offline'))
    await openDuplicate()
    change('Explanation', 'Unsent reason')
    change('Canonical report', targetId)
    if (method === 'resolution') save(); else fireEvent.click(screen.getByRole('button', { name: 'Save canonical link' }))
    const reload = await screen.findByRole('button', { name: 'Reload' })
    expect(field('Explanation').value).toBe('Unsent reason')
    expect((screen.getByRole('button', { name: 'Save resolution' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(reload)
    await waitFor(() => expect((screen.getByRole('button', { name: 'Save resolution' }) as HTMLButtonElement).disabled).toBe(false))
    expect(method === 'resolution' ? repository.resolveReport : repository.linkDuplicate).toHaveBeenCalledOnce()
    expect(field('Explanation').value).toBe('Unsent reason')
  })
  it.each(['resolution', 'link'] as const)('%s_lateCompletionAfterReportNavigation_doesNotPopulateReplacement', async method => {
    const { repository, router } = setup({ ...report, canonicalReport: { id: targetId, title: 'Canonical target' } })
    const pending = deferred<Report>()
    repository.resolveReport.mockReturnValueOnce(pending.promise)
    repository.linkDuplicate.mockReturnValueOnce(pending.promise)
    await openDuplicate()
    change('Explanation', 'Unsent reason')
    change('Canonical report', targetId)
    if (method === 'resolution') save(); else fireEvent.click(screen.getByRole('button', { name: 'Save canonical link' }))
    repository.getReport.mockResolvedValue({ ...report, id: targetId, title: 'Replacement report' })
    await act(async () => { await router.navigate(`/reports/${targetId}`) })
    await screen.findByRole('heading', { name: 'Replacement report' })
    const reads = repository.getReport.mock.calls.length
    await act(async () => pending.resolve(resolved))
    expect(repository.getReport).toHaveBeenCalledTimes(reads)
    expect(screen.queryByRole('heading', { name: 'Resolution' })).toBeNull()
    await open()
    expect(field('Fix summary').value).toBe('')
  })
  it.each(['resolution', 'link'] as const)('%s_failedAuthoritativeReadback_blocksMutationsUntilReloadWithoutResaving', async method => {
    const { repository } = setup({ ...report, canonicalReport: { id: targetId, title: 'Canonical target' } })
    await openDuplicate()
    change('Explanation', 'Unsent reason')
    change('Canonical report', targetId)
    repository.listReportHistory.mockRejectedValueOnce(new ReportError('unavailable', 'Readback offline'))
    if (method === 'resolution') save(); else fireEvent.click(screen.getByRole('button', { name: 'Save canonical link' }))
    const reload = await screen.findByRole('button', { name: 'Reload' })
    expect(field('Explanation').value).toBe('Unsent reason')
    expect((screen.getByRole('button', { name: 'Save resolution' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Post comment' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(reload)
    await waitFor(() => expect((screen.getByRole('button', { name: 'Save resolution' }) as HTMLButtonElement).disabled).toBe(false))
    expect(method === 'resolution' ? repository.resolveReport : repository.linkDuplicate).toHaveBeenCalledOnce()
    expect(field('Explanation').value).toBe('Unsent reason')
  })
  it('canonicalTargets_lateLoadAfterReportNavigation_ignoresOldProjectOptions', async () => {
    const { repository, router } = setup()
    const pending = deferred<Report[]>()
    repository.listProjectReports.mockReturnValueOnce(pending.promise)
    await open()
    change('Resolution outcome', 'duplicate')
    const replacement = { ...report, id: targetId, projectId: otherTargetId, title: 'Other project report' }
    repository.getReport.mockResolvedValue(replacement)
    repository.listProjectReports.mockResolvedValue([])
    await act(async () => { await router.navigate(`/reports/${targetId}`) })
    await open()
    change('Resolution outcome', 'duplicate')
    await screen.findByText(/No other reports/)
    await act(async () => pending.resolve([{ ...report, id: otherTargetId, title: 'Stale old project target' }]))
    expect(screen.queryByRole('option', { name: /Stale old project target/ })).toBeNull()
    expect(screen.getByRole('heading', { name: replacement.title })).toBeTruthy()
  })
})
