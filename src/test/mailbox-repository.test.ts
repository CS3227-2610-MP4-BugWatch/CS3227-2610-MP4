import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { createMailboxRepository } from '../features/mailbox/mailboxRepository'

const reportId = '10000000-0000-4000-8000-000000000001'
const actorId = '20000000-0000-4000-8000-000000000001'
const projectId = '30000000-0000-4000-8000-000000000001'
const time = '2026-11-12T00:00:00.000012Z'
function row(sequence = 1, createdAt = time) {
  return { id: `40000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`, report_id: reportId,
    actor_id: actorId, actor_username: 'tester', actor_display_name: 'Tester', report_title: 'Changed report',
    project_id: projectId, project_name: 'Current project', changed_fields: ['title', 'projectId'],
    created_at: createdAt, read_at: null }
}
function setup(data: unknown = [], error: unknown = null, status?: number) {
  const rpc = vi.fn().mockResolvedValue({ data, error, status })
  return { rpc, repository: createMailboxRepository({ rpc } as unknown as SupabaseClient) }
}
describe('private mailbox adapter', () => {
  it.each(['all', 'unread'] as const)('listItems_%sFilter_sendsNoChosenRecipientAndMapsContext', async filter => {
    const { repository, rpc } = setup([row()])
    await expect(repository.listItems(filter)).resolves.toEqual([{ id: row().id, reportId, actorId,
      actorUsername: 'tester', actorDisplayName: 'Tester', reportTitle: 'Changed report', projectId,
      projectName: 'Current project', changedFields: ['title', 'projectId'], createdAt: time, readAt: null }])
    expect(rpc).toHaveBeenCalledExactlyOnceWith('get_mailbox_items', { p_filter: filter, p_cursor_created_at: null, p_cursor_id: null })
  })
  it('listItems_emptySuccess_returnsEmptyList', async () => {
    await expect(setup().repository.listItems('all')).resolves.toEqual([])
  })
  it('listItems_fullPage_exhaustsKeysetPagesWithoutLosingMicrosecondPrecision', async () => {
    const page = Array.from({ length: 100 }, (_, index) => row(100 - index))
    const last = row(101, '2026-11-12T00:00:00.000011Z')
    const { repository, rpc } = setup()
    rpc.mockResolvedValueOnce({ data: page, error: null }).mockResolvedValueOnce({ data: [last], error: null })
    const result = await repository.listItems('unread')
    expect(result.map(item => item.id)).toEqual([...page, last].map(item => item.id))
    expect(rpc).toHaveBeenNthCalledWith(2, 'get_mailbox_items', { p_filter: 'unread',
      p_cursor_created_at: time, p_cursor_id: page[99].id })
    expect(rpc).toHaveBeenCalledTimes(2)
  })
  it('listItems_exactPageBoundary_requestsFinalEmptyPage', async () => {
    const page = Array.from({ length: 100 }, (_, index) => row(100 - index))
    const { repository, rpc } = setup()
    rpc.mockResolvedValueOnce({ data: page, error: null }).mockResolvedValueOnce({ data: [], error: null })
    await expect(repository.listItems('all')).resolves.toHaveLength(100)
    expect(rpc).toHaveBeenCalledTimes(2)
  })
  it('listItems_repeatedFullPage_rejectsInsteadOfLooping', async () => {
    const page = Array.from({ length: 100 }, (_, index) => row(100 - index))
    const { repository, rpc } = setup(page)
    await expect(repository.listItems('all')).rejects.toMatchObject({ code: 'unavailable' })
    expect(rpc).toHaveBeenCalledTimes(2)
  })
  it.each([
    ['duplicate ID', [row(), row()]], ['ascending ID tie', [row(1), row(2)]],
    ['ascending time', [row(2), row(1, '2026-11-12T00:00:00.000013Z')]],
    ['oversized page', Array.from({ length: 101 }, (_, index) => row(101 - index))],
    ['not an array', null],
  ])('listItems_%s_rejectsMalformedPagination', async (_name, data) => {
    await expect(setup(data).repository.listItems('all')).rejects.toMatchObject({ code: 'unavailable' })
  })
  it.each([
    ['invalid ID', { id: 'bad' }], ['invalid report ID', { report_id: 'bad' }],
    ['invalid actor ID', { actor_id: 'bad' }], ['invalid project ID', { project_id: 'bad' }],
    ['invalid creation date', { created_at: 'bad' }], ['invalid read date', { read_at: 'bad' }],
    ['unknown changed field', { changed_fields: ['reporterId'] }], ['empty changes', { changed_fields: [] }],
    ['nontext title', { report_title: null }],
  ])('listItems_%s_rejectsMalformedPrivateRecord', async (_name, override) => {
    await expect(setup([{ ...row(), ...override }]).repository.listItems('all')).rejects.toMatchObject({ code: 'unavailable' })
  })
  it('listItems_unavailableActor_keepsNullableAttribution', async () => {
    await expect(setup([{ ...row(), actor_username: null, actor_display_name: null, read_at: time }]).repository.listItems('all'))
      .resolves.toEqual([expect.objectContaining({ actorUsername: null, actorDisplayName: null, readAt: time })])
  })
  it.each(['markRead', 'deleteItem'] as const)('%s_ownedItem_sendsOnlyItemId', async method => {
    const { repository, rpc } = setup(null)
    await expect(repository[method](row().id)).resolves.toBeUndefined()
    expect(rpc).toHaveBeenCalledExactlyOnceWith(method === 'markRead' ? 'mark_mailbox_item_read' : 'delete_mailbox_item', { p_item_id: row().id })
  })
  it.each(['markRead', 'deleteItem'] as const)('%s_invalidId_rejectsBeforeNetwork', async method => {
    const { repository, rpc } = setup()
    await expect(repository[method]('invalid')).rejects.toMatchObject({ code: 'not_found' })
    expect(rpc).not.toHaveBeenCalled()
  })
  it.each([['P2001', 'unauthenticated'], ['PGRST301', 'unauthenticated'], ['P2002', 'forbidden'],
    ['42501', 'forbidden'], ['P2005', 'not_found'], ['unknown', 'unavailable']])(
    'listItems_error%s_mapsTo%sWithoutFalseEmptyResult', async (code, expected) => {
      await expect(setup(null, { code, message: 'Private SQL' }).repository.listItems('all')).rejects.toMatchObject({ code: expected })
    })
  it('listItems_http401_requestsAuthentication', async () => {
    await expect(setup(null, {}, 401).repository.listItems('all')).rejects.toMatchObject({ code: 'unauthenticated' })
  })
  it('listItems_transportFailure_rejectsRatherThanReturningEmpty', async () => {
    const { repository, rpc } = setup()
    rpc.mockRejectedValueOnce(new Error('Disconnected'))
    await expect(repository.listItems('all')).rejects.toMatchObject({ code: 'unavailable' })
  })
})
