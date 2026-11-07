import { createClient } from '@supabase/supabase-js'
import { afterEach, expect, it, vi } from 'vitest'
import endpoint from '../../api/tester/report-suggestions.js'
import { createReportSuggestionDependencies } from '../../api/_lib/_report-suggestion-dependencies.js'

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }))

const settings = {
  TESTER_SUGGESTIONS_ENABLED: 'true', SUPABASE_URL: 'https://review.example.test',
  SUPABASE_PUBLISHABLE_KEY: 'public-key', SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  SOCLAAS_API_KEY: 'provider-key', SOCLAAS_MODEL: 'test-model',
}
const id = '10000000-0000-4000-8000-000000000001'
const projectId = '20000000-0000-4000-8000-000000000001'

function setup(role = 'tester') {
  const getUser = vi.fn().mockResolvedValue({ data: { user: { id } }, error: null })
  const profileRead = vi.fn().mockResolvedValue({ data: { role }, error: null })
  const projectRead = vi.fn().mockResolvedValue({ data: { name: 'Trusted project', description: 'Trusted description', archived_at: null }, error: null })
  const profileFilter = vi.fn().mockReturnValue({ maybeSingle: profileRead })
  const projectFilter = vi.fn().mockReturnValue({ maybeSingle: projectRead })
  const profiles = { select: vi.fn().mockReturnValue({ eq: profileFilter }) }
  const projects = { select: vi.fn().mockReturnValue({ eq: projectFilter }) }
  const from = vi.fn((table: string) => {
    if (table === 'profiles') return profiles
    if (table === 'projects') return projects
    throw new Error('Unexpected table')
  })
  const quota = vi.fn().mockResolvedValue({ data: { allowed: true, retryAfterMs: 0 }, error: null })
  vi.mocked(createClient).mockImplementation((_url, key) => (
    key === settings.SUPABASE_SERVICE_ROLE_KEY ? { rpc: quota } : { auth: { getUser }, from }
  ) as unknown as ReturnType<typeof createClient>)
  const fetch = vi.fn().mockResolvedValue(Response.json({
    choices: [{ message: { content: JSON.stringify({ suggestions: { title: 'Clear title' }, questions: [] }) } }],
  }))
  vi.stubGlobal('fetch', fetch)
  for (const [name, value] of Object.entries(settings)) vi.stubEnv(name, value)
  return { getUser, profileRead, projectRead, profileFilter, projectFilter, quota, fetch }
}

afterEach(() => {
  vi.resetAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('reportSuggestionsDefaultHandler_validToken_usesScopedReadsAndPrivilegedQuotaOnly', async () => {
  const { getUser, profileFilter, projectFilter, quota, fetch } = setup()
  const result = await endpoint.fetch(new Request('https://example.test/api/tester/report-suggestions', {
    method: 'POST', headers: { Authorization: 'Bearer session-token' },
    body: JSON.stringify({ projectId, title: 'Original title', description: 'Original description', role: 'developer', severity: 'high' }),
  }))
  expect(result.status).toBe(200)
  expect(getUser).toHaveBeenCalledExactlyOnceWith('session-token')
  expect(profileFilter).toHaveBeenCalledExactlyOnceWith('id', id)
  expect(projectFilter).toHaveBeenCalledExactlyOnceWith('id', projectId)
  expect(quota).toHaveBeenCalledExactlyOnceWith('reserve_tester_suggestion_attempt', { p_actor_id: id })
  const clients = vi.mocked(createClient).mock.calls
  expect(clients.filter(call => call[1] === 'public-key')).toHaveLength(2)
  for (const [, , options] of clients.filter(call => call[1] === 'public-key')) {
    expect(options).toMatchObject({ global: { headers: { Authorization: 'Bearer session-token' } } })
  }
  const service = clients.filter(call => call[1] === 'service-key')
  expect(service).toHaveLength(1)
  expect(service[0][2]).not.toHaveProperty('global')
  const [, init] = fetch.mock.calls[0] as [string, RequestInit]
  const sent = JSON.parse(String(init.body))
  expect(JSON.parse(sent.messages[1].content)).toEqual({
    project: { name: 'Trusted project', description: 'Trusted description' },
    report: { title: 'Original title', description: 'Original description' },
  })
})

it('reportSuggestionsDefaultHandler_developerProfile_neverCallsQuotaOrProvider', async () => {
  const { quota, fetch, projectRead } = setup('developer')
  const result = await endpoint.fetch(new Request('https://example.test/api/tester/report-suggestions', {
    method: 'POST', headers: { Authorization: 'Bearer session-token' },
    body: JSON.stringify({ projectId, title: 'Title', description: 'Description', role: 'tester' }),
  }))
  expect(result.status).toBe(403)
  expect(projectRead).not.toHaveBeenCalled()
  expect(quota).not.toHaveBeenCalled()
  expect(fetch).not.toHaveBeenCalled()
})

it('reportSuggestionDependencies_missingConfiguration_returnsNoIntegration', () => {
  expect(createReportSuggestionDependencies({ ...settings, SOCLAAS_API_KEY: '' })).toBeNull()
  expect(createClient).not.toHaveBeenCalled()
})

it('reportSuggestionDependencies_invalidQuotaResult_failsClosed', async () => {
  const { quota, fetch } = setup()
  quota.mockResolvedValue({ data: { allowed: false, retryAfterMs: -1 }, error: null })
  const deps = createReportSuggestionDependencies(settings)!
  await expect(deps.reserve(id)).rejects.toThrow()
  expect(fetch).not.toHaveBeenCalled()
})
