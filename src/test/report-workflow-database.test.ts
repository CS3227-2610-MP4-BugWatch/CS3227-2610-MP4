import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

const names = [
  'PROJECT_TEST_ISOLATED', 'PROJECT_TEST_URL', 'PROJECT_TEST_PRODUCTION_URL',
  'PROJECT_TEST_PUBLISHABLE_KEY', 'PROJECT_TEST_SERVICE_ROLE_KEY',
  'PROJECT_TEST_TESTER_TOKEN', 'PROJECT_TEST_DEVELOPER_TOKEN', 'PROJECT_TEST_SECOND_DEVELOPER_TOKEN',
] as const
const configured = names.some(name => import.meta.env[name] !== undefined)

describe.skipIf(!configured)('isolated Supabase report workflow integration (requires PROJECT_TEST_* environment)', () => {
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
  let reporterName: string
  let reporterUsername: string
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
    reporterName = profile.display_name
    reporterUsername = profile.username
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
  async function snapshot(reportId: string) {
    const report = await admin.from('reports').select('*').eq('id', reportId).single()
    const history = await admin.from('report_history').select('*').eq('report_id', reportId).order('occurred_at').order('id')
    expect(report.error).toBeNull()
    expect(history.error).toBeNull()
    return { report: report.data!, history: history.data! }
  }
  async function rejectUnchanged(client: SupabaseClient, action: string, reportId: string, code?: string) {
    const before = await snapshot(reportId)
    const result = await client.rpc(action, { p_report_id: reportId })
    expect(result.error).not.toBeNull()
    if (code) expect(result.error?.code).toBe(code)
    expect(result.data).toBeNull()
    expect(await snapshot(reportId)).toEqual(before)
  }
  it('acceptReport_twoDistinctDevelopersRace_firstWinsWithOneAtomicEvent', async () => {
    const projectId = await project()
    const report = await saved(projectId)
    expect(report).toMatchObject({ state: 'Open', assigned_developer_id: null, assigned_at: null })
    const results = await Promise.all([developer, secondDeveloper].map(client => client.rpc('accept_report', { p_report_id: report.id })))
    expect(results.filter(result => !result.error)).toHaveLength(1)
    expect(results.filter(result => result.error?.code === 'P2006')).toHaveLength(1)
    const winnerIndex = results.findIndex(result => !result.error)
    const winnerId = [developerId, secondDeveloperId][winnerIndex]
    const state = await snapshot(report.id)
    expect(state.report).toMatchObject({ state: 'Accepted', assigned_developer_id: winnerId, assigned_at: expect.any(String) })
    expect(state.report.updated_at).toBe(state.report.assigned_at)
    expect(state.history).toHaveLength(2)
    const event = state.history.find(item => item.event === 'accepted')!
    expect(event).toMatchObject({ actor_id: winnerId, occurred_at: state.report.assigned_at, changes: {
      state: { before: 'Open', after: 'Accepted' }, assigned_developer_id: { before: null, after: winnerId }, assigned_at: { before: null, after: state.report.assigned_at },
    } })
    for (const client of [developer, secondDeveloper]) await rejectUnchanged(client, 'accept_report', report.id, 'P2006')
  })
  // This hosted scenario includes sequential before/after snapshots for three rejected writes.
  // Allow remote round-trip latency while keeping the concurrent RPC race and a finite budget.
  it('startInvestigation_nonAssigneeDeniedAndConcurrentAssigneeStart_commitsOnceAndPreservesAssignmentTime', async () => {
    const report = await saved(await project())
    expect((await developer.rpc('accept_report', { p_report_id: report.id })).error).toBeNull()
    const before = await snapshot(report.id)
    await rejectUnchanged(secondDeveloper, 'start_report_investigation', report.id, 'P2002')
    const results = await Promise.all([1, 2].map(() => developer.rpc('start_report_investigation', { p_report_id: report.id })))
    expect(results.filter(result => !result.error)).toHaveLength(1)
    expect(results.filter(result => result.error?.code === 'P2007')).toHaveLength(1)
    const after = await snapshot(report.id)
    expect(after.report).toMatchObject({ state: 'In progress', assigned_developer_id: developerId, assigned_at: before.report.assigned_at })
    expect(after.history).toHaveLength(3)
    expect(after.history.find(item => item.event === 'investigation_started')).toMatchObject({ actor_id: developerId, occurred_at: after.report.updated_at, changes: { state: { before: 'Accepted', after: 'In progress' } } })
    expect(after.history.find(item => item.event === 'investigation_started')!.changes).not.toHaveProperty('assigned_at')
    await rejectUnchanged(developer, 'start_report_investigation', report.id, 'P2007')
    await rejectUnchanged(developer, 'accept_report', report.id, 'P2006')
  }, 30000)
  it('startInvestigation_openReport_rejectsStateConflictWithoutWrites', async () => {
    const report = await saved(await project())
    await rejectUnchanged(developer, 'start_report_investigation', report.id, 'P2007')
  })
  for (const action of ['accept_report', 'start_report_investigation']) {
    it.each(['tester', 'anonymous', 'unprofiled'] as const)(`${action}_%s_deniesWithoutWrites`, async actor => {
      const report = await saved(await project())
      if (action === 'start_report_investigation') expect((await developer.rpc('accept_report', { p_report_id: report.id })).error).toBeNull()
      await rejectUnchanged({ tester, anonymous, unprofiled }[actor], action, report.id, actor === 'anonymous' ? undefined : 'P2002')
    })
    it(`${action}_archivedAfterRead_rejectsWithoutWrites`, async () => {
      const projectId = await project()
      const report = await saved(projectId)
      if (action === 'start_report_investigation') expect((await developer.rpc('accept_report', { p_report_id: report.id })).error).toBeNull()
      expect((await developer.rpc('get_report', { p_report_id: report.id })).error).toBeNull()
      expect((await admin.from('projects').update({ archived_at: new Date().toISOString() }).eq('id', projectId)).error).toBeNull()
      await rejectUnchanged(developer, action, report.id, 'P2004')
    })
    it(`${action}_missingReport_returnsNotFound`, async () => {
      const result = await developer.rpc(action, { p_report_id: crypto.randomUUID() })
      expect(result.error?.code).toBe('P2005')
      expect(result.data).toBeNull()
    })
    it(`${action}_forgedProtectedParameters_rejectedWithoutWrites`, async () => {
      const report = await saved(await project())
      const before = await snapshot(report.id)
      const result = await developer.rpc(action, { p_report_id: report.id, p_actor_id: secondDeveloperId, p_assigned_developer_id: secondDeveloperId, p_assigned_at: '2000-01-01T00:00:00Z', p_state: 'In progress' })
      expect(result.error).not.toBeNull()
      expect(await snapshot(report.id)).toEqual(before)
    })
  }
  it.each(['tester', 'developer', 'secondDeveloper'] as const)('workflow_directWritesBy%s_cannotForgeReportOrHistory', async actor => {
    const report = await saved(await project())
    const before = await snapshot(report.id)
    const client = { tester, developer, secondDeveloper }[actor]
    const update = await client.from('reports').update({ state: 'In progress', assigned_developer_id: secondDeveloperId, assigned_at: '2000-01-01T00:00:00Z', updated_at: '2000-01-01T00:00:00Z' }).eq('id', report.id)
    expect(update.error).not.toBeNull()
    const insert = await client.from('report_history').insert({ report_id: report.id, actor_id: secondDeveloperId, event: 'accepted', occurred_at: '2000-01-01T00:00:00Z', changes: {} })
    expect(insert.error).not.toBeNull()
    const historyUpdate = await client.from('report_history').update({ event: 'investigation_started' }).eq('report_id', report.id)
    expect(historyUpdate.error).not.toBeNull()
    const historyDelete = await client.from('report_history').delete().eq('report_id', report.id)
    expect(historyDelete.error).not.toBeNull()
    expect(await snapshot(report.id)).toEqual(before)
  })
  it.each(['tester', 'developer'] as const)('workflow_%sReload_readsPersistedStateAndScopedLabelsWithoutPrivateData', async actor => {
    const projectId = await project()
    const report = await saved(projectId)
    expect((await developer.rpc('accept_report', { p_report_id: report.id })).error).toBeNull()
    expect((await developer.rpc('start_report_investigation', { p_report_id: report.id })).error).toBeNull()
    const client = { tester, developer }[actor]
    const details = await client.rpc('get_report', { p_report_id: report.id })
    expect(details.error).toBeNull()
    expect(details.data).toMatchObject({ state: 'In progress', assigned_developer_id: developerId, assigned_at: expect.any(String), assigned_developer_username: expect.any(String), assigned_developer_display_name: expect.any(String), reporter_display_name: reporterName, reporter_username: reporterUsername })
    expect(details.data).not.toHaveProperty('email')
    const history = await client.rpc('get_report_history', { p_report_id: report.id })
    expect(history.error).toBeNull()
    expect(history.data.map((item: { event: string }) => item.event)).toEqual(['created', 'accepted', 'investigation_started'])
    expect(history.data[1]).toMatchObject({ actor_id: developerId, actor_username: details.data.assigned_developer_username, assigned_developer_username: details.data.assigned_developer_username })
    const list = await client.rpc('list_project_reports', { p_project_id: projectId })
    expect(list.error).toBeNull()
    expect(list.data).toHaveLength(1)
    expect(list.data[0]).toMatchObject({ id: report.id, state: 'In progress', assigned_developer_id: developerId, assigned_developer_username: details.data.assigned_developer_username, assigned_developer_display_name: details.data.assigned_developer_display_name })
    expect(list.data[0]).not.toHaveProperty('description')
    expect(list.data[0]).not.toHaveProperty('email')
    expect(list.data[0]).not.toHaveProperty('assigned_at')
  })
})
