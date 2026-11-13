// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { MailboxPage } from '../features/mailbox/MailboxPage'
import type { MailboxItem } from '../features/mailbox/types'

const user = { id: 'account-a', role: 'developer' as const, username: 'developer', displayName: 'Developer' }
const item: MailboxItem = { id: 'item-a', reportId: 'stable-report', actorId: 'tester', actorUsername: 'tester',
  actorDisplayName: 'Editing Tester', reportTitle: '<script>literal report</script>', projectId: 'project', projectName: 'Current project',
  changedFields: ['description', 'severity'], createdAt: '2026-11-12T00:00:00Z', readAt: null }
function setup() {
  const repository = { listItems: vi.fn().mockResolvedValue([item]), markRead: vi.fn().mockResolvedValue(undefined), deleteItem: vi.fn().mockResolvedValue(undefined) }
  function show() {
    const router = createMemoryRouter([{ path: '/mailbox', element: createElement(MailboxPage, { repository, user }) },
      { path: '/reports/:reportId', element: createElement('h1', null, 'Current report') }], { initialEntries: ['/mailbox'] })
    return { router, ...render(createElement(RouterProvider, { router })) }
  }
  return { repository, show }
}
afterEach(cleanup)
it('mailbox_readyCard_displaysActorCurrentProjectChangedFieldsAndLiteralTitle', async () => {
  const { show, repository } = setup(); show()
  await screen.findByRole('heading', { name: item.reportTitle })
  expect(screen.getByText('Editing Tester')).toBeTruthy()
  expect(screen.getByText('Current project')).toBeTruthy()
  expect(screen.getByText('Changed fields: Description, Severity')).toBeTruthy()
  expect(repository.listItems).toHaveBeenCalledExactlyOnceWith('all')
  expect(document.querySelector('script')).toBeNull()
})
it('mailbox_successfulEmptyResult_distinguishesAllAndUnread', async () => {
  const { show, repository } = setup(); repository.listItems.mockResolvedValue([]); show()
  await screen.findByText('Your mailbox is empty.')
  fireEvent.click(screen.getByRole('button', { name: 'Unread' }))
  await screen.findByText('No unread items.')
  expect(repository.listItems).toHaveBeenLastCalledWith('unread')
})
it('mailbox_failedLoad_showsRetryWithoutFalseEmptySuccess', async () => {
  const { show, repository } = setup(); repository.listItems.mockRejectedValueOnce(new Error('Offline')); show()
  await screen.findByRole('alert')
  expect(screen.queryByText('Your mailbox is empty.')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await screen.findByRole('heading', { name: item.reportTitle })
  expect(repository.listItems).toHaveBeenCalledTimes(2)
})
it('mailbox_markReadInUnread_removesItemWithoutNavigation', async () => {
  const { show, repository } = setup(); const { router } = show()
  await screen.findByRole('heading', { name: item.reportTitle })
  fireEvent.click(screen.getByRole('button', { name: 'Unread' }))
  await waitFor(() => expect(repository.listItems).toHaveBeenLastCalledWith('unread'))
  fireEvent.click(await screen.findByRole('button', { name: 'Mark as read' }))
  await screen.findByText('No unread items.')
  expect(repository.markRead).toHaveBeenCalledExactlyOnceWith(item.id)
  expect(router.state.location.pathname).toBe('/mailbox')
})
it('mailbox_openPending_marksReadBeforeNavigationAndPreventsDuplicateRequests', async () => {
  const { show, repository } = setup()
  let resolve!: () => void
  repository.markRead.mockReturnValueOnce(new Promise<void>(done => { resolve = done }))
  const { router } = show()
  fireEvent.click(await screen.findByRole('button', { name: 'Open report' }))
  fireEvent.click(screen.getByRole('button', { name: 'Open report' }))
  expect(repository.markRead).toHaveBeenCalledExactlyOnceWith(item.id)
  expect(router.state.location.pathname).toBe('/mailbox')
  await act(async () => resolve())
  await screen.findByRole('heading', { name: 'Current report' })
  expect(router.state.location.pathname).toBe(`/reports/${item.reportId}`)
})
it('mailbox_openReadFailure_staysWithItemAndRetryFeedback', async () => {
  const { show, repository } = setup(); repository.markRead.mockRejectedValueOnce(new Error('Offline'))
  const { router } = show()
  fireEvent.click(await screen.findByRole('button', { name: 'Open report' }))
  await screen.findByRole('alert')
  expect(router.state.location.pathname).toBe('/mailbox')
  expect(screen.getByRole('heading', { name: item.reportTitle })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Open report' }))
  await screen.findByRole('heading', { name: 'Current report' })
  expect(repository.markRead).toHaveBeenCalledTimes(2)
})
it('mailbox_deleteItem_removesOnlyItemWithoutOpeningReport', async () => {
  const { show, repository } = setup(); const { router } = show()
  fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
  await screen.findByText('Your mailbox is empty.')
  expect(repository.deleteItem).toHaveBeenCalledExactlyOnceWith(item.id)
  expect(repository.markRead).not.toHaveBeenCalled()
  expect(router.state.location.pathname).toBe('/mailbox')
})
it('mailbox_uncertainDelete_preservesItemAndAllowsSafeRetry', async () => {
  const { show, repository } = setup(); repository.deleteItem.mockRejectedValueOnce(new Error('Response lost')); show()
  fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
  await screen.findByText(/couldn’t confirm whether this item was deleted/i)
  expect(screen.getByRole('heading', { name: item.reportTitle })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
  await screen.findByText('Your mailbox is empty.')
  expect(repository.deleteItem).toHaveBeenCalledTimes(2)
})
it('mailbox_accountSwitchPendingLoad_ignoresOldPrivateItems', async () => {
  let resolve!: (items: MailboxItem[]) => void
  const oldRepository = { listItems: vi.fn().mockReturnValue(new Promise<MailboxItem[]>(done => { resolve = done })), markRead: vi.fn(), deleteItem: vi.fn() }
  const nextRepository = { listItems: vi.fn().mockResolvedValue([]), markRead: vi.fn(), deleteItem: vi.fn() }
  // Keep the page instance mounted across the account boundary, matching the session wrapper's contract.
  const first = createElement(MailboxPage, { repository: oldRepository, user })
  const view = render(createElement(MemoryRouter, null, first))
  view.rerender(createElement(MemoryRouter, null, createElement(MailboxPage, { repository: nextRepository, user: { ...user, id: 'account-b' } })))
  await screen.findByText('Your mailbox is empty.')
  await act(async () => resolve([item]))
  expect(screen.queryByRole('heading', { name: item.reportTitle })).toBeNull()
  expect(nextRepository.listItems).toHaveBeenCalledExactlyOnceWith('all')
})
