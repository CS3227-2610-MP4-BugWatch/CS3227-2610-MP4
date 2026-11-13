export const suggestionReportFields = [
  'title', 'description', 'version', 'reproductionSteps',
  'expectedResults', 'actualResults', 'testEnvironment',
] as const

export type SuggestionReportField = typeof suggestionReportFields[number]
export type SuggestedField = 'title' | 'description' | 'reproductionSteps'

export type ReportSuggestionRequest = {
  projectId: string
  title: string
  description: string
} & Partial<Record<Exclude<SuggestionReportField, 'title' | 'description'>, string>>

export interface ReportSuggestionResult {
  suggestions: Partial<Record<SuggestedField, string>>
  questions: Array<{ field?: SuggestionReportField; text: string }>
  partial: boolean
}
