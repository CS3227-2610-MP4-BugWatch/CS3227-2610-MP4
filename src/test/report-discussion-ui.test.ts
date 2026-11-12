// @vitest-environment jsdom
import { MantineProvider } from '@mantine/core'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ReportDetailsPage } from '../features/reports/ReportDetailsPage'
import { ReportError, type Report, type ReportComment, type ReportHistoryEntry, type ReportRepository } from '../features/reports/types'
import type { SessionUser } from '../shared/types/session'

Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: (query: string) => ({ matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false }) })
const developer: SessionUser = { id: '10000000-0000-4000-8000-000000000001', role: 'developer', username: 'dev', displayName: 'Developer' }
const tester: SessionUser = { ...developer, id: '10000000-0000-4000-8000-000000000002', role: 'tester', username: 'tester', displayName: 'Tester' }
const otherDeveloper = { ...developer, id: '10000000-0000-4000-8000-000000000003' }
const otherTester = { ...tester, id: '10000000-0000-4000-8000-000000000004' }
const id = '20000000-0000-4000-8000-000000000001'
const time = '2026-11-07T10:00:00Z'
const report: Report = { id, projectId: '30000000-0000-4000-8000-000000000001', title: 'Discussion report', description: 'Current report description', version: '1', reproductionSteps: 'Open', expectedResults: 'Works', actualResults: 'Fails', severity: 'high', testEnvironment: 'Chrome', severityRevision: 0, reporterId: tester.id, reporterUsername: 'tester', reporterDisplayName: 'Tester', projectName: 'Project', projectArchivedAt: null, resolution: null, canonicalReport: null, state: 'In progress', assignedDeveloperId: developer.id, assignedAt: time, assignedDeveloperUsername: 'dev', assignedDeveloperDisplayName: 'Developer', createdAt: time, updatedAt: time }
const waiting: Report = { ...report, state: 'Awaiting tester information' }
const first: ReportComment = { id: '40000000-0000-4000-8000-000000000001', reportId: id, authorId: developer.id, authorUsername: 'dev', authorDisplayName: 'Question author', body: 'Which browser?', replyToCommentId: null, createdAt: time }
const second: ReportComment = { ...first, id: '40000000-0000-4000-8000-000000000002', authorId: tester.id, authorDisplayName: 'Answer author', body: 'Chrome\n<script>literal()</script>', replyToCommentId: first.id }
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function setup(initial = report, user = developer, comments: ReportComment[] = []) {
  const repository = {
    listDrafts: vi.fn(), getDraft: vi.fn(), saveDraft: vi.fn(), deleteDraft: vi.fn(), submitDraft: vi.fn(), editReport: vi.fn(), createReport: vi.fn(),
    getReport: vi.fn().mockResolvedValue(initial), listReportHistory: vi.fn().mockResolvedValue([]), listProjectReports: vi.fn().mockResolvedValue([]),
    acceptReport: vi.fn(), startInvestigation: vi.fn(), resolveReport: vi.fn(), linkDuplicate: vi.fn(), awaitTesterInformation: vi.fn().mockResolvedValue(waiting), resumeInvestigation: vi.fn().mockResolvedValue(report),
    listReportComments: vi.fn().mockResolvedValue(comments), postReportComment: vi.fn().mockResolvedValue(second),
  } satisfies ReportRepository
  const router = createMemoryRouter([{ path: '/reports/:reportId', element: createElement(ReportDetailsPage, { reportRepository: repository, user }) }], { initialEntries: [`/reports/${id}`] })
  const view = render(createElement(MantineProvider, { env: 'test' }, createElement(RouterProvider, { router })))
  return { repository, router, view }
}
async function ready() { await screen.findByRole('textbox', { name: 'Comment' }) }
const comment = () => screen.getByRole('textbox', { name: 'Comment' }) as HTMLTextAreaElement
function type(text = 'Typed question') { fireEvent.change(comment(), { target: { value: text } }) }
function post() { fireEvent.click(screen.getByRole('button', { name: 'Post comment' })) }
afterEach(cleanup)

describe('conversation and activity layout', () => {
  it('reportDetails_initialVisit_expandsDetailsAboveEmptyConversationWithCount', async () => {
    const { view } = setup()
    await ready()
    expect(screen.getByRole('tab', { name: 'Conversation' }).getAttribute('aria-selected')).toBe('true')
    const details = screen.getByRole('heading', { name: 'Report details' }).closest('details')!
    expect(details.open).toBe(true)
    expect(within(details).getByText(report.description)).toBeTruthy()
    expect(view.container.textContent).toMatch(/no comments|no discussion|start.*conversation/i)
    expect(screen.getByRole('button', { name: 'Discussion (0)' })).toBeTruthy()
    expect(details.compareDocumentPosition(comment()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  it('activity_existingCreationAndClarificationEvents_keepsHeaderAndExpandsOriginalSnapshot', async () => {
    const { repository } = setup(waiting)
    const history: ReportHistoryEntry[] = [
      { id: 'created', reportId: id, actorId: tester.id, actorDisplayName: 'Original reporter', occurredAt: time, event: 'created', changes: { description: { before: null, after: 'Original submitted description' } } },
      { id: 'waiting', reportId: id, actorId: developer.id, actorDisplayName: 'Waiting developer', occurredAt: time, event: 'tester_information_requested', changes: { state: { before: 'In progress', after: 'Awaiting tester information' } } },
    ]
    repository.listReportHistory.mockResolvedValue(history)
    await ready()
    fireEvent.click(screen.getByRole('tab', { name: 'Activity' }))
    await screen.findByRole('heading', { name: 'Activity history' })
    expect(screen.getByRole('heading', { name: report.title })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Resume investigation' })).toBeTruthy()
    expect(screen.getByText('Original reporter')).toBeTruthy()
    const changes = screen.getAllByText('Recorded changes', { selector: 'summary' })
    expect(changes).toHaveLength(2)
    for (const summary of changes) expect(summary.closest('details')!.open).toBe(false)
    fireEvent.click(changes[0])
    expect(changes[0].closest('details')!.open).toBe(true)
    expect(screen.getByText('Original submitted description')).toBeTruthy()
    fireEvent.click(changes[1])
    expect(changes[1].closest('details')!.textContent).toContain('In progress')
    expect(changes[1].closest('details')!.textContent).toContain('Awaiting tester information')
  })
  it('conversation_tabAndDetailsChanges_preserveUnsentTextAndReplyTarget', async () => {
    setup(report, developer, [first])
    await ready()
    type('Unsent response')
    fireEvent.click(screen.getByRole('button', { name: 'Reply to Question author' }))
    fireEvent.click(screen.getByRole('heading', { name: 'Report details' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Activity' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Conversation' }))
    expect(comment().value).toBe('Unsent response')
    expect(screen.getByRole('button', { name: 'Cancel reply' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel reply' }))
    expect(comment().value).toBe('Unsent response')
    expect(screen.queryByRole('button', { name: 'Cancel reply' })).toBeNull()
  })
  it('conversation_commentsAndAuthorMarkup_renderLiterallyInChronologicalOrder', async () => {
    const { view } = setup(report, tester, [{ ...first, authorDisplayName: '<img src=x>' }, second])
    await ready()
    expect(screen.getAllByText('<img src=x>').length).toBeGreaterThan(0)
    expect(screen.getByText(/literal\(\)/)).toBeTruthy()
    expect(view.container.querySelector('img, script')).toBeNull()
    expect(screen.getByText(first.body).compareDocumentPosition(screen.getByText(/literal\(\)/)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Jump to latest' })).toBeTruthy()
  })
  it('conversation_referenceAndDiscussionShortcuts_targetReadableConversation', async () => {
    setup(report, tester, [first, second])
    await ready()
    const reference = screen.getByRole('link', { name: /Question author/i })
    expect(reference.getAttribute('href')).toContain(first.id)
    fireEvent.click(reference)
    const target = document.getElementById(reference.getAttribute('href')!.slice(1))
    expect(target).not.toBeNull()
    expect(document.activeElement).toBe(target)
    fireEvent.click(screen.getByRole('button', { name: 'Jump to latest' }))
    expect(document.activeElement?.id).toContain(second.id)
    fireEvent.click(screen.getByRole('tab', { name: 'Activity' }))
    fireEvent.click(screen.getByRole('button', { name: 'Discussion (2)' }))
    expect(screen.getByRole('tab', { name: 'Conversation' }).getAttribute('aria-selected')).toBe('true')
  })
})

describe('independent clarification actions and comments', () => {
  it.each([developer, tester, otherDeveloper, otherTester])('comment_$roleParticipant_postsWithoutChangingLifecycle', async user => {
    const { repository } = setup(waiting, user)
    await ready()
    type('A response')
    repository.listReportComments.mockResolvedValue([second])
    post()
    await screen.findByText(/literal\(\)/)
    expect(repository.postReportComment).toHaveBeenCalledExactlyOnceWith(id, { body: 'A response', replyToCommentId: null })
    expect(repository.awaitTesterInformation).not.toHaveBeenCalled()
    expect(repository.resumeInvestigation).not.toHaveBeenCalled()
    expect(screen.getByText('Awaiting tester information')).toBeTruthy()
    expect(comment().value).toBe('')
    expect(screen.getByRole('button', { name: 'Discussion (1)' })).toBeTruthy()
  })
  it.each([[report, 'Await tester information', 'awaitTesterInformation', waiting], [waiting, 'Resume investigation', 'resumeInvestigation', report]] as const)('clarification_$1_withoutCommentsChangesStateAndRetainsComposer', async (initial, label, method, next) => {
    const { repository } = setup(initial)
    await ready()
    type('Question not yet posted')
    repository.getReport.mockResolvedValue(next)
    fireEvent.click(screen.getByRole('button', { name: label }))
    await waitFor(() => expect(repository[method]).toHaveBeenCalledExactlyOnceWith(id))
    await waitFor(() => expect(screen.getByText(next.state)).toBeTruthy())
    expect(comment().value).toBe('Question not yet posted')
    expect(repository.postReportComment).not.toHaveBeenCalled()
  })
  it.each([tester, otherDeveloper, otherTester])('clarification_$roleNonAssignee_hasNoStateControls', async user => {
    setup(waiting, user)
    await ready()
    expect(screen.queryByRole('button', { name: 'Await tester information' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Resume investigation' })).toBeNull()
  })
  it('comment_replyAndCancel_setsAndClearsOnlyReference', async () => {
    const { repository } = setup(report, tester, [first])
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Reply to Question author' }))
    type('Reply text')
    repository.listReportComments.mockResolvedValue([first, second])
    post()
    await waitFor(() => expect(repository.postReportComment).toHaveBeenCalledExactlyOnceWith(id, { body: 'Reply text', replyToCommentId: first.id }))
    await waitFor(() => expect(comment().value).toBe(''))
  })
  it('comment_archivedProject_keepsConversationReadOnly', async () => {
    setup({ ...waiting, projectArchivedAt: time }, tester, [first])
    await screen.findByText(first.body)
    expect(screen.getAllByText(/archived/i).length).toBeGreaterThan(0)
    const submit = screen.queryByRole('button', { name: 'Post comment' }) as HTMLButtonElement | null
    expect(!submit || submit.disabled).toBe(true)
    expect(screen.queryByRole('button', { name: 'Resume investigation' })).toBeNull()
  })
})

describe('discussion recovery and stale outcomes', () => {
  it('comment_pending_blocksRepeatedPostAndWorkflowOverlap', async () => {
    const { repository } = setup()
    const pending = deferred<ReportComment>()
    repository.postReportComment.mockReturnValueOnce(pending.promise)
    await ready()
    type()
    post()
    post()
    fireEvent.click(screen.getByRole('button', { name: 'Await tester information' }))
    expect(repository.postReportComment).toHaveBeenCalledOnce()
    expect(repository.awaitTesterInformation).not.toHaveBeenCalled()
    await act(async () => pending.resolve(second))
  })
  it('clarification_pending_blocksCommentPosting', async () => {
    const { repository } = setup()
    const pending = deferred<Report>()
    repository.awaitTesterInformation.mockReturnValueOnce(pending.promise)
    await ready()
    type('Question')
    fireEvent.click(screen.getByRole('button', { name: 'Await tester information' }))
    post()
    expect(repository.awaitTesterInformation).toHaveBeenCalledOnce()
    expect(repository.postReportComment).not.toHaveBeenCalled()
    repository.getReport.mockResolvedValue(waiting)
    await act(async () => pending.resolve(waiting))
  })
  it.each([[report, 'Await tester information', 'awaitTesterInformation', waiting], [waiting, 'Resume investigation', 'resumeInvestigation', report]] as const)('clarification_$1Conflict_refreshesAuthoritativeStateWithoutPosting', async (initial, label, method, next) => {
    const { repository } = setup(initial)
    await ready()
    repository[method].mockRejectedValueOnce(new ReportError('state_conflict', 'The report state has changed'))
    repository.getReport.mockResolvedValue(next)
    fireEvent.click(screen.getByRole('button', { name: label }))
    await waitFor(() => expect(screen.getByText(next.state)).toBeTruthy())
    expect(repository[method]).toHaveBeenCalledOnce()
    expect(repository.postReportComment).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toMatch(/changed/i)
  })
  it('comment_rejectedValidation_retainsTextAndReference', async () => {
    const { repository } = setup(report, tester, [first])
    repository.postReportComment.mockRejectedValueOnce(new ReportError('validation', 'Check comment text'))
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Reply to Question author' }))
    type('Keep this text')
    post()
    await screen.findByText('Check comment text')
    expect(comment().value).toBe('Keep this text')
    expect(screen.getByRole('button', { name: 'Cancel reply' })).toBeTruthy()
  })
  it.each(['mutation', 'readback'])('comment_%sFailure_requiresReadOnlyReloadWithoutAutomaticRepost', async failure => {
    const { repository } = setup()
    await ready()
    type('Uncertain text')
    if (failure === 'mutation') repository.postReportComment.mockRejectedValueOnce(new ReportError('unavailable', 'Offline'))
    else repository.listReportComments.mockRejectedValueOnce(new ReportError('unavailable', 'Offline'))
    post()
    const reload = await screen.findByRole('button', { name: 'Reload' })
    expect(screen.getAllByRole('alert').some(item => /may have been saved|confirm|uncertain/i.test(item.textContent ?? ''))).toBe(true)
    expect(comment().value).toBe('Uncertain text')
    expect((screen.getByRole('button', { name: 'Post comment' }) as HTMLButtonElement).disabled).toBe(true)
    repository.listReportComments.mockResolvedValue([second])
    fireEvent.click(reload)
    await screen.findByText(/literal\(\)/)
    expect(repository.postReportComment).toHaveBeenCalledOnce()
    expect(comment().value).toBe('Uncertain text')
  })
  it.each(['discussion', 'activity'])('section_%sLoadFails_retainsReadableReportAndRetriesSection', async section => {
    const { repository } = setup()
    if (section === 'discussion') repository.listReportComments.mockRejectedValueOnce(new ReportError('unavailable', 'Offline'))
    else repository.listReportHistory.mockRejectedValueOnce(new ReportError('unavailable', 'Offline'))
    await screen.findByRole('heading', { name: report.title })
    if (section === 'activity') fireEvent.click(screen.getByRole('tab', { name: 'Activity' }))
    const retry = await screen.findByRole('button', { name: `Retry ${section}` })
    expect(screen.getByRole('heading', { name: report.title })).toBeTruthy()
    expect(screen.queryByText(/Report not found/i)).toBeNull()
    if (section === 'discussion') expect(screen.queryByRole('button', { name: 'Discussion (0)' })).toBeNull()
    const reportReads = repository.getReport.mock.calls.length
    fireEvent.click(retry)
    await waitFor(() => expect(section === 'discussion' ? repository.listReportComments : repository.listReportHistory).toHaveBeenCalledTimes(2))
    expect(repository.getReport).toHaveBeenCalledTimes(reportReads)
  })
  it('comment_pendingCompletionAfterNavigation_doesNotPopulateReplacementReport', async () => {
    const { repository, router } = setup()
    const pending = deferred<ReportComment>()
    repository.postReportComment.mockReturnValueOnce(pending.promise)
    await ready()
    type('Old report input')
    post()
    const replacement = { ...report, id: '20000000-0000-4000-8000-000000000002', title: 'Replacement report' }
    repository.getReport.mockResolvedValue(replacement)
    await act(async () => { await router.navigate(`/reports/${replacement.id}`) })
    await screen.findByRole('heading', { name: replacement.title })
    const reads = repository.listReportComments.mock.calls.length
    await act(async () => pending.resolve(second))
    expect(repository.listReportComments).toHaveBeenCalledTimes(reads)
    expect(comment().value).toBe('')
    expect(screen.queryByText(/literal\(\)/)).toBeNull()
  })
})
