import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

const names = ['PROJECT_TEST_ISOLATED', 'PROJECT_TEST_URL', 'PROJECT_TEST_PRODUCTION_URL', 'PROJECT_TEST_PUBLISHABLE_KEY',
  'PROJECT_TEST_SERVICE_ROLE_KEY', 'PROJECT_TEST_TESTER_TOKEN', 'PROJECT_TEST_DEVELOPER_TOKEN', 'PROJECT_TEST_SECOND_DEVELOPER_TOKEN'] as const
const configured = names.some(name => import.meta.env[name] !== undefined)
describe.skipIf(!configured)('isolated private mailbox persistence', () => {
  let admin: SupabaseClient
  let recipient: SupabaseClient
  let other: SupabaseClient
  let tester: SupabaseClient
  let anonymous: SupabaseClient
  let recipientId: string
  let reportId: string | undefined
  let projectId: string | undefined
  beforeAll(async () => {
    for (const name of names) if (!import.meta.env[name]?.trim()) throw new Error(`Missing isolated mailbox test setting: ${name}`)
    if (import.meta.env.PROJECT_TEST_ISOLATED !== 'true') throw new Error('PROJECT_TEST_ISOLATED must be true')
    const url = new URL(import.meta.env.PROJECT_TEST_URL!)
    const production = new URL(import.meta.env.PROJECT_TEST_PRODUCTION_URL!)
    if (url.protocol !== 'https:' || production.protocol !== 'https:' || url.origin === production.origin) throw new Error('Mailbox tests require distinct HTTPS test and production origins')
    const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    const key = import.meta.env.PROJECT_TEST_PUBLISHABLE_KEY!
    const account = (token: string) => createClient(url.href, key, { ...options, global: { headers: { Authorization: `Bearer ${token}` } } })
    admin = createClient(url.href, import.meta.env.PROJECT_TEST_SERVICE_ROLE_KEY!, options)
    anonymous = createClient(url.href, key, options)
    recipient = account(import.meta.env.PROJECT_TEST_DEVELOPER_TOKEN!)
    other = account(import.meta.env.PROJECT_TEST_SECOND_DEVELOPER_TOKEN!)
    tester = account(import.meta.env.PROJECT_TEST_TESTER_TOKEN!)
    const identity = await anonymous.auth.getUser(import.meta.env.PROJECT_TEST_DEVELOPER_TOKEN!)
    expect(identity.error).toBeNull()
    recipientId = identity.data.user!.id
    const profile = await admin.from('profiles').select('role').eq('id', recipientId).single()
    expect(profile.error).toBeNull(); expect(profile.data?.role).toBe('developer')
  }, 30000)
  afterEach(async () => {
    if (reportId) {
      for (const table of ['mailbox_items', 'report_edit_receipts', 'report_comments', 'report_history', 'reports']) {
        const result = await admin.from(table).delete().eq(table === 'reports' ? 'id' : 'report_id', reportId)
        expect(result.error).toBeNull()
      }
      reportId = undefined
    }
    if (projectId) {
      for (const table of ['project_history', 'projects']) {
        const result = await admin.from(table).delete().eq(table === 'projects' ? 'id' : 'project_id', projectId)
        expect(result.error).toBeNull()
      }
      projectId = undefined
    }
  }, 30000)
  async function notification() {
    const project = await recipient.rpc('create_project', { p_name: `Mailbox fixture ${crypto.randomUUID()}`,
      p_description: 'Isolated mailbox fixture', p_repository_url: 'https://example.test/repo' })
    projectId = project.data?.id
    expect(project.error).toBeNull()
    const report = await tester.rpc('create_report', { p_project_id: projectId, p_title: 'Original report', p_description: 'Description',
      p_version: '1', p_reproduction_steps: 'Open', p_expected_results: 'Works', p_actual_results: 'Fails', p_severity: 'low', p_test_environment: '' })
    reportId = report.data?.id
    expect(report.error).toBeNull()
    expect((await recipient.rpc('accept_report', { p_report_id: reportId })).error).toBeNull()
    const edit = await tester.rpc('edit_report', { p_report_id: reportId, p_input: { projectId, title: 'Edited report',
      description: 'Description', version: '1', reproductionSteps: 'Open', expectedResults: 'Works', actualResults: 'Fails', severity: 'low', testEnvironment: '' },
    p_expected_severity_revision: 0, p_request_id: crypto.randomUUID() })
    expect(edit.error).toBeNull()
    const result = await admin.from('mailbox_items').select('*').eq('report_id', reportId!).single()
    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({ recipient_id: recipientId, read_at: null })
    return result.data!
  }
  function list(client: SupabaseClient, filter = 'all') {
    return client.rpc('get_mailbox_items', { p_filter: filter, p_cursor_created_at: null, p_cursor_id: null })
  }
  it('mailbox_recipientListsAndMarksRead_persistsAcrossRepeatedReads', async () => {
    const item = await notification()
    const unread = await list(recipient, 'unread')
    expect(unread.error).toBeNull()
    expect(unread.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: item.id, report_id: reportId, report_title: 'Edited report' })]))
    for (let attempt = 0; attempt < 2; attempt++) expect((await recipient.rpc('mark_mailbox_item_read', { p_item_id: item.id })).error).toBeNull()
    const all = await list(recipient)
    expect(all.error).toBeNull()
    expect(all.data.find((value: { id: string }) => value.id === item.id).read_at).toEqual(expect.any(String))
    const after = await list(recipient, 'unread')
    expect(after.error).toBeNull()
    expect(after.data.some((value: { id: string }) => value.id === item.id)).toBe(false)
  })
  it('mailbox_crossRecipientListAndMutations_doNotDiscloseOrAlterPrivateItem', async () => {
    const item = await notification()
    const before = await admin.from('mailbox_items').select('*').eq('id', item.id).single()
    const listed = await list(other)
    expect(listed.error).toBeNull()
    expect(listed.data.some((value: { id: string }) => value.id === item.id)).toBe(false)
    const direct = await other.from('mailbox_items').select('*').eq('id', item.id)
    expect(direct.error !== null || direct.data?.length === 0).toBe(true)
    await other.rpc('mark_mailbox_item_read', { p_item_id: item.id })
    const deletion = await other.rpc('delete_mailbox_item', { p_item_id: item.id })
    expect(deletion.data).toBeNull()
    const after = await admin.from('mailbox_items').select('*').eq('id', item.id).single()
    expect(after.error).toBeNull(); expect(after.data).toEqual(before.data)
  })
  it('mailbox_deleteRepeated_removesOnlyNotificationAndPreservesReportHistory', async () => {
    const item = await notification()
    const beforeReport = await admin.from('reports').select('*').eq('id', reportId!).single()
    const beforeHistory = await admin.from('report_history').select('*').eq('report_id', reportId!).order('id')
    expect(beforeReport.error).toBeNull(); expect(beforeHistory.error).toBeNull()
    for (let attempt = 0; attempt < 2; attempt++) expect((await recipient.rpc('delete_mailbox_item', { p_item_id: item.id })).error).toBeNull()
    const removed = await admin.from('mailbox_items').select('*').eq('id', item.id)
    expect(removed.error).toBeNull(); expect(removed.data).toEqual([])
    const afterReport = await admin.from('reports').select('*').eq('id', reportId!).single()
    const afterHistory = await admin.from('report_history').select('*').eq('report_id', reportId!).order('id')
    expect(afterReport.error).toBeNull(); expect(afterHistory.error).toBeNull()
    expect(afterReport.data).toEqual(beforeReport.data); expect(afterHistory.data).toEqual(beforeHistory.data)
  })
  it('mailbox_anonymousCaller_deniesListingAndMutation', async () => {
    const item = await notification()
    expect((await list(anonymous)).error).not.toBeNull()
    expect((await anonymous.rpc('mark_mailbox_item_read', { p_item_id: item.id })).error).not.toBeNull()
    expect((await anonymous.rpc('delete_mailbox_item', { p_item_id: item.id })).error).not.toBeNull()
    const after = await admin.from('mailbox_items').select('*').eq('id', item.id).single()
    expect(after.error).toBeNull(); expect(after.data).toEqual(item)
  })
  it('mailbox_directInsertCannotForgeRecipientOrContent', async () => {
    const item = await notification()
    const forged = await tester.from('mailbox_items').insert({ ...item, id: crypto.randomUUID(), report_title: 'Forged message' })
    expect(forged.error).not.toBeNull()
    const result = await admin.from('mailbox_items').select('*').eq('report_id', reportId!)
    expect(result.error).toBeNull(); expect(result.data).toEqual([item])
  })
})
