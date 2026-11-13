import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

const names = ['PROJECT_TEST_ISOLATED', 'PROJECT_TEST_URL', 'PROJECT_TEST_PRODUCTION_URL',
  'PROJECT_TEST_PUBLISHABLE_KEY', 'PROJECT_TEST_SERVICE_ROLE_KEY', 'PROJECT_TEST_TESTER_TOKEN', 'PROJECT_TEST_DEVELOPER_TOKEN'] as const
const configured = names.some(name => import.meta.env[name] !== undefined)
describe.skipIf(!configured)('isolated submitted report editing persistence', () => {
  let admin: SupabaseClient
  let tester: SupabaseClient
  let developer: SupabaseClient
  let anonymous: SupabaseClient
  let developerId: string
  let otherTester: SupabaseClient
  let unprofiled: SupabaseClient
  const users = new Set<string>()
  const projects = new Set<string>()
  const reports = new Set<string>()
  beforeAll(async () => {
    for (const name of names) if (!import.meta.env[name]?.trim()) throw new Error(`Missing isolated edit test setting: ${name}`)
    if (import.meta.env.PROJECT_TEST_ISOLATED !== 'true') throw new Error('PROJECT_TEST_ISOLATED must be true')
    const url = new URL(import.meta.env.PROJECT_TEST_URL!)
    const production = new URL(import.meta.env.PROJECT_TEST_PRODUCTION_URL!)
    if (url.protocol !== 'https:' || production.protocol !== 'https:' || url.origin === production.origin) throw new Error('Editing tests require distinct HTTPS test and production origins')
    const key = import.meta.env.PROJECT_TEST_PUBLISHABLE_KEY!
    const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    const account = (token: string) => createClient(url.href, key, { ...options, global: { headers: { Authorization: `Bearer ${token}` } } })
    admin = createClient(url.href, import.meta.env.PROJECT_TEST_SERVICE_ROLE_KEY!, options)
    anonymous = createClient(url.href, key, options)
    tester = account(import.meta.env.PROJECT_TEST_TESTER_TOKEN!)
    developer = account(import.meta.env.PROJECT_TEST_DEVELOPER_TOKEN!)
    for (const [token, role] of [[import.meta.env.PROJECT_TEST_TESTER_TOKEN!, 'tester'], [import.meta.env.PROJECT_TEST_DEVELOPER_TOKEN!, 'developer']]) {
      const auth = await anonymous.auth.getUser(token)
      expect(auth.error).toBeNull()
      const profile = await admin.from('profiles').select('role').eq('id', auth.data.user!.id).single()
      expect(profile.error).toBeNull()
      expect(profile.data?.role).toBe(role)
      if (role === 'developer') developerId = auth.data.user!.id
    }
    for (const role of ['tester', null]) {
      const email = `edit-fixture-${crypto.randomUUID()}@example.test`
      const password = `Test-${crypto.randomUUID()}!`
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
      if (created.data.user) users.add(created.data.user.id)
      expect(created.error).toBeNull()
      if (role) {
        const profile = await admin.from('profiles').insert({ id: created.data.user!.id, role,
          username: `tester_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`, display_name: 'Other Tester' })
        expect(profile.error).toBeNull()
      }
      const login = await createClient(url.href, key, options).auth.signInWithPassword({ email, password })
      expect(login.error).toBeNull()
      if (role) otherTester = account(login.data.session!.access_token)
      else unprofiled = account(login.data.session!.access_token)
    }
  }, 30000)
  afterAll(async () => {
    for (const id of users) {
      expect((await admin.from('profiles').delete().eq('id', id)).error).toBeNull()
      expect((await admin.auth.admin.deleteUser(id)).error).toBeNull()
    }
  }, 30000)
  afterEach(async () => {
    if (reports.size) {
      // Dependent rows are removed only for IDs created by this suite.
      for (const table of ['mailbox_items', 'report_edit_receipts', 'report_comments', 'report_history', 'reports']) {
        const result = await admin.from(table).delete().in(table === 'reports' ? 'id' : 'report_id', [...reports])
        expect(result.error).toBeNull()
      }
      reports.clear()
    }
    if (projects.size) {
      for (const table of ['project_history', 'projects']) {
        const result = await admin.from(table).delete().in(table === 'projects' ? 'id' : 'project_id', [...projects])
        expect(result.error).toBeNull()
      }
      projects.clear()
    }
  }, 30000)
  async function project() {
    const result = await developer.rpc('create_project', { p_name: `Edit fixture ${crypto.randomUUID()}`,
      p_description: 'Isolated edit fixture', p_repository_url: 'https://example.test/repo' })
    if (result.data?.id) projects.add(result.data.id)
    expect(result.error).toBeNull()
    return result.data.id as string
  }
  function input(projectId: string) {
    return { projectId, title: 'Original title', description: 'Description', version: '1', reproductionSteps: 'Open',
      expectedResults: 'Works', actualResults: 'Fails', severity: 'low', testEnvironment: '' }
  }
  async function saved(existingProjectId?: string) {
    const projectId = existingProjectId ?? await project()
    const value = input(projectId)
    const result = await tester.rpc('create_report', { p_project_id: projectId, p_title: value.title, p_description: value.description,
      p_version: value.version, p_reproduction_steps: value.reproductionSteps, p_expected_results: value.expectedResults,
      p_actual_results: value.actualResults, p_severity: value.severity, p_test_environment: '' })
    if (result.data?.id) reports.add(result.data.id)
    expect(result.error).toBeNull()
    expect(result.data.severity_revision).toBe(0)
    return { id: result.data.id as string, input: value }
  }
  function edit(client: SupabaseClient, id: string, value: ReturnType<typeof input>, revision = 0, requestId = crypto.randomUUID()) {
    return client.rpc('edit_report', { p_report_id: id, p_input: value, p_expected_severity_revision: revision, p_request_id: requestId })
  }
  async function snapshot(id: string) {
    const result = await Promise.all(['reports', 'report_history', 'mailbox_items', 'report_edit_receipts'].map(table => admin.from(table).select('*')
      .eq(table === 'reports' ? 'id' : 'report_id', id)
      .order(table === 'report_edit_receipts' ? 'actor_id' : 'id')
      .order(table === 'report_edit_receipts' ? 'request_id' : 'id')))
    for (const item of result) expect(item.error).toBeNull()
    return { report: result[0].data![0], history: result[1].data!, mailbox: result[2].data!, receipts: result[3].data! }
  }
  it.each(['incoming current', 'outgoing current', 'incoming captured'] as const)(
    'editReport_%sReference_blocksMoveAtomicallyButAllowsSameProjectEdit', async reference => {
      const report = await saved()
      const peer = await saved(report.input.projectId)
      const destination = await project()
      const source = reference.startsWith('incoming') ? peer : report
      const target = reference.startsWith('incoming') ? report : peer
      if (reference.endsWith('current')) {
        expect((await developer.rpc('accept_report', { p_report_id: source.id })).error).toBeNull()
        expect((await developer.rpc('link_duplicate_report', { p_report_id: source.id,
          p_canonical_report_id: target.id, p_expected_canonical_report_id: null })).error).toBeNull()
      } else {
        // A captured reference may survive a later current-link change. Service-role
        // setup isolates this partition without relying on a future reopen action.
        const replacement = await saved(report.input.projectId)
        expect((await admin.from('reports').update({ state: 'Resolved', assigned_developer_id: developerId,
          assigned_at: new Date().toISOString(), canonical_report_id: replacement.id,
          resolution_kind: 'duplicate', resolution_explanation: 'Captured duplicate',
          resolution_canonical_report_id: target.id, resolution_author_id: developerId,
          resolved_at: new Date().toISOString() }).eq('id', source.id)).error).toBeNull()
      }
      const before = await snapshot(report.id)
      const peerBefore = await snapshot(peer.id)
      const moved = await edit(tester, report.id, { ...report.input, projectId: destination })
      expect(moved.error?.code).toBe('P2011')
      expect(await snapshot(report.id)).toEqual(before)
      expect(await snapshot(peer.id)).toEqual(peerBefore)
      const edited = await edit(tester, report.id, { ...report.input, title: 'Same project edit' })
      expect(edited.error).toBeNull()
      const after = await snapshot(report.id)
      expect(after.report).toMatchObject({ project_id: report.input.projectId, title: 'Same project edit',
        canonical_report_id: before.report.canonical_report_id,
        resolution_canonical_report_id: before.report.resolution_canonical_report_id })
      expect(after.history).toEqual(expect.arrayContaining(before.history))
      expect(after.history).toHaveLength(before.history.length + 1)
    })
  it('editReport_outgoingCapturedDuplicateResolution_refusesMoveAndPreservesBothCanonicalReferences', async () => {
    const report = await saved()
    const target = await saved(report.input.projectId)
    const replacement = await saved(report.input.projectId)
    const destination = await project()
    expect((await developer.rpc('accept_report', { p_report_id: report.id })).error).toBeNull()
    expect((await developer.rpc('start_report_investigation', { p_report_id: report.id })).error).toBeNull()
    expect((await developer.rpc('link_duplicate_report', { p_report_id: report.id,
      p_canonical_report_id: target.id, p_expected_canonical_report_id: null })).error).toBeNull()
    expect((await developer.rpc('resolve_report', { p_report_id: report.id,
      p_resolution: { kind: 'duplicate', explanation: 'Same defect', canonical_report_id: target.id } })).error).toBeNull()
    expect((await developer.rpc('link_duplicate_report', { p_report_id: report.id,
      p_canonical_report_id: replacement.id, p_expected_canonical_report_id: target.id })).error).toBeNull()
    const before = await snapshot(report.id)
    expect(before.report).toMatchObject({ canonical_report_id: replacement.id, resolution_canonical_report_id: target.id })
    const result = await edit(tester, report.id, { ...report.input, projectId: destination })
    // A captured outgoing reference exists only on a read-only resolved report.
    expect(result.error?.code).toBe('P2007')
    expect(await snapshot(report.id)).toEqual(before)
  })
  it.each(['Resolved', 'Closed'])('editReport_%sResolution_remainsReadOnlyWithHistoryIntact', async state => {
    const report = await saved()
    expect((await developer.rpc('accept_report', { p_report_id: report.id })).error).toBeNull()
    expect((await developer.rpc('start_report_investigation', { p_report_id: report.id })).error).toBeNull()
    expect((await edit(tester, report.id, { ...report.input, title: 'Edited before resolution' })).error).toBeNull()
    expect((await developer.rpc('resolve_report', { p_report_id: report.id,
      p_resolution: { kind: 'invalid', explanation: 'Not a product defect' } })).error).toBeNull()
    if (state === 'Closed') expect((await admin.from('reports').update({ state }).eq('id', report.id)).error).toBeNull()
    const before = await snapshot(report.id)
    expect(before.history.map(item => item.event)).toEqual(expect.arrayContaining(['report_edited', 'resolved']))
    const result = await edit(tester, report.id, { ...report.input, title: 'Forbidden after resolution' })
    expect(result.error?.code).toBe('P2007')
    expect(await snapshot(report.id)).toEqual(before)
    const readable = await tester.rpc('get_report', { p_report_id: report.id })
    expect(readable.error).toBeNull()
    expect(readable.data).toMatchObject({ state, severity_revision: 0, resolution: { kind: 'invalid' } })
  })
  it('editReport_normalizedNoop_changesNoReportTimestampHistoryOrMailboxAndReplaysOneReceipt', async () => {
    const report = await saved()
    const before = await snapshot(report.id)
    const requestId = crypto.randomUUID()
    const value = { ...report.input, title: ' \u00a0Original title\n' }
    const result = await edit(tester, report.id, value, 0, requestId)
    expect(result.error).toBeNull()
    expect(result.data.outcome).toBe('unchanged')
    const after = await snapshot(report.id)
    expect(after.report).toEqual(before.report)
    expect(after.history).toEqual(before.history)
    expect(after.mailbox).toEqual(before.mailbox)
    expect(after.receipts).toHaveLength(before.receipts.length + 1)
    expect(after.receipts).toEqual(expect.arrayContaining(before.receipts))
    const receipt = after.receipts.find(item => item.request_id === requestId)
    expect(receipt).toMatchObject({ actor_id: before.report.reporter_id, request_id: requestId,
      report_id: report.id,
      result: { outcome: 'unchanged', report: { id: report.id, severity_revision: 0 } } })
    expect(receipt.payload).toEqual({ expectedSeverityRevision: 0, input: {
      project_id: report.input.projectId, title: report.input.title, description: report.input.description,
      version: report.input.version, reproduction_steps: report.input.reproductionSteps,
      expected_results: report.input.expectedResults, actual_results: report.input.actualResults,
      severity: report.input.severity, test_environment: report.input.testEnvironment,
    } })
    expect(receipt.result).toEqual(result.data)
    const replay = await edit(tester, report.id, value, 0, requestId)
    expect(replay.error).toBeNull()
    expect(replay.data).toEqual(result.data)
    expect(await snapshot(report.id)).toEqual(after)
  })
  it.each(['anonymous', 'developer', 'other Tester', 'missing profile'])('editReport_%sCaller_deniesWithoutWrites', async actor => {
    const report = await saved()
    const before = await snapshot(report.id)
    const client = actor === 'anonymous' ? anonymous : actor === 'developer' ? developer : actor === 'other Tester' ? otherTester : unprofiled
    const result = await edit(client, report.id, { ...report.input, title: 'Unauthorized' })
    expect(result.error).not.toBeNull()
    expect(await snapshot(report.id)).toEqual(before)
  })
  it.each([['title', 200], ['description', 5000], ['version', 100], ['reproductionSteps', 5000],
    ['expectedResults', 5000], ['actualResults', 5000], ['testEnvironment', 1000]] as const)(
    'editReport_directRpc%sUnicodeBoundary_acceptsMaximumAndRejectsAboveWithoutWrites', async (field, maximum) => {
      const report = await saved()
      const valid = { ...report.input, [field]: ` \u00a0${'😀'.repeat(maximum)}\n` }
      expect((await edit(tester, report.id, valid)).error).toBeNull()
      const before = await snapshot(report.id)
      const invalid = await edit(tester, report.id, { ...report.input, [field]: '😀'.repeat(maximum + 1) })
      expect(invalid.error?.code).toBe('P2003')
      expect(await snapshot(report.id)).toEqual(before)
    })
  it.each(['title', 'description', 'version', 'reproductionSteps', 'expectedResults', 'actualResults'] as const)(
    'editReport_directRpc%sBlank_rejectsWithoutWrites', async field => {
      const report = await saved()
      const before = await snapshot(report.id)
      expect((await edit(tester, report.id, { ...report.input, [field]: ' \u00a0\n' })).error?.code).toBe('P2003')
      expect(await snapshot(report.id)).toEqual(before)
    })
  it('editReport_directRpcProtectedFields_rejectsForgedMetadata', async () => {
    const report = await saved()
    const before = await snapshot(report.id)
    const result = await edit(tester, report.id, { ...report.input, reporterId: developerId, state: 'Closed' } as ReturnType<typeof input>)
    expect(result.error).not.toBeNull()
    expect(await snapshot(report.id)).toEqual(before)
  })
  it.each(['Open', 'Accepted', 'In progress', 'Awaiting tester information'])('editReport_originalTesterIn%s_savesOneHistoryAndTrustedRecipient', async state => {
    const report = await saved()
    if (state !== 'Open') expect((await developer.rpc('accept_report', { p_report_id: report.id })).error).toBeNull()
    if (state === 'In progress' || state === 'Awaiting tester information') expect((await developer.rpc('start_report_investigation', { p_report_id: report.id })).error).toBeNull()
    if (state === 'Awaiting tester information') expect((await developer.rpc('await_tester_information', { p_report_id: report.id })).error).toBeNull()
    const before = await snapshot(report.id)
    const result = await edit(tester, report.id, { ...report.input, title: 'Edited title' })
    expect(result.error).toBeNull()
    expect(result.data.outcome).toBe('saved')
    const after = await snapshot(report.id)
    expect(after.report).toMatchObject({ id: report.id, title: 'Edited title', state, severity_revision: 0,
      reporter_id: before.report.reporter_id, created_at: before.report.created_at, assigned_developer_id: before.report.assigned_developer_id })
    expect(after.history).toHaveLength(before.history.length + 1)
    expect(after.history.find(item => item.event === 'report_edited')?.changes).toEqual({ title: { before: 'Original title', after: 'Edited title' } })
    expect(after.mailbox).toHaveLength(state === 'Open' ? 0 : 1)
    if (state !== 'Open') expect(after.mailbox[0]).toMatchObject({ recipient_id: developerId, read_at: null, report_id: report.id })
  })
  it('editReport_sameRequestReplay_returnsOriginalResultWithoutDuplicateEvent', async () => {
    const report = await saved()
    expect((await developer.rpc('accept_report', { p_report_id: report.id })).error).toBeNull()
    const key = crypto.randomUUID()
    const value = { ...report.input, title: 'Committed despite lost response' }
    const first = await edit(tester, report.id, value, 0, key)
    expect(first.error).toBeNull()
    const committed = await snapshot(report.id)
    const replay = await edit(tester, report.id, value, 0, key)
    expect(replay.error).toBeNull()
    expect(replay.data).toEqual(first.data)
    expect(await snapshot(report.id)).toEqual(committed)
    const changedPayload = await edit(tester, report.id, { ...value, title: 'Different payload' }, 0, key)
    expect(changedPayload.error).not.toBeNull()
    expect(await snapshot(report.id)).toEqual(committed)
  })
  it('editReport_severityABAThenExplicitRetry_detectsRevisionAndAllowsDeliberateOverride', async () => {
    const report = await saved()
    for (const severity of ['high', 'low']) expect((await admin.from('reports').update({ severity }).eq('id', report.id)).error).toBeNull()
    const before = await snapshot(report.id)
    expect(before.report.severity_revision).toBe(2)
    const value = { ...report.input, title: 'Retained manual edit' }
    const conflict = await edit(tester, report.id, value)
    expect(conflict.error?.code).toBe('P2010')
    expect(JSON.parse(conflict.error!.details)).toMatchObject({ latestSeverity: 'low', latestSeverityRevision: 2 })
    expect(await snapshot(report.id)).toEqual(before)
    expect((await edit(tester, report.id, value, 2)).error).toBeNull()
    expect((await snapshot(report.id)).report.title).toBe(value.title)
  })
  it.each(['archive', 'reporter changed'])('editReport_receiptReplayAfter%s_rechecksCurrentAuthorization', async condition => {
    const report = await saved()
    const key = crypto.randomUUID()
    const value = { ...report.input, title: 'Saved before permissions changed' }
    expect((await edit(tester, report.id, value, 0, key)).error).toBeNull()
    if (condition === 'archive') {
      expect((await admin.from('projects').update({ archived_at: new Date().toISOString() }).eq('id', report.input.projectId)).error).toBeNull()
    } else {
      expect((await admin.from('reports').update({ reporter_id: developerId }).eq('id', report.id)).error).toBeNull()
    }
    const before = await snapshot(report.id)
    const replay = await edit(tester, report.id, value, 0, key)
    expect(replay.error?.code).toBe(condition === 'archive' ? 'P2004' : 'P2002')
    expect(replay.data).toBeNull()
    expect(await snapshot(report.id)).toEqual(before)
  })
  it.each(['source', 'destination'])('editReport_archived%s_refusesWithoutPartialMove', async archived => {
    const report = await saved()
    const destination = await project()
    expect((await admin.from('projects').update({ archived_at: new Date().toISOString() })
      .eq('id', archived === 'source' ? report.input.projectId : destination)).error).toBeNull()
    const before = await snapshot(report.id)
    const result = await edit(tester, report.id, { ...report.input, projectId: destination })
    expect(result.error?.code).toBe('P2004')
    expect(await snapshot(report.id)).toEqual(before)
  })
  it('editReport_projectMove_preservesIdentityAssignmentDiscussionAndEarlierHistory', async () => {
    const report = await saved()
    const destination = await project()
    expect((await developer.rpc('accept_report', { p_report_id: report.id })).error).toBeNull()
    const comment = await tester.rpc('post_report_comment', { p_report_id: report.id, p_body: 'Keep this discussion', p_reply_to_comment_id: null })
    expect(comment.error).toBeNull()
    const before = await snapshot(report.id)
    expect((await edit(tester, report.id, { ...report.input, projectId: destination })).error).toBeNull()
    const after = await snapshot(report.id)
    expect(after.report).toMatchObject({ id: report.id, project_id: destination, reporter_id: before.report.reporter_id,
      created_at: before.report.created_at, state: before.report.state, assigned_developer_id: before.report.assigned_developer_id,
      assigned_at: before.report.assigned_at })
    expect(after.history).toEqual(expect.arrayContaining(before.history))
    const comments = await tester.rpc('list_report_comments', { p_report_id: report.id })
    expect(comments.error).toBeNull()
    expect(comments.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: comment.data.id, body: 'Keep this discussion' })]))
    for (const [projectId, contains] of [[report.input.projectId, false], [destination, true]] as const) {
      const list = await tester.rpc('list_project_reports', { p_project_id: projectId })
      expect(list.error).toBeNull()
      expect(list.data.some((item: { id: string }) => item.id === report.id)).toBe(contains)
    }
  })
})
