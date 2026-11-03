import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createClient, client } = vi.hoisted(() => {
  const client = { auth: {}, from: vi.fn() }
  return { client, createClient: vi.fn(() => client) }
})

vi.mock('@supabase/supabase-js', () => ({ createClient }))

describe('shared Supabase client', () => {
  beforeEach(() => {
    vi.resetModules()
    createClient.mockClear()
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test-only')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('supabase_configuredEnvironment_initializesAndExportsSharedClient', async () => {
    const first = await import('../shared/lib/supabaseClient.js')
    const second = await import('../shared/lib/supabaseClient.js')

    expect(createClient).toHaveBeenCalledExactlyOnceWith(
      'https://example.supabase.co', 'sb_publishable_test-only',
    )
    expect(first.supabase).toBe(client)
    expect(second.supabase).toBe(first.supabase)
  })

  it('supabase_paddedEnvironment_trimsConfiguration', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', ' https://example.supabase.co ')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', ' sb_publishable_test-only ')

    await import('../shared/lib/supabaseClient.js')

    expect(createClient).toHaveBeenCalledExactlyOnceWith(
      'https://example.supabase.co', 'sb_publishable_test-only',
    )
  })

  it.each(['', '   ', undefined])('supabase_missingUrl_%s_rejectsBeforeCreatingClient', async value => {
    vi.stubEnv('VITE_SUPABASE_URL', value)

    await expect(import('../shared/lib/supabaseClient.js')).rejects.toThrow('Missing Supabase configuration')
    expect(createClient).not.toHaveBeenCalled()
  })

  it.each(['', '   ', undefined])('supabase_missingKey_%s_rejectsBeforeCreatingClient', async value => {
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', value)

    await expect(import('../shared/lib/supabaseClient.js')).rejects.toThrow('Missing Supabase configuration')
    expect(createClient).not.toHaveBeenCalled()
  })
})
