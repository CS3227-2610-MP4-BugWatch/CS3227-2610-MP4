import { describe, expect, it } from 'vitest'
import type { ReportInput } from '../features/reports/types'
import { validateReportInput } from '../features/reports/validation'

const input: ReportInput = {
  projectId: '10000000-0000-4000-8000-000000000001',
  title: 'Unexpected error', description: 'The page fails', version: '1.2',
  reproductionSteps: 'Open the page', expectedResults: 'Page opens',
  actualResults: 'Error appears', severity: 'low',
}

const limits = [
  ['title', 200], ['description', 5000], ['version', 100],
  ['reproductionSteps', 5000], ['expectedResults', 5000], ['actualResults', 5000],
] as const

describe('report input validation', () => {
  it.each(limits)('validateReportInput_%sAtBothBoundaries_acceptsTrimmedCodePoints', (field, limit) => {
    for (const length of [1, limit]) {
      const value = '😀'.repeat(length)
      expect(validateReportInput({ ...input, [field]: `\u00a0${value}\n` })).toMatchObject({
        valid: true, value: { [field]: value },
      })
    }
  })

  it.each(limits)('validateReportInput_%sAboveMaximum_rejectsField', (field, limit) => {
    expect(validateReportInput({ ...input, [field]: '😀'.repeat(limit + 1) })).toMatchObject({
      valid: false, errors: { [field]: expect.any(String) },
    })
  })

  it.each(limits)('validateReportInput_%sBlankOrMissing_rejectsField', (field) => {
    for (const value of ['', '\u00a0 \t\n', undefined]) {
      expect(validateReportInput({ ...input, [field]: value })).toMatchObject({
        valid: false, errors: { [field]: expect.any(String) },
      })
    }
  })

  it('validateReportInput_internalWhitespace_retainsLineBreaksAndSpaces', () => {
    expect(validateReportInput({ ...input, description: ' \tA  B\nC\n ' })).toMatchObject({
      valid: true, value: { description: 'A  B\nC' },
    })
  })

  it.each(['very_low', 'low', 'medium', 'high'] as const)('validateReportInput_%sSeverity_acceptsChoice', severity => {
    expect(validateReportInput({ ...input, severity })).toMatchObject({ valid: true, value: { severity } })
  })

  it.each(['', 'critical', ' Low ', undefined])('validateReportInput_invalidSeverity%j_rejectsChoice', severity => {
    expect(validateReportInput({ ...input, severity } as ReportInput)).toMatchObject({
      valid: false, errors: { severity: expect.any(String) },
    })
  })

  it.each(['', 'not-a-uuid'])('validateReportInput_invalidProject%j_rejectsSelection', projectId => {
    expect(validateReportInput({ ...input, projectId })).toMatchObject({
      valid: false, errors: { projectId: expect.any(String) },
    })
  })

  it.each([undefined, '', '\u00a0 \n'])('validateReportInput_blankEnvironment%j_normalizesToEmpty', testEnvironment => {
    expect(validateReportInput({ ...input, testEnvironment })).toMatchObject({
      valid: true, value: { testEnvironment: '' },
    })
  })

  it('validateReportInput_environmentAtMaximum_acceptsUnicode', () => {
    const value = '😀'.repeat(1000)
    expect(validateReportInput({ ...input, testEnvironment: ` ${value}\n` })).toMatchObject({
      valid: true, value: { testEnvironment: value },
    })
  })

  it('validateReportInput_environmentAboveMaximum_rejectsField', () => {
    expect(validateReportInput({ ...input, testEnvironment: '😀'.repeat(1001) })).toMatchObject({
      valid: false, errors: { testEnvironment: expect.any(String) },
    })
  })
})
