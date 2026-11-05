import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizeProjectName, validateProjectInput } from '../features/projects/validation'
import type { ProjectInput } from '../features/projects/types'

const validInput: ProjectInput = {
  name: 'BugWatch',
  description: 'Track application bugs.',
  repositoryUrl: 'https://example.com/team/project',
}

function expectFieldError(field: keyof ProjectInput, value: string) {
  const result = validateProjectInput({ ...validInput, [field]: value })
  expect(result.valid).toBe(false)
  if (!result.valid) {
    expect(result.errors[field]).toEqual(expect.any(String))
    expect(result.errors[field]).not.toBe('')
    expect(Object.keys(result.errors)).toEqual([field])
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('validateProjectInput', () => {
  it('validateProjectInput_surroundingWhitespace_returnsTrimmedFieldsWithDisplayCase', () => {
    expect(validateProjectInput({
      name: ' \tBugWatch\n',
      description: '\n Track application bugs. \t',
      repositoryUrl: ' https://example.com/Team/Project?ref=Main ',
    })).toEqual({
      valid: true,
      value: {
        name: 'BugWatch',
        description: 'Track application bugs.',
        repositoryUrl: 'https://example.com/Team/Project?ref=Main',
      },
    })
  })

  it.each([1, 100])('validateProjectInput_nameLength%d_acceptsBoundary', (length) => {
    const name = 'n'.repeat(length)
    expect(validateProjectInput({ ...validInput, name })).toEqual({
      valid: true, value: { ...validInput, name },
    })
  })

  it.each(['', ' \n\t ', '\u00a0'])('validateProjectInput_blankName%j_returnsNameError', (name) => {
    expectFieldError('name', name)
  })

  it('validateProjectInput_nameLength101_returnsNameError', () => {
    expectFieldError('name', 'n'.repeat(101))
  })

  it('validateProjectInput_name100UnicodeCodePoints_acceptsWithoutUtf16Truncation', () => {
    const name = '🐛'.repeat(100)
    expect(validateProjectInput({ ...validInput, name })).toEqual({
      valid: true, value: { ...validInput, name },
    })
  })

  it('validateProjectInput_name101UnicodeCodePoints_returnsNameError', () => {
    expectFieldError('name', '🐛'.repeat(101))
  })

  it.each([1, 5000])('validateProjectInput_descriptionLength%d_acceptsBoundary', (length) => {
    const description = 'd'.repeat(length)
    expect(validateProjectInput({ ...validInput, description })).toEqual({
      valid: true, value: { ...validInput, description },
    })
  })

  it.each(['', ' \n\t '])('validateProjectInput_blankDescription%j_returnsDescriptionError', (description) => {
    expectFieldError('description', description)
  })

  it('validateProjectInput_descriptionLength5001_returnsDescriptionError', () => {
    expectFieldError('description', 'd'.repeat(5001))
  })

  it('validateProjectInput_description5000UnicodeCodePoints_accepts', () => {
    expect(validateProjectInput({ ...validInput, description: '🐛'.repeat(5000) }).valid).toBe(true)
  })

  it('validateProjectInput_plainTextWithMarkup_preservesLiteralContent', () => {
    const description = '<script>alert("text")</script>\nTwo  spaces stay.'
    expect(validateProjectInput({ ...validInput, description })).toEqual({
      valid: true, value: { ...validInput, description },
    })
  })

  it.each([
    'http://example.com/repo',
    'https://git.example.org/Team/Repo?ref=Main#readme',
    'HTTPS://example.com/CasePreserved',
    "https://example.com/repo!$&'()*+,-./:;=?@_~%#[]",
    'https://example.com/repo\u00a1',
    'https://example.com/repo\u{10fffd}',
  ])('validateProjectInput_absoluteHttpUrl%s_acceptsWithoutRewriting', (repositoryUrl) => {
    expect(validateProjectInput({ ...validInput, repositoryUrl })).toEqual({
      valid: true, value: { ...validInput, repositoryUrl },
    })
  })

  it.each([
    '', ' \t ', '/team/repo', '//example.com/team/repo', 'not a url',
    'https://', 'https:///no-host', 'ftp://example.com/repo',
    'ssh://git@example.com/repo', 'git@example.com:team/repo.git',
    'javascript:alert(1)', 'https://example.com/a b',
    'https://example.com/a\nb', 'https://example.com/a\tb',
    'https://example.com/repo"', 'https://example.com/repo^',
    'https://example.com/repo\u0085', 'https://example.com/repo\u007f',
    'https://example.com/repo\ufdd0', 'https://example.com/repo\u{1fffe}',
    'https://example.com/repo\u{10fffe}', 'https://example.com/repo\ud800',
    'https://xn--\u2665.com/repo',
  ])('validateProjectInput_invalidRepositoryUrl%j_returnsUrlError', (repositoryUrl) => {
    expectFieldError('repositoryUrl', repositoryUrl)
  })

  it('validateProjectInput_urlLength2048_acceptsUpperBoundary', () => {
    const prefix = 'https://example.com/'
    const repositoryUrl = prefix + 'a'.repeat(2048 - prefix.length)
    expect(validateProjectInput({ ...validInput, repositoryUrl })).toEqual({
      valid: true, value: { ...validInput, repositoryUrl },
    })
  })

  it('validateProjectInput_urlLength2049_returnsUrlError', () => {
    const prefix = 'https://example.com/'
    expectFieldError('repositoryUrl', prefix + 'a'.repeat(2049 - prefix.length))
  })

  it('validateProjectInput_repositoryAddress_doesNotFetchDestination', () => {
    const fetch = vi.fn(() => { throw new Error('Network access is forbidden') })
    vi.stubGlobal('fetch', fetch)
    expect(validateProjectInput(validInput).valid).toBe(true)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('validateProjectInput_multipleInvalidFields_reportsEachFieldIndependently', () => {
    const result = validateProjectInput({ name: '', description: '', repositoryUrl: '' })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(Object.keys(result.errors).sort()).toEqual(['description', 'name', 'repositoryUrl'])
    }
  })
})

describe('normalizeProjectName', () => {
  it('normalizeProjectName_caseAndSurroundingWhitespace_returnsSameComparisonKey', () => {
    expect(normalizeProjectName(' BugWatch ')).toBe(normalizeProjectName('bugwatch'))
    expect(normalizeProjectName(' BugWatch ')).toBe('bugwatch')
  })

  it('normalizeProjectName_internalWhitespace_preservesDistinctNames', () => {
    expect(normalizeProjectName('Bug Watch')).not.toBe(normalizeProjectName('BugWatch'))
  })

  it('normalizeProjectName_accentAndCase_changesCaseWithoutAccentFolding', () => {
    expect(normalizeProjectName(' Équipe ')).toBe('équipe')
    expect(normalizeProjectName('équipe')).not.toBe(normalizeProjectName('equipe'))
  })
})
