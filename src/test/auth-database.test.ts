import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

// Run only against a disposable project with manually created Auth accounts.
// Supplying any AUTH_TEST_* value opts in to configuration validation: partial
// configuration fails rather than silently reporting an integration skip.
const names = [
  'AUTH_TEST_ISOLATED', 'AUTH_TEST_URL', 'AUTH_TEST_PUBLISHABLE_KEY',
  'AUTH_TEST_SERVICE_ROLE_KEY', 'AUTH_TEST_TESTER_TOKEN', 'AUTH_TEST_DEVELOPER_TOKEN',
  'AUTH_TEST_UNASSIGNED_USER_ID',
] as const
const configured = names.some(name => Boolean(import.meta.env[name]))
type Profile = { id: string; username: string; display_name: string; role: 'tester' | 'developer' }

describe.skipIf(!configured)('isolated Supabase profile integration (requires AUTH_TEST_* environment)', () => {
  let admin: SupabaseClient
  let anonymous: SupabaseClient
  let tester: SupabaseClient
  let developer: SupabaseClient
  let testerProfile: Profile
  let developerProfile: Profile
  let unassignedId: string
  let fixturesReady = false

  beforeAll(async () => {
    for (const name of names) {
      if (!import.meta.env[name]?.trim()) throw new Error(`Missing isolated database test setting: ${name}`)
    }
    if (import.meta.env.AUTH_TEST_ISOLATED !== 'true') {
      throw new Error('AUTH_TEST_ISOLATED must be true for this disposable-project integration run')
    }
    const url = import.meta.env.AUTH_TEST_URL!
    const key = import.meta.env.AUTH_TEST_PUBLISHABLE_KEY!
    const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    const accountClient = (token: string) => createClient(url, key, {
      ...options, global: { headers: { Authorization: `Bearer ${token}` } },
    })
    admin = createClient(url, import.meta.env.AUTH_TEST_SERVICE_ROLE_KEY!, options)
    anonymous = createClient(url, key, options)
    tester = accountClient(import.meta.env.AUTH_TEST_TESTER_TOKEN!)
    developer = accountClient(import.meta.env.AUTH_TEST_DEVELOPER_TOKEN!)
    unassignedId = import.meta.env.AUTH_TEST_UNASSIGNED_USER_ID!

    const loadAccount = async (token: string, role: Profile['role']) => {
      const identity = await anonymous.auth.getUser(token)
      expect(identity.error).toBeNull()
      expect(identity.data.user).not.toBeNull()
      const result = await admin.from('profiles').select('*').eq('id', identity.data.user!.id).single()
      expect(result.error).toBeNull()
      expect(result.data.role).toBe(role)
      return result.data as Profile
    }
    testerProfile = await loadAccount(import.meta.env.AUTH_TEST_TESTER_TOKEN!, 'tester')
    developerProfile = await loadAccount(import.meta.env.AUTH_TEST_DEVELOPER_TOKEN!, 'developer')
    expect(testerProfile.id).not.toBe(developerProfile.id)
    expect([testerProfile.id, developerProfile.id]).not.toContain(unassignedId)
    const unassignedAccount = await admin.auth.admin.getUserById(unassignedId)
    expect(unassignedAccount.error).toBeNull()
    const existing = await admin.from('profiles').select('id').eq('id', unassignedId)
    expect(existing.error).toBeNull()
    expect(existing.data).toEqual([])
    fixturesReady = true
  }, 30000)

  afterEach(async () => {
    if (!fixturesReady) return
    // Restore fixture state even if a broken policy unexpectedly permitted a write.
    const removed = await admin.from('profiles').delete().eq('id', unassignedId)
    expect(removed.error).toBeNull()
    const restored = await admin.from('profiles').upsert([testerProfile, developerProfile])
    expect(restored.error).toBeNull()
  }, 30000)

  function candidate(overrides: Record<string, unknown> = {}) {
    return { id: unassignedId, username: `integration-${unassignedId}`, display_name: 'Integration fixture', role: 'tester', ...overrides }
  }

  it('profiles_authenticatedAccounts_canReadOnlyOwnTrustedProfile', async () => {
    for (const [client, profile] of [[tester, testerProfile], [developer, developerProfile]] as const) {
      const result = await client.from('profiles').select('*')
      expect(result.error).toBeNull()
      expect(result.data).toEqual([profile])
    }
  })

  it('profiles_anonymousRead_exposesNoIdentityRows', async () => {
    const result = await anonymous.from('profiles').select('*')
    expect(result.error !== null || result.data?.length === 0).toBe(true)
  })

  it('profiles_distinctUsername_administratorCanInsertAndDeleteFixture', async () => {
    const result = await admin.from('profiles').insert(candidate()).select().single()
    expect(result.error).toBeNull()
    expect(result.data.id).toBe(unassignedId)
  })

  it('profiles_caseVariantUsername_rejectsDuplicate', async () => {
    const result = await admin.from('profiles').insert(candidate({ username: testerProfile.username.toUpperCase() }))
    expect(result.error?.code).toBe('23505')
  })

  it.each([
    ['null username', { username: null }],
    ['empty username', { username: '' }],
    ['blank username', { username: '   ' }],
    ['null display name', { display_name: null }],
    ['empty display name', { display_name: '' }],
    ['blank display name', { display_name: '   ' }],
    ['null role', { role: null }],
    ['unknown role', { role: 'admin' }],
  ])('profiles_%s_rejectsInvalidIdentity', async (_label, overrides) => {
    const result = await admin.from('profiles').insert(candidate(overrides))
    expect(['23502', '23514']).toContain(result.error?.code)
  })

  it.each(['tester', 'developer'] as const)('profiles_%sInsert_isDenied', async role => {
    const client = role === 'tester' ? tester : developer
    const result = await client.from('profiles').insert(candidate())
    expect(result.error).not.toBeNull()
    const stored = await admin.from('profiles').select('id').eq('id', unassignedId)
    expect(stored.error).toBeNull()
    expect(stored.data).toEqual([])
  })

  it.each(['tester', 'developer'] as const)('profiles_%sUpdate_cannotChangeUsernameOrRole', async role => {
    const client = role === 'tester' ? tester : developer
    const profile = role === 'tester' ? testerProfile : developerProfile
    await client.from('profiles').update({ username: `changed-${profile.username}`, role: role === 'tester' ? 'developer' : 'tester' }).eq('id', profile.id)
    const stored = await admin.from('profiles').select('*').eq('id', profile.id).single()
    expect(stored.error).toBeNull()
    expect(stored.data).toEqual(profile)
  })

  it.each(['tester', 'developer'] as const)('profiles_%sDelete_cannotRemoveIdentity', async role => {
    const client = role === 'tester' ? tester : developer
    const profile = role === 'tester' ? testerProfile : developerProfile
    await client.from('profiles').delete().eq('id', profile.id)
    const stored = await admin.from('profiles').select('*').eq('id', profile.id).single()
    expect(stored.error).toBeNull()
    expect(stored.data).toEqual(profile)
  })
})
