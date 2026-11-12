import type { TesterQuestionRequest, TesterQuestionResult } from './testerQuestionTypes'
import { parseTesterQuestions } from './testerQuestionTypes'

export type GenerateTesterQuestions = (request: TesterQuestionRequest, signal: AbortSignal) => Promise<TesterQuestionResult>

export class TesterQuestionError extends Error {
  readonly code: string
  readonly retryAfterMs: number
  constructor(code: string, retryAfterMs = 0) {
    super('Tester questions are unavailable.')
    this.code = code
    this.retryAfterMs = retryAfterMs
  }
}

export const requestTesterQuestions: GenerateTesterQuestions = async (request, signal) => {
  const { supabase } = await import('../../shared/lib/supabaseClient.js')
  const { data, error } = await supabase.auth.getSession()
  signal.throwIfAborted()
  if (error || !data.session) throw new TesterQuestionError('unauthorized')
  const response = await fetch('/api/developer/tester-questions', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify({ reportId: request.reportId }),
  })
  const body: unknown = await response.json()
  if (!response.ok) {
    const code = body && typeof body === 'object' && 'code' in body && typeof body.code === 'string' ? body.code : 'unavailable'
    const retry = body && typeof body === 'object' && 'retryAfterMs' in body && typeof body.retryAfterMs === 'number'
      && Number.isFinite(body.retryAfterMs) && body.retryAfterMs > 0 ? Math.min(body.retryAfterMs, 300_000) : 0
    throw new TesterQuestionError(code, response.status === 429 ? retry : 0)
  }
  if (!body || typeof body !== 'object' || !('questions' in body) || !('contextVersion' in body)
    || typeof body.contextVersion !== 'string' || !body.contextVersion) throw new TesterQuestionError('unavailable')
  const questions = parseTesterQuestions({ questions: body.questions })
  if (questions === null) throw new TesterQuestionError('unavailable')
  return { questions, contextVersion: body.contextVersion }
}
