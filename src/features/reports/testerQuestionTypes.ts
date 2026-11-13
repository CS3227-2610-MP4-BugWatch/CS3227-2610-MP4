import type { Report, ReportState } from './types.js'

export const TESTER_QUESTION_ELIGIBLE_STATES: readonly ReportState[] = Object.freeze([
  'Accepted',
  'In progress',
  'Awaiting tester information',
])

export type TesterQuestionRequest = { reportId: string }
export type TesterQuestionResult = { questions: string[]; contextVersion: string }
export type QuestionReportFields = Pick<Report,
  'title' | 'description' | 'version' | 'reproductionSteps' |
  'expectedResults' | 'actualResults' | 'severity' | 'testEnvironment'>
export type QuestionCommentContext = { id: string; body: string; replyToCommentId: string | null }
export type QuestionContext = { report: QuestionReportFields; discussion: QuestionCommentContext[] }

// Project/profile metadata and unsaved composer text must never enter the snapshot.
export function questionContext(context: QuestionContext): QuestionContext {
  const report = context.report
  return {
    report: {
      title: report.title, description: report.description, version: report.version,
      reproductionSteps: report.reproductionSteps, expectedResults: report.expectedResults,
      actualResults: report.actualResults, severity: report.severity, testEnvironment: report.testEnvironment,
    },
    discussion: context.discussion.map(comment => ({
      id: comment.id, body: comment.body, replyToCommentId: comment.replyToCommentId,
    })),
  }
}

export function serializeQuestionContext(context: QuestionContext): string {
  // Readers supply chronological comments, with the stable ID breaking timestamp ties.
  return JSON.stringify(questionContext(context))
}

export function questionContextVersion(context: QuestionContext): string {
  // A deterministic FNV-1a checksum for stale detection only, never authorization.
  let digest = 0xcbf29ce484222325n
  for (const byte of new TextEncoder().encode(serializeQuestionContext(context))) {
    digest = BigInt.asUintN(64, (digest ^ BigInt(byte)) * 0x100000001b3n)
  }
  return digest.toString(16).padStart(16, '0')
}

export function parseTesterQuestions(value: unknown): string[] | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).length !== 1 || !('questions' in value)
    || !Array.isArray(value.questions) || value.questions.length > 5) return null
  const questions: string[] = []
  for (const question of value.questions) {
    if (typeof question !== 'string') return null
    const text = question.trim()
    if (!text || Array.from(text).length > 200) return null
    questions.push(text)
  }
  return questions
}
