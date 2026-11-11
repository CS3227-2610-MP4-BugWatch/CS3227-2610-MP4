import type { CommentInput, ReportFieldErrors, ReportInput, ReportSeverity, ValidatedReportInput } from './types.js'

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
