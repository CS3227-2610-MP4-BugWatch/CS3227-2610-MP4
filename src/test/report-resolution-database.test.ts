import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

const names = [
  'PROJECT_TEST_ISOLATED', 'PROJECT_TEST_URL', 'PROJECT_TEST_PRODUCTION_URL',
  'PROJECT_TEST_PUBLISHABLE_KEY', 'PROJECT_TEST_SERVICE_ROLE_KEY',
  'PROJECT_TEST_TESTER_TOKEN', 'PROJECT_TEST_DEVELOPER_TOKEN', 'PROJECT_TEST_SECOND_DEVELOPER_TOKEN',
] as const
const configured = names.some(name => import.meta.env[name] !== undefined)

describe.skipIf(!configured)('isolated Supabase report resolution integration (requires PROJECT_TEST_* environment)', () => {
  let admin: SupabaseClient
  let anonymous: SupabaseClient
  let tester: SupabaseClient
  let developer: SupabaseClient
  let secondDeveloper: SupabaseClient
  let secondDeveloperId: string
  let unprofiled: SupabaseClient
  let unprofiledId: string | undefined
  let developerId: string
  let testerId: string
  const projectIds = new Set<string>()
  const reportIds = new Set<string>()

  beforeAll(async () => {
    for (const name of names) {
      if (!import.meta.env[name]?.trim()) throw new Error(`Missing isolated report test setting: ${name}`)
    }
    if (import.meta.env.PROJECT_TEST_ISOLATED !== 'true') throw new Error('PROJECT_TEST_ISOLATED must be true')
    const url = new URL(import.meta.env.PROJECT_TEST_URL!)
    const production = new URL(import.meta.env.PROJECT_TEST_PRODUCTION_URL!)
    if (url.protocol !== 'https:' || production.protocol !== 'https:' || url.origin === production.origin) {
      throw new Error('Report integration requires distinct HTTPS test and production origins')
    }
    const key = import.meta.env.PROJECT_TEST_PUBLISHABLE_KEY!
    const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    const account = (token: string) => createClient(url.href, key, {
      ...options, global: { headers: { Authorization: `Bearer ${token}` } },
    })
    admin = createClient(url.href, import.meta.env.PROJECT_TEST_SERVICE_ROLE_KEY!, options)
    anonymous = createClient(url.href, key, options)
    const testerToken = import.meta.env.PROJECT_TEST_TESTER_TOKEN!
    const developerToken = import.meta.env.PROJECT_TEST_DEVELOPER_TOKEN!
    tester = account(testerToken)
    developer = account(developerToken)

    async function identity(token: string, role: string) {
      const auth = await anonymous.auth.getUser(token)
      expect(auth.error).toBeNull()
      const profile = await admin.from('profiles').select('id,role,username,display_name').eq('id', auth.data.user!.id).single()
      expect(profile.error).toBeNull()
      expect(profile.data?.role).toBe(role)
      return profile.data!
    }
    const profile = await identity(testerToken, 'tester')
    testerId = profile.id
    developerId = (await identity(developerToken, 'developer')).id
    expect(developerId).not.toBe(testerId)
    secondDeveloper = account(import.meta.env.PROJECT_TEST_SECOND_DEVELOPER_TOKEN!)
    secondDeveloperId = (await identity(import.meta.env.PROJECT_TEST_SECOND_DEVELOPER_TOKEN!, 'developer')).id
    expect(secondDeveloperId).not.toBe(developerId)
    expect(secondDeveloperId).not.toBe(testerId)

    const email = `report-integration-${crypto.randomUUID()}@example.test`
    const password = `Test-${crypto.randomUUID()}!`
    const user = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    unprofiledId = user.data.user?.id
    expect(user.error).toBeNull()
    const signIn = await createClient(url.href, key, options).auth.signInWithPassword({ email, password })
    expect(signIn.error).toBeNull()
    unprofiled = account(signIn.data.session!.access_token)
    const absent = await admin.from('profiles').select('id').eq('id', unprofiledId!).maybeSingle()
    expect(absent.error).toBeNull()
    expect(absent.data).toBeNull()
  }, 30000)

  afterEach(async () => {
    if (reportIds.size) {
      const ids = [...reportIds]
      const comments = await admin.from('report_comments').delete().in('report_id', ids)
      expect(comments.error).toBeNull()
      const history = await admin.from('report_history').delete().in('report_id', ids)
      expect(history.error).toBeNull()
      const reports = await admin.from('reports').delete().in('id', ids)
      expect(reports.error).toBeNull()
      reportIds.clear()
    }
    if (projectIds.size) {
      const ids = [...projectIds]
      const history = await admin.from('project_history').delete().in('project_id', ids)
      expect(history.error).toBeNull()
      const projects = await admin.from('projects').delete().in('id', ids)
      expect(projects.error).toBeNull()
      projectIds.clear()
    }
  }, 30000)

  afterAll(async () => {
    if (!unprofiledId) return
    const result = await admin.auth.admin.deleteUser(unprofiledId)
    expect(result.error).toBeNull()
  }, 30000)

  async function project() {
    const result = await developer.rpc('create_project', {
      p_name: `Report fixture ${crypto.randomUUID()}`,
      p_description: 'Report integration fixture', p_repository_url: 'https://example.test/repo',
    })
    if (result.data?.id) projectIds.add(result.data.id)
    expect(result.error).toBeNull()
    return result.data.id as string
  }

  function params(projectId: string) {
    return {
      p_project_id: projectId, p_title: ' \u00a0Report title ', p_description: 'Description\n',
      p_version: '1.2', p_reproduction_steps: 'Step 1\nStep 2',
      p_expected_results: 'Expected', p_actual_results: 'Actual', p_severity: 'high',
      p_test_environment: ' \t',
    }
  }

  async function create(client: SupabaseClient, projectId: string, overrides: Record<string, unknown> = {}) {
    const result = await client.rpc('create_report', { ...params(projectId), ...overrides })
    if (result.data?.id) reportIds.add(result.data.id)
    return result
  }

  async function saved(projectId: string) {
    const result = await create(tester, projectId)
    expect(result.error).toBeNull()
    expect(result.data?.id).toEqual(expect.any(String))
    return result.data
  }
  const fixed = { kind: 'fixed', fix_summary: ' Fixed crash ', affected_version: ' 1.2 ', commit_url: ' https://git.example/commit/abc ', pull_request_url: ' http://other.example/pr/1 ' }
  async function snapshot(reportId: string) {
    const report = await tester.rpc('get_report', { p_report_id: reportId })
    const history = await tester.rpc('get_report_history', { p_report_id: reportId })
    expect(report.error).toBeNull()
    expect(history.error).toBeNull()
    return { report: report.data, history: history.data as { event: string; actor_id: string; occurred_at: string; changes: Record<string, unknown> }[] }
  }
  async function investigating(projectId?: string) {
    const report = await saved(projectId ?? await project())
    expect((await developer.rpc('accept_report', { p_report_id: report.id })).error).toBeNull()
    expect((await developer.rpc('start_report_investigation', { p_report_id: report.id })).error).toBeNull()
    return (await snapshot(report.id)).report
  }
  const resolve = (client: SupabaseClient, id: string, input: unknown = fixed) => client.rpc('resolve_report', { p_report_id: id, p_resolution: input })
  const link = (client: SupabaseClient, id: string, target: string, expected: string | null = null) => client.rpc('link_duplicate_report', { p_report_id: id, p_canonical_report_id: target, p_expected_canonical_report_id: expected })
  async function rejectsUnchanged(reportId: string, operation: () => ReturnType<typeof resolve>, code?: string) {
    const before = await snapshot(reportId)
    const result = await operation()
    expect(result.error).not.toBeNull()
    if (code) expect(result.error?.code).toBe(code)
    expect(await snapshot(reportId)).toEqual(before)
  }

  it.each(['fixed', 'invalid', 'cannot_reproduce', 'will_not_fix', 'duplicate'])('resolveReport_%s_persistsTrustedFieldsAndOneImmutableEventReadableByBothRoles', async kind => {
    const report = await investigating()
    const target = await saved(report.project_id)
    if (kind === 'duplicate') expect((await link(developer, report.id, target.id)).error).toBeNull()
    const before = await snapshot(report.id)
    const input = kind === 'fixed' ? fixed : kind === 'duplicate' ? { kind, explanation: ' Same bug ', canonical_report_id: target.id } : { kind, explanation: ' Reason ' }
    const result = await resolve(developer, report.id, input)
    expect(result.error).toBeNull()
    const after = await snapshot(report.id)
    expect(after.report).toMatchObject({ state: 'Resolved', version: report.version, assigned_developer_id: developerId, assigned_at: report.assigned_at, resolution: { kind, author_id: developerId, resolved_at: expect.any(String) } })
    if (kind === 'fixed') expect(after.report.resolution).toMatchObject({ fix_summary: 'Fixed crash', affected_version: '1.2', commit_url: 'https://git.example/commit/abc', pull_request_url: 'http://other.example/pr/1' })
    else expect(after.report.resolution).toMatchObject({ explanation: kind === 'duplicate' ? 'Same bug' : 'Reason' })
    expect(after.history).toHaveLength(before.history.length + 1)
    const event = after.history.at(-1)!
    expect(event).toMatchObject({ event: 'resolved', actor_id: developerId, occurred_at: after.report.updated_at, changes: { state: { before: 'In progress', after: 'Resolved' }, resolution: { before: null, after: after.report.resolution } } })
    for (const client of [tester, developer]) {
      const read = await client.rpc('get_report', { p_report_id: report.id })
      expect(read.error).toBeNull()
      expect(read.data).toEqual(after.report)
      const listing = await client.rpc('list_project_reports', { p_project_id: report.project_id })
      expect(listing.error).toBeNull()
      expect(listing.data.find((row: { id: string }) => row.id === report.id)).toMatchObject({ state: 'Resolved', assigned_developer_id: developerId })
    }
    const comment = await tester.rpc('post_report_comment', { p_report_id: report.id, p_body: 'Discussion remains available', p_reply_to_comment_id: null })
    expect(comment.error).toBeNull()
    expect((await snapshot(report.id)).report).toEqual(after.report)
  }, 30000)

  it('linkDuplicate_separateSaveNoopStaleReplacementAndResolvedSnapshot_areIndependent', async () => {
    const report = await investigating()
    const first = await saved(report.project_id)
    const second = await saved(report.project_id)
    const before = await snapshot(report.id)
    expect((await link(developer, report.id, first.id)).error).toBeNull()
    const linked = await snapshot(report.id)
    expect(linked.report).toMatchObject({ state: 'In progress', resolution: null, canonical_report: { id: first.id }, assigned_at: report.assigned_at })
    expect(linked.history).toHaveLength(before.history.length + 1)
    expect(linked.history.at(-1)).toMatchObject({ event: 'duplicate_linked', actor_id: developerId, changes: { canonical_report_id: { before: null, after: first.id } } })
    // Identical target is a no-op even if the caller has an older expected value.
    expect((await link(developer, report.id, first.id)).error).toBeNull()
    expect(await snapshot(report.id)).toEqual(linked)
    await rejectsUnchanged(report.id, () => link(developer, report.id, second.id), 'P2007')
    expect((await resolve(developer, report.id, { kind: 'duplicate', explanation: 'Same', canonical_report_id: first.id })).error).toBeNull()
    const resolved = await snapshot(report.id)
    expect((await link(developer, report.id, second.id, first.id)).error).toBeNull()
    const replaced = await snapshot(report.id)
    expect(replaced.report).toMatchObject({ state: 'Resolved', canonical_report: { id: second.id }, resolution: resolved.report.resolution })
    expect(replaced.report.resolution.canonical_report_id).toBe(first.id)
    expect(replaced.history.filter(row => row.event === 'resolved')).toEqual(resolved.history.filter(row => row.event === 'resolved'))
  }, 30000)

  it.each(['Accepted', 'Awaiting tester information', 'Resolved', 'Closed'])('linkDuplicate_%sSource_preservesStateAndAllowsResolvedClosedTargets', async state => {
    const report = await investigating()
    const target = await investigating(report.project_id)
    expect((await resolve(developer, target.id)).error).toBeNull()
    if (state === 'Closed') expect((await admin.from('reports').update({ state: 'Closed' }).eq('id', target.id)).error).toBeNull()
    if (state === 'Accepted') expect((await admin.from('reports').update({ state }).eq('id', report.id)).error).toBeNull()
    if (state === 'Awaiting tester information') expect((await developer.rpc('await_tester_information', { p_report_id: report.id })).error).toBeNull()
    if (state === 'Resolved' || state === 'Closed') {
      expect((await resolve(developer, report.id)).error).toBeNull()
      if (state === 'Closed') expect((await admin.from('reports').update({ state }).eq('id', report.id)).error).toBeNull()
    }
    const before = await snapshot(report.id)
    const targetBefore = await snapshot(target.id)
    expect((await link(developer, report.id, target.id)).error).toBeNull()
    const after = await snapshot(report.id)
    expect(after.report).toMatchObject({ state, assigned_at: before.report.assigned_at, resolution: before.report.resolution })
    expect(await snapshot(target.id)).toEqual(targetBefore)
  }, 30000)

  it('mutations_wrongActorsAndDirectWrites_areDeniedWithoutChanges', async () => {
    const report = await investigating()
    const target = await saved(report.project_id)
    for (const client of [tester, secondDeveloper, unprofiled, anonymous]) {
      await rejectsUnchanged(report.id, () => resolve(client, report.id))
      await rejectsUnchanged(report.id, () => link(client, report.id, target.id))
    }
    const before = await snapshot(report.id)
    for (const client of [tester, developer]) {
      const write = await client.from('reports').update({ state: 'Resolved', canonical_report_id: target.id }).eq('id', report.id)
      expect(write.error).not.toBeNull()
      const history = await client.from('report_history').insert({ report_id: report.id, actor_id: developerId, event: 'resolved', changes: {} })
      expect(history.error).not.toBeNull()
    }
    expect(await snapshot(report.id)).toEqual(before)
  }, 30000)

  it.each(['Open', 'Accepted', 'Awaiting tester information', 'Resolved', 'Closed'])('resolveReport_%sSource_rejectsWithoutChanges', async state => {
    const report = await saved(await project())
    if (state !== 'Open') expect((await developer.rpc('accept_report', { p_report_id: report.id })).error).toBeNull()
    if (!['Open', 'Accepted'].includes(state)) expect((await developer.rpc('start_report_investigation', { p_report_id: report.id })).error).toBeNull()
    if (state === 'Awaiting tester information') expect((await developer.rpc('await_tester_information', { p_report_id: report.id })).error).toBeNull()
    if (state === 'Resolved' || state === 'Closed') expect((await resolve(developer, report.id)).error).toBeNull()
    if (state === 'Closed') expect((await admin.from('reports').update({ state }).eq('id', report.id)).error).toBeNull()
    await rejectsUnchanged(report.id, () => resolve(developer, report.id), state === 'Open' ? undefined : 'P2007')
  }, 30000)

  it('mutations_invalidTargetsAndMissingSavedDuplicateLink_rejectWithoutChanges', async () => {
    const report = await investigating()
    const foreign = await saved(await project())
    const draft = await tester.rpc('save_report_draft', { p_draft_id: null, ...params(report.project_id) })
    expect(draft.error).toBeNull()
    try {
      for (const target of [report.id, crypto.randomUUID(), foreign.id, draft.data.id, 'bad']) await rejectsUnchanged(report.id, () => link(developer, report.id, target))
      await rejectsUnchanged(report.id, () => resolve(developer, report.id, { kind: 'duplicate', explanation: 'Same', canonical_report_id: foreign.id }), 'P2003')
      expect((await resolve(developer, crypto.randomUUID())).error?.code).toBe('P2005')
    } finally {
      expect((await tester.rpc('delete_report_draft', { p_draft_id: draft.data.id })).error).toBeNull()
    }
  }, 30000)

  it('resolveReport_invalidRuntimeFieldsBoundariesUrlsAndProtectedMetadata_rejectWithoutChanges', async () => {
    const report = await investigating()
    const invalid: unknown[] = [null, [], 'fixed', { kind: 'unknown' }, { ...fixed, author_id: developerId }, { ...fixed, resolved_at: '2000-01-01' }, { ...fixed, state: 'Closed' }, { ...fixed, explanation: 'hidden' }, { kind: 'invalid', explanation: 'Reason', fix_summary: 'hidden' }]
    for (const field of ['fix_summary', 'affected_version', 'commit_url', 'pull_request_url']) for (const value of ['', ' \u00a0\n', null, 42]) invalid.push({ ...fixed, [field]: value })
    for (const [field, limit] of [['fix_summary', 5000], ['affected_version', 100]] as const) invalid.push({ ...fixed, [field]: '\u{1F600}'.repeat(limit + 1) })
    for (const value of ['/relative', 'javascript:alert(1)', 'https://', 'https://example.test/' + 'a'.repeat(2048)]) invalid.push({ ...fixed, commit_url: value })
    for (const value of ['', '\u{1F600}'.repeat(5001), 42]) invalid.push({ kind: 'invalid', explanation: value })
    for (const value of invalid) await rejectsUnchanged(report.id, () => resolve(developer, report.id, value), 'P2003')
  }, 60000)

  it('resolveReport_exactUnicodeAndUrlBoundaries_matchClientContract', async () => {
    const report = await investigating()
    const prefix = 'https://example.test/'
    const result = await resolve(developer, report.id, { ...fixed, fix_summary: '\u00a0' + '\u{1F600}'.repeat(5000) + '\n', affected_version: '\u{1F600}'.repeat(100), commit_url: prefix + 'a'.repeat(2048 - prefix.length), pull_request_url: 'http://independent.example/pr' })
    expect(result.error).toBeNull()
    expect(Array.from(result.data.resolution.fix_summary)).toHaveLength(5000)
    expect(Array.from(result.data.resolution.affected_version)).toHaveLength(100)
    expect(Array.from(result.data.resolution.commit_url)).toHaveLength(2048)
  }, 30000)

  it('mutations_archiveAfterLoad_rejectsAndBothRolesRetainReadback', async () => {
    const report = await investigating()
    const target = await saved(report.project_id)
    expect((await admin.from('projects').update({ archived_at: new Date().toISOString() }).eq('id', report.project_id)).error).toBeNull()
    await rejectsUnchanged(report.id, () => resolve(developer, report.id), 'P2004')
    await rejectsUnchanged(report.id, () => link(developer, report.id, target.id), 'P2004')
    for (const client of [tester, developer]) expect((await client.rpc('get_report', { p_report_id: report.id })).error).toBeNull()
  }, 30000)

  it.each(['resolution', 'clarification'])('resolveReport_races%s_exactlyOneSourceTransitionCommits', async contender => {
    const report = await investigating()
    const before = await snapshot(report.id)
    const results = await Promise.all([resolve(developer, report.id), contender === 'resolution' ? resolve(developer, report.id, { kind: 'invalid', explanation: 'Reason' }) : developer.rpc('await_tester_information', { p_report_id: report.id })])
    expect(results.filter(value => !value.error)).toHaveLength(1)
    expect(results.filter(value => value.error?.code === 'P2007')).toHaveLength(1)
    const after = await snapshot(report.id)
    expect(after.history).toHaveLength(before.history.length + 1)
    expect(after.report.assigned_at).toBe(report.assigned_at)
  }, 30000)

  it.each(['resolution', 'link'])('mutation_%sRacingArchive_serializesBeforeArchiveOrRejectsWithoutPartialWrites', async action => {
    const report = await investigating()
    const target = await saved(report.project_id)
    const before = await snapshot(report.id)
    const [mutation, archive] = await Promise.all([
      action === 'resolution' ? resolve(developer, report.id) : link(developer, report.id, target.id),
      admin.from('projects').update({ archived_at: new Date().toISOString() }).eq('id', report.project_id),
    ])
    expect(archive.error).toBeNull()
    const after = await snapshot(report.id)
    expect(after.report.project_archived_at).not.toBeNull()
    if (mutation.error) {
      expect(mutation.error.code).toBe('P2004')
      expect({ ...after.report, project_archived_at: null }).toEqual(before.report)
      expect(after.history).toEqual(before.history)
    } else {
      expect(after.history).toHaveLength(before.history.length + 1)
      expect(after.report).toMatchObject(action === 'resolution' ? { state: 'Resolved', resolution: { kind: 'fixed' } } : { state: 'In progress', canonical_report: { id: target.id }, resolution: null })
    }
  }, 30000)

  it('linkAndDuplicateResolution_race_serializesCapturedTargetAndStaleExpectedLinks', async () => {
    const report = await investigating()
    const first = await saved(report.project_id)
    const second = await saved(report.project_id)
    expect((await link(developer, report.id, first.id)).error).toBeNull()
    const results = await Promise.all([link(developer, report.id, second.id, first.id), resolve(developer, report.id, { kind: 'duplicate', explanation: 'Same', canonical_report_id: first.id })])
    expect(results[0].error).toBeNull()
    const after = await snapshot(report.id)
    expect(after.report.canonical_report.id).toBe(second.id)
    if (results[1].error) {
      expect(results[1].error.code).toBe('P2007')
      expect(after.report.state).toBe('In progress')
      expect(after.history.filter(row => row.event === 'resolved')).toHaveLength(0)
    } else {
      expect(after.report.resolution.canonical_report_id).toBe(first.id)
      expect(after.history.filter(row => row.event === 'resolved')).toHaveLength(1)
    }
    await rejectsUnchanged(report.id, () => link(developer, report.id, first.id, first.id), 'P2007')
  }, 30000)
})
