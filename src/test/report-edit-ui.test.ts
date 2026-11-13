// @vitest-environment jsdom
import { MantineProvider } from '@mantine/core'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { ReportEditPage } from '../features/reports/ReportEditPage'
import { ReportError, type Report } from '../features/reports/types'
import * as suggestionClient from '../features/reports/reportSuggestionClient'
import type { SessionUser } from '../shared/types/session'

Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: (query: string) => ({
  matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false,
}) })
const user = { id: '10000000-0000-4000-8000-000000000001', role: 'tester' as const, username: 'tester', displayName: 'Tester' }
const id = '20000000-0000-4000-8000-000000000001'
const projectId = '30000000-0000-4000-8000-000000000001'
const time = '2026-11-12T00:00:00Z'
const report: Report = { id, projectId, title: 'Original title', description: 'Original description', version: '1',
  reproductionSteps: 'Open page', expectedResults: 'Works', actualResults: 'Fails', severity: 'low', severityRevision: 0,
  testEnvironment: '', reporterId: user.id, reporterUsername: 'tester', reporterDisplayName: 'Tester',
  projectName: 'Project', projectArchivedAt: null, resolution: null, canonicalReport: null, state: 'Open', assignedDeveloperId: null, assignedAt: null,
  assignedDeveloperUsername: null, assignedDeveloperDisplayName: null, createdAt: time, updatedAt: time }
function setup(initial = report, actor: SessionUser = user) {
  const project = { id: projectId, name: 'Project', description: 'Test', repositoryUrl: 'https://example.test',
    createdBy: user.id, createdAt: time, updatedAt: time, revision: 1, archivedAt: null }
  const projectRepository = { listActiveProjects: vi.fn().mockResolvedValue([project]), getProject: vi.fn(),
    createProject: vi.fn(), updateProject: vi.fn(), listProjectHistory: vi.fn() }
  const reportRepository = { editReport: vi.fn().mockResolvedValue({ outcome: 'saved', report: initial }),
    getReport: vi.fn().mockResolvedValue(initial), createReport: vi.fn(), saveDraft: vi.fn(), submitDraft: vi.fn(),
    listDrafts: vi.fn(), getDraft: vi.fn(), deleteDraft: vi.fn(), listReportHistory: vi.fn(), listProjectReports: vi.fn(),
    listReportComments: vi.fn(), postReportComment: vi.fn(), acceptReport: vi.fn(), startInvestigation: vi.fn(),
    resolveReport: vi.fn(), linkDuplicate: vi.fn(), awaitTesterInformation: vi.fn(), resumeInvestigation: vi.fn() }
  function show() {
    const router = createMemoryRouter([{ path: '/reports/:reportId/edit', element: createElement(ReportEditPage,
      { projectRepository, reportRepository, user: actor }) }, { path: '/reports/:reportId', element: createElement('h1', null, 'Current report destination') }],
    { initialEntries: [`/reports/${id}/edit`] })
    return { router, ...render(createElement(MantineProvider, { env: 'test' }, createElement(RouterProvider, { router }))) }
  }
  return { show, reportRepository, projectRepository }
}
afterEach(() => { cleanup(); vi.restoreAllMocks() })
const title = () => screen.getByLabelText('Title') as HTMLInputElement
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
async function changeTitle() {
  await screen.findByLabelText('Title')
  fireEvent.change(title(), { target: { value: 'Retained manual title' } })
}

it.each(['Open', 'Accepted', 'In progress', 'Awaiting tester information'] as const)(
  'reportEdit_originalTesterIn%s_prefillsAllInputsWithoutDraftActions', async state => {
    setup({ ...report, state }).show()
    await screen.findByLabelText('Title')
    for (const [label, value] of [['Title', report.title], ['Description', report.description], ['Version', report.version],
      ['Reproduction steps', report.reproductionSteps], ['Expected results', report.expectedResults], ['Actual results', report.actualResults],
      ['Severity', report.severity], ['Project', projectId]] as const) expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe(value)
    expect(screen.queryByRole('button', { name: 'Save draft' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Submit report' })).toBeNull()
  })
it.each(['other reporter', 'archived project', 'missing revision', 'resolved state', 'closed state'])(
  'reportEdit_%s_refusesEditor', async kind => {
    const initial = { ...report, ...(kind === 'other reporter' ? { reporterId: projectId } : kind === 'archived project'
      ? { projectArchivedAt: time } : kind === 'missing revision' ? { severityRevision: undefined } : { state: kind === 'resolved state' ? 'Resolved' : 'Closed' }) } as Report
    const { show, reportRepository } = setup(initial)
    show()
    await screen.findByRole('heading', { name: 'Report cannot be edited' })
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull()
    expect(reportRepository.editReport).not.toHaveBeenCalled()
  })
it('reportEdit_developer_refusesWithoutLoadingPrivateEditor', () => {
  const { show, reportRepository, projectRepository } = setup(report, { ...user, role: 'developer' })
  show()
  expect(screen.getByRole('heading', { name: 'Tester access required' })).toBeTruthy()
  expect(reportRepository.getReport).not.toHaveBeenCalled()
  expect(projectRepository.listActiveProjects).not.toHaveBeenCalled()
})
it.each(['saved', 'unchanged'])('reportEdit_%s_returnsToSameReportAndCallsOnlyEdit', async outcome => {
  const { show, reportRepository } = setup()
  reportRepository.editReport.mockResolvedValueOnce({ outcome, report })
  const { router } = show()
  await screen.findByLabelText('Title')
  save()
  await screen.findByRole('heading', { name: 'Current report destination' })
  expect(router.state.location.pathname).toBe(`/reports/${id}`)
  expect(reportRepository.editReport).toHaveBeenCalledExactlyOnceWith(id, expect.objectContaining({ expectedSeverityRevision: 0,
    requestId: expect.stringMatching(/^[\da-f-]{36}$/), input: expect.objectContaining({ title: report.title, projectId }) }))
  expect(reportRepository.createReport).not.toHaveBeenCalled()
  expect(reportRepository.saveDraft).not.toHaveBeenCalled()
  expect(reportRepository.submitDraft).not.toHaveBeenCalled()
})
it('reportEdit_severityABAAndRepeatedChange_retainsInputAndRequiresEachExplicitRetry', async () => {
  const { show, reportRepository } = setup()
  const conflict = (latestSeverityRevision: number) => new ReportError('severity_conflict', 'Severity changed', undefined,
    { latestSeverity: 'low', latestSeverityRevision, actorRole: null })
  reportRepository.editReport.mockRejectedValueOnce(conflict(2)).mockRejectedValueOnce(conflict(4))
  show()
  await changeTitle()
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Retained description' } })
  save()
  await screen.findByRole('alert')
  expect(title().value).toBe('Retained manual title')
  expect((screen.getByLabelText('Description') as HTMLTextAreaElement).value).toBe('Retained description')
  expect(reportRepository.editReport).toHaveBeenCalledTimes(1)
  save()
  await waitFor(() => expect(reportRepository.editReport).toHaveBeenCalledTimes(2))
  await waitFor(() => expect((screen.getByRole('button', { name: 'Save changes' }) as HTMLButtonElement).disabled).toBe(false))
  expect(title().value).toBe('Retained manual title')
  save()
  await screen.findByRole('heading', { name: 'Current report destination' })
  expect(reportRepository.editReport.mock.calls.map(call => call[1].expectedSeverityRevision)).toEqual([0, 2, 4])
  expect(new Set(reportRepository.editReport.mock.calls.map(call => call[1].requestId)).size).toBe(3)
})
it.each(['validation', 'archived', 'forbidden', 'state_conflict'] as const)('reportEdit_%sFailure_retainsManualInput', async code => {
  const { show, reportRepository } = setup()
  reportRepository.editReport.mockRejectedValueOnce(new ReportError(code, 'Save refused'))
  show(); await changeTitle(); save()
  await screen.findByText('Save refused')
  expect(title().value).toBe('Retained manual title')
})
it('reportEdit_duplicateLinkedMove_showsProjectErrorAndRetainsManualInput', async () => {
  const { show, reportRepository } = setup()
  reportRepository.editReport.mockRejectedValueOnce(new ReportError('validation',
    'This report is linked to another report as a duplicate and must stay in this project. You can still edit its other fields.',
    { projectId: 'Duplicate-linked reports must stay in their current project.' }))
  show(); await changeTitle(); save()
  await screen.findByText('Duplicate-linked reports must stay in their current project.')
  expect(title().value).toBe('Retained manual title')
  expect((screen.getByLabelText('Project') as HTMLSelectElement).value).toBe(projectId)
  expect(reportRepository.editReport).toHaveBeenCalledTimes(1)
})
it('reportEdit_uncertainFailure_reusesReceiptForSamePayloadAndPreventsOverlap', async () => {
  const { show, reportRepository } = setup()
  let reject!: (reason: unknown) => void
  reportRepository.editReport.mockReturnValueOnce(new Promise((_resolve, fail) => { reject = fail }))
  show(); await changeTitle(); save()
  fireEvent.click(screen.getByRole('button', { name: 'Please wait…' }))
  expect(reportRepository.editReport).toHaveBeenCalledTimes(1)
  await act(async () => reject(new ReportError('unavailable', 'Connection lost')))
  await screen.findByText(/couldn’t confirm whether your changes were saved/i)
  expect(title().value).toBe('Retained manual title')
  save()
  await screen.findByRole('heading', { name: 'Current report destination' })
  expect(reportRepository.editReport.mock.calls[1][1]).toEqual(reportRepository.editReport.mock.calls[0][1])
})
it('reportEdit_AIApply_changesOnlyChosenFieldUntilExplicitSave', async () => {
  const generate = vi.spyOn(suggestionClient, 'requestReportSuggestions').mockResolvedValue({ suggestions: { title: 'Suggested title', description: 'Suggested description' }, questions: [], partial: false })
  const { show, reportRepository } = setup()
  show(); await screen.findByLabelText('Title')
  fireEvent.click(screen.getByRole('button', { name: 'Generate suggestions' }))
  await screen.findByLabelText('AI generated suggestion for Title')
  fireEvent.click(screen.getAllByRole('button', { name: 'Use suggestion' })[0])
  expect(title().value).toBe('Suggested title')
  expect((screen.getByLabelText('Description') as HTMLTextAreaElement).value).toBe(report.description)
  expect(generate).toHaveBeenCalled()
  expect(reportRepository.editReport).not.toHaveBeenCalled()
  expect(reportRepository.saveDraft).not.toHaveBeenCalled()
  expect(reportRepository.createReport).not.toHaveBeenCalled()
  save()
  await screen.findByRole('heading', { name: 'Current report destination' })
  expect(reportRepository.editReport.mock.calls[0][1].input.title).toBe('Suggested title')
})
it.each(['developer', 'tester', null] as const)('reportEdit_conflictActor%s_announcesAccuratelyAndFocusesNotice', async actorRole => {
  const { show, reportRepository } = setup()
  reportRepository.editReport.mockRejectedValueOnce(new ReportError('severity_conflict', 'Conflict', undefined,
    { latestSeverity: 'high', latestSeverityRevision: 1, actorRole }))
  show(); await changeTitle(); save()
  const notice = await screen.findByRole('alert')
  expect(notice.textContent).toContain('Current severity: High')
  expect(notice.textContent).toContain('Your selected severity: Low')
  expect(notice.textContent?.includes('A Developer changed')).toBe(actorRole === 'developer')
  expect(document.activeElement).toBe(notice)
  expect(title().value).toBe('Retained manual title')
})
it('reportEdit_severityConflict_precedesFirstFieldsInReadingOrderAndReceivesFocus', async () => {
  const { show, reportRepository } = setup()
  reportRepository.editReport.mockRejectedValueOnce(new ReportError('severity_conflict', 'Conflict', undefined,
    { latestSeverity: 'high', latestSeverityRevision: 1, actorRole: 'developer' }))
  show(); await changeTitle(); save()
  const notice = await screen.findByRole('alert')
  for (const field of [screen.getByLabelText('Project'), title()]) {
    expect(Boolean(notice.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
  }
  expect(document.activeElement).toBe(notice)
  expect(title().value).toBe('Retained manual title')
})
it('reportEdit_cancelUnsavedInput_canKeepEditingThenLeaveWithoutDraft', async () => {
  const { show, reportRepository } = setup()
  show(); await changeTitle()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.getByRole('dialog', { name: 'Unsaved changes' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
  expect(title().value).toBe('Retained manual title')
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  fireEvent.click(screen.getByRole('button', { name: 'Leave without saving' }))
  await screen.findByRole('heading', { name: 'Current report destination' })
  expect(reportRepository.editReport).not.toHaveBeenCalled()
  expect(reportRepository.saveDraft).not.toHaveBeenCalled()
})
it('reportEdit_assistantFailure_retainsInputAndAllowsManualSave', async () => {
  vi.spyOn(suggestionClient, 'requestReportSuggestions').mockRejectedValueOnce(new Error('AI unavailable'))
  const { show, reportRepository } = setup()
  show(); await changeTitle()
  fireEvent.click(screen.getByRole('button', { name: 'Generate suggestions' }))
  await screen.findByRole('alert')
  expect(title().value).toBe('Retained manual title')
  expect(reportRepository.editReport).not.toHaveBeenCalled()
  save()
  await screen.findByRole('heading', { name: 'Current report destination' })
  expect(reportRepository.editReport).toHaveBeenCalledTimes(1)
})
it('reportEdit_loadFailure_canRetryWithoutFalseMissingReport', async () => {
  const { show, reportRepository } = setup()
  reportRepository.getReport.mockRejectedValueOnce(new Error('Offline'))
  show()
  await screen.findByRole('alert')
  expect(screen.queryByRole('heading', { name: 'Report not found' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await screen.findByLabelText('Title')
  expect(reportRepository.getReport).toHaveBeenCalledTimes(2)
})
it('reportEdit_missingReport_showsMissingWithoutSave', async () => {
  const { show, reportRepository } = setup()
  reportRepository.getReport.mockResolvedValueOnce(null)
  show()
  await screen.findByRole('heading', { name: 'Report not found' })
  expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull()
})
it('reportEdit_unmountedPendingSave_ignoresLateNavigation', async () => {
  const { show, reportRepository } = setup()
  let resolve!: (value: { outcome: string; report: Report }) => void
  reportRepository.editReport.mockReturnValueOnce(new Promise(done => { resolve = done }))
  const view = show(); await changeTitle(); save()
  view.unmount()
  await act(async () => resolve({ outcome: 'saved', report }))
  expect(view.router.state.location.pathname).toBe(`/reports/${id}/edit`)
})
