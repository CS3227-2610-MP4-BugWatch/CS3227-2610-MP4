import { useState, useSyncExternalStore } from 'react'
import { ReportSuggestionRateLimit } from './reportSuggestionClient'
import type { GenerateReportSuggestions } from './reportSuggestionClient'
import { suggestionReportFields } from './reportSuggestionTypes'
import type { ReportSuggestionRequest, ReportSuggestionResult, SuggestedField } from './reportSuggestionTypes'
import type { ReportDraft, ReportInput } from './types'
import { REPORT_TEXT_FIELDS } from './validation'

type SuggestionSet = {
  result: ReportSuggestionResult
  edited: ReportSuggestionResult['suggestions']
  source: ReportInput
}

export function suggestionRequest(input: ReportInput): ReportSuggestionRequest {
  const request: ReportSuggestionRequest = {
    projectId: input.projectId,
    title: input.title.trim(),
    description: input.description.trim(),
  }
  for (const field of suggestionReportFields) {
    const value = input[field]?.trim()
    if (value) request[field] = value
  }
  return request
}

export function suggestionPrerequisites(request: ReportSuggestionRequest, activeProject: boolean): string[] {
  const issues: string[] = []
  if (!activeProject) issues.push('Select an active project to generate suggestions.')
  if (!request.title) issues.push('Enter a title.')
  if (!request.description) issues.push('Enter a description.')
  for (const field of suggestionReportFields) {
    const { label, limit } = REPORT_TEXT_FIELDS[field]
    if (Array.from(request[field] ?? '').length > limit) issues.push(`${label} must be at most ${limit} characters.`)
  }
  return issues
}

type SuggestionState = {
  suggestions?: SuggestionSet
  generating: boolean
  confirmReplacement: boolean
  error: string
  retryAfterMs: number
}

export function createReportSuggestionSession() {
  let state: SuggestionState = { generating: false, confirmReplacement: false, error: '', retryAfterMs: 0 }
  let inFlight: AbortController | undefined
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let transferring = false
  const listeners = new Set<() => void>()

  function update(patch: Partial<SuggestionState>) {
    state = { ...state, ...patch }
    listeners.forEach(notify => notify())
  }

  async function start(generate: GenerateReportSuggestions, request: ReportSuggestionRequest, source: ReportInput) {
    if (inFlight || state.retryAfterMs) return
    const controller = new AbortController()
    inFlight = controller
    update({ generating: true, confirmReplacement: false, error: '' })
    try {
      const result = await generate(request, controller.signal)
      if (!controller.signal.aborted) update({ suggestions: { result, edited: { ...result.suggestions }, source } })
    } catch (reason) {
      if (controller.signal.aborted) return
      if (reason instanceof ReportSuggestionRateLimit) {
        update({
          retryAfterMs: reason.retryAfterMs,
          error: `Suggestion limit reached. Try again in ${Math.ceil(reason.retryAfterMs / 1000)} seconds.`,
        })
        retryTimer = setTimeout(() => update({ retryAfterMs: 0, error: '' }), reason.retryAfterMs)
      } else {
        update({ error: 'Couldn’t generate suggestions. Try again or continue editing your report.' })
      }
    } finally {
      if (inFlight === controller) inFlight = undefined
      if (!controller.signal.aborted) update({ generating: false })
    }
  }

  function requestGeneration(generate: GenerateReportSuggestions, request: ReportSuggestionRequest, source: ReportInput) {
    const { suggestions } = state
    if (suggestions && Object.entries(suggestions.edited).some(
      ([key, value]) => suggestions.result.suggestions[key as SuggestedField] !== value,
    )) {
      update({ confirmReplacement: true })
      return
    }
    void start(generate, request, source)
  }

  function edit(field: SuggestedField, value: string) {
    const { suggestions } = state
    if (suggestions) update({ suggestions: { ...suggestions, edited: { ...suggestions.edited, [field]: value } } })
  }

  function remove(field: SuggestedField) {
    const { suggestions } = state
    if (!suggestions) return
    const edited = { ...suggestions.edited }
    delete edited[field]
    update({ suggestions: { ...suggestions, edited } })
  }

  return {
    getSnapshot: () => state,
    subscribe(notify: () => void) {
      listeners.add(notify)
      transferring = false
      return () => {
        listeners.delete(notify)
        queueMicrotask(() => {
          // Strict Mode immediately resubscribes during its mount check.
          if (!listeners.size && !transferring) {
            inFlight?.abort()
            inFlight = undefined
            clearTimeout(retryTimer)
            update({ generating: false, retryAfterMs: 0, error: '' })
          }
        })
      }
    },
    beginHandoff: () => { transferring = true },
    requestGeneration, start, edit, remove,
    cancelReplacement: () => update({ confirmReplacement: false }),
  }
}

export type ReportSuggestionSession = ReturnType<typeof createReportSuggestionSession>

// The saved draft object is already handed off in the account-scoped route cache.
export const draftSuggestionHandoffs = new WeakMap<ReportDraft, ReportSuggestionSession>()

export function useReportSuggestions(generate: GenerateReportSuggestions, existing?: ReportSuggestionSession) {
  const [session] = useState(() => existing ?? createReportSuggestionSession())
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot)
  return {
    ...state,
    edit: session.edit,
    remove: session.remove,
    cancelReplacement: session.cancelReplacement,
    requestGeneration: (request: ReportSuggestionRequest, source: ReportInput) =>
      session.requestGeneration(generate, request, source),
    start: (request: ReportSuggestionRequest, source: ReportInput) => session.start(generate, request, source),
  }
}
