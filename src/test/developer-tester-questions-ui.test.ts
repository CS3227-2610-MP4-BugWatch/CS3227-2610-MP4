// @vitest-environment jsdom
import { MantineProvider } from '@mantine/core'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { ReportDetailsPage } from '../features/reports/ReportDetailsPage'
import { requestTesterQuestions, TesterQuestionError } from '../features/reports/testerQuestionClient'
import { questionContextVersion } from '../features/reports/testerQuestionTypes'
import type { TesterQuestionResult } from '../features/reports/testerQuestionTypes'
import type { Report, ReportComment, ReportRepository } from '../features/reports/types'
import type { SessionUser } from '../shared/types/session'

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }))
vi.mock('../shared/lib/supabaseClient.js', () => ({ supabase: { auth: { getSession } } }))

Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: (query: string) => ({ matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false }) })
const developer: SessionUser = { id: '10000000-0000-4000-8000-000000000001', role: 'developer', username: 'dev', displayName: 'Developer' }
const tester: SessionUser = { ...developer, id: '10000000-0000-4000-8000-000000000002', role: 'tester' }
const id = '20000000-0000-4000-8000-000000000001'
const time = '2026-11-07T10:00:00Z'
const report: Report = { resolution: null, canonicalReport: null, id, projectId: '30000000-0000-4000-8000-000000000001', title: 'Question report', description: 'Current report description', version: '1', reproductionSteps: 'Open', expectedResults: 'Works', actualResults: 'Fails', severity: 'high', testEnvironment: 'Chrome', reporterId: tester.id, reporterUsername: 'tester', reporterDisplayName: 'Tester', projectName: 'Project', projectArchivedAt: null, state: 'In progress', assignedDeveloperId: developer.id, assignedAt: time, assignedDeveloperUsername: 'dev', assignedDeveloperDisplayName: 'Developer', createdAt: time, updatedAt: time }
const first: ReportComment = { id: '40000000-0000-4000-8000-000000000001', reportId: id, authorId: developer.id, authorUsername: 'dev', authorDisplayName: 'Question author', body: 'Which browser?', replyToCommentId: null, createdAt: time }
const answer: ReportComment = { ...first, id: '40000000-0000-4000-8000-000000000002', authorId: tester.id, body: 'Chrome 130', replyToCommentId: first.id }
const question = 'Does this happen in a clean browser profile?'
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function setup(initial = report, user = developer, discussion: ReportComment[] = []) {
  const repository = {
    listDrafts: vi.fn(), getDraft: vi.fn(), saveDraft: vi.fn(), deleteDraft: vi.fn(), submitDraft: vi.fn(), createReport: vi.fn(),
    getReport: vi.fn().mockResolvedValue(initial), listReportHistory: vi.fn().mockResolvedValue([]), listProjectReports: vi.fn().mockResolvedValue([]),
    acceptReport: vi.fn(), startInvestigation: vi.fn(), awaitTesterInformation: vi.fn().mockResolvedValue({ ...initial, state: 'Awaiting tester information' }), resumeInvestigation: vi.fn(),
    resolveReport: vi.fn(), linkDuplicate: vi.fn(),
    listReportComments: vi.fn().mockResolvedValue(discussion), postReportComment: vi.fn().mockResolvedValue(answer),
  } satisfies ReportRepository
  const result: TesterQuestionResult = { questions: [question], contextVersion: questionContextVersion({ report: initial, discussion }) }
  const generate = vi.fn().mockResolvedValue(result)
  const element = (account: SessionUser) => createElement(ReportDetailsPage, { reportRepository: repository, user: account, generateTesterQuestions: generate })
  const router = createMemoryRouter([{ path: '/reports/:reportId', element: element(user) }, { path: '/away', element: createElement('p', null, 'Other screen') }], { initialEntries: [`/reports/${id}`] })
  const view = render(createElement(MantineProvider, { env: 'test' }, createElement(RouterProvider, { router })))
  return { repository, generate, result, router, view, element }
}
const composer = () => screen.getByRole('textbox', { name: 'Comment' }) as HTMLTextAreaElement
const generateButton = () => screen.getByRole('button', { name: /Generate tester questions|Generate again/ }) as HTMLButtonElement
const ready = async () => { await screen.findByRole('textbox', { name: 'Comment' }) }
const type = (text: string) => fireEvent.change(composer(), { target: { value: text } })
const reloadDiscussion = () => {
  type('Manual follow-up')
  fireEvent.click(screen.getByRole('button', { name: 'Post comment' }))
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

it.each(['Accepted', 'In progress', 'Awaiting tester information'] as const)('testerQuestionsUi_eligible%s_exposesExplicitGenerationOnly', async state => {
  const { generate } = setup({ ...report, state })
  await ready()
  expect(generateButton().disabled).toBe(false)
  expect(generate).not.toHaveBeenCalled()
  fireEvent.click(generateButton())
  await screen.findByText(question)
  expect(generate).toHaveBeenCalledExactlyOnceWith({ reportId: id }, expect.any(AbortSignal))
})
it.each([
  ['Tester', report, tester], ['other Developer', report, { ...developer, id: 'other' }],
  ['Open', { ...report, state: 'Open' as const, assignedDeveloperId: null }, developer],
  ['archived', { ...report, projectArchivedAt: time }, developer],
])('testerQuestionsUi_%s_hidesAssistant', async (_name, initial, user) => {
  const { generate } = setup(initial as Report, user as SessionUser)
  await screen.findByRole('heading', { name: report.title })
  expect(screen.queryByRole('button', { name: /Generate tester questions/ })).toBeNull()
  expect(generate).not.toHaveBeenCalled()
})
it('testerQuestionsUi_generateAndCopy_keepsComposerReplyAndReportUntouched', async () => {
  const { repository } = setup(report, developer, [first])
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  await ready()
  fireEvent.click(screen.getByRole('button', { name: /Reply/ }))
  type('Existing manual reply')
  fireEvent.click(generateButton())
  await screen.findByText(question)
  expect(screen.queryByRole('textbox', { name: /AI|suggestion|question/i })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Copy question 1' }))
  await screen.findByText(/Question copied/)
  expect(writeText).toHaveBeenCalledExactlyOnceWith(question)
  expect(composer().value).toBe('Existing manual reply')
  expect(screen.getByRole('button', { name: /Cancel reply/ })).toBeTruthy()
  expect(repository.postReportComment).not.toHaveBeenCalled()
  expect(repository.awaitTesterInformation).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Post comment' }))
  await waitFor(() => expect(repository.postReportComment).toHaveBeenCalledExactlyOnceWith(id, { body: 'Existing manual reply', replyToCommentId: first.id }))
})
it('testerQuestionsUi_clipboardFailure_keepsSelectableQuestionAndManualComposer', async () => {
  setup()
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('blocked')) } })
  await ready()
  fireEvent.click(generateButton())
  await screen.findByText(question)
  fireEvent.click(screen.getByRole('button', { name: 'Copy question 1' }))
  await screen.findByText(/copy it manually/)
  expect(screen.getByText(question)).toBeTruthy()
  expect(composer().disabled).toBe(false)
})
it('testerQuestionsUi_emptyResult_explainsNoUsefulFollowUp', async () => {
  const { generate, result } = setup()
  generate.mockResolvedValue({ ...result, questions: [] })
  await ready()
  fireEvent.click(generateButton())
  await screen.findByText(/No useful follow-up questions/)
  expect(screen.queryByRole('button', { name: 'Copy question 1' })).toBeNull()
})
it('testerQuestionsUi_repeatedClicks_runsOneRequestAndLeavesComposerUsable', async () => {
  const { generate, result } = setup()
  const pending = deferred<TesterQuestionResult>()
  generate.mockReturnValue(pending.promise)
  await ready()
  fireEvent.click(generateButton())
  fireEvent.click(generateButton())
  expect(generateButton().disabled).toBe(true)
  expect(generate).toHaveBeenCalledTimes(1)
  type('Manual while waiting')
  expect((screen.getByRole('button', { name: 'Post comment' }) as HTMLButtonElement).disabled).toBe(false)
  await act(async () => pending.resolve(result))
  expect(composer().value).toBe('Manual while waiting')
})
it('testerQuestionsUi_tabsAndReloadedDiscussion_retainsOutdatedOutputAndFailedRegeneration', async () => {
  const { repository, generate } = setup(report, developer, [first])
  await ready()
  fireEvent.click(generateButton())
  await screen.findByText(question)
  fireEvent.click(screen.getByRole('tab', { name: 'Activity' }))
  fireEvent.click(screen.getByRole('tab', { name: 'Conversation' }))
  expect(screen.getByText(question)).toBeTruthy()
  repository.listReportComments.mockResolvedValue([first, answer])
  reloadDiscussion()
  await screen.findByText(/suggestions are outdated/)
  expect(screen.getByText(question)).toBeTruthy()
  expect(generate).toHaveBeenCalledTimes(1)
  generate.mockRejectedValueOnce(new Error('private failure'))
  fireEvent.click(generateButton())
  await screen.findByRole('alert')
  expect(screen.getByText(question)).toBeTruthy()
  expect(screen.getByText(/suggestions are outdated/)).toBeTruthy()
  expect(screen.queryByText('private failure')).toBeNull()
})
it('testerQuestionsUi_contextChangesDuringGeneration_marksLateResultOutdated', async () => {
  const { repository, generate, result } = setup()
  const pending = deferred<TesterQuestionResult>()
  generate.mockReturnValue(pending.promise)
  await ready()
  fireEvent.click(generateButton())
  repository.listReportComments.mockResolvedValue([answer])
  reloadDiscussion()
  await screen.findByText(answer.body)
  await act(async () => pending.resolve(result))
  expect(screen.getByText(/suggestions are outdated/)).toBeTruthy()
  expect(generate).toHaveBeenCalledTimes(1)
})
it('testerQuestionsUi_rateLimitOnly_disablesGenerationUntilRetryBoundary', async () => {
  const { generate } = setup()
  await ready()
  generate.mockRejectedValueOnce(new TesterQuestionError('rate_limited', 1500))
  vi.useFakeTimers()
  await act(async () => fireEvent.click(generateButton()))
  expect(screen.getByRole('alert').textContent).toContain('2 seconds')
  expect(generateButton().disabled).toBe(true)
  type('Manual comment')
  expect((screen.getByRole('button', { name: 'Post comment' }) as HTMLButtonElement).disabled).toBe(false)
  act(() => vi.advanceTimersByTime(1499))
  expect(generateButton().disabled).toBe(true)
  act(() => vi.advanceTimersByTime(1))
  expect(generateButton().disabled).toBe(false)
})

it('testerQuestionsUi_sixthAttemptRateLimited_preservesFifthResultAndManualComposer', async () => {
  const { generate, result } = setup()
  await ready()
  for (let attempt = 1; attempt <= 5; attempt++) {
    generate.mockResolvedValueOnce({ ...result, questions: [`Question from attempt ${attempt}?`] })
    fireEvent.click(generateButton())
    await screen.findByText(`Question from attempt ${attempt}?`)
  }
  generate.mockRejectedValueOnce(new TesterQuestionError('rate_limited', 1000))
  type('Still editable')
  fireEvent.click(generateButton())
  await screen.findByText(/Question limit reached/)
  expect(generate).toHaveBeenCalledTimes(6)
  expect(generateButton().disabled).toBe(true)
  expect(screen.getByText('Question from attempt 5?')).toBeTruthy()
  expect(composer().value).toBe('Still editable')
})
it('testerQuestionsUi_oversizedContext_showsClearRefusalWithoutBlockingManualDiscussion', async () => {
  const { generate } = setup()
  generate.mockRejectedValueOnce(new TesterQuestionError('context_too_large'))
  await ready()
  type('Keep this')
  fireEvent.click(generateButton())
  await screen.findByText(/full report and discussion are too large/)
  expect(composer().value).toBe('Keep this')
  expect(generate).toHaveBeenCalledTimes(1)
})
it('testerQuestionsUi_reportDeparture_abortsAndIgnoresLateCompletion', async () => {
  const { generate, result, router } = setup()
  const pending = deferred<TesterQuestionResult>()
  generate.mockReturnValue(pending.promise)
  await ready()
  fireEvent.click(generateButton())
  const signal = generate.mock.calls[0][1] as AbortSignal
  await act(async () => router.navigate('/away'))
  await act(async () => pending.resolve(result))
  expect(signal.aborted).toBe(true)
  expect(screen.queryByText(question)).toBeNull()
  await act(async () => router.navigate(`/reports/${id}`))
  await ready()
  expect(screen.queryByText(question)).toBeNull()
})
it('testerQuestionsUi_reportReplacement_cannotReceiveEarlierReportOutput', async () => {
  const { repository, generate, result, router } = setup()
  const pending = deferred<TesterQuestionResult>()
  generate.mockReturnValue(pending.promise)
  await ready()
  fireEvent.click(generateButton())
  repository.getReport.mockResolvedValue({ ...report, id: '20000000-0000-4000-8000-000000000002', title: 'Replacement report' })
  await act(async () => router.navigate('/reports/20000000-0000-4000-8000-000000000002'))
  await screen.findByRole('heading', { name: 'Replacement report' })
  await act(async () => pending.resolve(result))
  expect(screen.queryByText(question)).toBeNull()
})

it('testerQuestionsUi_accountReplacement_abortsAndDiscardsPreviousAccountResult', async () => {
  const { repository, generate, result, element, view } = setup()
  const pending = deferred<TesterQuestionResult>()
  generate.mockReturnValue(pending.promise)
  await ready()
  fireEvent.click(generateButton())
  const signal = generate.mock.calls[0][1] as AbortSignal
  const otherDeveloper = { ...developer, id: '10000000-0000-4000-8000-000000000003' }
  repository.getReport.mockResolvedValue({ ...report, assignedDeveloperId: otherDeveloper.id })
  const replacementRouter = createMemoryRouter([{ path: '/reports/:reportId', element: element(otherDeveloper) }], { initialEntries: [`/reports/${id}`] })
  view.rerender(createElement(MantineProvider, { env: 'test' }, createElement(RouterProvider, { router: replacementRouter })))
  await ready()
  await act(async () => pending.resolve(result))
  expect(signal.aborted).toBe(true)
  expect(screen.queryByText(question)).toBeNull()
})

it('testerQuestionsUi_eligibilityLossDiscoveredDuringGeneration_clearsAndAborts', async () => {
  const { repository, generate, result } = setup()
  const pending = deferred<TesterQuestionResult>()
  generate.mockReturnValue(pending.promise)
  await ready()
  fireEvent.click(generateButton())
  const signal = generate.mock.calls[0][1] as AbortSignal
  repository.getReport.mockResolvedValue({ ...report, projectArchivedAt: time })
  fireEvent.click(screen.getByRole('button', { name: 'Await tester information' }))
  await waitFor(() => expect(screen.queryByRole('button', { name: /Generate tester questions/ })).toBeNull())
  await act(async () => pending.resolve(result))
  expect(signal.aborted).toBe(true)
  expect(screen.queryByText(question)).toBeNull()
})

it('testerQuestionsUi_newlyLoadedReportFields_marksExistingQuestionsOutdated', async () => {
  const { repository, generate } = setup()
  await ready()
  fireEvent.click(generateButton())
  await screen.findByText(question)
  repository.getReport.mockResolvedValue({ ...report, state: 'Awaiting tester information', description: 'Updated saved description' })
  fireEvent.click(screen.getByRole('button', { name: 'Await tester information' }))
  await screen.findByText(/suggestions are outdated/)
  expect(screen.getByText(question)).toBeTruthy()
  expect(generate).toHaveBeenCalledTimes(1)
})

it('testerQuestionsUi_eligibilityDeniedByServer_clearsPreviouslyVisibleQuestions', async () => {
  const { generate } = setup()
  await ready()
  fireEvent.click(generateButton())
  await screen.findByText(question)
  generate.mockRejectedValueOnce(new TesterQuestionError('forbidden'))
  fireEvent.click(generateButton())
  await screen.findByRole('alert')
  expect(screen.queryByText(question)).toBeNull()
})

it.each([false, true])('testerQuestionsUi_reportResolvedWithGenerationPending%s_clearsSuggestionsAndIgnoresLateOutput', async pendingGeneration => {
  const { repository, generate, result } = setup()
  const pending = deferred<TesterQuestionResult>()
  await ready()
  fireEvent.click(generateButton())
  await screen.findByText(question)
  if (pendingGeneration) {
    generate.mockReturnValueOnce(pending.promise)
    fireEvent.click(generateButton())
  }
  const resolved: Report = { ...report, state: 'Resolved', resolution: {
    kind: 'invalid', explanation: 'Expected behavior', authorId: developer.id,
    authorUsername: developer.username, authorDisplayName: developer.displayName, resolvedAt: time,
  } }
  repository.getReport.mockResolvedValue(resolved)
  repository.resolveReport.mockResolvedValue(resolved)
  fireEvent.click(screen.getByRole('button', { name: 'Resolve report' }))
  fireEvent.change(screen.getByLabelText('Resolution outcome'), { target: { value: 'invalid' } })
  fireEvent.change(screen.getByRole('textbox', { name: 'Explanation' }), { target: { value: 'Expected behavior' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save resolution' }))
  await screen.findByRole('heading', { name: 'Resolution' })
  expect(repository.resolveReport).toHaveBeenCalledExactlyOnceWith(id, { kind: 'invalid', explanation: 'Expected behavior' })
  expect(screen.queryByRole('region', { name: 'Suggested tester questions' })).toBeNull()
  expect(screen.queryByText(question)).toBeNull()
  if (pendingGeneration) {
    await waitFor(() => expect((generate.mock.calls[1][1] as AbortSignal).aborted).toBe(true))
    await act(async () => pending.resolve(result))
    expect(screen.queryByText(question)).toBeNull()
  }
})

it('testerQuestionsUi_discussionReadFailure_disablesGenerationRatherThanAssumingEmpty', async () => {
  const { repository, generate } = setup()
  repository.listReportComments.mockRejectedValue(new Error('private read error'))
  await screen.findByText(/Load the full discussion/)
  expect(generateButton().disabled).toBe(true)
  expect(generate).not.toHaveBeenCalled()
})

it('testerQuestionClient_currentSession_sendsOnlyReportIdAndSupportsEmptyQuestions', async () => {
  getSession.mockResolvedValue({ data: { session: { access_token: 'current-token' } }, error: null })
  const fetch = vi.fn().mockResolvedValue(Response.json({ questions: [], contextVersion: 'snapshot' }))
  vi.stubGlobal('fetch', fetch)
  const signal = new AbortController().signal
  await expect(requestTesterQuestions({ reportId: id }, signal)).resolves.toEqual({ questions: [], contextVersion: 'snapshot' })
  expect(fetch).toHaveBeenCalledExactlyOnceWith('/api/developer/tester-questions', {
    method: 'POST', signal, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer current-token' }, body: JSON.stringify({ reportId: id }),
  })
})

it.each([null, { session: null }])('testerQuestionClient_noCurrentSession%j_doesNotDispatch', async data => {
  getSession.mockResolvedValue({ data: data ?? {}, error: null })
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  await expect(requestTesterQuestions({ reportId: id }, new AbortController().signal)).rejects.toMatchObject({ code: 'unauthorized' })
  expect(fetch).not.toHaveBeenCalled()
})

it('testerQuestionClient_abortedDuringSessionLookup_doesNotDispatch', async () => {
  const pending = deferred<{ data: { session: { access_token: string } }; error: null }>()
  getSession.mockReturnValue(pending.promise)
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  const controller = new AbortController()
  const request = requestTesterQuestions({ reportId: id }, controller.signal)
  controller.abort()
  pending.resolve({ data: { session: { access_token: 'token' } }, error: null })
  await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  expect(fetch).not.toHaveBeenCalled()
})

it.each([
  ['rate limit', 429, { code: 'rate_limited', retryAfterMs: 1501 }, 'rate_limited', 1501],
  ['oversized context', 413, { code: 'context_too_large' }, 'context_too_large', 0],
  ['expired auth', 401, { code: 'unauthorized' }, 'unauthorized', 0],
  ['unsafe retry on server error', 502, { code: 'unavailable', retryAfterMs: 100 }, 'unavailable', 0],
  ['invalid negative retry', 429, { code: 'rate_limited', retryAfterMs: -5 }, 'rate_limited', 0],
] as const)('testerQuestionClient_%s_preservesSafeFailureAndDoesNotRetry', async (_name, status, body, code, retryAfterMs) => {
  getSession.mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null })
  const fetch = vi.fn().mockResolvedValue(Response.json(body, { status }))
  vi.stubGlobal('fetch', fetch)
  await expect(requestTesterQuestions({ reportId: id }, new AbortController().signal)).rejects.toMatchObject({ code, retryAfterMs })
  expect(fetch).toHaveBeenCalledTimes(1)
})

it.each([{ questions: [], contextVersion: '' }, { questions: [' '], contextVersion: 'snapshot' }, { questions: Array(6).fill('Question?'), contextVersion: 'snapshot' }, { contextVersion: 'snapshot' }])('testerQuestionClient_invalidSuccess%j_rejects', async body => {
  getSession.mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body)))
  await expect(requestTesterQuestions({ reportId: id }, new AbortController().signal)).rejects.toMatchObject({ code: 'unavailable' })
})

it('testerQuestionsUi_policyRefusalDuringRegeneration_preservesPriorOutdatedQuestionComposerAndReply', async () => {
  const { repository, generate } = setup(report, developer, [first])
  await ready()
  fireEvent.click(generateButton())
  await screen.findByText(question)
  repository.listReportComments.mockResolvedValue([first, answer])
  reloadDiscussion()
  await screen.findByText(/suggestions are outdated/)
  fireEvent.click(screen.getAllByRole('button', { name: 'Reply to Question author' })[0])
  type('Keep this manual reply')
  const postsBefore = repository.postReportComment.mock.calls.length
  getSession.mockResolvedValue({ data: { session: { access_token: 'current-token' } }, error: null })
  const fetch = vi.fn().mockResolvedValue(Response.json({ code: 'unavailable' }, { status: 502 }))
  vi.stubGlobal('fetch', fetch)
  generate.mockImplementationOnce(requestTesterQuestions)
  fireEvent.click(generateButton())
  await screen.findByRole('alert')
  expect(screen.getByText(question)).toBeTruthy()
  expect(screen.getByText(/suggestions are outdated/)).toBeTruthy()
  expect(composer().value).toBe('Keep this manual reply')
  expect(screen.getByRole('button', { name: /Cancel reply/ })).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Post comment' }) as HTMLButtonElement).disabled).toBe(false)
  expect(screen.getAllByRole('button', { name: /Copy question/ })).toHaveLength(1)
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(repository.postReportComment).toHaveBeenCalledTimes(postsBefore)
  expect(repository.awaitTesterInformation).not.toHaveBeenCalled()
})

it('testerQuestionsUi_mockedUrlCommandAndMarkup_areInertTextAndCopyRequiresExplicitAction', async () => {
  const { repository, generate, result } = setup()
  const questions = [
    'Does https://example.invalid/help match the address you saw?',
    'Did echo diagnostic print the expected output?',
    'Did <script>window.exampleAction()</script><img src="https://example.invalid/pixel"> appear as literal text?',
  ]
  generate.mockResolvedValue({ ...result, questions })
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  const open = vi.spyOn(window, 'open').mockImplementation(() => null)
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  await ready()
  type('Manual text')
  fireEvent.click(generateButton())
  await screen.findByText(questions[0])
  const region = screen.getByRole('region', { name: 'Suggested tester questions' })
  for (const text of questions) expect(within(region).getByText(text)).toBeTruthy()
  expect(region.querySelectorAll('a,script,img,iframe,form')).toHaveLength(0)
  fireEvent.click(within(region).getByText(questions[0]))
  expect(fetch).not.toHaveBeenCalled()
  expect(open).not.toHaveBeenCalled()
  expect(writeText).not.toHaveBeenCalled()
  expect(repository.postReportComment).not.toHaveBeenCalled()
  expect(repository.awaitTesterInformation).not.toHaveBeenCalled()
  expect(repository.startInvestigation).not.toHaveBeenCalled()
  expect(repository.acceptReport).not.toHaveBeenCalled()
  fireEvent.click(within(region).getByRole('button', { name: 'Copy question 3' }))
  await screen.findByText(/Question copied/)
  expect(writeText).toHaveBeenCalledExactlyOnceWith(questions[2])
  expect(composer().value).toBe('Manual text')
  expect(fetch).not.toHaveBeenCalled()
  expect(repository.postReportComment).not.toHaveBeenCalled()
})
