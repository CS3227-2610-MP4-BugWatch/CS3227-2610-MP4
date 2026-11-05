export interface ProjectInput {
  name: string
  description: string
  repositoryUrl: string
}

export type { SessionUser } from '../../shared/types/session'

export interface Project extends ProjectInput {
  id: string
  createdBy: string
  createdAt: string
  updatedAt: string
  revision: number
  archivedAt: string | null
}

export interface ProjectHistoryEntry {
  id: string
  projectId: string
  actorId: string
  actorDisplayName?: string | null
  occurredAt: string
  event: 'created' | 'edited'
  changes: Partial<Record<keyof ProjectInput, { before: string | null; after: string }>>
}

type ProjectErrorCode =
  | 'validation'
  | 'duplicate_name'
  | 'conflict'
  | 'unauthenticated'
  | 'forbidden'
  | 'archived'
  | 'not_found'
  | 'unavailable'

export class ProjectError extends Error {
  readonly code: ProjectErrorCode
  readonly fieldErrors?: Partial<Record<keyof ProjectInput, string>>

  constructor(
    code: ProjectErrorCode,
    message: string,
    fieldErrors?: Partial<Record<keyof ProjectInput, string>>,
  ) {
    super(message)
    this.name = 'ProjectError'
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

export interface ProjectRepository {
  listActiveProjects(): Promise<Project[]>
  getProject(id: string): Promise<Project | null>
  listProjectHistory(id: string): Promise<ProjectHistoryEntry[]>
  createProject(input: ProjectInput): Promise<Project>
  updateProject(id: string, expectedRevision: number, input: ProjectInput): Promise<Project>
}
