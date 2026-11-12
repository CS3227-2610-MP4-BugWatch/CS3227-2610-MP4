export type ReportSeverity = 'very_low' | 'low' | 'medium' | 'high'
export type ReportState = 'Open' | 'Accepted' | 'In progress' | 'Awaiting tester information' | 'Resolved' | 'Closed'

export type ResolutionInput = {
  kind: 'fixed'
  fixSummary: string
  affectedVersion: string
  commitUrl: string
  pullRequestUrl: string
} | {
  kind: 'duplicate'
  explanation: string
  canonicalReportId: string
} | {
  kind: 'invalid' | 'cannot_reproduce' | 'will_not_fix'
  explanation: string
}

export type ReportResolution = ResolutionInput & {
  authorId: string
  authorUsername: string | null
  authorDisplayName: string | null
  resolvedAt: string
}

export type ResolutionFieldErrors = Partial<Record<'kind' | 'fixSummary' | 'affectedVersion' | 'commitUrl' | 'pullRequestUrl' | 'explanation' | 'canonicalReportId', string>>

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
  resolution: ReportResolution | null
  canonicalReport: { id: string; title: string } | null
  id: string
  reporterId: string
  createdAt: string
  updatedAt: string
  state: ReportState
  assignedDeveloperId: string | null
  assignedAt: string | null
  assignedDeveloperUsername: string | null
  assignedDeveloperDisplayName: string | null
  projectName: string
  projectArchivedAt: string | null
  reporterUsername: string
  reporterDisplayName: string
}

export interface DraftSummary {
  id: string
  projectId: string
  projectName: string
  projectArchivedAt: string | null
  title: string
  updatedAt: string
}

export interface ReportDraft extends DraftSummary, ReportInput {}

export interface CommentInput {
  body: string
  replyToCommentId?: string | null
}

export interface ReportComment {
  id: string
  reportId: string
  authorId: string
  authorUsername: string | null
  authorDisplayName: string | null
  body: string
  replyToCommentId: string | null
  createdAt: string
}

interface ReportHistoryIdentity {
  id: string
  reportId: string
  actorId: string
  actorDisplayName: string | null
  actorUsername?: string | null
  occurredAt: string
}

export type ReportHistoryEntry = ReportHistoryIdentity & ({
  event: 'created'
  changes: Partial<Record<keyof ReportInput, { before: null; after: string }>>
} | {
  event: 'accepted'
  assignedDeveloperUsername?: string | null
  assignedDeveloperDisplayName?: string | null
  changes: {
    state: { before: 'Open'; after: 'Accepted' }
    assignedDeveloperId: { before: null; after: string }
    assignedAt: { before: null; after: string }
  }
} | {
  event: 'investigation_started'
  changes: { state: { before: 'Accepted'; after: 'In progress' } }
} | {
  event: 'tester_information_requested'
  changes: { state: { before: 'In progress'; after: 'Awaiting tester information' } }
} | {
  event: 'investigation_resumed'
  changes: { state: { before: 'Awaiting tester information'; after: 'In progress' } }
} | {
  event: 'resolved'
  changes: {
    state: { before: 'In progress'; after: 'Resolved' }
    resolution: { before: null; after: ReportResolution }
  }
} | {
  event: 'duplicate_linked'
  changes: { canonicalReportId: { before: string | null; after: string } }
})

export type ProjectReportSummary = Pick<Report,
  'id' | 'projectId' | 'title' | 'projectName' | 'severity' | 'state' | 'assignedDeveloperId'
  | 'assignedDeveloperUsername' | 'assignedDeveloperDisplayName' | 'reporterDisplayName'>

type ReportErrorCode = 'validation' | 'unauthenticated' | 'forbidden' | 'archived' | 'not_found' | 'unavailable' | 'already_assigned' | 'state_conflict'
export type ReportFieldErrors = Partial<Record<keyof ReportInput, string>>

export class ReportError extends Error {
  readonly code: ReportErrorCode
  readonly fieldErrors?: ReportFieldErrors & ResolutionFieldErrors

  constructor(code: ReportErrorCode, message: string, fieldErrors?: ReportFieldErrors & ResolutionFieldErrors) {
    super(message)
    this.name = 'ReportError'
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

export interface ReportRepository {
  listDrafts(): Promise<DraftSummary[]>
  getDraft(id: string): Promise<ReportDraft | null>
  saveDraft(input: ReportInput, id?: string): Promise<ReportDraft>
  deleteDraft(id: string): Promise<void>
  submitDraft(id: string, input: ReportInput): Promise<Report>
  createReport(input: ReportInput): Promise<Report>
  getReport(id: string): Promise<Report | null>
  acceptReport(id: string): Promise<Report>
  startInvestigation(id: string): Promise<Report>
  awaitTesterInformation(id: string): Promise<Report>
  resumeInvestigation(id: string): Promise<Report>
  resolveReport(id: string, input: ResolutionInput): Promise<Report>
  linkDuplicate(id: string, canonicalReportId: string, expectedCanonicalReportId: string | null): Promise<Report>
  listReportComments(id: string): Promise<ReportComment[]>
  postReportComment(id: string, input: CommentInput): Promise<ReportComment>
  listReportHistory(id: string): Promise<ReportHistoryEntry[]>
  listProjectReports(projectId: string): Promise<ProjectReportSummary[]>
}
