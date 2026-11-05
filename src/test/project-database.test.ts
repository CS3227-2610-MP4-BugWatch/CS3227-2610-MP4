import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

// Explicit hosted-test opt-in only. Never use the normal browser credentials as
// an implicit fallback; the runner must pass both the test and forbidden target.
const names = [
  'PROJECT_TEST_ISOLATED', 'PROJECT_TEST_URL', 'PROJECT_TEST_PRODUCTION_URL',
  'PROJECT_TEST_PUBLISHABLE_KEY', 'PROJECT_TEST_SERVICE_ROLE_KEY',
  'PROJECT_TEST_TESTER_TOKEN', 'PROJECT_TEST_DEVELOPER_TOKEN', 'PROJECT_TEST_SECOND_DEVELOPER_TOKEN',
] as const
const configured = names.some(name => import.meta.env[name] !== undefined)
type ProjectRow = {
  id: string; name: string; description: string; repository_url: string; created_by: string
  created_at: string; updated_at: string; revision: number; archived_at: string | null
}

describe.skipIf(!configured)('isolated Supabase project integration (requires PROJECT_TEST_* environment)', () => {
  let admin: SupabaseClient
  let anonymous: SupabaseClient
  let tester: SupabaseClient
  let developer: SupabaseClient
  let secondDeveloper: SupabaseClient
  let developerId: string
  let secondDeveloperId: string
  let testerId: string
  const createdIds = new Set<string>()
  const prefix = `project-integration-${crypto.randomUUID()}`

  beforeAll(async () => {
    for (const name of names) {
      if (!import.meta.env[name]?.trim()) throw new Error(`Missing isolated project test setting: ${name}`)
    }
    if (import.meta.env.PROJECT_TEST_ISOLATED !== 'true') throw new Error('PROJECT_TEST_ISOLATED must be true')
    const testUrl = new URL(import.meta.env.PROJECT_TEST_URL!)
    const productionUrl = new URL(import.meta.env.PROJECT_TEST_PRODUCTION_URL!)
    if (testUrl.protocol !== 'https:' || productionUrl.protocol !== 'https:') {
      throw new Error('Project integration requires explicit HTTPS test and production URLs')
    }
    if (testUrl.origin === productionUrl.origin) throw new Error('Project tests must not target production')
    const key = import.meta.env.PROJECT_TEST_PUBLISHABLE_KEY!
    const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    const account = (token: string) => createClient(testUrl.href, key, {
      ...options, global: { headers: { Authorization: `Bearer ${token}` } },
    })
    admin = createClient(testUrl.href, import.meta.env.PROJECT_TEST_SERVICE_ROLE_KEY!, options)
    anonymous = createClient(testUrl.href, key, options)
    tester = account(import.meta.env.PROJECT_TEST_TESTER_TOKEN!)
    developer = account(import.meta.env.PROJECT_TEST_DEVELOPER_TOKEN!)
    secondDeveloper = account(import.meta.env.PROJECT_TEST_SECOND_DEVELOPER_TOKEN!)

    async function verifyIdentity(token: string, expectedRole: 'tester' | 'developer') {
      const identity = await anonymous.auth.getUser(token)
      expect(identity.error).toBeNull()
      expect(identity.data.user).not.toBeNull()
      const id = identity.data.user!.id
      const profile = await admin.from('profiles').select('id, role').eq('id', id).single()
      expect(profile.error).toBeNull()
      expect(profile.data?.role).toBe(expectedRole)
      return id
    }
    testerId = await verifyIdentity(import.meta.env.PROJECT_TEST_TESTER_TOKEN!, 'tester')
    developerId = await verifyIdentity(import.meta.env.PROJECT_TEST_DEVELOPER_TOKEN!, 'developer')
    secondDeveloperId = await verifyIdentity(import.meta.env.PROJECT_TEST_SECOND_DEVELOPER_TOKEN!, 'developer')
    expect(new Set([testerId, developerId, secondDeveloperId]).size).toBe(3)
  }, 30000)

  afterEach(async () => {
    // Only UUIDs returned by this suite's successful creates are removed.
    if (!admin || createdIds.size === 0) return
    const ids = [...createdIds]
    const history = await admin.from('project_history').delete().in('project_id', ids)
    expect(history.error).toBeNull()
    const projects = await admin.from('projects').delete().in('id', ids)
    expect(projects.error).toBeNull()
    createdIds.clear()
  }, 30000)

  function parameters(name = `${prefix}-${crypto.randomUUID()}`) {
    return { p_name: name, p_description: 'Hosted project integration fixture', p_repository_url: 'https://example.test/repository' }
  }

  async function create(client = developer, overrides: Record<string, unknown> = {}) {
    const result = await client.rpc('create_project', { ...parameters(), ...overrides })
    if (result.data?.id) createdIds.add(result.data.id)
    return result
  }

  async function fixture() {
    const result = await create()
    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({ created_by: developerId, revision: 1, archived_at: null })
    return result.data as ProjectRow
  }

  function updateParameters(project: ProjectRow, overrides: Record<string, unknown> = {}) {
    return {
      p_project_id: project.id, p_expected_revision: project.revision,
      p_name: project.name, p_description: project.description, p_repository_url: project.repository_url,
      ...overrides,
    }
  }

  async function stored(id: string) {
    const result = await admin.from('projects').select('*').eq('id', id).single()
    expect(result.error).toBeNull()
    return result.data as ProjectRow
  }

  async function history(id: string) {
    const result = await admin.from('project_history').select('*').eq('project_id', id).order('occurred_at').order('id')
    expect(result.error).toBeNull()
    return result.data!
  }

  it('createProject_developer_persistsProjectAndAttributableInitialHistory', async () => {
    const project = await fixture()
    expect(await stored(project.id)).toEqual(project)
    const entries = await history(project.id)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ project_id: project.id, actor_id: developerId, event: 'created', changes: {
      name: { before: null, after: project.name }, description: { before: null, after: project.description },
      repository_url: { before: null, after: project.repository_url },
    } })
    expect(entries[0].occurred_at).toEqual(expect.any(String))
  })

  it('readProject_bothAuthenticatedRoles_canReadOtherDevelopersProjectAndHistory', async () => {
    const project = await fixture()
    for (const client of [tester, secondDeveloper]) {
      const result = await client.from('projects').select('*').eq('id', project.id).single()
      expect(result.error).toBeNull()
      expect(result.data).toEqual(project)
      const entries = await client.from('project_history').select('*').eq('project_id', project.id)
      expect(entries.error).toBeNull()
      expect(entries.data).toHaveLength(1)
    }
  })

  it('getProjectHistory_authenticatedReaders_receiveCurrentNamesForEachActorWithoutProfileDirectoryAccess', async () => {
    const project = await fixture()
    const edit = await secondDeveloper.rpc('update_project', updateParameters(project, { p_description: 'History name regression' }))
    expect(edit.error).toBeNull()
    const profiles = await admin.from('profiles').select('id, display_name').in('id', [developerId, secondDeveloperId])
    expect(profiles.error).toBeNull()
    expect(profiles.data).toHaveLength(2)
    const currentNames = new Map(profiles.data!.map(profile => [profile.id, profile.display_name?.trim() || null]))
    for (const [client, ownId] of [[tester, testerId], [developer, developerId], [secondDeveloper, secondDeveloperId]] as const) {
      const result = await client.rpc('get_project_history', { p_project_id: project.id })
      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(2)
      expect(result.data.map((entry: { actor_id: string }) => entry.actor_id)).toEqual([developerId, secondDeveloperId])
      for (const entry of result.data) {
        expect(entry.actor_display_name).toBe(currentNames.get(entry.actor_id))
        expect(Object.keys(entry).sort()).toEqual(['actor_display_name', 'actor_id', 'changes', 'event', 'id', 'occurred_at', 'project_id'])
        expect(entry.project_id).toBe(project.id)
      }
      const directProfiles = await client.from('profiles').select('id')
      expect(directProfiles.error).toBeNull()
      expect(directProfiles.data).toEqual([{ id: ownId }])
    }
  })

  it('getProjectHistory_anonymous_cannotExecuteOrReadActorNames', async () => {
    const project = await fixture()
    const result = await anonymous.rpc('get_project_history', { p_project_id: project.id })
    expect(result.error).not.toBeNull()
    expect(result.data).toBeNull()
  })

  it.each([null, '10000000-0000-4000-8000-000000000099'])('getProjectHistory_missingTarget_%s_rejectsNotFound', async id => {
    const result = await tester.rpc('get_project_history', { p_project_id: id })
    expect(result.error?.code).toBe('P1005')
    expect(result.data).toBeNull()
  })

  it('readProject_anonymous_exposesNoProjectOrHistoryRows', async () => {
    const project = await fixture()
    for (const [table, column] of [['projects', 'id'], ['project_history', 'project_id']]) {
      const result = await anonymous.from(table).select('*').eq(column, project.id)
      expect(result.error !== null || result.data?.length === 0).toBe(true)
    }
  })

  it.each(['tester', 'anonymous'] as const)('createProject_%s_isDenied', async role => {
    const result = await create(role === 'tester' ? tester : anonymous)
    expect(result.error).not.toBeNull()
    expect(result.data).toBeNull()
  })

  it('updateProject_otherDeveloper_canEditAndRecordsOnlyChangedFields', async () => {
    const project = await fixture()
    const result = await secondDeveloper.rpc('update_project', updateParameters(project, { p_description: 'Changed by another developer' }))
    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({ id: project.id, created_by: developerId, created_at: project.created_at, revision: 2 })
    const entries = await history(project.id)
    expect(entries).toHaveLength(2)
    expect(entries[1]).toMatchObject({ actor_id: secondDeveloperId, event: 'edited', changes: {
      description: { before: project.description, after: 'Changed by another developer' },
    } })
    expect(Object.keys(entries[1].changes)).toEqual(['description'])
  })

  it('updateProject_freshUnchangedInput_preservesRevisionTimestampAndHistory', async () => {
    const project = await fixture()
    const result = await developer.rpc('update_project', updateParameters(project))
    expect(result.error).toBeNull()
    expect(result.data).toEqual(project)
    expect(await history(project.id)).toHaveLength(1)
  })

  it.each(['tester', 'anonymous'] as const)('updateProject_%s_leavesProjectAndHistoryUnchanged', async role => {
    const project = await fixture()
    const result = await (role === 'tester' ? tester : anonymous).rpc('update_project', updateParameters(project, { p_description: 'Unauthorized' }))
    expect(result.error).not.toBeNull()
    expect(await stored(project.id)).toEqual(project)
    expect(await history(project.id)).toHaveLength(1)
  })

  it('createProject_caseAndWhitespaceDuplicate_rejectsWithoutAdditionalRows', async () => {
    const project = await fixture()
    const result = await create(secondDeveloper, { p_name: ` \t${project.name.toUpperCase()}\n` })
    expect(result.error?.code).toBe('23505')
    expect(result.data).toBeNull()
    expect(await history(project.id)).toHaveLength(1)
  })

  it('createProject_simultaneousEquivalentNames_exactlyOneCommits', async () => {
    const name = `${prefix}-race-${crypto.randomUUID()}`
    const outcomes = await Promise.all([create(developer, { p_name: name }), create(secondDeveloper, { p_name: ` ${name.toUpperCase()} ` })])
    const succeeded = outcomes.filter(result => !result.error)
    const failed = outcomes.filter(result => result.error)
    expect(succeeded).toHaveLength(1)
    expect(failed).toHaveLength(1)
    expect(failed[0].error?.code).toBe('23505')
    expect(await history(succeeded[0].data.id)).toHaveLength(1)
  })

  it('updateProject_nameHeldByAnotherProject_rejectsAndKeepsOriginalState', async () => {
    const first = await fixture()
    const second = await fixture()
    const result = await developer.rpc('update_project', updateParameters(second, { p_name: first.name.toUpperCase() }))
    expect(result.error?.code).toBe('23505')
    expect(await stored(second.id)).toEqual(second)
    expect(await history(second.id)).toHaveLength(1)
  })

  it('updateProject_caseOnlyOwnName_succeeds', async () => {
    const project = await fixture()
    const result = await developer.rpc('update_project', updateParameters(project, { p_name: project.name.toUpperCase() }))
    expect(result.error).toBeNull()
    expect(result.data.name).toBe(project.name.toUpperCase())
    expect(result.data.revision).toBe(2)
  })

  it('updateProject_missingTarget_rejectsNotFound', async () => {
    const result = await developer.rpc('update_project', {
      ...parameters(), p_project_id: crypto.randomUUID(), p_expected_revision: 1,
    })
    expect(result.error?.code).toBe('P1005')
  })

  it('updateProject_invalidMetadata_preservesProjectAndHistory', async () => {
    const project = await fixture()
    const result = await developer.rpc('update_project', updateParameters(project, { p_repository_url: 'javascript:alert(1)' }))
    expect(result.error).not.toBeNull()
    expect(await stored(project.id)).toEqual(project)
    expect(await history(project.id)).toHaveLength(1)
  })

  it('updateProject_simultaneousSameRevision_exactlyOneSaveWins', async () => {
    const project = await fixture()
    const outcomes = await Promise.all([
      developer.rpc('update_project', updateParameters(project, { p_description: 'First attempt' })),
      secondDeveloper.rpc('update_project', updateParameters(project, { p_description: 'Second attempt' })),
    ])
    expect(outcomes.filter(result => !result.error)).toHaveLength(1)
    expect(outcomes.filter(result => result.error).map(result => result.error?.code)).toEqual(['P1006'])
    expect((await stored(project.id)).revision).toBe(2)
    expect(await history(project.id)).toHaveLength(2)
  })

  it('updateProject_staleRevisionEvenWithCurrentValues_rejectsBeforeNoOp', async () => {
    const project = await fixture()
    const changed = await developer.rpc('update_project', updateParameters(project, { p_description: 'Current description' }))
    expect(changed.error).toBeNull()
    const stale = await secondDeveloper.rpc('update_project', updateParameters(changed.data, { p_expected_revision: 1 }))
    expect(stale.error?.code).toBe('P1006')
    expect(await stored(project.id)).toEqual(changed.data)
    expect(await history(project.id)).toHaveLength(2)
  })

  it('archivedProject_blocksEditingAndReservesName', async () => {
    const project = await fixture()
    const archived = await admin.from('projects').update({ archived_at: new Date().toISOString() }).eq('id', project.id)
    expect(archived.error).toBeNull()
    const edit = await developer.rpc('update_project', updateParameters(project, { p_description: 'Attempted edit' }))
    expect(edit.error?.code).toBe('P1004')
    const duplicate = await create(secondDeveloper, { p_name: project.name })
    expect(duplicate.error?.code).toBe('23505')
    expect((await stored(project.id)).description).toBe(project.description)
    expect(await history(project.id)).toHaveLength(1)
  })

  it.each([
    ['blank name', { p_name: ' \t\n' }], ['long name', { p_name: 'n'.repeat(101) }],
    ['blank description', { p_description: ' ' }], ['long description', { p_description: 'd'.repeat(5001) }],
    ['relative URL', { p_repository_url: '/repository' }], ['unsupported URL', { p_repository_url: 'ssh://example.test/repo' }],
    ['malformed URL', { p_repository_url: 'https://' }], ['URL whitespace', { p_repository_url: 'https://example.test/a b' }],
    ['long URL', { p_repository_url: `https://example.test/${'a'.repeat(2049)}` }],
  ])('createProject_%s_databaseRejectsInvalidMetadata', async (_label, overrides) => {
    const result = await create(developer, overrides)
    expect(result.error).not.toBeNull()
    expect(result.data).toBeNull()
  })

  it('projectMetadata_unicodeTrimAndCodePointBoundaries_matchApprovedValidation', async () => {
    const name = `${prefix}-${'😀'.repeat(100 - Array.from(prefix).length - 1)}`
    const result = await create(developer, { p_name: `\u00a0${name}\u3000`, p_description: `\t${'😀'.repeat(5000)}\n` })
    expect(result.error).toBeNull()
    expect(result.data.name).toBe(name)
    expect(result.data.description).toBe('😀'.repeat(5000))
  })

  it('projectMetadata_exactMaximumUrlLength_databaseAcceptsBoundary', async () => {
    const urlPrefix = 'https://example.test/'
    const url = urlPrefix + 'a'.repeat(2048 - urlPrefix.length)
    const result = await create(developer, { p_repository_url: url })
    expect(result.error).toBeNull()
    expect(result.data.repository_url).toBe(url)
  })

  it('projectMetadata_percentEncodedNumericHost_acceptsValidUrlWithoutRewritingIt', async () => {
    const url = 'https://%31%32%37.0.0.1/repo'
    const result = await create(developer, { p_repository_url: url })
    expect(result.error).toBeNull()
    expect(result.data.repository_url).toBe(url)
  })

  it('projectMetadata_percentEncodedHostDelimiter_rejectsInvalidUrl', async () => {
    const result = await create(developer, { p_repository_url: 'https://example%2f.com/repo' })
    expect(result.error).not.toBeNull()
    expect(result.data).toBeNull()
  })

  it('projectMetadata_percentEncodedJoinerHostname_rejectsInvalidUrl', async () => {
    const result = await create(developer, { p_repository_url: 'https://%E2%80%8D.com/repo' })
    expect(result.error).not.toBeNull()
    expect(result.data).toBeNull()
  })

  it('projectMetadata_percentEncodedInteriorLatinJoiner_rejectsInvalidUrl', async () => {
    const result = await create(developer, { p_repository_url: 'https://a%E2%80%8Db.com/repo' })
    expect(result.error).not.toBeNull()
    expect(result.data).toBeNull()
  })

  it('projectMetadata_percentEncodedInteriorLatinNonJoiner_rejectsInvalidUrl', async () => {
    const result = await create(developer, { p_repository_url: 'https://a%E2%80%8Cb.com/repo' })
    expect(result.error).not.toBeNull()
    expect(result.data).toBeNull()
  })

  it.each([
    ['Indic virama joiner', 'https://' + '\u0928\u093e\u092e\u094d\u200d\u0937.com/repo'],
    ['Arabic joining-context non-joiner', 'https://' + '\u0646\u0627\u0645\u0647\u200c\u0627\u06cc.com/repo'],
  ])('projectMetadata_valid%s_acceptsContextualJoinerAndPreservesSpelling', async (_label, url) => {
    const result = await create(developer, { p_repository_url: url })
    expect(result.error).toBeNull()
    expect(result.data.repository_url).toBe(url)
  })

  it('projectMetadata_nbspAndBomWhitespace_trimsBeforeSaving', async () => {
    const name = `${prefix}-whitespace`
    const result = await create(developer, { p_name: `\u00a0\ufeff${name}\ufeff\u00a0` })
    expect(result.error).toBeNull()
    expect(result.data.name).toBe(name)
  })

  it('projectMetadata_accentedCaseVariant_rejectsNormalizedDuplicate', async () => {
    const name = `${prefix}-Équipe`
    const initial = await create(developer, { p_name: name })
    expect(initial.error).toBeNull()
    const duplicate = await create(secondDeveloper, { p_name: `\u00a0${name.toLowerCase()}\ufeff` })
    expect(duplicate.error?.code).toBe('23505')
    expect(duplicate.data).toBeNull()
  })

  it('projectMetadata_nameExceedsUnicodeCodePointLimit_rejects101CodePoints', async () => {
    const name = `${prefix}-${'😀'.repeat(101 - Array.from(prefix).length - 1)}`
    const result = await create(developer, { p_name: name })
    expect(result.error).not.toBeNull()
    expect(result.data).toBeNull()
  })

  it.each(['developer', 'tester'] as const)('directWrites_%s_cannotForgeProtectedMetadataDeleteProjectOrAlterHistory', async role => {
    const project = await fixture()
    const client = role === 'developer' ? developer : tester
    const originalHistory = await history(project.id)
    const inserted = await client.from('projects').insert({
      name: `${prefix}-direct`, description: project.description,
      repository_url: project.repository_url, created_by: secondDeveloperId,
    })
    expect(inserted.error).not.toBeNull()
    const tampered = await client.from('projects').update({ created_by: secondDeveloperId, revision: 100, archived_at: new Date().toISOString() }).eq('id', project.id)
    expect(tampered.error).not.toBeNull()
    const deleted = await client.from('projects').delete().eq('id', project.id)
    expect(deleted.error).not.toBeNull()
    const forged = await client.from('project_history').insert({
      project_id: project.id, actor_id: secondDeveloperId, event: 'edited', changes: {},
    })
    expect(forged.error).not.toBeNull()
    const modified = await client.from('project_history').update({ actor_id: secondDeveloperId }).eq('project_id', project.id)
    expect(modified.error).not.toBeNull()
    const removed = await client.from('project_history').delete().eq('project_id', project.id)
    expect(removed.error).not.toBeNull()
    expect(await stored(project.id)).toEqual(project)
    expect(await history(project.id)).toEqual(originalHistory)
  })
})
