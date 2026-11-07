// @vitest-environment jsdom
import { MantineProvider } from '@mantine/core'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ReportDetailsPage } from '../features/reports/ReportDetailsPage'
import { ProjectReportsPanel } from '../features/reports/ProjectReportsPanel'
import { ReportError, type Report, type ReportHistoryEntry, type ReportRepository } from '../features/reports/types'
import type { SessionUser } from '../shared/types/session'

Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: (query: string) => ({ matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false }) })
const developer: SessionUser = { id: '10000000-0000-4000-8000-000000000001', role: 'developer', username: 'dev', displayName: 'Developer' }
const tester: SessionUser = { ...developer, id: '10000000-0000-4000-8000-000000000002', role: 'tester', username: 'tester', displayName: 'Tester' }
const other = { ...developer, id: '10000000-0000-4000-8000-000000000003', username: 'other', displayName: 'Other developer' }
const id = '20000000-0000-4000-8000-000000000001'
const projectId = '30000000-0000-4000-8000-000000000001'
const time = '2026-11-07T09:30:00Z'
const assignedTime = '2026-11-07T10:00:00Z'
const open: Report = { id, projectId, title: 'Workflow report', description: 'Failure', version: '1', reproductionSteps: 'Open', expectedResults: 'Works', actualResults: 'Fails', severity: 'low', testEnvironment: '', reporterId: tester.id, reporterUsername: 'tester', reporterDisplayName: 'Tester', projectName: 'Project', projectArchivedAt: null, state: 'Open', assignedDeveloperId: null, assignedAt: null, assignedDeveloperUsername: null, assignedDeveloperDisplayName: null, createdAt: time, updatedAt: time }
const accepted: Report = { ...open, state: 'Accepted', assignedDeveloperId: developer.id, assignedAt: assignedTime, assignedDeveloperUsername: 'dev', assignedDeveloperDisplayName: 'Developer', updatedAt: assignedTime }
const progressing: Report = { ...accepted, state: 'In progress' }
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function setup(initial = open, actor = developer) {
  const repository = {
    listDrafts: vi.fn(), getDraft: vi.fn(), saveDraft: vi.fn(), deleteDraft: vi.fn(), submitDraft: vi.fn(), createReport: vi.fn(),
    getReport: vi.fn().mockResolvedValue(initial), listReportHistory: vi.fn().mockResolvedValue([]), listProjectReports: vi.fn().mockResolvedValue([initial]),
    acceptReport: vi.fn().mockResolvedValue(accepted), startInvestigation: vi.fn().mockResolvedValue(progressing),
  } satisfies ReportRepository
  const router = createMemoryRouter([{ path: '/reports/:reportId', element: createElement(ReportDetailsPage, { reportRepository: repository, user: actor }) }, { path: '/projects', element: createElement('h1', null, 'Projects destination') }], { initialEntries: [`/reports/${id}`] })
  const view = render(createElement(MantineProvider, { env: 'test' }, createElement(RouterProvider, { router })))
  return { repository, router, view }
}
afterEach(cleanup)
const action = (label: string) => screen.queryByRole('button', { name: label })
async function ready() { await screen.findByRole('heading', { name: open.title }) }

describe('report workflow detail controls', () => {
  it.each([
    [developer, open, 'Accept report'], [developer, accepted, 'Start investigation'],
    [other, accepted, null], [tester, open, null], [tester, accepted, null],
    [developer, progressing, null], [tester, progressing, null],
    [developer, { ...open, projectArchivedAt: time }, null], [developer, { ...accepted, projectArchivedAt: time }, null],
  ] as const)('reportDetails_$0.role/$1.state_archive$1.projectArchivedAt_showsOnlyEligibleAction', async (actor, report, expected) => {
    const { repository } = setup(report, actor)
    await ready()
    expect(Boolean(action('Accept report'))).toBe(expected === 'Accept report')
    expect(Boolean(action('Start investigation'))).toBe(expected === 'Start investigation')
    expect(repository.acceptReport).not.toHaveBeenCalled()
    expect(repository.startInvestigation).not.toHaveBeenCalled()
  })
  it('acceptReport_success_refreshesReportAndHistoryBeforeSeparateStart', async () => {
    const { repository, router } = setup()
    await ready()
    repository.getReport.mockResolvedValue(accepted)
    fireEvent.click(screen.getByRole('button', { name: 'Accept report' }))
    const start = await screen.findByRole('button', { name: 'Start investigation' })
    expect(repository.acceptReport).toHaveBeenCalledExactlyOnceWith(id)
    expect(repository.startInvestigation).not.toHaveBeenCalled()
    expect(repository.getReport).toHaveBeenCalledTimes(2)
    expect(repository.listReportHistory).toHaveBeenCalledTimes(2)
    expect(screen.getByText('Accepted', { exact: true })).toBeTruthy()
    expect(router.state.location.pathname).toBe(`/reports/${id}`)
    repository.getReport.mockResolvedValue(progressing)
    fireEvent.click(start)
    await screen.findByText('In progress', { exact: true })
    expect(repository.startInvestigation).toHaveBeenCalledExactlyOnceWith(id)
    expect(action('Start investigation')).toBeNull()
    expect(repository.getReport).toHaveBeenCalledTimes(3)
    expect(repository.listReportHistory).toHaveBeenCalledTimes(3)
  })
  it.each([['acceptReport', open, 'Accept report', accepted], ['startInvestigation', accepted, 'Start investigation', progressing]] as const)('%s_pending_blocksDuplicateRequests', async (method, initial, label, result) => {
    const { repository } = setup(initial)
    const pending = deferred<Report>()
    repository[method].mockReturnValueOnce(pending.promise)
    await ready()
    const button = screen.getByRole('button', { name: label }) as HTMLButtonElement
    fireEvent.click(button)
    fireEvent.click(button)
    expect(button.disabled).toBe(true)
    expect(repository[method]).toHaveBeenCalledOnce()
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
    repository.getReport.mockResolvedValue(result)
    await act(async () => pending.resolve(result))
    expect(repository[method]).toHaveBeenCalledOnce()
  })
  it.each([
    ['already_assigned', open, 'Accept report', { ...accepted, assignedDeveloperId: other.id }, /already.*assigned/i],
    ['state_conflict', accepted, 'Start investigation', progressing, /changed|conflict|state/i],
    ['archived', open, 'Accept report', { ...open, projectArchivedAt: time }, /archived/i],
  ] as const)('workflow_%s_explainsAndRefreshesAuthoritativeState', async (code, initial, label, result, notice) => {
    const { repository } = setup(initial)
    await ready()
    const method = label === 'Accept report' ? 'acceptReport' : 'startInvestigation'
    repository[method].mockRejectedValueOnce(new ReportError(code, code === 'already_assigned' ? 'Already assigned' : code === 'archived' ? 'Project archived' : 'State changed'))
    repository.getReport.mockResolvedValue(result)
    fireEvent.click(screen.getByRole('button', { name: label }))
    await waitFor(() => expect(repository.listReportHistory).toHaveBeenCalledTimes(2))
    expect(screen.getByRole('alert').textContent).toMatch(notice)
    expect(action('Accept report')).toBeNull()
    expect(action('Start investigation')).toBeNull()
    expect(repository[method]).toHaveBeenCalledOnce()
  })
  it.each(['mutation', 'report read', 'history read'] as const)('workflow_%sFailure_requiresReadOnlyReloadWithoutMutationRetry', async failure => {
    const { repository } = setup()
    await ready()
    if (failure === 'mutation') repository.acceptReport.mockRejectedValueOnce(new ReportError('unavailable', 'Offline'))
    else {
      repository.getReport.mockResolvedValue(accepted)
      if (failure === 'report read') repository.getReport.mockRejectedValueOnce(new ReportError('unavailable', 'Offline'))
      else repository.listReportHistory.mockRejectedValueOnce(new ReportError('unavailable', 'Offline'))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Accept report' }))
    const reload = await screen.findByRole('button', { name: /reload/i })
    expect(screen.getAllByRole('alert').some(alert => /confirm|uncertain|may have been saved/i.test(alert.textContent ?? ''))).toBe(true)
    const accept = action('Accept report') as HTMLButtonElement | null
    const start = action('Start investigation') as HTMLButtonElement | null
    expect(!accept || accept.disabled).toBe(true)
    expect(!start || start.disabled).toBe(true)
    expect(repository.acceptReport).toHaveBeenCalledOnce()
    repository.getReport.mockResolvedValue(accepted)
    fireEvent.click(reload)
    await screen.findByRole('button', { name: 'Start investigation' })
    expect(repository.acceptReport).toHaveBeenCalledOnce()
    expect(repository.startInvestigation).not.toHaveBeenCalled()
  })
  it('workflow_completionAfterNavigation_doesNotPopulateReplacementReport', async () => {
    const { repository, router } = setup()
    const pending = deferred<Report>()
    repository.acceptReport.mockReturnValueOnce(pending.promise)
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Accept report' }))
    const replacement = { ...open, id: '20000000-0000-4000-8000-000000000002', title: 'Replacement report' }
    repository.getReport.mockResolvedValue(replacement)
    await act(async () => { await router.navigate(`/reports/${replacement.id}`) })
    await screen.findByRole('heading', { name: replacement.title })
    const reads = repository.getReport.mock.calls.length
    await act(async () => pending.resolve(accepted))
    expect(screen.queryByRole('heading', { name: open.title })).toBeNull()
    expect(repository.getReport).toHaveBeenCalledTimes(reads)
    expect(router.state.location.pathname).toBe(`/reports/${replacement.id}`)
  })
  it('workflow_completionAfterUnmount_doesNotRefresh', async () => {
    const { repository, view } = setup()
    const pending = deferred<Report>()
    repository.acceptReport.mockReturnValueOnce(pending.promise)
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Accept report' }))
    view.unmount()
    await act(async () => pending.resolve(accepted))
    expect(repository.getReport).toHaveBeenCalledOnce()
  })
})

describe('workflow readback and labels', () => {
  it.each([developer, tester])('reportDetails_$role_readsAssignmentTimestampAndActivityAsLiteralLabels', async actor => {
    const { repository, view } = setup({ ...accepted, assignedDeveloperDisplayName: '', assignedDeveloperUsername: '<img src=x>' }, actor)
    const history: ReportHistoryEntry[] = [
      { id: 'created', reportId: id, actorId: tester.id, actorDisplayName: null, actorUsername: 'tester', occurredAt: time, event: 'created', changes: { title: { before: null, after: open.title } } },
      { id: 'accepted', reportId: id, actorId: developer.id, actorDisplayName: '', actorUsername: '<img src=x>', assignedDeveloperUsername: '<img src=x>', assignedDeveloperDisplayName: '', occurredAt: assignedTime, event: 'accepted', changes: { state: { before: 'Open', after: 'Accepted' }, assignedDeveloperId: { before: null, after: developer.id }, assignedAt: { before: null, after: assignedTime } } },
      { id: 'started', reportId: id, actorId: developer.id, actorDisplayName: null, actorUsername: 'dev', occurredAt: assignedTime, event: 'investigation_started', changes: { state: { before: 'Accepted', after: 'In progress' } } },
    ]
    repository.listReportHistory.mockResolvedValue(history)
    await ready()
    expect(screen.getByRole('heading', { name: 'Activity history' })).toBeTruthy()
    expect(screen.getAllByText(/<img src=x>/).length).toBeGreaterThan(0)
    expect(view.container.querySelector('img')).toBeNull()
    expect(view.container.textContent).not.toContain(developer.id)
    expect(view.container.querySelector(`time[datetime="${assignedTime}"]`)).not.toBeNull()
    expect(view.container.textContent).toMatch(/accepted/i)
    expect(view.container.textContent).toMatch(/investigation/i)
    expect(view.container.textContent).toMatch(/created this report/i)
  })
  it('projectListing_assignedReport_showsStateAndAssigneeWithoutActions', async () => {
    const repository = { listProjectReports: vi.fn().mockResolvedValue([{ ...accepted, assignedDeveloperDisplayName: '', assignedDeveloperUsername: '<b>dev</b>' }]) }
    const router = createMemoryRouter([{ path: '/', element: createElement(ProjectReportsPanel, { projectId, repository: repository as unknown as ReportRepository }) }])
    const view = render(createElement(MantineProvider, { env: 'test' }, createElement(RouterProvider, { router })))
    await screen.findByRole('link', { name: open.title })
    expect(screen.getByText('<b>dev</b>')).toBeTruthy()
    expect(screen.getByText('Accepted')).toBeTruthy()
    expect(view.container.querySelector('b')).toBeNull()
    expect(action('Accept report')).toBeNull()
    expect(action('Start investigation')).toBeNull()
  })
})
