// @vitest-environment node
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { createServer } from 'vite'
import type { ViteDevServer } from 'vite'

let server: ViteDevServer
let origin: string

beforeAll(async () => {
  vi.stubEnv('TESTER_SUGGESTIONS_ENABLED', 'false')
  vi.stubEnv('DEVELOPER_QUESTIONS_ENABLED', 'false')
  server = await createServer({
    mode: 'test',
    server: { host: '127.0.0.1', port: 0, hmr: false },
  })
  await server.listen()
  const address = server.httpServer!.address()
  if (!address || typeof address === 'string') throw new Error('Local server did not bind')
  origin = `http://127.0.0.1:${address.port}`
}, 20_000)

afterAll(async () => {
  await server?.close()
  vi.unstubAllEnvs()
})

it('localApi_get_reachesTheSameEndpointMethodGuard', async () => {
  const response = await fetch(`${origin}/api/tester/report-suggestions`)
  expect(response.status).toBe(405)
  expect(response.headers.get('Allow')).toBe('POST')
  expect(await response.json()).toEqual({ code: 'method_not_allowed' })
})

it('localApi_disabledPost_returnsJsonWithoutCallingTheProvider', async () => {
  const response = await fetch(`${origin}/api/tester/report-suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Synthetic report' }),
  })
  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({ code: 'unavailable' })
})

it('localApi_post_forwardsBodyAndHeadersAndReturnsEndpointResponse', async () => {
  const handler = vi.fn(async (request: Request) => {
    expect(request.method).toBe('POST')
    expect(new URL(request.url).pathname).toBe('/api/tester/report-suggestions')
    expect(request.headers.get('Authorization')).toBe('Bearer synthetic-token')
    expect(await request.json()).toEqual({ title: 'Synthetic report', description: 'A test observation' })
    return Response.json({ received: true }, {
      status: 429, headers: { 'Retry-After': '12', 'Cache-Control': 'no-store' },
    })
  })
  const load = vi.spyOn(server, 'ssrLoadModule').mockResolvedValue({ default: { fetch: handler } })
  try {
    const response = await fetch(`${origin}/api/tester/report-suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic-token' },
      body: JSON.stringify({ title: 'Synthetic report', description: 'A test observation' }),
    })
    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('12')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ received: true })
    expect(handler).toHaveBeenCalledTimes(1)
  } finally {
    load.mockRestore()
  }
})

it('localApi_frontendRoute_stillServesTheApp', async () => {
  const response = await fetch(`${origin}/projects`)
  expect(response.status).toBe(200)
  expect(await response.text()).toContain('id="root"')
})

it('localDeveloperApi_get_reachesDeveloperMethodGuard', async () => {
  const response = await fetch(`${origin}/api/developer/tester-questions`)
  expect(response.status).toBe(405)
  expect(response.headers.get('Allow')).toBe('POST')
  expect(await response.json()).toEqual({ code: 'method_not_allowed' })
})

it('localDeveloperApi_disabledPost_returnsSafeJson', async () => {
  const response = await fetch(`${origin}/api/developer/tester-questions`, { method: 'POST', body: JSON.stringify({ reportId: 'synthetic' }) })
  expect(response.status).toBe(503)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(await response.json()).toEqual({ code: 'unavailable' })
})

it('localDeveloperApi_post_dispatchesDeveloperModuleAndPreservesResponse', async () => {
  const handler = vi.fn(async (request: Request) => {
    expect(request.headers.get('Authorization')).toBe('Bearer developer-token')
    expect(await request.json()).toEqual({ reportId: 'synthetic-id' })
    return Response.json({ questions: [] }, { headers: { 'Cache-Control': 'no-store' } })
  })
  const load = vi.spyOn(server, 'ssrLoadModule').mockResolvedValue({ default: { fetch: handler } })
  try {
    const response = await fetch(`${origin}/api/developer/tester-questions`, { method: 'POST', headers: { Authorization: 'Bearer developer-token' }, body: JSON.stringify({ reportId: 'synthetic-id' }) })
    expect(load).toHaveBeenCalledExactlyOnceWith('/api/developer/tester-questions.ts')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ questions: [] })
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(handler).toHaveBeenCalledTimes(1)
  } finally { load.mockRestore() }
})
