import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { createReportRepository } from '../features/reports/reportRepository'

const reportId = '10000000-0000-4000-8000-000000000001'
const authorId = '20000000-0000-4000-8000-000000000001'
const time = '2026-11-07T09:30:00.000012+00:00'
const commentId = (sequence: number) => `30000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`
function row(sequence = 1, createdAt = time) {
  return { id: commentId(sequence), report_id: reportId, author_id: authorId, author_username: 'tester', author_display_name: 'Tester', body: 'Question\n<script>x</script>', reply_to_comment_id: null, created_at: createdAt }
}
function setup(data: unknown = [], error: unknown = null, status?: number) {
  const rpc = vi.fn().mockResolvedValue({ data, error, status })
  return { rpc, repository: createReportRepository({ rpc } as unknown as SupabaseClient) }
}

describe('discussion repository', () => {
  it('postReportComment_validText_sendsOnlyNormalizedUserInputAndMapsServerIdentity', async () => {
    const saved = { ...row(2), reply_to_comment_id: commentId(1) }
    const { rpc, repository } = setup(saved)
    await expect(repository.postReportComment(reportId, { body: ` ${saved.body}\n`, replyToCommentId: commentId(1), authorId: 'forged', createdAt: '2000' } as { body: string; replyToCommentId: string })).resolves.toEqual({
      id: saved.id, reportId, authorId, authorUsername: 'tester', authorDisplayName: 'Tester', body: saved.body, replyToCommentId: commentId(1), createdAt: time,
    })
    expect(rpc).toHaveBeenCalledExactlyOnceWith('post_report_comment', { p_report_id: reportId, p_body: saved.body, p_reply_to_comment_id: commentId(1) })
  })
  it('postReportComment_noReply_sendsNullReference', async () => {
    const { rpc, repository } = setup(row())
    await repository.postReportComment(reportId, { body: 'Question' })
    expect(rpc).toHaveBeenCalledExactlyOnceWith('post_report_comment', { p_report_id: reportId, p_body: 'Question', p_reply_to_comment_id: null })
  })
  it.each(['', 'x'.repeat(5001)])('postReportComment_invalidText_rejectsBeforeRpc', async body => {
    const { rpc, repository } = setup()
    await expect(repository.postReportComment(reportId, { body })).rejects.toMatchObject({ code: 'validation' })
    expect(rpc).not.toHaveBeenCalled()
  })
  it('postReportComment_invalidReply_rejectsBeforeRpc', async () => {
    const { rpc, repository } = setup()
    await expect(repository.postReportComment(reportId, { body: 'Question', replyToCommentId: 'bad' })).rejects.toMatchObject({ code: 'validation' })
    expect(rpc).not.toHaveBeenCalled()
  })
  it.each(['list', 'post'] as const)('discussion_%sMalformedReport_rejectsBeforeRpc', async method => {
    const { rpc, repository } = setup()
    await expect(method === 'list' ? repository.listReportComments('bad') : repository.postReportComment('bad', { body: 'Question' })).rejects.toMatchObject({ code: 'not_found' })
    expect(rpc).not.toHaveBeenCalled()
  })
  it('listReportComments_empty_returnsSuccessfulEmptyList', async () => {
    await expect(setup().repository.listReportComments(reportId)).resolves.toEqual([])
  })
  it('listReportComments_101EqualMicrosecondTimestamps_preservesRawCursorAndOrder', async () => {
    const page = Array.from({ length: 100 }, (_, index) => row(index + 1))
    const { rpc, repository } = setup()
    rpc.mockResolvedValueOnce({ data: page, error: null }).mockResolvedValueOnce({ data: [row(101)], error: null })
    const comments = await repository.listReportComments(reportId)
    expect(comments.map(comment => comment.id)).toEqual([...page, row(101)].map(comment => comment.id))
    expect(comments[0]).toMatchObject({ body: row().body, authorId, authorUsername: 'tester' })
    expect(rpc).toHaveBeenNthCalledWith(2, 'list_report_comments', { p_report_id: reportId, p_after_created_at: time, p_after_id: commentId(100) })
    expect(rpc).toHaveBeenCalledTimes(2)
  })
  it('listReportComments_exact100_fetchesEmptyNextPage', async () => {
    const { rpc, repository } = setup()
    rpc.mockResolvedValueOnce({ data: Array.from({ length: 100 }, (_, index) => row(index + 1)), error: null }).mockResolvedValueOnce({ data: [], error: null })
    expect(await repository.listReportComments(reportId)).toHaveLength(100)
    expect(rpc).toHaveBeenCalledTimes(2)
  })
  it('listReportComments_repeatedFullPage_rejectsWithoutInfiniteLoop', async () => {
    const page = Array.from({ length: 100 }, (_, index) => row(index + 1))
    const { rpc, repository } = setup(page)
    await expect(repository.listReportComments(reportId)).rejects.toMatchObject({ code: 'unavailable' })
    expect(rpc).toHaveBeenCalledTimes(2)
  })
  it('listReportComments_secondPageFails_rejectsInsteadOfReturningPartialConversation', async () => {
    const { rpc, repository } = setup()
    rpc.mockResolvedValueOnce({ data: Array.from({ length: 100 }, (_, index) => row(index + 1)), error: null }).mockResolvedValueOnce({ data: null, error: { code: 'offline' } })
    await expect(repository.listReportComments(reportId)).rejects.toMatchObject({ code: 'unavailable' })
    expect(rpc).toHaveBeenCalledTimes(2)
  })
  it.each([
    { report_id: authorId }, { id: 'bad' }, { author_id: 'bad' }, { created_at: 'bad' },
    { body: 3 }, { reply_to_comment_id: 'bad' }, { author_display_name: 3 },
  ])('listReportComments_malformedRow%j_rejectsUnavailable', async override => {
    await expect(setup([{ ...row(), ...override }]).repository.listReportComments(reportId)).rejects.toMatchObject({ code: 'unavailable' })
  })
  for (const method of ['list', 'post'] as const) {
    it.each([['P2001', 'unauthenticated'], ['P2002', 'forbidden'], ['P2003', 'validation'], ['P2004', 'archived'], ['P2005', 'not_found'], ['PGRST301', 'unauthenticated'], ['unknown', 'unavailable']])(`discussion_${method}Error%s_mapsTo%sWithoutSqlLeak`, async (code, expected) => {
      const { repository } = setup(null, { code, message: 'Private SQL internals' })
      const operation = method === 'list' ? repository.listReportComments(reportId) : repository.postReportComment(reportId, { body: 'Question' })
      await expect(operation).rejects.toMatchObject({ code: expected, message: expect.not.stringContaining('Private SQL internals') })
    })
    it(`discussion_${method}NetworkRejection_doesNotRetry`, async () => {
      const { rpc, repository } = setup()
      rpc.mockRejectedValueOnce(new TypeError('Network lost'))
      await expect(method === 'list' ? repository.listReportComments(reportId) : repository.postReportComment(reportId, { body: 'Question' })).rejects.toMatchObject({ code: 'unavailable' })
      expect(rpc).toHaveBeenCalledOnce()
    })
  }
})
