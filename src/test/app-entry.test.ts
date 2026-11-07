// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App'

Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: (query: string) => ({
  matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false,
}) })

vi.mock('../features/auth/AuthenticatedApp', () => ({
  default: () => createElement('h1', null, 'Authentication boundary'),
}))

afterEach(cleanup)

describe('application entry', () => {
  it('App_initialLoad_entersAuthenticationBoundary', async () => {
    render(createElement(App))
    expect(screen.getByRole('status').textContent).toContain('Loading BugWatch')
    expect(await screen.findByRole('heading', { name: 'Authentication boundary' })).not.toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })
})
