// @vitest-environment jsdom
import { MantineProvider } from '@mantine/core'
import type { ReactElement } from 'react'
import { createElement, StrictMode } from 'react'
import { act, cleanup, fireEvent, render as testingRender, screen, waitFor } from '@testing-library/react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ReportError, type Report } from '../features/reports/types'

const { service, projects, reports } = vi.hoisted(() => ({
  service: {
    getCurrentSession: vi.fn(), loadIdentity: vi.fn(), signIn: vi.fn(),
    signOut: vi.fn(), onAuthStateChange: vi.fn(),
  },
  projects: {
    listActiveProjects: vi.fn(), getProject: vi.fn(), listProjectHistory: vi.fn(),
    createProject: vi.fn(), updateProject: vi.fn(),
  },
  reports: { awaitTesterInformation: vi.fn(), resumeInvestigation: vi.fn(), listReportComments: vi.fn().mockResolvedValue([]), postReportComment: vi.fn(), acceptReport: vi.fn(), startInvestigation: vi.fn(), createReport: vi.fn(), getReport: vi.fn(), listReportHistory: vi.fn(), saveDraft: vi.fn(), getDraft: vi.fn() },
}))

vi.mock('../shared/lib/supabaseClient.js', () => ({ supabase: {} }))
vi.mock('../features/projects/projectRepository', () => ({ createProjectRepository: () => projects }))
vi.mock('../features/reports/reportRepository', () => ({ createReportRepository: () => reports }))
vi.mock('../features/auth/authService', async importOriginal => ({
  ...await importOriginal<typeof import('../features/auth/authService')>(),
  createAuthService: () => service,
}))

import AuthenticatedApp from '../features/auth/AuthenticatedApp'

Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: (query: string) => ({
  matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false,
}) })

function render(element: ReactElement) {
  return testingRender(createElement(MantineProvider, { env: 'test' }, element))
}

const testerId = '10000000-0000-4000-8000-000000000001'
const otherId = '10000000-0000-4000-8000-000000000002'
const projectId = '20000000-0000-4000-8000-000000000001'
const reportId = '30000000-0000-4000-8000-000000000001'
const title = 'Unsaved report title'
let callback: (event: AuthChangeEvent, session: Session | null) => void
const session = (id: string) => ({ user: { id } } as Session)

beforeEach(() => {
  vi.resetAllMocks()
  reports.listReportComments.mockResolvedValue([])
  window.history.replaceState({}, '', '/reports/new')
  service.getCurrentSession.mockResolvedValueOnce(session(testerId)).mockResolvedValue(null)
  service.loadIdentity.mockImplementation(async (id: string) => ({
    id, role: 'tester', username: id === testerId ? 'first' : 'second',
    displayName: id === testerId ? 'First Tester' : 'Second Tester',
  }))
  service.onAuthStateChange.mockImplementation(listener => { callback = listener; return () => undefined })
  service.signOut.mockResolvedValue(undefined)
  projects.listActiveProjects.mockResolvedValue([{ id: projectId, name: 'Project', archivedAt: null }])
})
afterEach(cleanup)

async function openForm() {
  render(createElement(AuthenticatedApp))
  fireEvent.change(await screen.findByLabelText(/^Title\b/i), { target: { value: title } })
}

function fillRemainingFields() {
  for (const [label, value] of [
    [/^Project\b/i, projectId], [/^Description\b/i, 'A bug'], [/^Version\b/i, '1.2'],
    [/^Reproduction steps\b/i, 'Open the page'], [/^Expected results\b/i, 'Opens'],
    [/^Actual results\b/i, 'Fails'], [/^Severity\b/i, 'high'],
  ] as const) fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

it.each(['SIGNED_IN', 'TOKEN_REFRESHED'] as const)('reportForm_sameUser%s_preservesUnsavedInput', async event => {
  await openForm()
  await act(async () => { callback(event, session(testerId)) })
  expect((screen.getByLabelText(/^Title\b/i) as HTMLInputElement).value).toBe(title)
})

it('reportForm_sessionLoss_clearsProtectedForm', async () => {
  await openForm()
  await act(async () => { callback('SIGNED_OUT', null) })
  await screen.findByRole('button', { name: 'Log in' })
  expect(screen.queryByLabelText(/^Title\b/i)).toBeNull()
  expect(screen.queryByRole('navigation', { name: 'Workspace navigation' })).toBeNull()
})

it('workspace_logoutPending_immediatelyRemovesNavigationAndUnsavedForm', async () => {
  let finish!: () => void
  service.signOut.mockReturnValueOnce(new Promise<void>(resolve => { finish = resolve }))
  await openForm()
  expect(screen.getByRole('navigation', { name: 'Workspace navigation' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
  await screen.findByRole('button', { name: 'Log in' })
  expect(service.signOut).toHaveBeenCalledOnce()
  expect(screen.queryByRole('navigation', { name: 'Workspace navigation' })).toBeNull()
  expect(screen.queryByLabelText(/^Title\b/i)).toBeNull()
  await act(async () => { finish() })
  expect(screen.queryByRole('navigation', { name: 'Workspace navigation' })).toBeNull()
})

it('workspace_logoutFailure_keepsProtectedContentRemovedAndOffersRetry', async () => {
  service.signOut.mockRejectedValueOnce(new Error('Connection lost'))
  await openForm()
  fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
  expect(await screen.findByRole('button', { name: 'Retry' })).toBeTruthy()
  expect(screen.queryByRole('navigation', { name: 'Workspace navigation' })).toBeNull()
  expect(screen.queryByLabelText(/^Title\b/i)).toBeNull()
  expect(screen.getAllByRole('alert').some(alert => /Authentication is unavailable/.test(alert.textContent ?? ''))).toBe(true)
})

it('workspace_menuToggle_keepsUnsavedFormAndDoesNotReloadProjects', async () => {
  await openForm()
  const menu = screen.getByRole('button', { name: 'Toggle navigation' })
  fireEvent.click(menu)
  fireEvent.click(menu)
  expect((screen.getByLabelText(/^Title\b/i) as HTMLInputElement).value).toBe(title)
  expect(projects.listActiveProjects).toHaveBeenCalledOnce()
  expect(reports.saveDraft).not.toHaveBeenCalled()
})

it('reportForm_userReplacement_clearsFirstUserInputAndIgnoresOldSubmission', async () => {
  let complete!: (value: Pick<Report, 'id'>) => void
  reports.createReport.mockReturnValueOnce(new Promise<Pick<Report, 'id'>>(resolve => { complete = resolve }))
  await openForm()
  fillRemainingFields()
  fireEvent.click(screen.getByRole('button', { name: 'Submit report' }))
  expect(reports.createReport).toHaveBeenCalledOnce()
  await act(async () => { callback('SIGNED_IN', session(otherId)) })
  await screen.findByText(/Second Tester/)
  const replacement = await screen.findByLabelText(/^Title\b/i) as HTMLInputElement
  expect(replacement.value).toBe('')
  await act(async () => { complete({ id: reportId }) })
  expect(window.location.pathname).toBe('/reports/new')
  expect(reports.getReport).not.toHaveBeenCalled()
})

it('reportForm_expiredPersistenceSession_rechecksAuthAndRemovesInput', async () => {
  reports.createReport.mockRejectedValueOnce(new ReportError('unauthenticated', 'Session ended'))
  await openForm()
  fillRemainingFields()
  fireEvent.click(screen.getByRole('button', { name: 'Submit report' }))
  await screen.findByRole('button', { name: 'Log in' })
  expect(service.getCurrentSession).toHaveBeenCalledTimes(2)
  expect(screen.queryByLabelText(/^Title\b/i)).toBeNull()
})

it.each(['different user', 'same user after logout'] as const)(
  'reportForm_staleUnauthorizedFailureAfter%s_doesNotRetryAuthOrClearNewInput',
  async replacement => {
    let reject!: (error: Error) => void
    reports.createReport.mockReturnValueOnce(new Promise<never>((_, fail) => { reject = fail }))
    await openForm()
    fillRemainingFields()
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }))
    expect(reports.createReport).toHaveBeenCalledOnce()

    if (replacement === 'same user after logout') {
      await act(async () => { callback('SIGNED_OUT', null) })
      await screen.findByRole('button', { name: 'Log in' })
    }
    const id = replacement === 'different user' ? otherId : testerId
    await act(async () => { callback('SIGNED_IN', session(id)) })
    const field = await screen.findByLabelText(/^Title\b/i) as HTMLInputElement
    expect(field.value).toBe('')
    const replacementTitle = 'Replacement session input'
    fireEvent.change(field, { target: { value: replacementTitle } })

    await act(async () => { reject(new ReportError('unauthenticated', 'Old session ended')) })
    expect(service.getCurrentSession).toHaveBeenCalledTimes(1)
    expect((screen.getByLabelText(/^Title\b/i) as HTMLInputElement).value).toBe(replacementTitle)
  },
)

it('draftSave_firstSaveWithReadUnavailable_keepsSavedFormOpenWithoutReading', async () => {
  const draft = {
    id: reportId, projectId, projectName: 'Project', projectArchivedAt: null,
    title, description: '', version: '', reproductionSteps: '', expectedResults: '',
    actualResults: '', severity: '' as const, testEnvironment: '', updatedAt: '2026-11-05T09:30:00Z',
  }
  reports.saveDraft.mockResolvedValue(draft)
  reports.getDraft.mockRejectedValue(new ReportError('unavailable', 'Offline'))
  await openForm()
  fireEvent.change(await screen.findByLabelText(/^Project\b/i), { target: { value: projectId } })
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await screen.findByRole('heading', { name: 'Edit draft' })
  await screen.findByText('Draft saved')
  expect(window.location.pathname).toBe(`/drafts/${reportId}`)
  expect((await screen.findByLabelText(/^Title\b/i) as HTMLInputElement).value).toBe(title)
  expect(reports.getDraft).not.toHaveBeenCalled()
  await waitFor(() => expect((screen.getByRole('button', { name: 'Save draft' }) as HTMLButtonElement).disabled).toBe(false))
  fireEvent.change(screen.getByLabelText(/^Title\b/i), { target: { value: 'Next edit' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await waitFor(() => expect(reports.saveDraft).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Next edit' }), reportId))
})

it('authenticatedRouter_strictMode_mountsAndHandlesNavigation', async () => {
  service.getCurrentSession.mockReset().mockResolvedValue(session(testerId))
  render(createElement(StrictMode, null, createElement(AuthenticatedApp)))
  expect(await screen.findByLabelText(/^Title\b/i)).toBeTruthy()
  fireEvent.click(screen.getByRole('link', { name: 'Back to projects' }))
  expect(await screen.findByRole('heading', { name: 'Active projects' })).toBeTruthy()
})

it('draftSave_projectReloadFails_keepsSavedFormAndRetriesBeforeWriting', async () => {
  const draft = {
    id: reportId, projectId, projectName: 'Project', projectArchivedAt: null,
    title, description: '', version: '', reproductionSteps: '', expectedResults: '',
    actualResults: '', severity: '' as const, testEnvironment: '', updatedAt: '2026-11-05T09:30:00Z',
  }
  projects.listActiveProjects.mockResolvedValueOnce([{ id: projectId, name: 'Project', archivedAt: null }])
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValue([{ id: projectId, name: 'Project', archivedAt: null }])
  reports.saveDraft.mockResolvedValue(draft)
  reports.getDraft.mockRejectedValue(new ReportError('unavailable', 'Offline'))
  await openForm()
  fireEvent.change(screen.getByLabelText(/^Project\b/i), { target: { value: projectId } })
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await screen.findByRole('alert')
  expect((screen.getByLabelText(/^Title\b/i) as HTMLInputElement).value).toBe(title)
  expect(screen.getByText('Draft saved')).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Save draft' }) as HTMLButtonElement).disabled).toBe(true)
  expect((screen.getByRole('button', { name: 'Submit report' }) as HTMLButtonElement).disabled).toBe(true)
  expect(reports.getDraft).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await waitFor(() => expect((screen.getByRole('button', { name: 'Save draft' }) as HTMLButtonElement).disabled).toBe(false))
  fireEvent.change(screen.getByLabelText(/^Title\b/i), { target: { value: 'Next edit' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  expect(reports.saveDraft).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Next edit' }), reportId)
})


function workflowReport(state: Report['state'] = 'Open'): Report {
  const assigned = state !== 'Open'
  return { id: reportId, projectId, title: 'Protected workflow report', description: 'Bug', version: '1', reproductionSteps: 'Open', expectedResults: 'Works', actualResults: 'Fails', severity: 'low', testEnvironment: '', reporterId: otherId, reporterUsername: 'tester', reporterDisplayName: 'Tester', projectName: 'Project', projectArchivedAt: null, state, assignedDeveloperId: assigned ? testerId : null, assignedAt: assigned ? '2026-11-07T10:00:00Z' : null, assignedDeveloperUsername: assigned ? 'dev' : null, assignedDeveloperDisplayName: assigned ? 'Developer' : null, createdAt: '2026-11-07T09:00:00Z', updatedAt: '2026-11-07T10:00:00Z' }
}
async function openWorkflow(state: Report['state'] = 'Open') {
  window.history.replaceState({}, '', `/reports/${reportId}`)
  service.loadIdentity.mockImplementation(async (id: string) => ({ id, role: 'developer', username: id === testerId ? 'first' : 'second', displayName: id === testerId ? 'First Developer' : 'Second Developer' }))
  reports.getReport.mockResolvedValue(workflowReport(state))
  reports.listReportHistory.mockResolvedValue([])
  render(createElement(AuthenticatedApp))
  await screen.findByRole('heading', { name: 'Protected workflow report' })
}
it.each([['acceptReport', 'Open', 'Accept report'], ['startInvestigation', 'Accepted', 'Start investigation'], ['awaitTesterInformation', 'In progress', 'Await tester information'], ['resumeInvestigation', 'Awaiting tester information', 'Resume investigation']] as const)('workflow_%sExpiredSession_rechecksAuthAndClearsProtectedContent', async (method, state, label) => {
  reports[method].mockRejectedValueOnce(new ReportError('unauthenticated', 'Session ended'))
  await openWorkflow(state)
  fireEvent.click(screen.getByRole('button', { name: label }))
  await screen.findByRole('button', { name: 'Log in' })
  expect(service.getCurrentSession).toHaveBeenCalledTimes(2)
  expect(screen.queryByRole('heading', { name: 'Protected workflow report' })).toBeNull()
  expect(reports[method]).toHaveBeenCalledExactlyOnceWith(reportId)
})
it.each(['logout', 'identity replacement', 'stale expiry'] as const)('workflow_acceptanceCompletionAfter%s_doesNotRestoreOldProtectedState', async replacement => {
  let complete!: (value: Report) => void
  let reject!: (reason: Error) => void
  reports.acceptReport.mockReturnValueOnce(new Promise<Report>((resolve, fail) => { complete = resolve; reject = fail }))
  await openWorkflow()
  fireEvent.click(screen.getByRole('button', { name: 'Accept report' }))
  expect(reports.acceptReport).toHaveBeenCalledOnce()
  if (replacement === 'logout') {
    await act(async () => { callback('SIGNED_OUT', null) })
    await screen.findByRole('button', { name: 'Log in' })
  } else {
    reports.getReport.mockResolvedValue({ ...workflowReport(), title: 'Replacement identity report' })
    await act(async () => { callback('SIGNED_IN', session(otherId)) })
    await screen.findByRole('heading', { name: 'Replacement identity report' })
  }
  const reads = reports.getReport.mock.calls.length
  await act(async () => { if (replacement === 'stale expiry') reject(new ReportError('unauthenticated', 'Old session ended')); else complete(workflowReport('Accepted')) })
  expect(reports.getReport).toHaveBeenCalledTimes(reads)
  expect(service.getCurrentSession).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('heading', { name: 'Protected workflow report' })).toBeNull()
  if (replacement !== 'logout') expect(screen.getByRole('heading', { name: 'Replacement identity report' })).toBeTruthy()
})

it('discussion_postExpiredSession_rechecksAuthAndClearsUnsentText', async () => {
  reports.postReportComment.mockRejectedValueOnce(new ReportError('unauthenticated', 'Session ended'))
  await openWorkflow('In progress')
  fireEvent.change(await screen.findByRole('textbox', { name: 'Comment' }), { target: { value: 'Private unsent comment' } })
  fireEvent.click(screen.getByRole('button', { name: 'Post comment' }))
  await screen.findByRole('button', { name: 'Log in' })
  expect(service.getCurrentSession).toHaveBeenCalledTimes(2)
  expect(screen.queryByRole('textbox', { name: 'Comment' })).toBeNull()
  expect(screen.queryByText('Private unsent comment')).toBeNull()
})

it('discussion_staleUnauthorizedPostAfterIdentityReplacement_keepsReplacementSession', async () => {
  let reject!: (reason: Error) => void
  reports.postReportComment.mockReturnValueOnce(new Promise<never>((_, fail) => { reject = fail }))
  await openWorkflow('In progress')
  fireEvent.change(await screen.findByRole('textbox', { name: 'Comment' }), { target: { value: 'Old session text' } })
  fireEvent.click(screen.getByRole('button', { name: 'Post comment' }))
  reports.getReport.mockResolvedValue({ ...workflowReport('In progress'), title: 'Replacement discussion' })
  await act(async () => { callback('SIGNED_IN', session(otherId)) })
  await screen.findByRole('heading', { name: 'Replacement discussion' })
  const replacement = await screen.findByRole('textbox', { name: 'Comment' }) as HTMLTextAreaElement
  expect(replacement.value).toBe('')
  fireEvent.change(replacement, { target: { value: 'Replacement session text' } })
  await act(async () => reject(new ReportError('unauthenticated', 'Old session ended')))
  expect(service.getCurrentSession).toHaveBeenCalledTimes(1)
  expect(replacement.value).toBe('Replacement session text')
  expect(screen.getByRole('heading', { name: 'Replacement discussion' })).toBeTruthy()
})
