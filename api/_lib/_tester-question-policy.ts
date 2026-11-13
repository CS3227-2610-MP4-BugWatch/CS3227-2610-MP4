// Bounded English disclosure forms, not a general safety or intent classifier.
// Keep credential categories next to the request wording so ordinary diagnostics
// mentioning a password change or an error code do not match by keyword alone.
const credential = '(?:passwords?|(?:one[- ]time(?: authentication| verification| security)?|authentication|verification|security|login) codes?|(?:access|refresh|authentication|bearer|session) tokens?|private keys?|api keys?|credentials)'
const qualifiers = '(?:(?:your|the|a|an|account|current|actual|full|complete|raw|secret|value|of) ){0,5}'
const diagnosticSuffix = '(?! (?:reset|change|policy|requirements|length|expiry|expiration|configuration|configured|type|name|identifier|error|status|format|field|count)\\b)'
const disclosure = new RegExp(`(?:\\b(?:can|could|would|will) you (?:please )?|^(?:please )?)(?:provide|share|paste|send|disclose|reveal|supply|submit|enter|type|give|tell) (?:me |us )?${qualifiers}${credential}\\b${diagnosticSuffix}`, 'u')
const valueQuestion = new RegExp(`\\bwhat (?:is|are) ${qualifiers}${credential}\\b${diagnosticSuffix}`, 'u')

export function containsCredentialSolicitation(questions: readonly string[]): boolean {
  return questions.some(question => {
    // Inspect a copy only: accepted output and saved incident evidence stay intact.
    const normalized = question.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim()
    return disclosure.test(normalized) || valueQuestion.test(normalized)
  })
}
