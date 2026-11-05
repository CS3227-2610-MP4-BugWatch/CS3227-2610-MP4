import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { createProjectRepository } from '../features/projects/projectRepository'
import type { ProjectInput } from '../features/projects/types'

const ID = '10000000-0000-4000-8000-000000000001'
const ACTOR = '20000000-0000-4000-8000-000000000001'
const input: ProjectInput = { name: 'BugWatch', description: 'A bug tracker', repositoryUrl: 'https://example.test/repository' }
const row = {
  id: ID, name: input.name, description: input.description, repository_url: input.repositoryUrl,
  created_by: ACTOR, created_at: '2026-11-03T00:00:00Z', updated_at: '2026-11-03T00:00:00Z', revision: 1, archived_at: null,
}
type Response = { data: unknown; error: unknown; status?: number }

function clientDouble(responses: Response[] = []) {
  const takeResponse = () => responses.shift() ?? { data: null, error: null }
  const chain = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockReturnThis(), single: vi.fn().mockReturnThis(),
    then(resolve: (value: Response) => unknown, reject: (error: unknown) => unknown) {
      return Promise.resolve(takeResponse()).then(resolve, reject)
    },
  }
  const from = vi.fn(() => chain)
  const rpc = vi.fn().mockImplementation(() => Promise.resolve(takeResponse()))
  const client = { from, rpc } as unknown as SupabaseClient
  return { repository: createProjectRepository(client), from, rpc, chain }
}

describe('Supabase project repository', () => {
  it('listActiveProjects_rows_mapsFieldsAndSelectsOnlyActiveProjects', async () => {
    const { repository, from, chain } = clientDouble([{ data: [row], error: null }])
    await expect(repository.listActiveProjects()).resolves.toEqual([{
      id: ID, ...input, createdBy: ACTOR, createdAt: row.created_at, updatedAt: row.updated_at, revision: 1, archivedAt: null,
    }])
    expect(from).toHaveBeenCalledWith('projects')
    expect(chain.is).toHaveBeenCalledWith('archived_at', null)
    expect(chain.order.mock.calls.map(call => call[0])).toEqual(['name', 'id'])
  })

  it('listActiveProjects_emptyRows_returnsEmptyCollection', async () => {
    await expect(clientDouble([{ data: [], error: null }]).repository.listActiveProjects()).resolves.toEqual([])
  })

  it('getProject_existingId_queriesIdAndMapsRow', async () => {
    const { repository, chain } = clientDouble([{ data: row, error: null }])
    await expect(repository.getProject(ID)).resolves.toMatchObject({ id: ID, repositoryUrl: input.repositoryUrl })
    expect(chain.eq).toHaveBeenCalledWith('id', ID)
    expect(chain.maybeSingle).toHaveBeenCalledOnce()
  })

  it('getProject_missingId_returnsNull', async () => {
    await expect(clientDouble([{ data: null, error: null }]).repository.getProject(ID)).resolves.toBeNull()
  })

  it('getProject_invalidUuid_returnsNullWithoutDatabaseRequest', async () => {
    const { repository, from } = clientDouble()
    await expect(repository.getProject('not-a-uuid')).resolves.toBeNull()
    expect(from).not.toHaveBeenCalled()
  })

  it('listProjectHistory_existingProject_mapsNamesAndChangesFromScopedRpc', async () => {
    const entry = { id: 'history-id', project_id: ID, actor_id: ACTOR, actor_display_name: 'Another Developer', occurred_at: row.created_at, event: 'edited', changes: {
      repository_url: { before: 'https://old.test/repo', after: input.repositoryUrl },
      description: { before: 'Old', after: input.description },
    } }
    const { repository, from, rpc } = clientDouble([{ data: row, error: null }, { data: [entry], error: null }])
    await expect(repository.listProjectHistory(ID)).resolves.toEqual([{
      id: entry.id, projectId: ID, actorId: ACTOR, actorDisplayName: 'Another Developer', occurredAt: row.created_at, event: 'edited', changes: {
        repositoryUrl: entry.changes.repository_url, description: entry.changes.description,
      },
    }])
    expect(rpc).toHaveBeenCalledExactlyOnceWith('get_project_history', { p_project_id: ID })
    expect(from).toHaveBeenCalledExactlyOnceWith('projects')
  })

  it('listProjectHistory_duplicateLabels_preservesSeparateActorIdentitiesAndNullNames', async () => {
    const entries = [ACTOR, '20000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003']
      .map((actor, index) => ({ id: `entry-${index}`, project_id: ID, actor_id: actor,
        actor_display_name: index === 2 ? null : 'Shared Name', occurred_at: row.created_at, event: 'created', changes: {} }))
    const { repository } = clientDouble([{ data: row, error: null }, { data: entries, error: null }])
    const history = await repository.listProjectHistory(ID)
    expect(history.map(entry => entry.actorId)).toEqual(entries.map(entry => entry.actor_id))
    expect(history.map(entry => entry.actorDisplayName)).toEqual(['Shared Name', 'Shared Name', null])
  })

  it.each([
    ['null collection', null], ['object collection', {}],
    ...[undefined, 42, {}, []].map((name, index): [string, unknown] => [`invalid name partition ${index}`, [{ id: 'entry', project_id: ID, actor_id: ACTOR,
      occurred_at: row.created_at, event: 'created', changes: {}, ...(name === undefined ? {} : { actor_display_name: name }) }]]),
  ])('listProjectHistory_%s_rejectsMalformedRpcResponse', async (_label, data) => {
    const { repository } = clientDouble([{ data: row, error: null }, { data, error: null }])
    await expect(repository.listProjectHistory(ID)).rejects.toMatchObject({ code: 'unavailable' })
  })

  it.each([['P1001', 'unauthenticated'], ['P1002', 'forbidden'], ['42501', 'forbidden'],
    ['P1005', 'not_found'], ['PGRST301', 'unauthenticated'], ['unexpected', 'unavailable']])(
    'listProjectHistory_rpcError_%s_mapsSafelyTo_%s', async (code, expected) => {
      const { repository } = clientDouble([{ data: row, error: null }, { data: null, error: { code, message: 'private detail' } }])
      const request = repository.listProjectHistory(ID)
      await expect(request).rejects.toMatchObject({ code: expected })
      await expect(request).rejects.not.toThrow('private detail')
    })

  it('listProjectHistory_missingProject_rejectsNotFound', async () => {
    const { repository, from } = clientDouble([{ data: null, error: null }])
    await expect(repository.listProjectHistory(ID)).rejects.toMatchObject({ code: 'not_found' })
    expect(from).toHaveBeenCalledTimes(1)
  })

  it('listProjectHistory_invalidUuid_rejectsNotFoundWithoutRequest', async () => {
    const { repository, from } = clientDouble()
    await expect(repository.listProjectHistory('invalid')).rejects.toMatchObject({ code: 'not_found' })
    expect(from).not.toHaveBeenCalled()
  })

  it('createProject_validInput_trimsAndSendsOnlyEditableFields', async () => {
    const { repository, rpc } = clientDouble([{ data: row, error: null }])
    const tampered = { ...input, name: ' BugWatch ', description: ' A bug tracker ', createdBy: 'forged', revision: 99, archivedAt: 'forged' }
    await expect(repository.createProject(tampered)).resolves.toMatchObject({ id: ID, revision: 1, createdBy: ACTOR })
    expect(rpc).toHaveBeenCalledExactlyOnceWith('create_project', {
      p_name: input.name, p_description: input.description, p_repository_url: input.repositoryUrl,
    })
  })

  it('updateProject_matchingRevision_sendsTargetRevisionAndOnlyEditableFields', async () => {
    const { repository, rpc } = clientDouble([{ data: { ...row, revision: 2 }, error: null }])
    await expect(repository.updateProject(ID, 1, input)).resolves.toMatchObject({ id: ID, revision: 2 })
    expect(rpc).toHaveBeenCalledExactlyOnceWith('update_project', {
      p_project_id: ID, p_expected_revision: 1, p_name: input.name,
      p_description: input.description, p_repository_url: input.repositoryUrl,
    })
  })

  it('updateProject_unchangedResult_preservesReturnedRevisionAndTimestamp', async () => {
    await expect(clientDouble([{ data: row, error: null }]).repository.updateProject(ID, 1, input))
      .resolves.toMatchObject({ revision: 1, updatedAt: row.updated_at })
  })

  it.each(['create', 'update'] as const)('%sProject_invalidFields_rejectsBeforeRpc', async operation => {
    const { repository, rpc } = clientDouble()
    const invalid = { ...input, name: ' ' }
    const request = operation === 'create' ? repository.createProject(invalid) : repository.updateProject(ID, 1, invalid)
    await expect(request).rejects.toMatchObject({ code: 'validation', fieldErrors: { name: expect.any(String) } })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('updateProject_invalidUuid_rejectsNotFoundWithoutRpc', async () => {
    const { repository, rpc } = clientDouble()
    await expect(repository.updateProject('invalid', 1, input)).rejects.toMatchObject({ code: 'not_found' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it.each([0, -1, 1.5, Number.NaN])('updateProject_invalidRevision_%s_rejectsBeforeRpc', async revision => {
    const { repository, rpc } = clientDouble()
    await expect(repository.updateProject(ID, revision, input)).rejects.toMatchObject({ code: 'validation' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it.each([
    ['null collection', null], ['object instead of collection', row], ['invalid revision', [{ ...row, revision: 0 }]],
    ['missing metadata', [{ id: ID }]],
  ])('listActiveProjects_%s_rejectsUnavailableInsteadOfLeakingMalformedData', async (_label, data) => {
    await expect(clientDouble([{ data, error: null }]).repository.listActiveProjects()).rejects.toMatchObject({ code: 'unavailable' })
  })

  it.each([
    ['P1001', 'unauthenticated'], ['P1002', 'forbidden'], ['P1003', 'validation'],
    ['P1004', 'archived'], ['P1005', 'not_found'], ['P1006', 'conflict'], ['23505', 'duplicate_name'],
    ['PGRST301', 'unauthenticated'], ['PGRST303', 'unauthenticated'], ['42501', 'forbidden'],
    ['23514', 'validation'], ['23502', 'validation'], ['unexpected', 'unavailable'],
  ])('createProject_databaseError_%s_mapsTo_%s', async (code, expected) => {
    const { repository } = clientDouble([{ data: null, error: { code, message: 'private database detail' } }])
    const request = repository.createProject(input)
    await expect(request).rejects.toMatchObject({ code: expected })
    await expect(request).rejects.not.toThrow('private database detail')
  })

  it('getProject_httpUnauthorized_mapsToUnauthenticated', async () => {
    const { repository } = clientDouble([{ data: null, error: { code: 'unexpected' }, status: 401 }])
    await expect(repository.getProject(ID)).rejects.toMatchObject({ code: 'unauthenticated' })
  })

  it('createProject_networkFailure_mapsToUnavailable', async () => {
    const { repository, rpc } = clientDouble()
    rpc.mockRejectedValue(new Error('private network failure'))
    await expect(repository.createProject(input)).rejects.toMatchObject({ code: 'unavailable' })
  })

  it('listActiveProjects_readFailure_mapsToUnavailable', async () => {
    const { repository } = clientDouble([{ data: null, error: { code: 'unexpected' } }])
    await expect(repository.listActiveProjects()).rejects.toMatchObject({ code: 'unavailable' })
  })
})
