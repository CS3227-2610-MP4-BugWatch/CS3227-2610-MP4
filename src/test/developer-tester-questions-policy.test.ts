// @vitest-environment node
import { expect, it } from 'vitest'
import { containsCredentialSolicitation } from '../../api/_lib/_tester-question-policy.js'

const solicitations = [
  'What is your password?',
  'Can you provide your account password?',
  'Can you share your one-time authentication code?',
  'Can you paste your access token?',
  'Could you send your private key?',
  'Can you provide your API key?',
] as const
const diagnostics = [
  'Does the error occur after changing your password?',
  'Which authentication method were you using?',
  'Is an API key configured?',
  'Could you provide the error code?',
] as const

function fullwidth(text: string) {
  return Array.from(text, character => {
    const code = character.codePointAt(0)!
    return code >= 0x21 && code <= 0x7e ? String.fromCodePoint(code + 0xfee0) : character
  }).join('')
}

it.each(solicitations)('credentialPolicy_explicitDisclosure%s_matches', question => {
  expect(containsCredentialSolicitation([question])).toBe(true)
})
it.each(diagnostics)('credentialPolicy_benignDiagnostic%s_doesNotMatch', question => {
  expect(containsCredentialSolicitation([question])).toBe(false)
})
it.each(solicitations.flatMap(question => [
  { variant: 'uppercase', question: question.toUpperCase() },
  { variant: 'folded whitespace', question: `  ${question.replaceAll(' ', '\t\n  ')}  ` },
  { variant: 'fullwidth', question: fullwidth(question) },
]))('credentialPolicy_$variantExplicitDisclosure_normalizesAndMatches', ({ question }) => {
  expect(containsCredentialSolicitation([question])).toBe(true)
})
it.each(diagnostics.flatMap(question => [
  { variant: 'uppercase', question: question.toUpperCase() },
  { variant: 'folded whitespace', question: `  ${question.replaceAll(' ', '\t\n  ')}  ` },
  { variant: 'fullwidth', question: fullwidth(question) },
]))('credentialPolicy_$variantBenignDiagnostic_remainsAllowed', ({ question }) => {
  expect(containsCredentialSolicitation([question])).toBe(false)
})
it('credentialPolicy_emptyQuestions_doesNotMatch', () => {
  expect(containsCredentialSolicitation([])).toBe(false)
})
it.each([0, 1, 2])('credentialPolicy_solicitationAtIndex%d_matchesEntireList', index => {
  const questions = ['Which browser version?', 'Could you provide the error code?', 'Does the error occur after changing your password?']
  questions[index] = solicitations[0]
  expect(containsCredentialSolicitation(questions)).toBe(true)
})
it('credentialPolicy_readonlyInput_doesNotRewriteQuestions', () => {
  const questions = Object.freeze(['Ｃａｎ you\tprovide your API key?', 'Could you provide the error code?'])
  const before = [...questions]
  expect(containsCredentialSolicitation(questions)).toBe(true)
  expect(questions).toEqual(before)
})
it.each(['password', 'token', 'code', 'Does https://example.invalid/help match the address you saw?', 'Did the command echo diagnostic produce this error?', 'Did the literal text <script>example</script> appear in the error?'])('credentialPolicy_nonSolicitingText%s_hasNoUrlCommandOrKeywordFilter', question => {
  expect(containsCredentialSolicitation([question])).toBe(false)
})
