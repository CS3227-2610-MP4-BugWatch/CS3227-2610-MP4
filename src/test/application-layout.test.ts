// @vitest-environment jsdom
import { MantineProvider } from '@mantine/core'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { ProjectsApp } from '../features/projects/ProjectsApp'
import type { Project, ProjectRepository, SessionUser } from '../features/projects/types'
import type { ReportRepository } from '../features/reports/types'

Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: (query: string) => ({
  matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false,
}) })

const tester: SessionUser = { id: 'tester', username: 'tester', displayName: 'Test Reporter', role: 'tester' }
const project: Project = {
  id: '10000000-0000-4000-8000-000000000001', name: 'Sample project', description: 'Project description',
  repositoryUrl: 'https://example.test/project', createdBy: 'developer',
  createdAt: '2026-11-06T10:00:00Z', updatedAt: '2026-11-06T10:00:00Z', revision: 1, archivedAt: null,
}

function setup(path = '/projects', user = tester, signOutState = { signOutPending: false, signOutError: '' }) {
  const repository = {
    listActiveProjects: vi.fn().mockResolvedValue([project]), getProject: vi.fn().mockResolvedValue(project),
    listProjectHistory: vi.fn().mockResolvedValue([]), createProject: vi.fn(), updateProject: vi.fn(),
  } satisfies ProjectRepository
  const reportRepository = {
    listDrafts: vi.fn().mockResolvedValue([]), getDraft: vi.fn(), saveDraft: vi.fn(), deleteDraft: vi.fn(),
    submitDraft: vi.fn(), createReport: vi.fn(), getReport: vi.fn().mockResolvedValue(null),
    listReportHistory: vi.fn().mockResolvedValue([]), listProjectReports: vi.fn().mockResolvedValue([]),
  } satisfies ReportRepository
  const onSignOut = vi.fn()
  const router = createMemoryRouter([{ path: '*', element: createElement(ProjectsApp, {
    repository, reportRepository, user, onSignOut, ...signOutState,
  }) }], { initialEntries: [path] })
  const view = render(createElement(MantineProvider, { env: 'test' }, createElement(RouterProvider, { router })))
  return { ...view, router, repository, reportRepository, onSignOut }
}

afterEach(cleanup)

it.each(['tester', 'developer'] as const)('workspace_%s_showsIdentityAndOnlyAvailableDestinations', async role => {
  setup('/projects', { ...tester, role })
  const navigation = within(screen.getByRole('navigation', { name: 'Workspace navigation' }))
  expect(navigation.getByRole('link', { name: 'Projects' }).getAttribute('href')).toBe('/projects')
  expect(Boolean(navigation.queryByRole('link', { name: 'My drafts' }))).toBe(role === 'tester')
  expect(navigation.getAllByRole('link')).toHaveLength(role === 'tester' ? 2 : 1)
  expect(screen.getByText(tester.displayName)).toBeTruthy()
  expect(screen.getByText(new RegExp(`^${role}$`, 'i'))).toBeTruthy()
  expect(await screen.findByRole('heading', { name: 'Active projects' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Log out' })).toBeTruthy()
})

it.each([
  ['/projects', 'Projects'], [`/projects/${project.id}?tab=reports`, 'Projects'],
  ['/reports/saved-report', 'Projects'], ['/drafts', 'My drafts'],
])('workspace_directRoute%s_announcesCurrentDestination', (path, destination) => {
  setup(path)
  const navigation = within(screen.getByRole('navigation', { name: 'Workspace navigation' }))
  const current = navigation.getByRole('link', { name: destination })
  expect(current.getAttribute('aria-current')).toBe('page')
  for (const link of navigation.getAllByRole('link')) {
    if (link !== current) expect(link.getAttribute('aria-current')).toBeNull()
  }
})

it('workspace_menuKeyboardActivation_announcesExpandedStateAndClosesAfterNavigation', async () => {
  const { router } = setup()
  const menu = screen.getByRole('button', { name: 'Toggle navigation' })
  expect(menu.getAttribute('type')).toBe('button')
  expect(menu.getAttribute('aria-expanded')).toBe('false')
  expect(menu.getAttribute('aria-controls')).toBe('workspace-navigation')
  menu.focus()
  expect(document.activeElement).toBe(menu)
  // Native buttons dispatch a click with detail zero for keyboard activation.
  fireEvent.click(menu, { detail: 0 })
  expect(menu.getAttribute('aria-expanded')).toBe('true')
  const drafts = within(screen.getByRole('navigation', { name: 'Workspace navigation' })).getByRole('link', { name: 'My drafts' })
  drafts.focus()
  expect(document.activeElement).toBe(drafts)
  fireEvent.click(drafts, { detail: 0 })
  expect(await screen.findByRole('heading', { name: 'My drafts' })).toBeTruthy()
  expect(router.state.location.pathname).toBe('/drafts')
  expect(menu.getAttribute('aria-expanded')).toBe('false')
  fireEvent.click(menu, { detail: 0 })
  fireEvent.click(menu, { detail: 0 })
  expect(menu.getAttribute('aria-expanded')).toBe('false')
  fireEvent.click(menu)
  fireEvent.keyDown(menu, { key: 'Escape' })
  expect(menu.getAttribute('aria-expanded')).toBe('false')
  fireEvent.click(menu)
  drafts.focus()
  fireEvent.keyDown(drafts, { key: 'Escape' })
  expect(menu.getAttribute('aria-expanded')).toBe('false')
  expect(document.activeElement).toBe(menu)
})

it('workspace_historyBackAndForward_keepsMenuClosedUntilToggledAgain', async () => {
  const { router } = setup()
  const menu = screen.getByRole('button', { name: 'Toggle navigation' })
  fireEvent.click(menu)
  expect(menu.getAttribute('aria-expanded')).toBe('true')
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Workspace navigation' })).getByRole('link', { name: 'My drafts' }))
  expect(await screen.findByRole('heading', { name: 'My drafts' })).toBeTruthy()
  expect(menu.getAttribute('aria-expanded')).toBe('false')

  await act(async () => { await router.navigate(-1) })
  expect(router.state.location.pathname).toBe('/projects')
  expect(await screen.findByRole('heading', { name: 'Active projects' })).toBeTruthy()
  expect(menu.getAttribute('aria-expanded')).toBe('false')

  fireEvent.click(menu)
  expect(menu.getAttribute('aria-expanded')).toBe('true')
  await act(async () => { await router.navigate(1) })
  expect(router.state.location.pathname).toBe('/drafts')
  expect(await screen.findByRole('heading', { name: 'My drafts' })).toBeTruthy()
  expect(menu.getAttribute('aria-expanded')).toBe('false')

  await act(async () => { await router.navigate(-1) })
  expect(router.state.location.pathname).toBe('/projects')
  expect(menu.getAttribute('aria-expanded')).toBe('false')
})

it.each(['Projects', 'My drafts'])('workspace_dirtyReportNavigationTo%s_keepsInputUntilExplicitLeave', async destination => {
  const { router, reportRepository } = setup('/reports/new')
  const title = await screen.findByLabelText(/^Title\b/i)
  fireEvent.change(title, { target: { value: 'Unsaved finding' } })
  const menu = screen.getByRole('button', { name: 'Toggle navigation' })
  fireEvent.click(menu)
  expect((screen.getByLabelText(/^Title\b/i) as HTMLInputElement).value).toBe('Unsaved finding')
  const link = within(screen.getByRole('navigation', { name: 'Workspace navigation' })).getByRole('link', { name: destination })
  fireEvent.click(link)
  const warning = await screen.findByRole('dialog', { name: 'Unsaved changes' })
  expect(router.state.location.pathname).toBe('/reports/new')
  expect(menu.getAttribute('aria-expanded')).toBe('true')
  fireEvent.click(within(warning).getByRole('button', { name: 'Keep editing' }))
  expect((screen.getByLabelText(/^Title\b/i) as HTMLInputElement).value).toBe('Unsaved finding')
  fireEvent.click(link)
  fireEvent.click(within(await screen.findByRole('dialog', { name: 'Unsaved changes' })).getByRole('button', { name: 'Leave without saving' }))
  expect(await screen.findByRole('heading', { name: destination === 'Projects' ? 'Active projects' : 'My drafts' })).toBeTruthy()
  expect(router.state.location.pathname).toBe(destination === 'Projects' ? '/projects' : '/drafts')
  expect(menu.getAttribute('aria-expanded')).toBe('false')
  expect(screen.queryByLabelText(/^Title\b/i)).toBeNull()
  expect(reportRepository.saveDraft).not.toHaveBeenCalled()
  expect(reportRepository.createReport).not.toHaveBeenCalled()
})

it('workspace_logout_usesSuppliedAction', () => {
  const { onSignOut } = setup()
  fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
  expect(onSignOut).toHaveBeenCalledOnce()
})

it('workspace_logoutPendingAndError_announcesFeedbackAndPreventsRepeatAction', () => {
  const { onSignOut } = setup('/projects', tester, { signOutPending: true, signOutError: 'Please retry logout.' })
  const logout = screen.getByRole('button', { name: /Logging out/ }) as HTMLButtonElement
  expect(logout.disabled).toBe(true)
  fireEvent.click(logout)
  expect(onSignOut).not.toHaveBeenCalled()
  expect(screen.getByRole('alert').textContent).toBe('Please retry logout.')
})
