import type { CommentInput, ReportFieldErrors, ReportInput, ReportSeverity, ResolutionFieldErrors, ResolutionInput, ValidatedReportInput } from './types.js'

export const REPORT_SEVERITIES = {
  very_low: 'Very Low',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
} satisfies Record<ReportSeverity, string>

export const REPORT_TEXT_FIELDS = {
  title: { label: 'Title', limit: 200 },
  description: { label: 'Description', limit: 5000 },
  version: { label: 'Version', limit: 100 },
  reproductionSteps: { label: 'Reproduction steps', limit: 5000 },
  expectedResults: { label: 'Expected results', limit: 5000 },
  actualResults: { label: 'Actual results', limit: 5000 },
  testEnvironment: { label: 'Test environment', limit: 1000 },
}

export const REPORT_TEXT_KEYS = Object.keys(REPORT_TEXT_FIELDS) as (keyof typeof REPORT_TEXT_FIELDS)[]
export const REPORT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const COMMENT_TEXT_LIMIT = 5000

export const RESOLUTION_TEXT_LIMIT = 5000
export const RESOLUTION_VERSION_LIMIT = 100
export const RESOLUTION_URL_LIMIT = 2048
export const RESOLUTION_KINDS = {
  fixed: 'Fixed', duplicate: 'Duplicate', invalid: 'Invalid', cannot_reproduce: 'Cannot reproduce', will_not_fix: 'Will not fix',
} as const

export function validateResolutionInput(input: ResolutionInput): { valid: true; value: ResolutionInput } | { valid: false; errors: ResolutionFieldErrors } {
  const errors: ResolutionFieldErrors = {}
  if (!input || typeof input !== 'object' || Array.isArray(input) || typeof input.kind !== 'string' || !Object.hasOwn(RESOLUTION_KINDS, input.kind)) {
    return { valid: false, errors: { kind: 'Choose a resolution outcome.' } }
  }
  const fields = input.kind === 'fixed' ? ['fixSummary', 'affectedVersion', 'commitUrl', 'pullRequestUrl'] as const
    : input.kind === 'duplicate' ? ['explanation', 'canonicalReportId'] as const : ['explanation'] as const
  const source = input as unknown as Record<string, unknown>
  if (Object.keys(source).some(key => key !== 'kind' && !(fields as readonly string[]).includes(key))) {
    errors.kind = 'Only include fields for the selected resolution outcome.'
  }
  const normalized: Record<string, string> = { kind: input.kind }
  for (const key of fields) {
    const raw = source[key]
    const value = typeof raw === 'string' ? raw.trim() : ''
    normalized[key] = value
    if (typeof raw !== 'string' || !value) { errors[key] = 'Enter a value for this field.'; continue }
    if (key === 'canonicalReportId') {
      if (!REPORT_UUID.test(value)) errors[key] = 'Choose a valid canonical report.'
      continue
    }
    const limit = key === 'affectedVersion' ? RESOLUTION_VERSION_LIMIT
      : key === 'commitUrl' || key === 'pullRequestUrl' ? RESOLUTION_URL_LIMIT : RESOLUTION_TEXT_LIMIT
    if (Array.from(value).length > limit) { errors[key] = `Use at most ${limit.toLocaleString('en-US')} characters.`; continue }
    if (key === 'commitUrl' || key === 'pullRequestUrl') {
      try {
        const url = new URL(value)
        // Reject URL-parser repairs (missing slashes, whitespace and backslashes) at both boundaries.
        if (!/^https?:\/\/[^/\\?#]/i.test(value) || !['http:', 'https:'].includes(url.protocol) || !url.hostname || /[\s\p{Cc}\\]/u.test(value)) throw new Error('Invalid URL')
        // Match the established project URL code-point rules used by SQL migration 004.
        for (const character of value) {
          const point = character.codePointAt(0) ?? 0
          if (point < 0x80 ? !(/[A-Za-z0-9]/.test(character) || "!$&'()*+,-./:;=?@_~%#[]".includes(character))
            : point < 0xA0 || point > 0x10FFFD || (point >= 0xD800 && point <= 0xDFFF)
              || (point >= 0xFDD0 && point <= 0xFDEF) || (point & 0xFFFF) >= 0xFFFE) throw new Error('Invalid URL')
        }
      } catch { errors[key] = 'Enter an absolute HTTP or HTTPS URL with a host.' }
    }
  }
  if (Object.keys(errors).length) return { valid: false, errors }
  return { valid: true, value: normalized as unknown as ResolutionInput }
}

export function validateCommentInput(input: CommentInput): { valid: true; value: { body: string; replyToCommentId: string | null } } | { valid: false; message: string } {
  if (typeof input?.body !== 'string') return { valid: false, message: 'Enter text for your comment.' }
  const body = input.body.trim()
  if (!body) return { valid: false, message: 'Enter a comment.' }
  if (Array.from(body).length > COMMENT_TEXT_LIMIT) return { valid: false, message: 'Comments must be at most 5,000 characters.' }
  const replyToCommentId = input.replyToCommentId ?? null
  if (replyToCommentId !== null && (typeof replyToCommentId !== 'string' || !REPORT_UUID.test(replyToCommentId))) {
    return { valid: false, message: 'Choose a valid comment to reply to.' }
  }
  return { valid: true, value: { body, replyToCommentId } }
}

type ValidationResult = { valid: true; value: ValidatedReportInput } | { valid: false; errors: ReportFieldErrors }

function isSeverity(value: unknown): value is ReportSeverity {
  return typeof value === 'string' && Object.hasOwn(REPORT_SEVERITIES, value)
}

export function validateReportInput(input: ReportInput): ValidationResult {
  const errors: ReportFieldErrors = {}
  const projectId = input?.projectId
  const severity = input?.severity
  if (typeof projectId !== 'string' || !REPORT_UUID.test(projectId)) errors.projectId = 'Choose an active project.'
  if (!isSeverity(severity)) errors.severity = 'Choose a severity.'
  const fields = {
    title: '', description: '', version: '', reproductionSteps: '',
    expectedResults: '', actualResults: '', testEnvironment: '',
  }
  for (const key of REPORT_TEXT_KEYS) {
    const raw = input?.[key]
    const value = typeof raw === 'string' ? raw.trim() : ''
    const { label, limit } = REPORT_TEXT_FIELDS[key]
    if (key !== 'testEnvironment' && !value) errors[key] = `Enter ${label.toLowerCase()}.`
    else if (raw !== undefined && typeof raw !== 'string') errors[key] = `Enter text for ${label.toLowerCase()}.`
    else if (Array.from(value).length > limit) errors[key] = `${label} must be at most ${limit.toLocaleString('en-US')} characters.`
    fields[key] = value
  }
  if (Object.keys(errors).length || !isSeverity(severity)) return { valid: false, errors }
  return { valid: true, value: { projectId, severity, ...fields } }
}

export function validateDraftInput(input: ReportInput): { valid: true; value: ReportInput } | { valid: false; errors: ReportFieldErrors } {
  const errors: ReportFieldErrors = {}
  const projectId = input?.projectId
  const severity = input?.severity
  if (typeof projectId !== 'string' || !REPORT_UUID.test(projectId)) errors.projectId = 'Choose an active project.'
  if (severity !== '' && !isSeverity(severity)) errors.severity = 'Choose a severity.'
  const fields = { title: '', description: '', version: '', reproductionSteps: '', expectedResults: '', actualResults: '', testEnvironment: '' }
  for (const key of REPORT_TEXT_KEYS) {
    const raw = input?.[key]
    const value = typeof raw === 'string' ? raw.trim() : ''
    const { label, limit } = REPORT_TEXT_FIELDS[key]
    if (typeof raw !== 'string' && !(key === 'testEnvironment' && raw === undefined)) errors[key] = `Enter text for ${label.toLowerCase()}.`
    else if (Array.from(value).length > limit) errors[key] = `${label} must be at most ${limit.toLocaleString('en-US')} characters.`
    fields[key] = value
  }
  if (Object.keys(errors).length || (severity !== '' && !isSeverity(severity))) return { valid: false, errors }
  return { valid: true, value: { projectId, severity, ...fields } }
}
