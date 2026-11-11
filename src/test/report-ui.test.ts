// @vitest-environment jsdom
import { MantineProvider } from '@mantine/core'
import type { ReactElement } from 'react'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render as testingRender, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { DraftEditPage } from '../features/reports/DraftEditPage'
import { ReportCreatePage } from '../features/reports/ReportCreatePage'
import { ReportDetailsPage } from '../features/reports/ReportDetailsPage'
import { ReportError, type Report } from '../features/reports/types'
import type { SessionUser } from '../shared/types/session'

Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: (query: string) => ({
  matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false,
}) })

function render(element: ReactElement) {
  return testingRender(createElement(MantineProvider, { env: 'test' }, element))
}

const user: SessionUser = { id: '10000000-0000-4000-8000-000000000001', role: 'tester', username: 'test', displayName: 'Tester' }
const projectId = '20000000-0000-4000-8000-000000000001'
const otherProjectId = '20000000-0000-4000-8000-000000000002'
const reportId = '30000000-0000-4000-8000-000000000001'
const time = '2026-11-05T09:30:00Z'
const input = {
  projectId, title: 'Page crashes', description: '<img src=x onerror=alert(1)>', version: '1.2',
  reproductionSteps: 'Open page', expectedResults: 'Page opens', actualResults: 'Page fails',
  severity: 'high' as const, testEnvironment: '',
}
const saved: Report = {
  ...input, id: reportId, reporterId: user.id, createdAt: time, updatedAt: time,
  state: 'Open', assignedDeveloperId: null, assignedAt: null, assignedDeveloperUsername: null, assignedDeveloperDisplayName: null, projectName: 'Test project', projectArchivedAt: null,
  reporterDisplayName: user.displayName, reporterUsername: user.username,
}

function ProjectDestination() {
  const { search } = useLocation()
  return createElement('h1', null, search === '?tab=reports' ? 'Selected project reports' : 'Selected project details')
}

function setup() {
  const project = {
    id: projectId, name: 'Test project', description: 'Test', repositoryUrl: 'https://example.test',
    createdBy: user.id, createdAt: time, updatedAt: time, revision: 1, archivedAt: null,
  }
  const projectRepository = {
    listActiveProjects: vi.fn().mockResolvedValue([project, { ...project, id: otherProjectId, name: 'Another project' }]),
    getProject: vi.fn(), listProjectHistory: vi.fn(), createProject: vi.fn(), updateProject: vi.fn(),
  }
  const reportRepository = {
    awaitTesterInformation: vi.fn(), resumeInvestigation: vi.fn(), listReportComments: vi.fn().mockResolvedValue([]), postReportComment: vi.fn(), acceptReport: vi.fn(), startInvestigation: vi.fn(), listDrafts: vi.fn(), getDraft: vi.fn(), saveDraft: vi.fn(), deleteDraft: vi.fn(), submitDraft: vi.fn().mockResolvedValue(saved),
    listProjectReports: vi.fn(),
    createReport: vi.fn().mockResolvedValue(saved), getReport: vi.fn().mockResolvedValue(saved),
    listReportHistory: vi.fn().mockResolvedValue([{
      id: 'history', reportId, actorId: user.id, actorDisplayName: 'Named history actor', occurredAt: time,
      event: 'created', changes: { description: { before: null, after: input.description } },
    }]),
  }
  function show(path = '/reports/new', actor = user) {
    const router = createMemoryRouter([
      { path: '/drafts/:draftId', element: createElement(DraftEditPage, { projectRepository, reportRepository, user: actor }) },
      { path: '/reports/new', element: createElement(ReportCreatePage, { projectRepository, reportRepository, user: actor }) },
      { path: '/reports/:reportId', element: createElement(ReportDetailsPage, { reportRepository, user: actor }) },
      { path: '/projects/:projectId', element: createElement(ProjectDestination) },
    ], { initialEntries: [path] })
    return render(createElement(RouterProvider, { router }))
  }
  return { show, projectRepository, reportRepository }
}

afterEach(cleanup)

async function enterReport(severity = 'high') {
  const project = await screen.findByLabelText(/^Project\b/i, { selector: 'select' })
  fireEvent.change(project, { target: { value: projectId } })
  for (const [label, value] of [
    [/^Title\b/i, input.title], [/^Description\b/i, input.description], [/^Version\b/i, input.version],
    [/^Reproduction steps\b/i, input.reproductionSteps], [/^Expected results\b/i, input.expectedResults],
    [/^Actual results\b/i, input.actualResults], [/^Severity\b/i, severity],
  ] as const) fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Submit report' }))
}

it('reportCreate_success_opensSavedDetailUsingReturnedId', async () => {
  const { show, reportRepository } = setup()
  show()
  await enterReport()
  submit()
  await screen.findByRole('heading', { name: saved.title })
  expect(reportRepository.createReport).toHaveBeenCalledExactlyOnceWith(input)
  expect(reportRepository.getReport).toHaveBeenCalledExactlyOnceWith(reportId)
})

it('reportForm_groupedFields_exposesAllExistingInputsAndDraftActions', async () => {
  const { show } = setup()
  show()
  await screen.findByLabelText(/^Project\b/i)
  for (const [name, labels] of [
    ['Identify the problem', ['Title', 'Description', 'Version']],
    ['Reproduce the problem', ['Reproduction steps', 'Test environment']],
    ['Expected and actual results', ['Expected results', 'Actual results']],
    ['Impact', ['Severity']],
  ] as const) {
    const section = within(screen.getByRole('group', { name }))
    for (const label of labels) expect(section.getByLabelText(label)).toBeTruthy()
  }
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Submit report' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
})

it('reportCreate_noSeverity_rejectsAndPreservesOtherInputs', async () => {
  const { show, reportRepository } = setup()
  show()
  const severity = await screen.findByLabelText(/^Severity\b/i) as HTMLSelectElement
  expect(severity.value).toBe('')
  await enterReport('')
  submit()
  expect(severity.getAttribute('aria-invalid')).toBe('true')
  expect((screen.getByLabelText(/^Title\b/i) as HTMLInputElement).value).toBe(input.title)
  expect(reportRepository.createReport).not.toHaveBeenCalled()
})

it('reportCreate_developer_deniesEntryWithoutLoadingProjects', () => {
  const { show, projectRepository, reportRepository } = setup()
  show('/reports/new', { ...user, role: 'developer' })
  expect(screen.getByRole('heading', { name: /Tester access required/i })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Submit report' })).toBeNull()
  expect(projectRepository.listActiveProjects).not.toHaveBeenCalled()
  expect(reportRepository.createReport).not.toHaveBeenCalled()
})

it('reportCreate_projectLoadFailure_allowsRetry', async () => {
  const { show, projectRepository } = setup()
  projectRepository.listActiveProjects.mockRejectedValueOnce(new Error('Offline'))
  show()
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: /retry/i }))
  expect(await screen.findByRole('option', { name: 'Test project' })).toBeTruthy()
})

it('reportCreate_noActiveProjects_explainsWhySubmissionUnavailable', async () => {
  const { show, projectRepository, reportRepository } = setup()
  projectRepository.listActiveProjects.mockResolvedValueOnce([])
  show()
  await screen.findByText(/no active projects/i)
  const button = screen.queryByRole('button', { name: 'Submit report' }) as HTMLButtonElement | null
  expect(!button || button.disabled).toBe(true)
  expect(reportRepository.createReport).not.toHaveBeenCalled()
})

it('reportCreate_missingProject_retainsInput', async () => {
  const { show, reportRepository } = setup()
  reportRepository.createReport.mockRejectedValueOnce(new ReportError('not_found', 'Submission failed'))
  show()
  await enterReport()
  submit()
  await screen.findByRole('alert')
  expect((screen.getByLabelText(/^Title\b/i) as HTMLInputElement).value).toBe(input.title)
  expect(reportRepository.getReport).not.toHaveBeenCalled()
})

it('reportCreate_archivedProject_explainsRejectionAndDiscardsOnlyOnExplicitAction', async () => {
  const { show, projectRepository, reportRepository } = setup()
  reportRepository.createReport.mockRejectedValueOnce(new ReportError('archived', 'Project archived'))
  show()
  await enterReport()
  submit()
  const notice = await screen.findByRole('alert')
  expect(notice.textContent).toMatch(/archived/i)
  expect(notice.textContent).toMatch(/(?:not|n['’]t) submitted/i)
  expect(notice.textContent).toMatch(/contact.*developer.*created/i)
  expect((screen.getByLabelText(/^Description\b/i) as HTMLTextAreaElement).value).toBe(input.description)
  expect((screen.getByLabelText(/^Title\b/i) as HTMLInputElement).value).toBe(input.title)
  expect(projectRepository.listActiveProjects).toHaveBeenCalledOnce()
  expect(projectRepository.updateProject).not.toHaveBeenCalled()
  expect(reportRepository.createReport).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', { name: 'Discard report' }))
  fireEvent.click(screen.getByRole('button', { name: 'Leave without saving' }))
  await screen.findByRole('heading', { name: 'Selected project details' })
  expect(screen.queryByLabelText(/^Title\b/i)).toBeNull()
  expect(reportRepository.createReport).toHaveBeenCalledOnce()
  expect(reportRepository.getReport).not.toHaveBeenCalled()
})

it('reportCreate_manualProjectSwitchAfterArchiveRejection_preservesInputAndUsesNewSelection', async () => {
  const { show, projectRepository, reportRepository } = setup()
  reportRepository.createReport.mockRejectedValueOnce(new ReportError('archived', 'Project archived'))
  show()
  await enterReport()
  submit()
  await screen.findByRole('alert')
  const project = screen.getByLabelText(/^Project\b/i, { selector: 'select' })
  fireEvent.change(project, { target: { value: otherProjectId } })
  expect((screen.getByLabelText(/^Title\b/i) as HTMLInputElement).value).toBe(input.title)
  expect((screen.getByLabelText(/^Severity\b/i) as HTMLSelectElement).value).toBe(input.severity)
  expect(projectRepository.listActiveProjects).toHaveBeenCalledOnce()
  expect(reportRepository.createReport).toHaveBeenCalledOnce()
  submit()
  await screen.findByRole('heading', { name: saved.title })
  expect(reportRepository.createReport).toHaveBeenNthCalledWith(2, { ...input, projectId: otherProjectId })
})

it('reportCreate_unconfirmedSave_retainsInputUntilTesterRetries', async () => {
  const { show, reportRepository } = setup()
  reportRepository.createReport.mockRejectedValueOnce(new ReportError('unavailable', 'Connection interrupted'))
  show()
  await enterReport()
  submit()
  const notice = await screen.findByRole('alert')
  expect(notice.textContent).toMatch(/(?:could not|couldn['’]t) (?:be )?confirm/i)
  expect(notice.textContent).not.toMatch(/(?:not|n['’]t) submitted/i)
  expect((screen.getByLabelText(/^Title\b/i) as HTMLInputElement).value).toBe(input.title)
  expect(reportRepository.createReport).toHaveBeenCalledOnce()
  expect(reportRepository.getReport).not.toHaveBeenCalled()
  submit()
  await screen.findByRole('heading', { name: saved.title })
  expect(reportRepository.createReport).toHaveBeenNthCalledWith(2, input)
})

it('reportCreate_cancel_returnsToSelectedProjectWithoutWriting', async () => {
  const { show, reportRepository } = setup()
  show()
  await enterReport()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.getByRole('dialog', { name: 'Unsaved changes' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
  expect((screen.getByLabelText(/^Title\b/i) as HTMLInputElement).value).toBe(input.title)
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  fireEvent.click(screen.getByRole('button', { name: 'Leave without saving' }))
  expect(await screen.findByRole('heading', { name: 'Selected project details' })).toBeTruthy()
  expect(reportRepository.createReport).not.toHaveBeenCalled()
})

it('reportCreate_pendingSubmit_blocksRepeatedRequestsAndIgnoresUnmountedResult', async () => {
  const { show, reportRepository } = setup()
  let complete!: (result: Report) => void
  reportRepository.createReport.mockReturnValueOnce(new Promise<Report>(resolve => { complete = resolve }))
  const view = show()
  await enterReport()
  const button = screen.getByRole('button', { name: 'Submit report' }) as HTMLButtonElement
  const form = button.closest('form')!
  fireEvent.submit(form)
  expect(button.disabled).toBe(true)
  fireEvent.click(button)
  fireEvent.submit(form)
  fireEvent.submit(form)
  expect(reportRepository.createReport).toHaveBeenCalledOnce()
  view.unmount()
  await act(async () => { complete(saved) })
  expect(reportRepository.getReport).not.toHaveBeenCalled()
})

it('reportDetails_directLink_backButtonOpensProjectReportsWithoutBreadcrumb', async () => {
  const { show } = setup()
  show(`/reports/${reportId}`)
  await screen.findByRole('heading', { name: saved.title })
  expect(screen.queryByRole('navigation', { name: /breadcrumb/i })).toBeNull()
  expect(screen.getByRole('link', { name: saved.projectName }).getAttribute('href')).toBe(`/projects/${projectId}`)
  const link = screen.getByRole('link', { name: 'Back to project reports' })
  expect(link.getAttribute('href')).toBe(`/projects/${projectId}?tab=reports`)
  fireEvent.click(link)
  await screen.findByRole('heading', { name: 'Selected project reports' })
})

it('reportDetails_missingReport_showsNotFoundWithoutRequestingHistory', async () => {
  const { show, reportRepository } = setup()
  reportRepository.getReport.mockResolvedValueOnce(null)
  show(`/reports/${reportId}`)
  await screen.findByText(/report not found/i)
  expect(reportRepository.listReportHistory).not.toHaveBeenCalled()
})

it('reportDetails_directLink_loadsHistoryAndRendersMarkupLiterally', async () => {
  const { show, reportRepository } = setup()
  const view = show(`/reports/${reportId}`, { ...user, role: 'developer' })
  await screen.findByRole('heading', { name: saved.title })
  fireEvent.click(screen.getByRole('tab', { name: 'Activity' }))
  expect(await screen.findByText(/Named history actor/i)).toBeTruthy()
  expect(screen.getAllByText(input.description, { exact: false }).length).toBeGreaterThan(0)
  expect(view.container.querySelector('img')).toBeNull()
  expect(reportRepository.listReportHistory).toHaveBeenCalledWith(reportId)
})

it('reportDetails_failedHistoryLoad_retriesWithoutShowingMissingReport', async () => {
  const { show, reportRepository } = setup()
  reportRepository.listReportHistory.mockRejectedValueOnce(new ReportError('unavailable', 'History unavailable'))
  show(`/reports/${reportId}`)
  await screen.findByRole('heading', { name: saved.title })
  fireEvent.click(screen.getByRole('tab', { name: 'Activity' }))
  await screen.findByRole('alert')
  expect(screen.queryByText(/report not found/i)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /retry/i }))
  await waitFor(() => expect(screen.getByText(/Named history actor/i)).toBeTruthy())
})






it('draftSave_missingProject_preservesInputAndDoesNotWrite', async () => {
  const { show, reportRepository } = setup()
  show()
  fireEvent.change(await screen.findByLabelText(/^Title\b/i), { target: { value: 'Unfinished' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  expect(screen.getByText(/choose an active project/i)).toBeTruthy()
  expect((screen.getByLabelText(/^Title\b/i) as HTMLInputElement).value).toBe('Unfinished')
  expect(reportRepository.saveDraft).not.toHaveBeenCalled()
})
it('draftSave_incompleteInput_opensStableDraftAndShowsConfirmation', async () => {
  const { show, reportRepository } = setup()
  const draft = { ...input, title: '', description: '', version: '', expectedResults: '', actualResults: '', severity: '' as const, id: reportId, projectName: 'Test project', projectArchivedAt: null, updatedAt: time }
  reportRepository.saveDraft.mockResolvedValue(draft)
  reportRepository.getDraft.mockResolvedValue(draft)
  show()
  fireEvent.change(await screen.findByLabelText(/^Project\b/i), { target: { value: projectId } })
  fireEvent.change(screen.getByLabelText(/^Reproduction steps\b/i), { target: { value: input.reproductionSteps } })
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  expect((await screen.findByLabelText(/^Reproduction steps\b/i) as HTMLTextAreaElement).value).toBe(input.reproductionSteps)
  expect(screen.getByText('Draft saved')).toBeTruthy()
  expect(reportRepository.saveDraft).toHaveBeenCalledOnce()
})
it('draftSave_failure_retainsInputWithoutConfirmation', async () => {
  const { show, reportRepository } = setup()
  reportRepository.saveDraft.mockRejectedValue(new ReportError('unavailable', 'Offline'))
  show()
  fireEvent.change(await screen.findByLabelText(/^Project\b/i), { target: { value: projectId } })
  fireEvent.change(screen.getByLabelText(/^Title\b/i), { target: { value: 'Unfinished' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await screen.findByRole('alert')
  expect(screen.queryByText('Draft saved')).toBeNull()
  expect((screen.getByLabelText(/^Title\b/i) as HTMLInputElement).value).toBe('Unfinished')
})
it('draftSubmit_currentEdits_sendsDraftIdAndOpensReport', async () => {
  const { show, reportRepository } = setup()
  reportRepository.getDraft.mockResolvedValue({ ...input, id: reportId, title: 'Saved title', projectName: 'Test project', projectArchivedAt: null, updatedAt: time })
  show(`/drafts/${reportId}`)
  fireEvent.change(await screen.findByLabelText(/^Title\b/i), { target: { value: input.title } })
  await waitFor(() => expect((screen.getByRole('button', { name: 'Submit report' }) as HTMLButtonElement).disabled).toBe(false))
  submit()
  await screen.findByRole('heading', { name: saved.title })
  expect(reportRepository.submitDraft).toHaveBeenCalledExactlyOnceWith(reportId, input)
})

it('draftEdit_archivedProject_preservesTextAndAllowsReassignment', async () => {
  const { show, reportRepository } = setup()
  const draft = { ...input, id: reportId, projectId: '20000000-0000-4000-8000-000000000003', projectName: 'Old project', projectArchivedAt: time, updatedAt: time }
  reportRepository.getDraft.mockResolvedValue(draft)
  reportRepository.saveDraft.mockResolvedValue({ ...draft, projectId })
  show(`/drafts/${reportId}`)
  expect(await screen.findByRole('option', { name: 'Old project (Archived)' })).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Save draft' }) as HTMLButtonElement).disabled).toBe(true)
  expect((screen.getByLabelText(/^Title\b/i) as HTMLInputElement).value).toBe(input.title)
  await screen.findByRole('option', { name: 'Test project' })
  fireEvent.change(screen.getByLabelText(/^Project\b/i), { target: { value: projectId } })
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await screen.findByText('Draft saved')
  expect(reportRepository.saveDraft).toHaveBeenCalledExactlyOnceWith(input, reportId)
})
it('draftSubmit_rejected_preservesCurrentValues', async () => {
  const { show, reportRepository } = setup()
  reportRepository.getDraft.mockResolvedValue({ ...input, id: reportId, projectName: 'Test project', projectArchivedAt: null, updatedAt: time })
  reportRepository.submitDraft.mockRejectedValue(new ReportError('unavailable', 'Offline'))
  show(`/drafts/${reportId}`)
  fireEvent.change(await screen.findByLabelText(/^Title\b/i), { target: { value: 'Edited title' } })
  await waitFor(() => expect((screen.getByRole('button', { name: 'Submit report' }) as HTMLButtonElement).disabled).toBe(false))
  submit()
  await screen.findByRole('alert')
  expect((screen.getByLabelText(/^Title\b/i) as HTMLInputElement).value).toBe('Edited title')
  expect(reportRepository.getReport).not.toHaveBeenCalled()
})

it('draftSave_normalizedSavedValues_leavesWithoutFalseUnsavedWarning', async () => {
  const { show, reportRepository } = setup()
  const draft = { ...input, id: reportId, projectName: 'Test project', projectArchivedAt: null, updatedAt: time }
  reportRepository.getDraft.mockResolvedValue(draft)
  reportRepository.saveDraft.mockResolvedValue({ ...draft, title: 'Edited title' })
  show(`/drafts/${reportId}`)
  fireEvent.change(await screen.findByLabelText(/^Title\b/i), { target: { value: '  Edited title  ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await screen.findByText('Draft saved')
  expect((screen.getByLabelText(/^Title\b/i) as HTMLInputElement).value).toBe('Edited title')
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(await screen.findByRole('heading', { name: 'Selected project details' })).toBeTruthy()
  expect(screen.queryByRole('dialog', { name: 'Unsaved changes' })).toBeNull()
})
