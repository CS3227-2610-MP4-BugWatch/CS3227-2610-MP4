import type { ReportSuggestionRequest, ReportSuggestionResult } from './reportSuggestionTypes'

export type GenerateReportSuggestions = (
  request: ReportSuggestionRequest,
  signal: AbortSignal,
) => Promise<ReportSuggestionResult>

export class ReportSuggestionRateLimit extends Error {
  readonly retryAfterMs: number

  constructor(retryAfterMs: number) {
    super('Suggestion limit reached.')
    this.retryAfterMs = retryAfterMs
  }
}

export const requestReportSuggestions: GenerateReportSuggestions = async (request, signal) => {
  const { supabase } = await import('../../shared/lib/supabaseClient.js')
  const { data, error } = await supabase.auth.getSession()
  signal.throwIfAborted()
  if (error || !data.session) throw new Error('Sign in again to generate suggestions.')

  const response = await fetch('/api/tester/report-suggestions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify(request),
    signal,
  })
  if (response.status === 429) {
    const body: unknown = await response.json()
    if (body && typeof body === 'object' && 'retryAfterMs' in body
      && typeof body.retryAfterMs === 'number' && Number.isFinite(body.retryAfterMs)
      && body.retryAfterMs > 0) {
      throw new ReportSuggestionRateLimit(Math.min(body.retryAfterMs, 300_000))
    }
  }
  if (!response.ok) throw new Error('Suggestions are unavailable.')
  return await response.json() as ReportSuggestionResult
}
