import { describe, expect, it } from 'vitest'
import type { ResolutionInput } from '../features/reports/types'
import { validateResolutionInput } from '../features/reports/validation'

const target = '10000000-0000-4000-8000-000000000001'
const fixed = { kind: 'fixed', fixSummary: 'Fix crash', affectedVersion: '1.2', commitUrl: 'https://git.example/commit/abc', pullRequestUrl: 'http://other.example/pr/1' } as const
const check = (value: unknown) => validateResolutionInput(value as ResolutionInput)

describe('resolution validation', () => {
  it('validateResolutionInput_fixed_trimsAllFieldsAndPreservesUrlSpelling', () => {
    const value = { kind: 'fixed', fixSummary: ' A  B\nC ', affectedVersion: '\u00a01.2\n', commitUrl: ' HTTPS://Git.Example/a%2fb?x=A ', pullRequestUrl: '\thttp://other.example/pr/1\n' }
    expect(check(value)).toEqual({ valid: true, value: { ...value, fixSummary: 'A  B\nC', affectedVersion: '1.2', commitUrl: 'HTTPS://Git.Example/a%2fb?x=A', pullRequestUrl: 'http://other.example/pr/1' } })
  })
  it.each(['invalid', 'cannot_reproduce', 'will_not_fix'] as const)('validateResolutionInput_%s_acceptsOnlyTrimmedExplanation', kind => {
    expect(check({ kind, explanation: ' \u00a0Reason\n' })).toEqual({ valid: true, value: { kind, explanation: 'Reason' } })
  })
  it('validateResolutionInput_duplicate_requiresTrimmedExplanationAndUuid', () => {
    expect(check({ kind: 'duplicate', explanation: ' Same bug ', canonicalReportId: target })).toEqual({ valid: true, value: { kind: 'duplicate', explanation: 'Same bug', canonicalReportId: target } })
  })
  it.each([['fixSummary', 5000], ['affectedVersion', 100]] as const)('validateResolutionInput_%s_countsSupplementaryCodePointsAtBoundaries', (field, limit) => {
    for (const length of [1, limit]) expect(check({ ...fixed, [field]: `\u00a0${'\u{1F600}'.repeat(length)}\n` })).toMatchObject({ valid: true, value: { [field]: '\u{1F600}'.repeat(length) } })
    expect(check({ ...fixed, [field]: '\u{1F600}'.repeat(limit + 1) })).toMatchObject({ valid: false, errors: { [field]: expect.any(String) } })
  })
  it.each(['duplicate', 'invalid', 'cannot_reproduce', 'will_not_fix'] as const)('validateResolutionInput_%sExplanation_boundariesAndRuntimeTypes', kind => {
    const base = kind === 'duplicate' ? { kind, canonicalReportId: target } : { kind }
    for (const count of [1, 5000]) expect(check({ ...base, explanation: ` ${'\u{1F600}'.repeat(count)}\n` })).toMatchObject({ valid: true })
    for (const value of ['', '\u00a0 \n', '\u{1F600}'.repeat(5001), undefined, null, 42, {}, []]) expect(check({ ...base, explanation: value })).toMatchObject({ valid: false, errors: { explanation: expect.any(String) } })
  })
  it.each(['fixSummary', 'affectedVersion', 'commitUrl', 'pullRequestUrl'])('validateResolutionInput_%sMissingOrWrongRuntimeType_reportsField', field => {
    for (const value of ['', '\u00a0 \n', undefined, null, 42, {}, []]) expect(check({ ...fixed, [field]: value })).toMatchObject({ valid: false, errors: { [field]: expect.any(String) } })
  })
  it.each(['commitUrl', 'pullRequestUrl'])('validateResolutionInput_%s_exactUrlLimitAndOneOver', field => {
    const prefix = 'https://example.test/'
    const value = prefix + 'a'.repeat(2048 - prefix.length)
    expect(check({ ...fixed, [field]: ` ${value}\n` })).toMatchObject({ valid: true, value: { [field]: value } })
    expect(check({ ...fixed, [field]: value + 'a' })).toMatchObject({ valid: false, errors: { [field]: expect.any(String) } })
  })
  it.each(['commitUrl', 'pullRequestUrl'])('validateResolutionInput_%s_invalidDestinationsRejectSeparately', field => {
    for (const value of ['/relative', '//example.test/a', 'javascript:alert(1)', 'data:text/html,x', 'ftp://example.test/a', 'https://', 'not a url', 'https://exa mple.test/a']) expect(check({ ...fixed, [field]: value })).toMatchObject({ valid: false, errors: { [field]: expect.any(String) } })
  })
  it.each(['', 'not-id', null, undefined, 42])('validateResolutionInput_duplicateInvalidTarget%j_rejectsSelection', canonicalReportId => {
    expect(check({ kind: 'duplicate', explanation: 'Duplicate', canonicalReportId })).toMatchObject({ valid: false, errors: { canonicalReportId: expect.any(String) } })
  })
  it.each([null, undefined, [], 'fixed', 42, {}, { kind: 'unknown' }, { ...fixed, explanation: 'hidden' }, { ...fixed, fixedVersion: '2' }, { ...fixed, authorId: target }, { kind: 'invalid', explanation: 'Reason', fixSummary: 'hidden' }, { kind: 'invalid', explanation: 'Reason', canonicalReportId: target }])('validateResolutionInput_invalidOrInapplicableFields%j_rejectsWithoutThrowing', input => {
    expect(check(input)).toMatchObject({ valid: false })
  })
})
