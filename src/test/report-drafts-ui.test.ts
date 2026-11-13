// @vitest-environment jsdom
import { MantineProvider } from '@mantine/core'
import type { ReactElement } from 'react'
import { createElement } from 'react'
import { cleanup, fireEvent, render as testingRender, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { DraftListPage } from '../features/reports/DraftListPage'
import type { ReportRepository } from '../features/reports/types'
import type { SessionUser } from '../shared/types/session'

Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: (query: string) => ({
  matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false,
}) })

function render(element: ReactElement) {
  return testingRender(createElement(MantineProvider, { env: 'test' }, element))
}

const user: SessionUser = { id: '10000000-0000-4000-8000-000000000001', role: 'tester', username: 'tester', displayName: 'Tester' }
const drafts = [
  { id: '1', projectId: 'a', projectName: 'Active project', projectArchivedAt: null, title: '', updatedAt: '2026-11-05T09:30:00Z' },
  { id: '2', projectId: 'b', projectName: 'Old project', projectArchivedAt: '2026-11-05T09:30:00Z', title: '<img src=x>', updatedAt: '2026-11-05T09:30:00Z' },
]
function setup(actor = user) {
  const repository = { listDrafts: vi.fn().mockResolvedValue(drafts), deleteDraft: vi.fn().mockResolvedValue(undefined) }
  const router = createMemoryRouter([{ path: '/drafts', element: createElement(DraftListPage, { repository: repository as unknown as ReportRepository, user: actor }) }], { initialEntries: ['/drafts'] })
  const view = render(createElement(RouterProvider, { router }))
  return { repository, view }
}
afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('draftList_projectGroups_showsArchivedAndLiteralTitles', async () => {
  const { view } = setup()
  expect(await screen.findByRole('heading', { name: 'Active project' })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Old project (Archived)' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Untitled draft' }).getAttribute('href')).toBe('/drafts/1')
  expect(screen.getByRole('link', { name: '<img src=x>' }).getAttribute('href')).toBe('/drafts/2')
  expect(view.container.querySelector('img')).toBeNull()
})
it('draftList_deleteCancelled_keepsDraftAndMakesNoRequest', async () => {
  const { repository } = setup()
  vi.spyOn(window, 'confirm').mockReturnValue(false)
  const link = await screen.findByRole('link', { name: 'Untitled draft' })
  fireEvent.click(within(link.closest('li')!).getByRole('button', { name: 'Delete' }))
  expect(repository.deleteDraft).not.toHaveBeenCalled()
  expect(screen.getByRole('link', { name: 'Untitled draft' })).toBeTruthy()
})
it('draftList_deleteConfirmed_removesOnlyDeletedDraft', async () => {
  const { repository } = setup()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  const link = await screen.findByRole('link', { name: 'Untitled draft' })
  fireEvent.click(within(link.closest('li')!).getByRole('button', { name: 'Delete' }))
  await waitFor(() => expect(screen.queryByRole('link', { name: 'Untitled draft' })).toBeNull())
  expect(repository.deleteDraft).toHaveBeenCalledExactlyOnceWith('1')
  expect(screen.getByRole('link', { name: '<img src=x>' })).toBeTruthy()
})
it('draftList_developer_deniesAccessWithoutRequest', () => {
  const { repository } = setup({ ...user, role: 'developer' })
  expect(screen.getByRole('heading', { name: 'Tester access required' })).toBeTruthy()
  expect(repository.listDrafts).not.toHaveBeenCalled()
})

it('draftList_deleteFailure_preservesDraftAndAllowsRetry', async () => {
  const { repository } = setup()
  repository.deleteDraft.mockRejectedValueOnce(new Error('Draft storage unavailable'))
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  const link = await screen.findByRole('link', { name: 'Untitled draft' })
  const remove = within(link.closest('li')!).getByRole('button', { name: 'Delete' })
  fireEvent.click(remove)
  expect((await screen.findByRole('alert')).textContent).toBe('Draft storage unavailable')
  expect(screen.getByRole('link', { name: 'Untitled draft' })).toBeTruthy()
  expect((remove as HTMLButtonElement).disabled).toBe(false)
  fireEvent.click(remove)
  await waitFor(() => expect(screen.queryByRole('link', { name: 'Untitled draft' })).toBeNull())
  expect(repository.deleteDraft).toHaveBeenCalledTimes(2)
  expect(screen.getByRole('link', { name: '<img src=x>' })).toBeTruthy()
})
