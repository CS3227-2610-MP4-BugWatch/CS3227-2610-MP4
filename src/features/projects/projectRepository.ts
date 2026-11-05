import type { SupabaseClient } from '@supabase/supabase-js'
import { ProjectError } from './types'
import type { Project, ProjectHistoryEntry, ProjectInput, ProjectRepository } from './types'
import { validateProjectInput } from './validation'

const PROJECT_COLUMNS = 'id, name, description, repository_url, created_by, created_at, updated_at, revision, archived_at'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function fail(error: unknown, status?: number): never {
  if (error instanceof ProjectError) throw error
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined
  if (status === 401 || ['P1001', 'PGRST301', 'PGRST303'].includes(String(code))) {
    throw new ProjectError('unauthenticated', 'Your session has ended. Please log in again.')
  }
  switch (code) {
    case 'P1002':
    case '42501': throw new ProjectError('forbidden', 'You do not have permission to change this project.')
    case 'P1003':
    case '23514':
    case '23502': throw new ProjectError('validation', 'Check the project fields.')
    case 'P1004': throw new ProjectError('archived', 'Archived projects cannot be edited.')
    case 'P1005': throw new ProjectError('not_found', 'Project not found.')
    case 'P1006': throw new ProjectError('conflict', 'This project changed. Reload the latest version before saving again.')
    case '23505': throw new ProjectError('duplicate_name', 'A project with this name already exists.')
    default: throw new ProjectError('unavailable', 'Project storage is unavailable. Please try again.')
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(null)
  return value as Record<string, unknown>
}

function text(value: unknown): string {
  if (typeof value !== 'string') fail(null)
  return value
}

function projectRow(value: unknown): Project {
  const row = record(value)
  if (typeof row.revision !== 'number' || !Number.isSafeInteger(row.revision) || row.revision < 1
    || (row.archived_at !== null && typeof row.archived_at !== 'string')) fail(null)
  return {
    id: text(row.id), name: text(row.name), description: text(row.description),
    repositoryUrl: text(row.repository_url), createdBy: text(row.created_by),
    createdAt: text(row.created_at), updatedAt: text(row.updated_at),
    revision: row.revision, archivedAt: row.archived_at,
  }
}

function historyRow(value: unknown): ProjectHistoryEntry {
  const row = record(value)
  if (row.event !== 'created' && row.event !== 'edited') fail(null)
  if (row.actor_display_name !== null && typeof row.actor_display_name !== 'string') fail(null)
  const source = record(row.changes)
  const changes: ProjectHistoryEntry['changes'] = {}
  for (const [databaseField, field] of [
    ['name', 'name'], ['description', 'description'], ['repository_url', 'repositoryUrl'],
  ] as const) {
    if (!(databaseField in source)) continue
    const change = record(source[databaseField])
    if (change.before !== null && typeof change.before !== 'string') fail(null)
    changes[field] = { before: change.before, after: text(change.after) }
  }
  return {
    id: text(row.id), projectId: text(row.project_id), actorId: text(row.actor_id),
    actorDisplayName: row.actor_display_name,
    occurredAt: text(row.occurred_at), event: row.event, changes,
  }
}

function inputParameters(input: ProjectInput) {
  const result = validateProjectInput(input)
  if (!result.valid) throw new ProjectError('validation', 'Check the project fields.', result.errors)
  return { p_name: result.value.name, p_description: result.value.description, p_repository_url: result.value.repositoryUrl }
}

export function createProjectRepository(client: SupabaseClient): ProjectRepository {
  async function getProject(id: string): Promise<Project | null> {
    if (!UUID.test(id)) return null
    try {
      const { data, error, status } = await client.from('projects').select(PROJECT_COLUMNS).eq('id', id).maybeSingle()
      if (error) fail(error, status)
      return data === null ? null : projectRow(data)
    } catch (error) { return fail(error) }
  }

  async function mutate(operation: 'create_project' | 'update_project', parameters: Record<string, unknown>) {
    try {
      const { data, error, status } = await client.rpc(operation, parameters)
      if (error) fail(error, status)
      return projectRow(data)
    } catch (error) { return fail(error) }
  }

  return {
    getProject,
    async listActiveProjects() {
      try {
        const { data, error, status } = await client.from('projects').select(PROJECT_COLUMNS)
          .is('archived_at', null).order('name').order('id')
        if (error) fail(error, status)
        if (!Array.isArray(data)) fail(null)
        return data.map(projectRow)
      } catch (error) { return fail(error) }
    },
    async listProjectHistory(id) {
      if (!await getProject(id)) throw new ProjectError('not_found', 'Project not found.')
      try {
        const { data, error, status } = await client.rpc('get_project_history', { p_project_id: id })
        if (error) fail(error, status)
        if (!Array.isArray(data)) fail(null)
        return data.map(historyRow)
      } catch (error) { return fail(error) }
    },
    async createProject(input) {
      return mutate('create_project', inputParameters(input))
    },
    async updateProject(id, expectedRevision, input) {
      if (!UUID.test(id)) throw new ProjectError('not_found', 'Project not found.')
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
        throw new ProjectError('validation', 'Reload the project before saving.')
      }
      return mutate('update_project', {
        p_project_id: id, p_expected_revision: expectedRevision, ...inputParameters(input),
      })
    },
  }
}
