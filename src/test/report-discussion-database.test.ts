import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

const names = [
  'PROJECT_TEST_ISOLATED', 'PROJECT_TEST_URL', 'PROJECT_TEST_PRODUCTION_URL',
  'PROJECT_TEST_PUBLISHABLE_KEY', 'PROJECT_TEST_SERVICE_ROLE_KEY',
  'PROJECT_TEST_TESTER_TOKEN', 'PROJECT_TEST_DEVELOPER_TOKEN', 'PROJECT_TEST_SECOND_DEVELOPER_TOKEN',
] as const
const configured = names.some(name => import.meta.env[name] !== undefined)

describe.skipIf(!configured)('isolated Supabase discussion and clarification integration (requires PROJECT_TEST_* environment)', () => {
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

  async function investigating() {
    const report = await saved(await project())
    expect((await developer.rpc('accept_report', { p_report_id: report.id })).error).toBeNull()
    expect((await developer.rpc('start_report_investigation', { p_report_id: report.id })).error).toBeNull()
    return report
  }
  async function comments(reportId: string) {
    const result = await tester.rpc('list_report_comments', { p_report_id: reportId })
    expect(result.error).toBeNull()
    return result.data as { id: string; report_id: string; author_id: string; body: string; reply_to_comment_id: string | null; created_at: string }[]
  }
  async function post(client: SupabaseClient, reportId: string, body: unknown = 'Question', reply: string | null = null) {
    return client.rpc('post_report_comment', { p_report_id: reportId, p_body: body, p_reply_to_comment_id: reply })
  }

  it('clarification_noCommentsOrReplies_waitAndResumePreserveAssignmentAndRecordExactHistory', async () => {
    const report = await investigating()
    const before = await snapshot(report.id)
    expect(await comments(report.id)).toEqual([])
    const wait = await developer.rpc('await_tester_information', { p_report_id: report.id })
    expect(wait.error).toBeNull()
    expect(wait.data).toMatchObject({ state: 'Awaiting tester information', assigned_developer_id: developerId, assigned_at: before.report.assigned_at })
    const waited = await snapshot(report.id)
    expect(waited.history).toHaveLength(before.history.length + 1)
    expect(waited.history.find(item => item.event === 'tester_information_requested')).toMatchObject({ actor_id: developerId, occurred_at: waited.report.updated_at, changes: { state: { before: 'In progress', after: 'Awaiting tester information' } } })
    for (const client of [tester, secondDeveloper]) {
      const read = await client.rpc('get_report', { p_report_id: report.id })
      expect(read.error).toBeNull()
      expect(read.data.state).toBe('Awaiting tester information')
      const listing = await client.rpc('list_project_reports', { p_project_id: report.project_id })
      expect(listing.error).toBeNull()
      expect(listing.data[0].state).toBe('Awaiting tester information')
    }
    const resume = await developer.rpc('resume_report_investigation', { p_report_id: report.id })
    expect(resume.error).toBeNull()
    expect(resume.data).toMatchObject({ state: 'In progress', assigned_at: before.report.assigned_at, assigned_developer_id: developerId })
    expect(await comments(report.id)).toEqual([])
    const after = await snapshot(report.id)
    expect(after.history).toHaveLength(before.history.length + 2)
    expect(after.history.find(item => item.event === 'investigation_resumed')).toMatchObject({ actor_id: developerId, changes: { state: { before: 'Awaiting tester information', after: 'In progress' } } })
  }, 30000)

  for (const action of ['await_tester_information', 'resume_report_investigation']) {
    it.each(['tester', 'secondDeveloper', 'anonymous', 'unprofiled'] as const)(`${action}_%s_deniesWithoutWrites`, async actor => {
      const report = await investigating()
      if (action === 'resume_report_investigation') expect((await developer.rpc('await_tester_information', { p_report_id: report.id })).error).toBeNull()
      await rejectUnchanged({ tester, secondDeveloper, anonymous, unprofiled }[actor], action, report.id, actor === 'anonymous' ? undefined : 'P2002')
    }, 30000)
    it(`${action}_duplicateConcurrentRequests_commitsOnce`, async () => {
      const report = await investigating()
      if (action === 'resume_report_investigation') expect((await developer.rpc('await_tester_information', { p_report_id: report.id })).error).toBeNull()
      const before = await snapshot(report.id)
      const results = await Promise.all([1, 2].map(() => developer.rpc(action, { p_report_id: report.id })))
      expect(results.filter(result => !result.error)).toHaveLength(1)
      expect(results.filter(result => result.error?.code === 'P2007')).toHaveLength(1)
      const after = await snapshot(report.id)
      expect(after.history).toHaveLength(before.history.length + 1)
      expect(after.report.assigned_at).toBe(before.report.assigned_at)
      await rejectUnchanged(developer, action, report.id, 'P2007')
    }, 30000)
    it(`${action}_archivedAfterRead_rejectsWithoutWrites`, async () => {
      const report = await investigating()
      if (action === 'resume_report_investigation') expect((await developer.rpc('await_tester_information', { p_report_id: report.id })).error).toBeNull()
      expect((await admin.from('projects').update({ archived_at: new Date().toISOString() }).eq('id', report.project_id)).error).toBeNull()
      await rejectUnchanged(developer, action, report.id, 'P2004')
    }, 30000)
    it(`${action}_assignedAcceptedStateAndMissingReport_rejectWithoutMutation`, async () => {
      const report = await saved(await project())
      await rejectUnchanged(developer, action, report.id, 'P2002')
      expect((await developer.rpc('accept_report', { p_report_id: report.id })).error).toBeNull()
      await rejectUnchanged(developer, action, report.id, 'P2007')
      const missing = await developer.rpc(action, { p_report_id: crypto.randomUUID() })
      expect(missing.error?.code).toBe('P2005')
    }, 30000)
  }

  it('comments_allParticipantsAndReply_preserveWorkflowAndServerIdentity', async () => {
    const report = await investigating()
    const before = await snapshot(report.id)
    const first = await post(tester, report.id, ' \u00a0Question\n<script>x</script>\ufeff ')
    expect(first.error).toBeNull()
    expect(first.data).toMatchObject({ report_id: report.id, author_id: testerId, body: 'Question\n<script>x</script>', reply_to_comment_id: null, created_at: expect.any(String) })
    const reply = await post(secondDeveloper, report.id, 'Response', first.data.id)
    expect(reply.error).toBeNull()
    expect(reply.data).toMatchObject({ author_id: secondDeveloperId, reply_to_comment_id: first.data.id })
    expect((await post(developer, report.id, 'Assignee joins')).error).toBeNull()
    expect((await comments(report.id)).map(item => item.id)).toEqual([first.data.id, reply.data.id, expect.any(String)])
    expect(await snapshot(report.id)).toEqual(before)
  }, 30000)
  it('comments_waitingReply_doesNotResume', async () => {
    const report = await investigating()
    expect((await developer.rpc('await_tester_information', { p_report_id: report.id })).error).toBeNull()
    const before = await snapshot(report.id)
    expect((await post(tester, report.id, 'Here are the details')).error).toBeNull()
    expect(await snapshot(report.id)).toEqual(before)
  }, 30000)
  it.each(['', '\t\u00a0\ufeff\n', '😀'.repeat(5001), null, 7, { text: 'Question' }])('postComment_invalidBody%j_rejectsWithoutComment', async body => {
    const report = await saved(await project())
    const result = await post(tester, report.id, body)
    expect(result.error?.code).toBe('P2003')
    expect(await comments(report.id)).toEqual([])
  }, 30000)
  it.each([1, 5000])('postComment_%sUnicodeCodePoints_accepts', async length => {
    const report = await saved(await project())
    const body = '😀'.repeat(length)
    const result = await post(tester, report.id, ` \u00a0${body}\ufeff `)
    expect(result.error).toBeNull()
    expect(result.data.body).toBe(body)
  }, 30000)
  it('postComment_crossReportOrMissingReply_rejectsWithoutDisclosure', async () => {
    const projectId = await project()
    const first = await saved(projectId)
    const second = await saved(projectId)
    const comment = await post(tester, first.id)
    expect(comment.error).toBeNull()
    for (const target of [comment.data.id, crypto.randomUUID()]) {
      const result = await post(developer, second.id, 'Reply', target)
      expect(result.error?.code).toBe('P2003')
      expect(result.error?.message).not.toContain(comment.data.body)
    }
    expect(await comments(second.id)).toEqual([])
  }, 30000)
  it.each(['anonymous', 'unprofiled'] as const)('comments_%s_cannotReadOrWrite', async actor => {
    const report = await saved(await project())
    const client = { anonymous, unprofiled }[actor]
    expect((await post(client, report.id)).error).not.toBeNull()
    expect((await client.rpc('list_report_comments', { p_report_id: report.id })).error).not.toBeNull()
    expect(await comments(report.id)).toEqual([])
  }, 30000)
  it('comments_archivedAfterRead_remainReadableAndRejectNewPosts', async () => {
    const report = await saved(await project())
    const original = await post(tester, report.id)
    expect(original.error).toBeNull()
    expect((await admin.from('projects').update({ archived_at: new Date().toISOString() }).eq('id', report.project_id)).error).toBeNull()
    expect((await post(developer, report.id)).error?.code).toBe('P2004')
    expect((await post(tester, report.id, 'Reply', original.data.id)).error?.code).toBe('P2004')
    expect(await comments(report.id)).toHaveLength(1)
  }, 30000)
  it('comments_directInsertUpdateDeleteAndForgedParameters_areDenied', async () => {
    const report = await saved(await project())
    const original = await post(tester, report.id)
    expect(original.error).toBeNull()
    const before = await comments(report.id)
    for (const client of [tester, developer]) {
      expect((await client.from('report_comments').insert({ report_id: report.id, author_id: developerId, body: 'Forged', created_at: '2000-01-01T00:00:00Z' })).error).not.toBeNull()
      expect((await client.from('report_comments').update({ body: 'Forged' }).eq('id', original.data.id)).error).not.toBeNull()
      expect((await client.from('report_comments').delete().eq('id', original.data.id)).error).not.toBeNull()
      expect((await client.rpc('post_report_comment', { p_report_id: report.id, p_body: 'Forged', p_author_id: developerId })).error).not.toBeNull()
    }
    expect(await comments(report.id)).toEqual(before)
  }, 30000)
  it('comments_101EqualTimestampRows_keysetReadRetainsAllWithoutLeaks', async () => {
    const report = await saved(await project())
    const timestamp = '2026-11-07T09:30:00.000012+00:00'
    const rows = Array.from({ length: 101 }, () => ({ id: crypto.randomUUID(), report_id: report.id, author_id: testerId, body: 'Pagination fixture', created_at: timestamp }))
    expect((await admin.from('report_comments').insert(rows)).error).toBeNull()
    const first = await tester.rpc('list_report_comments', { p_report_id: report.id })
    expect(first.error).toBeNull()
    expect(first.data).toHaveLength(100)
    const tail = first.data.at(-1)
    const second = await tester.rpc('list_report_comments', { p_report_id: report.id, p_after_created_at: tail.created_at, p_after_id: tail.id })
    expect(second.error).toBeNull()
    expect(second.data).toHaveLength(1)
    const returned = [...first.data, ...second.data]
    expect(returned.map(item => item.id)).toEqual(rows.map(item => item.id).sort())
    expect(returned[0]).not.toHaveProperty('email')
  }, 30000)
  it('comments_concurrentPosts_preserveBoth', async () => {
    const report = await saved(await project())
    const results = await Promise.all([post(tester, report.id, 'First'), post(developer, report.id, 'Second')])
    expect(results.every(result => !result.error)).toBe(true)
    expect(await comments(report.id)).toHaveLength(2)
  }, 30000)
  it('comments_missingReport_rejectsReadAndWrite', async () => {
    const id = crypto.randomUUID()
    expect((await post(tester, id)).error?.code).toBe('P2005')
    expect((await tester.rpc('list_report_comments', { p_report_id: id })).error?.code).toBe('P2005')
  })
})
