export type ReportSeverity = 'very_low' | 'low' | 'medium' | 'high'

export interface ReportInput {
  projectId: string
  title: string
  description: string
  version: string
  reproductionSteps: string
  expectedResults: string
  actualResults: string
  severity: ReportSeverity | ''
  testEnvironment?: string
}

export interface ValidatedReportInput extends ReportInput {
  severity: ReportSeverity
  testEnvironment: string
}

export interface Report extends ValidatedReportInput {
  id: string
  reporterId: string
  createdAt: string
  updatedAt: string
  state: 'Open'
  assignedDeveloperId: null
  projectName: string
  projectArchivedAt: string | null
  reporterUsername: string
  reporterDisplayName: string
}

export interface ReportHistoryEntry {
  id: string
  reportId: string
  actorId: string
  actorDisplayName: string | null
  occurredAt: string
  event: 'created'
  changes: Partial<Record<keyof ReportInput, { before: null; after: string }>>
}

export type ProjectReportSummary = Pick<Report,
  'id' | 'projectId' | 'title' | 'projectName' | 'severity' | 'state' | 'assignedDeveloperId' | 'reporterDisplayName'>

type ReportErrorCode = 'validation' | 'unauthenticated' | 'forbidden' | 'archived' | 'not_found' | 'unavailable'
export type ReportFieldErrors = Partial<Record<keyof ReportInput, string>>

export class ReportError extends Error {
  readonly code: ReportErrorCode
  readonly fieldErrors?: ReportFieldErrors

  constructor(code: ReportErrorCode, message: string, fieldErrors?: ReportFieldErrors) {
    super(message)
    this.name = 'ReportError'
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

export interface ReportRepository {
  createReport(input: ReportInput): Promise<Report>
  getReport(id: string): Promise<Report | null>
  listReportHistory(id: string): Promise<ReportHistoryEntry[]>
  listProjectReports(projectId: string): Promise<ProjectReportSummary[]>
}
