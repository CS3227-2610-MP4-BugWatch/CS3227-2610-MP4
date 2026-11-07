// @vitest-environment jsdom
import { MantineProvider } from '@mantine/core'
import type { ReactElement } from 'react'
import { createElement } from 'react'
import { cleanup, fireEvent, render as testingRender, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectError } from '../features/projects/types'

const { service, repository } = vi.hoisted(() => ({
  service: {
    getCurrentSession: vi.fn(), loadIdentity: vi.fn(), signIn: vi.fn(), signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => () => undefined),
  },
  repository: {
    listActiveProjects: vi.fn(), getProject: vi.fn(), listProjectHistory: vi.fn(),
    createProject: vi.fn(), updateProject: vi.fn(),
  },
}))

vi.mock('../shared/lib/supabaseClient.js', () => ({ supabase: {} }))
vi.mock('../features/projects/projectRepository', () => ({ createProjectRepository: () => repository }))
vi.mock('../features/auth/authService', async importOriginal => ({
  ...await importOriginal<typeof import('../features/auth/authService')>(),
  createAuthService: () => service,
}))

import AuthenticatedApp from '../features/auth/AuthenticatedApp'

Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: (query: string) => ({
  matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false,
}) })

function render(element: ReactElement) {
  return testingRender(createElement(MantineProvider, { env: 'test' }, element))
}

beforeEach(() => {
  vi.clearAllMocks()
  window.history.replaceState({}, '', '/projects/new')
  service.getCurrentSession.mockResolvedValueOnce({ user: { id: 'developer-id' } }).mockResolvedValue(null)
  service.loadIdentity.mockResolvedValue({ id: 'developer-id', username: 'dev', displayName: 'Developer', role: 'developer' })
  repository.listActiveProjects.mockResolvedValue([])
})
afterEach(cleanup)

describe('project authentication boundary', () => {
  async function submit() {
    render(createElement(AuthenticatedApp))
    fireEvent.change(await screen.findByLabelText('Name (required)'), { target: { value: 'My project' } })
    fireEvent.change(screen.getByLabelText('Description (required)'), { target: { value: 'Unsaved description' } })
    fireEvent.change(screen.getByLabelText('Repository URL (required)'), { target: { value: 'https://example.com/repository' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save project' }))
  }

  it('projectSave_rejectedSession_rechecksAuthAndUnmountsProtectedForm', async () => {
    repository.createProject.mockRejectedValue(new ProjectError('unauthenticated', 'Session ended'))
    await submit()
    await screen.findByRole('button', { name: 'Log in' })
    expect(service.getCurrentSession).toHaveBeenCalledTimes(2)
    expect(screen.queryByLabelText('Description (required)')).toBeNull()
    expect(screen.queryByText('Unsaved description')).toBeNull()
  })

  it('projectSave_networkFailure_preservesFormAndDoesNotInvalidateSession', async () => {
    repository.createProject.mockRejectedValue(new ProjectError('unavailable', 'Storage unavailable'))
    await submit()
    await screen.findByText('Storage unavailable')
    expect((screen.getByLabelText('Description (required)') as HTMLTextAreaElement).value).toBe('Unsaved description')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save project' }).hasAttribute('disabled')).toBe(false))
    expect(service.getCurrentSession).toHaveBeenCalledTimes(1)
  })
})
