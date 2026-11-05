// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { ProjectsApp } from '../features/projects/ProjectsApp'
import type { Project, ProjectRepository, SessionUser } from '../features/projects/types'
import type { Report, ReportInput } from '../features/reports/types'

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
  state: 'Open', assignedDeveloperId: null, projectName: project.name, projectArchivedAt: null,
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
    listProjectReports: vi.fn(async (id: string) => rows.filter(item => item.projectId === id).map(item => ({
      id: item.id, projectId: item.projectId, title: item.title, projectName: item.projectName,
      severity: item.severity, state: item.state, assignedDeveloperId: item.assignedDeveloperId,
      reporterDisplayName: item.reporterDisplayName,
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
    return render(createElement(MemoryRouter, { initialEntries: [path] },
      createElement(ProjectsApp, { repository, reportRepository, user })))
  }
  return { show, repository, reportRepository }
}

afterEach(cleanup)

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
  for (const label of [project.name, 'High', 'Open', 'Unassigned', tester.displayName]) {
    expect(row.getByText(label)).toBeTruthy()
  }
  expect(screen.queryByRole('link', { name: otherSaved.title })).toBeNull()
  expect(reportRepository.listProjectReports).toHaveBeenCalledExactlyOnceWith(projectId)
  expect(Boolean(screen.queryByRole('link', { name: 'Report bug' }))).toBe(user.role === 'tester')
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
