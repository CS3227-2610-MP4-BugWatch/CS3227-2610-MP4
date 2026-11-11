import { describe, expect, it } from 'vitest'
import type { CommentInput } from '../features/reports/types'
import { COMMENT_TEXT_LIMIT, validateCommentInput } from '../features/reports/validation'

const replyId = '10000000-0000-4000-8000-000000000001'

describe('comment validation', () => {
  it('validateCommentInput_configuredLimit_isConfirmed5000CodePoints', () => {
    expect(COMMENT_TEXT_LIMIT).toBe(5000)
  })
  it.each(['', ' ', '\t\r\n', '\u00a0\ufeff\u2029'])('validateCommentInput_blank%s_rejects', body => {
    expect(validateCommentInput({ body })).toMatchObject({ valid: false, message: expect.any(String) })
  })
  it.each([1, 4999, 5000])('validateCommentInput_%sCodePoints_accepts', length => {
    const body = '😀'.repeat(length)
    expect(validateCommentInput({ body })).toEqual({ valid: true, value: { body, replyToCommentId: null } })
  })
  it.each(['x'.repeat(5001), '😀'.repeat(5001)])('validateCommentInput_overLimit_rejects', body => {
    expect(validateCommentInput({ body })).toMatchObject({ valid: false })
  })
  it.each([undefined, null, 12, {}, []])('validateCommentInput_nonText%j_rejectsWithoutThrow', body => {
    expect(validateCommentInput({ body } as unknown as CommentInput)).toMatchObject({ valid: false })
  })
  it('validateCommentInput_multilineAndMarkup_trimsOnlySurroundingWhitespace', () => {
    const body = '<script>alert(1)</script>\n  Browser: Chrome'
    expect(validateCommentInput({ body: `\u00a0\ufeff ${body}\t\n`, replyToCommentId: replyId }))
      .toEqual({ valid: true, value: { body, replyToCommentId: replyId } })
  })
  it.each([undefined, null])('validateCommentInput_noReply%j_normalizesNull', replyToCommentId => {
    expect(validateCommentInput({ body: 'Question', replyToCommentId }))
      .toEqual({ valid: true, value: { body: 'Question', replyToCommentId: null } })
  })
  it.each(['', 'invalid', `${replyId} `, 3])('validateCommentInput_invalidReference%j_rejects', replyToCommentId => {
    expect(validateCommentInput({ body: 'Question', replyToCommentId } as unknown as CommentInput)).toMatchObject({ valid: false })
  })
})
