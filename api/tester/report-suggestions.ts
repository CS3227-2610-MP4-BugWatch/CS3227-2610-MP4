import { suggestionReportFields } from '../../src/features/reports/reportSuggestionTypes.js'
import type { ReportSuggestionRequest, ReportSuggestionResult, SuggestedField, SuggestionReportField } from '../../src/features/reports/reportSuggestionTypes.js'
import { REPORT_TEXT_FIELDS, REPORT_UUID } from '../../src/features/reports/validation.js'
import { createReportSuggestionDependencies } from '../_lib/_report-suggestion-dependencies.js'

type ReportContext = Omit<ReportSuggestionRequest, 'projectId'>
type ProjectContext = { name: string; description: string }

export interface ReportSuggestionDependencies {
  authenticate(token: string): Promise<{ id: string; role: string } | null>
  findProject(token: string, projectId: string): Promise<(ProjectContext & { archived: boolean }) | null>
  reserve(actorId: string): Promise<{ allowed: boolean; retryAfterMs: number }>
  generate(context: { project: ProjectContext; report: ReportContext }): Promise<unknown>
}

const suggestedFields = ['title', 'description', 'reproductionSteps'] as const satisfies readonly SuggestedField[]
const optionalFields = ['version', 'reproductionSteps', 'expectedResults', 'actualResults', 'testEnvironment'] as const
const MAX_QUESTION_LENGTH = 200
const MAX_QUESTIONS = 5
// A maximally escaped JSON representation of every allowed field fits within this bound.
const MAX_REQUEST_BYTES = 300_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function boundedText(value: unknown, limit: number): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return Array.from(text).length <= limit ? text : null
}

async function readRequest(request: Request): Promise<unknown> {
  if (!request.body) return null
  const reader = request.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let size = 0
  let text = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) return JSON.parse(text + decoder.decode()) as unknown
      size += value.byteLength
      if (size > MAX_REQUEST_BYTES) {
        await reader.cancel()
        return null
      }
      text += decoder.decode(value, { stream: true })
    }
  } catch {
    return null
  } finally {
    reader.releaseLock()
  }
}

function parseInput(value: unknown): { projectId: string; report: ReportContext } | null {
  if (!isRecord(value) || typeof value.projectId !== 'string') return null
  const projectId = value.projectId.trim()
  const title = boundedText(value.title, REPORT_TEXT_FIELDS.title.limit)
  const description = boundedText(value.description, REPORT_TEXT_FIELDS.description.limit)
  if (!REPORT_UUID.test(projectId) || !title || !description) return null

  const report: ReportContext = { title, description }
  for (const field of optionalFields) {
    if (value[field] === undefined) continue
    const text = boundedText(value[field], REPORT_TEXT_FIELDS[field].limit)
    if (text === null) return null
    if (text) report[field] = text
  }
  return { projectId, report }
}

function isQuestionField(value: unknown): value is SuggestionReportField {
  return suggestionReportFields.some(field => field === value)
}

function parseOutput(value: unknown): ReportSuggestionResult | null {
  if (!isRecord(value) || !isRecord(value.suggestions) || !Array.isArray(value.questions)) return null

  const suggestions: ReportSuggestionResult['suggestions'] = {}
  for (const field of suggestedFields) {
    const text = boundedText(value.suggestions[field], REPORT_TEXT_FIELDS[field].limit)
    if (text) suggestions[field] = text
  }

  const questions: ReportSuggestionResult['questions'] = []
  for (const question of value.questions) {
    if (questions.length === MAX_QUESTIONS) break
    if (!isRecord(question) || Object.keys(question).some(key => key !== 'field' && key !== 'text')) continue
    const text = boundedText(question.text, MAX_QUESTION_LENGTH)
    if (!text) continue
    if (question.field === undefined) questions.push({ text })
    else if (isQuestionField(question.field)) questions.push({ text, field: question.field })
  }

  const suggestionCount = Object.keys(suggestions).length
  if (!suggestionCount && !questions.length) return null
  const partial = suggestionCount < suggestedFields.length
    || suggestionCount !== Object.keys(value.suggestions).length
    || questions.length !== value.questions.length
    || Object.keys(value).length !== 2
  return { suggestions, questions, partial }
}

function reply(status: number, body: object, headers?: Record<string, string>): Response {
  const responseHeaders = new Headers(headers)
  responseHeaders.set('Cache-Control', 'no-store')
  return Response.json(body, { status, headers: responseHeaders })
}

export async function handleReportSuggestions(request: Request, dependencies: ReportSuggestionDependencies): Promise<Response> {
  if (request.method !== 'POST') return reply(405, { code: 'method_not_allowed' }, { Allow: 'POST' })
  const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get('Authorization') ?? '')?.[1]
  if (!token) return reply(401, { code: 'unauthorized' })

  try {
    const actor = await dependencies.authenticate(token)
    if (!actor) return reply(401, { code: 'unauthorized' })
    if (actor.role !== 'tester') return reply(403, { code: 'forbidden' })

    const input = parseInput(await readRequest(request))
    if (!input) return reply(400, { code: 'invalid_input' })
    const project = await dependencies.findProject(token, input.projectId)
    if (!project || project.archived) return reply(400, { code: 'invalid_project' })

    const quota = await dependencies.reserve(actor.id)
    if (!quota.allowed) {
      return reply(429, { code: 'rate_limited', retryAfterMs: quota.retryAfterMs }, {
        'Retry-After': String(Math.ceil(quota.retryAfterMs / 1000)),
      })
    }

    const result = parseOutput(await dependencies.generate({
      project: { name: project.name, description: project.description },
      report: input.report,
    }))
    if (result) return reply(200, result)
  } catch {
    // Keep provider and database errors out of the response.
  }
  return reply(502, { code: 'unavailable' })
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return reply(405, { code: 'method_not_allowed' }, { Allow: 'POST' })
    try {
      const dependencies = createReportSuggestionDependencies(process.env)
      if (dependencies) return await handleReportSuggestions(request, dependencies)
    } catch {
      // Invalid deployment configuration should fail closed.
    }
    return reply(503, { code: 'unavailable' })
  },
}
