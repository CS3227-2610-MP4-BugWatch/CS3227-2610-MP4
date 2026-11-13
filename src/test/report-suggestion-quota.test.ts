// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const enabled = process.env.QUOTA_TEST_DOCKER === 'true'
const dockerPath = process.env.QUOTA_TEST_DOCKER_PATH
const migratedActor = '00000000-0000-0000-0000-000000000001'
const concurrentActor = '00000000-0000-0000-0000-000000000002'
const expiryActor = '00000000-0000-0000-0000-000000000003'
const developer = '00000000-0000-0000-0000-000000000004'

describe.skipIf(!enabled)('isolated Docker suggestion quota integration', () => {
  const container = `bugwatch-quota-${randomUUID().slice(0, 8)}`
  let started = false

  function docker(args: string[], input?: string) {
    if (!dockerPath) throw new Error('QUOTA_TEST_DOCKER_PATH must explicitly identify Docker')
    return execFileSync(dockerPath, args, { input, encoding: 'utf8', timeout: 30_000 }).trim()
  }

  function sql(input: string) {
    return docker(['exec', '-i', container, 'psql', '-At', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres'], input)
  }

  function reserve(actor: string) {
    const result = sql(`set role service_role; select public.reserve_tester_suggestion_attempt('${actor}');`)
    return JSON.parse(result.split('\n').at(-1)!) as { allowed: boolean; retryAfterMs: number }
  }

  beforeAll(async () => {
    docker(['run', '--rm', '--name', container, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-d', 'postgres:17.6-alpine3.22'])
    started = true
    let ready = false
    for (let attempt = 0; attempt < 30; attempt++) {
      // Initialization starts a socket-only server that stops before the final server.
      // Probe TCP so that temporary server cannot prematurely satisfy readiness.
      try { docker(['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres']); ready = true; break }
      catch { await new Promise(resolve => setTimeout(resolve, 200)) }
    }
    if (!ready) throw new Error('Disposable PostgreSQL did not become ready')
    sql(`
      create role anon;
      create role authenticated;
      create role service_role;
      create table public.profiles(id uuid primary key, role text not null);
      insert into public.profiles values
        ('${migratedActor}', 'tester'), ('${concurrentActor}', 'tester'),
        ('${expiryActor}', 'tester'), ('${developer}', 'developer');
      create table public.quota_test_results(allowed boolean not null);
      grant insert on public.quota_test_results to service_role;
    `)
    sql(readFileSync('src/features/reports/database/009_tester_suggestion_quota.sql', 'utf8'))
    for (let attempt = 0; attempt < 3; attempt++) expect(reserve(migratedActor).allowed).toBe(true)
    expect(reserve(migratedActor).allowed).toBe(false)
    sql(readFileSync('src/features/reports/database/010_tester_suggestion_quota_five.sql', 'utf8'))
  }, 60_000)

  afterAll(() => { if (started) docker(['stop', container]) }, 30_000)

  it('quotaMigration_existingThreeAttempts_preservesHistoryAndAdmitsOnlyTwoMore', () => {
    expect(sql(`select cardinality(attempts) from public.tester_suggestion_quotas where actor_id = '${migratedActor}';`)).toBe('3')
    expect(reserve(migratedActor)).toEqual({ allowed: true, retryAfterMs: 0 })
    expect(reserve(migratedActor)).toEqual({ allowed: true, retryAfterMs: 0 })
    expect(sql(`select cardinality(attempts) from public.tester_suggestion_quotas where actor_id = '${migratedActor}';`)).toBe('5')
    const sixth = reserve(migratedActor)
    expect(sixth.allowed).toBe(false)
    expect(sixth.retryAfterMs).toBeGreaterThan(0)
    expect(sixth.retryAfterMs).toBeLessThanOrEqual(300_000)
  })

  it('quotaReservation_expiredAttempt_freesExactlyOneSlot', () => {
    sql(`insert into public.tester_suggestion_quotas values ('${expiryActor}',
      array[clock_timestamp() - interval '5 minutes', clock_timestamp(), clock_timestamp(), clock_timestamp(), clock_timestamp()]);`)
    expect(reserve(expiryActor)).toEqual({ allowed: true, retryAfterMs: 0 })
    expect(reserve(expiryActor).allowed).toBe(false)
  })

  it('quotaReservation_tenConcurrentCalls_admitsExactlyFive', () => {
    const script = `set role service_role;
      insert into public.quota_test_results values
      ((public.reserve_tester_suggestion_attempt('${concurrentActor}')->>'allowed')::boolean);`
    docker(['exec', '-i', container, 'pgbench', '-n', '-c', '10', '-j', '5', '-t', '1', '-f', '/dev/stdin', '-U', 'postgres', '-d', 'postgres'], script)
    expect(sql('select count(*), count(*) filter (where allowed) from public.quota_test_results;')).toBe('10|5')
  })

  it('quotaPermissions_ordinaryRoles_cannotReserveOrReadQuota', () => {
    for (const role of ['anon', 'authenticated']) {
      expect(sql(`select has_function_privilege('${role}', 'public.reserve_tester_suggestion_attempt(uuid)', 'execute'),
        has_table_privilege('${role}', 'public.tester_suggestion_quotas', 'select');`)).toBe('f|f')
      expect(() => sql(`set role ${role}; select public.reserve_tester_suggestion_attempt('${migratedActor}');`)).toThrow()
    }
    expect(sql("select has_function_privilege('service_role', 'public.reserve_tester_suggestion_attempt(uuid)', 'execute');")).toBe('t')
    expect(() => reserve(developer)).toThrow()
  })
})
