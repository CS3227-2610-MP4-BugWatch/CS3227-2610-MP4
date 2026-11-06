import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

const names = [
  'PROJECT_TEST_ISOLATED', 'PROJECT_TEST_URL', 'PROJECT_TEST_PRODUCTION_URL',
  'PROJECT_TEST_PUBLISHABLE_KEY', 'PROJECT_TEST_SERVICE_ROLE_KEY',
  'PROJECT_TEST_TESTER_TOKEN', 'PROJECT_TEST_DEVELOPER_TOKEN',
] as const
const configured = names.some(name => import.meta.env[name] !== undefined)

describe.skipIf(!configured)('isolated Supabase report integration (requires PROJECT_TEST_* environment)', () => {
  let admin: SupabaseClient
  let anonymous: SupabaseClient
  let tester: SupabaseClient
  let developer: SupabaseClient
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

  async function expectNoReports(projectId: string) {
    const rows = await admin.from('reports').select('id').eq('project_id', projectId)
    expect(rows.error).toBeNull()
    expect(rows.data).toEqual([])
  }

  it('createReport_tester_persistsTrimmedInputsAndTrustedHistoryReadableByDeveloper', async () => {
    const projectId = await project()
    const row = await saved(projectId)
    const expected = {
      id: row.id, project_id: projectId, title: 'Report title', description: 'Description',
      version: '1.2', reproduction_steps: 'Step 1\nStep 2', expected_results: 'Expected',
      actual_results: 'Actual', severity: 'high', test_environment: '', reporter_id: testerId,
      state: 'Open', assigned_developer_id: null, created_at: expect.any(String), updated_at: expect.any(String),
    }
    expect(row).toMatchObject(expected)
    expect(row.created_at).toBe(row.updated_at)
    const stored = await admin.from('reports').select('*').eq('id', row.id).single()
    expect(stored.error).toBeNull()
    expect(stored.data).toMatchObject(expected)
    const read = await developer.rpc('get_report', { p_report_id: row.id })
    expect(read.error).toBeNull()
    expect(read.data).toMatchObject({ ...expected, reporter_username: reporterUsername, reporter_display_name: reporterName })
    expect(read.data).not.toHaveProperty('email')
    const history = await developer.rpc('get_report_history', { p_report_id: row.id })
    expect(history.error).toBeNull()
    expect(history.data).toHaveLength(1)
    expect(history.data[0]).toMatchObject({
      report_id: row.id, actor_id: testerId, actor_display_name: reporterName, event: 'created',
      occurred_at: row.created_at, changes: {
        title: { before: null, after: 'Report title' }, project_id: { before: null, after: projectId },
      },
    })
    const profiles = await developer.from('profiles').select('id').eq('id', testerId)
    expect(profiles.error).toBeNull()
    expect(profiles.data).toEqual([])
  })

  it.each(['developer', 'anonymous', 'unprofiled'] as const)('createReport_%sCaller_deniesWithoutWrite', async actor => {
    const projectId = await project()
    const result = await create({ developer, anonymous, unprofiled }[actor], projectId)
    expect(result.error).not.toBeNull()
    if (actor !== 'anonymous') expect(result.error?.code).toBe('P2002')
    await expectNoReports(projectId)
  })

  it.each(['anonymous', 'unprofiled'] as const)('readReport_%sCaller_cannotReadReportsOrHistory', async actor => {
    const row = await saved(await project())
    const client = { anonymous, unprofiled }[actor]
    for (const [table, column] of [['reports', 'id'], ['report_history', 'report_id']] as const) {
      const result = await client.from(table).select('*').eq(column, row.id)
      expect(result.data ?? []).toEqual([])
    }
    for (const rpc of ['get_report', 'get_report_history']) {
      const result = await client.rpc(rpc, { p_report_id: row.id })
      expect(result.error).not.toBeNull()
      expect(result.data).toBeNull()
    }
  })

  it('createReport_archivedProject_rejectsWithoutWrite', async () => {
    const id = await project()
    const archive = await admin.from('projects').update({ archived_at: new Date().toISOString() }).eq('id', id)
    expect(archive.error).toBeNull()
    const result = await create(tester, id)
    expect(result.error?.code).toBe('P2004')
    await expectNoReports(id)
  })

  it('createReport_missingProject_returnsNotFound', async () => {
    const id = crypto.randomUUID()
    const result = await create(tester, id)
    expect(result.error?.code).toBe('P2005')
    await expectNoReports(id)
  })

  it('createReport_malformedProjectId_rejectsRequest', async () => {
    const result = await create(tester, 'not-a-uuid')
    expect(result.error).not.toBeNull()
    expect(result.data).toBeNull()
  })

  it.each([
    ['empty title', { p_title: '' }], ['overlong title', { p_title: '😀'.repeat(201) }],
    ['overlong version', { p_version: 'x'.repeat(101) }], ['missing description', { p_description: null }],
    ['blank steps', { p_reproduction_steps: '\u00a0\t' }],
    ['overlong expected results', { p_expected_results: 'x'.repeat(5001) }],
    ['missing actual results', { p_actual_results: null }],
    ['overlong environment', { p_test_environment: '😀'.repeat(1001) }],
    ['unknown severity', { p_severity: 'critical' }], ['missing severity', { p_severity: null }],
  ] as const)('createReport_%s_rejectsAtPersistence', async (_label, override) => {
    const id = await project()
    const result = await create(tester, id, override)
    expect(result.error?.code).toBe('P2003')
    await expectNoReports(id)
  })

  it('createReport_forgedReporterParameter_rejectsWithoutWrite', async () => {
    const id = await project()
    const result = await create(tester, id, { p_reporter_id: developerId })
    expect(result.error).not.toBeNull()
    await expectNoReports(id)
  })

  it('reportsTable_directInsert_deniesForgedMetadata', async () => {
    const projectId = await project()
    const result = await tester.from('reports').insert({
      project_id: projectId, reporter_id: developerId, title: 'Forged', description: 'Description',
      version: '1', reproduction_steps: 'Step', expected_results: 'Expected',
      actual_results: 'Actual', severity: 'high', test_environment: '',
    }).select('id')
    for (const row of result.data ?? []) reportIds.add(row.id)
    expect(result.error).not.toBeNull()
    await expectNoReports(projectId)
  })

  it.each(['update', 'delete'] as const)('reportsTable_direct%s_preservesTrustedRow', async operation => {
    const row = await saved(await project())
    const result = operation === 'update'
      ? await tester.from('reports').update({ reporter_id: developerId }).eq('id', row.id)
      : await tester.from('reports').delete().eq('id', row.id)
    expect(result.error).not.toBeNull()
    const stored = await admin.from('reports').select('reporter_id').eq('id', row.id).single()
    expect(stored.error).toBeNull()
    expect(stored.data?.reporter_id).toBe(testerId)
  })

  it.each(['insert', 'update', 'delete'] as const)('reportHistoryTable_direct%s_preservesCreationActivity', async operation => {
    const row = await saved(await project())
    const table = tester.from('report_history')
    const result = operation === 'insert'
      ? await table.insert({ report_id: row.id, actor_id: developerId, event: 'created', changes: {} })
      : operation === 'update'
        ? await table.update({ actor_id: developerId }).eq('report_id', row.id)
        : await table.delete().eq('report_id', row.id)
    expect(result.error).not.toBeNull()
    const stored = await admin.from('report_history').select('actor_id').eq('report_id', row.id)
    expect(stored.error).toBeNull()
    expect(stored.data).toEqual([{ actor_id: testerId }])
  })

  it.each(['tester', 'developer'] as const)('listProjectReports_%s_readsOnlyRequestedProjectSummariesNewestFirst', async actor => {
    const id = await project()
    const other = await saved(await project())
    const older = await saved(id)
    const newer = await saved(id)
    const setTimestamp = (reportId: string, createdAt: string) =>
      admin.from('reports').update({ created_at: createdAt, updated_at: createdAt }).eq('id', reportId)
    expect((await setTimestamp(older.id, '2026-11-05T09:30:00.000011+00:00')).error).toBeNull()
    expect((await setTimestamp(newer.id, '2026-11-05T09:30:00.000012+00:00')).error).toBeNull()

    const client = { tester, developer }[actor]
    const result = await client.rpc('list_project_reports', { p_project_id: id })
    expect(result.error).toBeNull()
    expect(result.data.map((item: { id: string }) => item.id)).toEqual([newer.id, older.id])
    expect(result.data[0]).toMatchObject({
      id: newer.id, project_id: id, title: newer.title, project_name: newer.project_name,
      severity: 'high', state: 'Open', assigned_developer_id: null, reporter_display_name: reporterName,
    })
    expect(result.data[0]).not.toHaveProperty('email')
    expect(result.data[0]).not.toHaveProperty('description')
    expect(result.data).not.toContainEqual(expect.objectContaining({ id: other.id }))

    const continuation = await client.rpc('list_project_reports', {
      p_project_id: id, p_before_created_at: result.data[0].created_at, p_before_id: newer.id,
    })
    expect(continuation.error).toBeNull()
    expect(continuation.data.map((item: { id: string }) => item.id)).toEqual([older.id])
  })

  it.each(['anonymous', 'unprofiled'] as const)('listProjectReports_%s_deniesDiscovery', async actor => {
    const id = await project()
    await saved(id)
    const client = { anonymous, unprofiled }[actor]
    const result = await client.rpc('list_project_reports', { p_project_id: id })
    expect(result.error).not.toBeNull()
    expect(result.data).toBeNull()
  })

  it('listProjectReports_missingProject_returnsNotFound', async () => {
    const result = await tester.rpc('list_project_reports', { p_project_id: crypto.randomUUID() })
    expect(result.error?.code).toBe('P2005')
    expect(result.data).toBeNull()
  })

  it('listProjectReports_partialCursor_rejectsInvalidRequest', async () => {
    const id = await project()
    const result = await tester.rpc('list_project_reports', {
      p_project_id: id, p_before_created_at: '2026-11-05T09:30:00Z',
    })
    expect(result.error?.code).toBe('P2003')
    expect(result.data).toBeNull()
  })

  it('listProjectReports_equalTimestamps_capsPageAndUsesUuidTieBreaker', async () => {
    const projectId = await project()
    const createdAt = '2026-11-05T09:30:00.000012+00:00'
    const rows = Array.from({ length: 101 }, (_, index) => ({
      id: crypto.randomUUID(), project_id: projectId, reporter_id: testerId,
      title: `Pagination fixture ${index}`, description: 'Description', version: '1',
      reproduction_steps: 'Open page', expected_results: 'Opens', actual_results: 'Fails',
      severity: 'low', created_at: createdAt, updated_at: createdAt,
    }))
    const insert = await admin.from('reports').insert(rows)
    expect(insert.error).toBeNull()
    for (const row of rows) reportIds.add(row.id)
    const expected = rows.map(row => row.id).sort().reverse()

    const first = await developer.rpc('list_project_reports', { p_project_id: projectId })
    expect(first.error).toBeNull()
    expect(first.data.map((item: { id: string }) => item.id)).toEqual(expected.slice(0, 100))
    const cursor = first.data.at(-1)
    const second = await developer.rpc('list_project_reports', {
      p_project_id: projectId, p_before_created_at: cursor.created_at, p_before_id: cursor.id,
    })
    expect(second.error).toBeNull()
    expect(second.data.map((item: { id: string }) => item.id)).toEqual(expected.slice(100))
  })
})
