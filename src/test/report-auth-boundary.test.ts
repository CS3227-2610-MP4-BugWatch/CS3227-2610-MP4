// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
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
  reports: { createReport: vi.fn(), getReport: vi.fn(), listReportHistory: vi.fn() },
}))

vi.mock('../shared/lib/supabaseClient.js', () => ({ supabase: {} }))
vi.mock('../features/projects/projectRepository', () => ({ createProjectRepository: () => projects }))
vi.mock('../features/reports/reportRepository', () => ({ createReportRepository: () => reports }))
vi.mock('../features/auth/authService', async importOriginal => ({
  ...await importOriginal<typeof import('../features/auth/authService')>(),
  createAuthService: () => service,
}))

import AuthenticatedApp from '../features/auth/AuthenticatedApp'

const testerId = '10000000-0000-4000-8000-000000000001'
const otherId = '10000000-0000-4000-8000-000000000002'
const projectId = '20000000-0000-4000-8000-000000000001'
const reportId = '30000000-0000-4000-8000-000000000001'
const title = 'Unsaved report title'
let callback: (event: AuthChangeEvent, session: Session | null) => void
const session = (id: string) => ({ user: { id } } as Session)

beforeEach(() => {
  vi.resetAllMocks()
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
