import { useEffect, useState, useSyncExternalStore } from 'react'
import { TesterQuestionError } from './testerQuestionClient'
import type { GenerateTesterQuestions } from './testerQuestionClient'
import type { TesterQuestionResult } from './testerQuestionTypes'

type QuestionState = { result?: TesterQuestionResult; generating: boolean; error: string; retryAfterMs: number; contextVersion?: string }

function failureMessage(error: unknown) {
  if (error instanceof TesterQuestionError) {
    if (error.code === 'context_too_large') return 'The full report and discussion are too large to generate questions. Continue the discussion manually.'
    if (error.code === 'unauthorized') return 'Sign in again to generate tester questions.'
    if (error.code === 'rate_limited') return `Question limit reached. Try again${error.retryAfterMs ? ` in ${Math.ceil(error.retryAfterMs / 1000)} seconds` : ' later'}.`
  }
  return 'Could not generate tester questions. Try again or continue the discussion manually.'
}

function createTesterQuestionSession() {
  let state: QuestionState = { generating: false, error: '', retryAfterMs: 0 }
  let inFlight: AbortController | undefined
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  const listeners = new Set<() => void>()
  function update(patch: Partial<QuestionState>) {
    state = { ...state, ...patch }
    listeners.forEach(listener => listener())
  }
  function clear() {
    inFlight?.abort()
    inFlight = undefined
    clearTimeout(retryTimer)
    update({ result: undefined, generating: false, error: '', retryAfterMs: 0 })
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        queueMicrotask(() => { if (!listeners.size) clear() })
      }
    },
    clear,
    setContext(contextVersion: string) {
      if (state.contextVersion !== contextVersion) update({ contextVersion })
    },
    async generate(generate: GenerateTesterQuestions, reportId: string) {
      if (inFlight || state.retryAfterMs) return
      const controller = new AbortController()
      inFlight = controller
      update({ generating: true, error: '' })
      try {
        const result = await generate({ reportId }, controller.signal)
        if (!controller.signal.aborted) update({ result })
      } catch (error) {
        if (controller.signal.aborted) return
        if (error instanceof TesterQuestionError && ['forbidden', 'not_found', 'ineligible_report', 'unauthorized'].includes(error.code)) {
          update({ result: undefined })
        }
        const retryAfterMs = error instanceof TesterQuestionError ? error.retryAfterMs : 0
        update({ error: failureMessage(error), retryAfterMs })
        if (retryAfterMs) retryTimer = setTimeout(() => update({ retryAfterMs: 0, error: '' }), retryAfterMs)
      } finally {
        if (inFlight === controller) inFlight = undefined
        if (!controller.signal.aborted) update({ generating: false })
      }
    },
  }
}

export function useTesterQuestions(generate: GenerateTesterQuestions, reportId: string | undefined, eligible: boolean, contextVersion: string | null) {
  const [session] = useState(createTesterQuestionSession)
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot)
  useEffect(() => { if (!eligible) session.clear() }, [eligible, session])
  useEffect(() => { if (contextVersion) session.setContext(contextVersion) }, [contextVersion, session])
  return {
    ...state,
    result: eligible ? state.result : undefined,
    outdated: Boolean(state.result && (contextVersion ?? state.contextVersion)
      && state.result.contextVersion !== (contextVersion ?? state.contextVersion)),
    generate: () => { if (eligible && reportId && contextVersion) void session.generate(generate, reportId) },
  }
}
