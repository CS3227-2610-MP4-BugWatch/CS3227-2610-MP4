// @vitest-environment jsdom
import { MantineProvider } from '@mantine/core'
import type { ReactElement } from 'react'
import { createElement } from 'react'
import { cleanup, fireEvent, render as testingRender, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { ProjectsApp } from '../features/projects/ProjectsApp'
import type { Project, ProjectRepository, SessionUser } from '../features/projects/types'
import type { Report, ReportInput } from '../features/reports/types'

Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: (query: string) => ({
  matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false,
}) })

function render(element: ReactElement) {
  return testingRender(createElement(MantineProvider, { env: 'test' }, element))
}

const projectId = '10000000-0000-4000-8000-000000000001'
const otherProjectId = '10000000-0000-4000-8000-000000000002'
const reportId = '20000000-0000-4000-8000-000000000001'
const otherReportId = '20000000-0000-4000-8000-000000000002'
const time = '2026-11-05T09:30:00Z'
const tester: SessionUser = { id: 'tester', role: 'tester', username: 'test', displayName: 'Test reporter' }
const developer: SessionUser = { id: 'developer', role: 'developer', username: 'dev', displayName: 'Project developer' }
const project: Project = {
  id: projectId, name: 'First project', description: 'First project overview', repositoryUrl: 'https://example.test/first',
  createdBy: developer.id, createdAt: time, updatedAt: time, revision: 1, archivedAt: null,
}
const otherProject = { ...project, id: otherProjectId, name: 'Other project' }
const saved: Report = {
  id: reportId, projectId, title: 'Unexpected crash', description: 'Open page and observe crash',
  version: '1.2', reproductionSteps: 'Open the page', expectedResults: 'Page loads', actualResults: 'Crash',
  severity: 'high', testEnvironment: '', reporterId: tester.id, createdAt: time, updatedAt: time,
  state: 'Open', assignedDeveloperId: null, assignedAt: null, assignedDeveloperUsername: null, assignedDeveloperDisplayName: null, projectName: project.name, projectArchivedAt: null,
  reporterUsername: tester.username, reporterDisplayName: tester.displayName,
}
const otherSaved: Report = {
  ...saved, id: otherReportId, projectId: otherProjectId, projectName: otherProject.name, title: 'Other project report',
}

function setup(initialReports: Report[] = [saved, otherSaved]) {
  const rows = [...initialReports]
  const projects = [project, otherProject]
  const repository = {
    listActiveProjects: vi.fn(async () => projects),
    getProject: vi.fn(async (id: string) => projects.find(item => item.id === id) ?? null),
    listProjectHistory: vi.fn(async (id: string) => [{
      id: 'history', projectId: id, event: 'created' as const, occurredAt: time,
      actorId: developer.id, actorDisplayName: developer.displayName,
      changes: { description: { before: null, after: 'Initial project description' } },
    }]),
    createProject: vi.fn(), updateProject: vi.fn(),
  } satisfies ProjectRepository
  const reportRepository = {
    awaitTesterInformation: vi.fn(), resumeInvestigation: vi.fn(), listReportComments: vi.fn().mockResolvedValue([]), postReportComment: vi.fn(), acceptReport: vi.fn(), startInvestigation: vi.fn(), listDrafts: vi.fn(), getDraft: vi.fn(), saveDraft: vi.fn(), deleteDraft: vi.fn(), submitDraft: vi.fn(),
    listProjectReports: vi.fn(async (id: string) => rows.filter(item => item.projectId === id).map(item => ({
      id: item.id, projectId: item.projectId, title: item.title, projectName: item.projectName,
      severity: item.severity, state: item.state, assignedDeveloperId: item.assignedDeveloperId,
      reporterDisplayName: item.reporterDisplayName, assignedDeveloperUsername: item.assignedDeveloperUsername, assignedDeveloperDisplayName: item.assignedDeveloperDisplayName,
    }))),
    createReport: vi.fn(async (input: ReportInput) => {
      const report = { ...saved, ...input, severity: saved.severity, testEnvironment: input.testEnvironment ?? '' }
      rows.unshift(report)
      return report
    }),
    getReport: vi.fn(async (id: string) => rows.find(item => item.id === id) ?? null),
    listReportHistory: vi.fn().mockResolvedValue([]),
  }
  function show(path = `/projects/${projectId}`, user = tester) {
    const router = createMemoryRouter([{ path: '*', element: createElement(ProjectsApp, { repository, reportRepository, user }) }], { initialEntries: [path] })
    return render(createElement(RouterProvider, { router }))
  }
  return { show, repository, reportRepository }
}

afterEach(cleanup)

it.each([
  ['very_low', 'Very Low', 'teal'], ['low', 'Low', 'green'],
  ['medium', 'Medium', 'yellow'], ['high', 'High', 'red'],
] as const)('projectReports_%sSeverity_retainsLabelAndUsesDistinctColor', async (severity, label, color) => {
  const { show } = setup([{ ...saved, severity }])
  show(`/projects/${projectId}?tab=reports`)
  const link = await screen.findByRole('link', { name: saved.title })
  expect(link.getAttribute('href')).toBe(`/reports/${reportId}`)
  link.focus()
  expect(document.activeElement).toBe(link)
  const row = within(link.closest('tr')!)
  expect(row.getAllByRole('cell')).toHaveLength(6)
  const badge = row.getByText(label)
  expect(badge.closest('[style]')?.getAttribute('style')).toContain(`--mantine-color-${color}-light`)
  fireEvent.click(link)
  expect(await screen.findByRole('heading', { name: saved.title })).toBeTruthy()
})

it('projectDetails_defaultOverview_retainsMetadataAndHistory', async () => {
  const { show, reportRepository } = setup()
  show()
  await screen.findByRole('heading', { name: 'Project history' })
  expect(screen.getByText(project.description)).toBeTruthy()
  expect(await screen.findByText(/Initial project description/)).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Report bug' })).toBeTruthy()
  expect(reportRepository.listProjectReports).not.toHaveBeenCalled()
})

it.each([['tester', tester], ['developer', developer]] as const)('projectReports_directLinkFor%s_showsOnlyProjectReports', async (_role, user) => {
  const { show, reportRepository } = setup()
  show(`/projects/${projectId}?tab=reports`, user)
  const link = await screen.findByRole('link', { name: saved.title })
  const row = within(link.closest('tr')!)
  const table = screen.getByRole('table', { name: 'Submitted bug reports' })
  expect(within(table).getAllByRole('columnheader').map(header => header.textContent)).toEqual([
    'Title', 'Project', 'Severity', 'Status', 'Assignee', 'Reporter',
  ])
  for (const label of [project.name, 'High', 'Open', 'Unassigned', tester.displayName]) {
    expect(row.getByText(label)).toBeTruthy()
  }
  expect(screen.queryByRole('link', { name: otherSaved.title })).toBeNull()
  expect(reportRepository.listProjectReports).toHaveBeenCalledExactlyOnceWith(projectId)
  expect(Boolean(screen.queryByRole('link', { name: 'Report bug' }))).toBe(user.role === 'tester')
  expect(Boolean(screen.queryByRole('link', { name: 'Edit project' }))).toBe(user.role === 'developer')
  expect(screen.getByRole('link', { name: 'Reports' }).getAttribute('aria-current')).toBe('page')
  expect(screen.getByRole('link', { name: 'Overview' }).getAttribute('aria-current')).toBeNull()
})

it('projectSections_switchingViews_preservesShareableUrlsAndSelectedView', async () => {
  const { show } = setup()
  show()
  await screen.findByRole('heading', { name: project.name })
  const overview = screen.getByRole('link', { name: 'Overview' })
  const reports = screen.getByRole('link', { name: 'Reports' })
  expect(overview.getAttribute('href')).toBe(`/projects/${projectId}`)
  expect(overview.getAttribute('aria-current')).toBe('page')
  expect(reports.getAttribute('href')).toBe(`/projects/${projectId}?tab=reports`)
  fireEvent.click(reports)
  await screen.findByRole('link', { name: saved.title })
  expect(reports.getAttribute('aria-current')).toBe('page')
  expect(overview.getAttribute('aria-current')).toBeNull()
  fireEvent.click(overview)
  await screen.findByRole('heading', { name: 'Project history' })
  expect(overview.getAttribute('aria-current')).toBe('page')
  expect(reports.getAttribute('aria-current')).toBeNull()
})

it('projectReports_emptyList_isDistinctFromFailureAndOverviewRemainsAvailable', async () => {
  const { show } = setup([])
  show()
  fireEvent.click(await screen.findByRole('link', { name: 'Reports' }))
  await screen.findByText(/no .*reports/i)
  expect(screen.queryByRole('alert')).toBeNull()
  fireEvent.click(screen.getByRole('link', { name: 'Overview' }))
  await screen.findByRole('heading', { name: 'Project history' })
})

it('projectReports_failedList_allowsExplicitRetryAndLeavesOverviewAvailable', async () => {
  const { show, reportRepository } = setup()
  reportRepository.listProjectReports.mockRejectedValueOnce(new Error('Report storage unavailable'))
  show(`/projects/${projectId}?tab=reports`)
  await screen.findByRole('alert')
  expect(screen.queryByText(/no .*reports/i)).toBeNull()
  expect(screen.getByRole('link', { name: 'Overview' })).toBeTruthy()
  expect(reportRepository.listProjectReports).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', { name: /retry/i }))
  await screen.findByRole('link', { name: saved.title })
  expect(reportRepository.listProjectReports).toHaveBeenCalledTimes(2)
})

it('projectReports_testerSubmitsAndDeveloperDiscoversReportViaProject', async () => {
  const { show, reportRepository } = setup([otherSaved])
  const testerView = show(`/projects/${projectId}?tab=reports`)
  fireEvent.click(await screen.findByRole('link', { name: 'Report bug' }))
  const selection = await screen.findByLabelText(/^Project\b/i, { selector: 'select' }) as HTMLSelectElement
  expect(selection.value).toBe(projectId)
  for (const [label, value] of [
    [/^Title\b/i, saved.title], [/^Description\b/i, saved.description], [/^Version\b/i, saved.version],
    [/^Reproduction steps\b/i, saved.reproductionSteps], [/^Expected results\b/i, saved.expectedResults],
    [/^Actual results\b/i, saved.actualResults], [/^Severity\b/i, saved.severity],
  ] as const) fireEvent.change(screen.getByLabelText(label), { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: 'Submit report' }))
  await screen.findByRole('heading', { name: saved.title })
  fireEvent.click(screen.getByRole('link', { name: 'Back to project reports' }))
  await screen.findByRole('link', { name: saved.title })
  testerView.unmount()

  show('/projects', developer)
  fireEvent.click(await screen.findByRole('link', { name: project.name }))
  expect(screen.queryByRole('link', { name: 'Report bug' })).toBeNull()
  fireEvent.click(await screen.findByRole('link', { name: 'Reports' }))
  fireEvent.click(await screen.findByRole('link', { name: saved.title }))
  await screen.findByRole('heading', { name: saved.title })
  expect(reportRepository.getReport).toHaveBeenLastCalledWith(reportId)
  expect(reportRepository.createReport).toHaveBeenCalledOnce()
})
