// @vitest-environment jsdom
import { MantineProvider } from '@mantine/core'
import type { ReactElement } from 'react'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render as testingRender, screen, waitFor } from '@testing-library/react'
import { Link, MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProjectsApp } from '../features/projects/ProjectsApp'
import type { ReportRepository } from '../features/reports/types'
import { ProjectError } from '../features/projects/types'
import type { Project, ProjectHistoryEntry, ProjectInput, ProjectRepository, SessionUser } from '../features/projects/types'

Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: (query: string) => ({
  matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false,
}) })

function render(element: ReactElement) {
  return testingRender(createElement(MantineProvider, { env: 'test' }, element))
}

const reportRepository: ReportRepository = {
  createReport: vi.fn(),
  getReport: vi.fn(),
  listReportHistory: vi.fn(),
  listDrafts: vi.fn(), getDraft: vi.fn(), saveDraft: vi.fn(), deleteDraft: vi.fn(), submitDraft: vi.fn(),
  listProjectReports: vi.fn(),
}

const developer: SessionUser = {
  id: '00000000-0000-4000-8000-000000000001', username: 'developer', displayName: 'Developer One', role: 'developer',
}
const tester: SessionUser = { ...developer, id: '00000000-0000-4000-8000-000000000003', role: 'tester' }
const project: Project = {
  id: '10000000-0000-4000-8000-000000000001', name: 'BugWatch', description: 'Project description',
  repositoryUrl: 'https://example.com/repo', createdBy: '00000000-0000-4000-8000-000000000002',
  createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z', revision: 1, archivedAt: null,
}

function repository() {
  return {
    listActiveProjects: vi.fn<ProjectRepository['listActiveProjects']>().mockResolvedValue([]),
    getProject: vi.fn<ProjectRepository['getProject']>().mockResolvedValue(project),
    listProjectHistory: vi.fn<ProjectRepository['listProjectHistory']>().mockResolvedValue([]),
    createProject: vi.fn<ProjectRepository['createProject']>().mockResolvedValue(project),
    updateProject: vi.fn<ProjectRepository['updateProject']>().mockResolvedValue({ ...project, revision: 2 }),
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(complete => { resolve = complete })
  return { promise, resolve }
}

function show(repo: ProjectRepository, route = '/projects', user = developer) {
  return render(createElement(MemoryRouter, { initialEntries: [route] },
    createElement(ProjectsApp, { repository: repo, reportRepository, user })))
}

function fill(input: ProjectInput = project) {
  fireEvent.change(screen.getByLabelText(/^Name /), { target: { value: input.name } })
  fireEvent.change(screen.getByLabelText(/^Description /), { target: { value: input.description } })
  fireEvent.change(screen.getByLabelText(/^Repository URL /), { target: { value: input.repositoryUrl } })
}

afterEach(cleanup)

describe('project browser and detail interactions', () => {
  it('projectList_pendingThenEmpty_distinguishesLoadingFromEmpty', async () => {
    const repo = repository()
    const request = deferred<Project[]>()
    repo.listActiveProjects.mockReturnValueOnce(request.promise)
    show(repo)
    expect(screen.getByRole('status').textContent).toContain('Loading projects')
    expect(screen.queryByText(/No active projects/)).toBeNull()
    await act(async () => { request.resolve([]) })
    expect(await screen.findByText(/No active projects/)).not.toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('projectList_failedRead_retryLoadsProjectsWithoutClaimingEmpty', async () => {
    const repo = repository()
    repo.listActiveProjects.mockRejectedValueOnce(new ProjectError('unavailable', 'Storage unavailable'))
      .mockResolvedValueOnce([project])
    show(repo)
    expect((await screen.findByRole('alert')).textContent).toContain('Storage unavailable')
    expect(screen.queryByText(/No active projects/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('link', { name: project.name })).not.toBeNull()
    expect(repo.listActiveProjects).toHaveBeenCalledTimes(2)
  })

  it('projectList_tester_canBrowseWithoutCreateAction', async () => {
    const repo = repository()
    repo.listActiveProjects.mockResolvedValue([project])
    show(repo, '/projects', tester)
    expect(await screen.findByRole('link', { name: project.name })).not.toBeNull()
    expect(screen.queryByRole('link', { name: 'Create project' })).toBeNull()
  })

  it('projectDetails_missingProject_displaysNotFoundWithoutLoadingHistory', async () => {
    const repo = repository()
    repo.getProject.mockResolvedValue(null)
    show(repo, `/projects/${project.id}`)
    expect(await screen.findByRole('heading', { name: 'Project not found' })).not.toBeNull()
    expect(repo.listProjectHistory).not.toHaveBeenCalled()
    expect(screen.queryByRole('link', { name: 'Edit project' })).toBeNull()
  })

  it('projectDetails_history_displaysLiteralTextAndOtherActorIdentity', async () => {
    const repo = repository()
    const markup = '<img src=x onerror=alert(1)>'
    repo.getProject.mockResolvedValue({ ...project, description: markup })
    const history: ProjectHistoryEntry = {
      id: 'entry', projectId: project.id, actorId: project.createdBy, actorDisplayName: 'Another Developer', occurredAt: project.updatedAt,
      event: 'edited', changes: { description: { before: 'Previous', after: markup } },
    }
    repo.listProjectHistory.mockResolvedValue([history])
    const view = show(repo, `/projects/${project.id}`, tester)
    await screen.findByRole('heading', { name: project.name })
    expect(screen.getByText(markup)).not.toBeNull()
    expect(view.container.querySelector('img')).toBeNull()
    expect(await screen.findByText('Another Developer', { selector: 'strong' })).not.toBeNull()
    expect(screen.queryByText(project.createdBy, { selector: 'strong' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Edit project' })).toBeNull()
    expect(screen.getByText(/Previously: Previous/)).not.toBeNull()
  })

  it.each([null, undefined, '', ' \t\n'])('projectHistory_otherActorName_%s_displaysUnknownUser', async actorDisplayName => {
    const repo = repository()
    repo.listProjectHistory.mockResolvedValue([{ id: 'entry', projectId: project.id, actorId: project.createdBy,
      actorDisplayName, occurredAt: project.updatedAt, event: 'created', changes: {} }])
    show(repo, `/projects/${project.id}`)
    expect(await screen.findByText('Unknown user', { selector: 'strong' })).not.toBeNull()
    expect(screen.queryByText(project.createdBy, { selector: 'strong' })).toBeNull()
  })

  it.each([null, undefined, '', ' \t'])('projectHistory_currentActorWithoutName_%s_usesSessionDisplayName', async actorDisplayName => {
    const repo = repository()
    repo.listProjectHistory.mockResolvedValue([{ id: 'entry', projectId: project.id, actorId: developer.id,
      actorDisplayName, occurredAt: project.updatedAt, event: 'created', changes: {} }])
    show(repo, `/projects/${project.id}`)
    expect(await screen.findByText(developer.displayName, { selector: 'strong' })).not.toBeNull()
  })

  it('projectHistory_currentProfileName_takesPrecedenceOverSessionNameAndEscapesMarkup', async () => {
    const repo = repository()
    const name = '<img src=x onerror=alert(1)>'
    repo.listProjectHistory.mockResolvedValue([{ id: 'entry', projectId: project.id, actorId: developer.id,
      actorDisplayName: name, occurredAt: project.updatedAt, event: 'created', changes: {} }])
    const view = show(repo, `/projects/${project.id}`)
    expect(await screen.findByText(name, { selector: 'strong' })).not.toBeNull()
    expect(view.container.querySelector('img')).toBeNull()
    expect(screen.queryByText(developer.displayName, { selector: 'strong' })).toBeNull()
  })

  it('projectHistory_distinctActorsWithSameDisplayName_rendersBothEntries', async () => {
    const repo = repository()
    repo.listProjectHistory.mockResolvedValue([developer.id, project.createdBy].map((actorId, index) => ({
      id: `entry-${index}`, projectId: project.id, actorId, actorDisplayName: 'Shared Name',
      occurredAt: project.updatedAt, event: 'created', changes: {},
    })))
    show(repo, `/projects/${project.id}`)
    expect(await screen.findAllByText('Shared Name', { selector: 'strong' })).toHaveLength(2)
  })

  it.each(['/projects/new', `/projects/${project.id}/edit`])('projectEditor_testerAt%s_deniesWithoutDataRequests', route => {
    const repo = repository()
    show(repo, route, tester)
    expect(screen.getByRole('heading', { name: 'Developer access required' })).not.toBeNull()
    expect(repo.getProject).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Save project' })).toBeNull()
  })

  it('projectEditor_archivedProject_deniesEditing', async () => {
    const repo = repository()
    repo.getProject.mockResolvedValue({ ...project, archivedAt: project.updatedAt })
    show(repo, `/projects/${project.id}/edit`)
    expect(await screen.findByRole('heading', { name: 'Project is archived' })).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Save project' })).toBeNull()
  })
})

describe('project create and edit forms', () => {
  it('projectCreate_validPaddedFields_submitsTrimmedValuesAndNavigatesToDetails', async () => {
    const repo = repository()
    show(repo, '/projects/new')
    fill({ name: ' BugWatch ', description: ' Project description ', repositoryUrl: ' https://example.com/repo ' })
    fireEvent.click(screen.getByRole('button', { name: 'Save project' }))
    await screen.findByRole('heading', { name: project.name })
    expect(repo.createProject).toHaveBeenCalledExactlyOnceWith({
      name: project.name, description: project.description, repositoryUrl: project.repositoryUrl,
    })
    expect(repo.getProject).toHaveBeenCalledWith(project.id)
    expect(repo.listProjectHistory).toHaveBeenCalledWith(project.id)
  })

  it('projectCreate_blankFields_showsAccessibleErrorsWithoutWriting', () => {
    const repo = repository()
    show(repo, '/projects/new')
    fireEvent.click(screen.getByRole('button', { name: 'Save project' }))
    expect(repo.createProject).not.toHaveBeenCalled()
    for (const label of [/^Name /, /^Description /, /^Repository URL /]) {
      expect(screen.getByLabelText(label).getAttribute('aria-invalid')).toBe('true')
    }
    expect(screen.getByText(/Enter a project name between/)).not.toBeNull()
  })

  it('projectCreate_cancel_discardsInputWithoutWriting', async () => {
    const repo = repository()
    show(repo, '/projects/new')
    fill()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByRole('heading', { name: 'Active projects' })).not.toBeNull()
    expect(repo.createProject).not.toHaveBeenCalled()
    expect(repo.updateProject).not.toHaveBeenCalled()
  })

  it('projectCreate_pendingSave_blocksRepeatSubmissions', async () => {
    const repo = repository()
    const save = deferred<Project>()
    repo.createProject.mockReturnValue(save.promise)
    show(repo, '/projects/new')
    fill()
    const button = screen.getByRole('button', { name: 'Save project' })
    fireEvent.click(button)
    const pendingButton = screen.getByRole('button', { name: /Saving/ }) as HTMLButtonElement
    expect(pendingButton.disabled).toBe(true)
    fireEvent.submit(pendingButton.closest('form')!)
    expect(repo.createProject).toHaveBeenCalledTimes(1)
    await act(async () => { save.resolve(project) })
    expect(await screen.findByRole('heading', { name: project.name })).not.toBeNull()
  })

  it('projectEdit_otherDeveloperProject_updatesWithLoadedRevision', async () => {
    const repo = repository()
    show(repo, `/projects/${project.id}/edit`)
    await screen.findByLabelText(/^Description /)
    fireEvent.change(screen.getByLabelText(/^Description /), { target: { value: 'Changed by another developer' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save project' }))
    await waitFor(() => expect(repo.updateProject).toHaveBeenCalledExactlyOnceWith(project.id, 1, {
      name: project.name, description: 'Changed by another developer', repositoryUrl: project.repositoryUrl,
    }))
    expect(repo.createProject).not.toHaveBeenCalled()
    await screen.findByRole('heading', { name: project.name })
  })

  it('projectCreate_duplicateName_retainsInputForCorrection', async () => {
    const repo = repository()
    repo.createProject.mockRejectedValueOnce(new ProjectError('duplicate_name', 'A project with this name already exists.'))
    show(repo, '/projects/new')
    fill()
    fireEvent.click(screen.getByRole('button', { name: 'Save project' }))
    expect((await screen.findByRole('alert')).textContent).toContain('already exists')
    expect((screen.getByLabelText(/^Name /) as HTMLInputElement).value).toBe(project.name)
    expect((screen.getByLabelText(/^Description /) as HTMLTextAreaElement).value).toBe(project.description)
    expect((screen.getByRole('button', { name: 'Save project' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('projectEdit_conflict_requiresReloadThenSavesLatestRevision', async () => {
    const repo = repository()
    const newer = { ...project, description: 'New server description', revision: 2 }
    repo.getProject.mockResolvedValueOnce(project).mockResolvedValueOnce(newer).mockResolvedValue(newer)
    repo.updateProject.mockRejectedValueOnce(new ProjectError('conflict', 'Project changed on the server.'))
      .mockResolvedValueOnce({ ...newer, description: 'Reviewed change', revision: 3 })
    show(repo, `/projects/${project.id}/edit`)
    await screen.findByLabelText(/^Description /)
    fireEvent.change(screen.getByLabelText(/^Description /), { target: { value: 'Unsaved local change' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save project' }))
    await screen.findByRole('button', { name: 'Reload latest project' })
    const blockedButton = screen.getByRole('button', { name: 'Save project' }) as HTMLButtonElement
    expect(blockedButton.disabled).toBe(true)
    expect((screen.getByLabelText(/^Description /) as HTMLTextAreaElement).value).toBe('Unsaved local change')
    fireEvent.submit(blockedButton.closest('form')!)
    expect(repo.updateProject).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Reload latest project' }))
    await waitFor(() => expect((screen.getByLabelText(/^Description /) as HTMLTextAreaElement).value).toBe(newer.description))
    fireEvent.change(screen.getByLabelText(/^Description /), { target: { value: 'Reviewed change' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save project' }))
    await waitFor(() => expect(repo.updateProject).toHaveBeenLastCalledWith(project.id, 2, {
      name: project.name, description: 'Reviewed change', repositoryUrl: project.repositoryUrl,
    }))
    await screen.findByRole('heading', { name: project.name })
  })

  it('projectRoutes_editToCreate_discardsPreviousProjectInput', async () => {
    const repo = repository()
    render(createElement(MemoryRouter, { initialEntries: [`/projects/${project.id}/edit`] },
      createElement(Link, { to: '/projects/new' }, 'Open new project'),
      createElement(ProjectsApp, { repository: repo, reportRepository, user: developer })))
    await screen.findByLabelText(/^Name /)
    expect((screen.getByLabelText(/^Name /) as HTMLInputElement).value).toBe(project.name)
    fireEvent.click(screen.getByRole('link', { name: 'Open new project' }))
    expect((screen.getByLabelText(/^Name /) as HTMLInputElement).value).toBe('')
    expect(screen.getByRole('heading', { name: 'Create project' })).not.toBeNull()
  })

  it('projectCreate_unmountedPendingSave_doesNotNavigateReplacementScreen', async () => {
    const repo = repository()
    const save = deferred<Project>()
    repo.createProject.mockReturnValue(save.promise)
    const mounted = show(repo, '/projects/new')
    fill()
    fireEvent.click(screen.getByRole('button', { name: 'Save project' }))
    mounted.unmount()
    render(createElement('p', null, 'Signed out'))
    await act(async () => { save.resolve(project) })
    expect(screen.getByText('Signed out')).not.toBeNull()
    expect(repo.getProject).not.toHaveBeenCalled()
  })
})
