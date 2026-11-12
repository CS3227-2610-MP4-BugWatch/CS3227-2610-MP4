// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const enabled = process.env.QUOTA_TEST_DOCKER === 'true'
const dockerPath = process.env.QUOTA_TEST_DOCKER_PATH
const developer = '00000000-0000-0000-0000-000000000001'
const concurrent = '00000000-0000-0000-0000-000000000002'
const expiry = '00000000-0000-0000-0000-000000000003'
const tester = '00000000-0000-0000-0000-000000000004'

describe.skipIf(!enabled)('isolated Docker Developer quota integration', () => {
  const container = `bugwatch-developer-quota-${randomUUID().slice(0, 8)}`
  let started = false
  function docker(args: string[], input?: string) {
    if (!dockerPath) throw new Error('QUOTA_TEST_DOCKER_PATH must explicitly identify Docker')
    return execFileSync(dockerPath, args, { input, encoding: 'utf8', timeout: 30_000 }).trim()
  }
  function sql(input: string) { return docker(['exec', '-i', container, 'psql', '-At', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres'], input) }
  function reserve(actor: string, role = 'developer') {
    const result = sql(`set role service_role; select public.reserve_${role === 'developer' ? 'developer_question' : 'tester_suggestion'}_attempt('${actor}');`)
    return JSON.parse(result.split('\n').at(-1)!) as { allowed: boolean; retryAfterMs: number }
  }
  beforeAll(async () => {
    docker(['run', '--rm', '--name', container, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-d', 'postgres:17.6-alpine3.22'])
    started = true
    let ready = false
    for (let attempt = 0; attempt < 30; attempt++) {
      try { docker(['exec', container, 'pg_isready', '-U', 'postgres']); ready = true; break }
      catch { await new Promise(resolve => setTimeout(resolve, 200)) }
    }
    if (!ready) throw new Error('Disposable PostgreSQL did not become ready')
    sql(`create role anon; create role authenticated; create role service_role;
      create table public.profiles(id uuid primary key, role text not null);
      insert into public.profiles values ('${developer}', 'developer'), ('${concurrent}', 'developer'), ('${expiry}', 'developer'), ('${tester}', 'tester');
      create table public.quota_test_results(allowed boolean not null);
      grant insert on public.quota_test_results to service_role;`)
    sql(readFileSync('src/features/reports/database/009_tester_suggestion_quota.sql', 'utf8'))
    sql(readFileSync('src/features/reports/database/010_tester_suggestion_quota_five.sql', 'utf8'))
    expect(reserve(tester, 'tester').allowed).toBe(true)
    sql(readFileSync('src/features/reports/database/013_developer_question_quota.sql', 'utf8'))
  }, 60_000)
  afterAll(() => { if (started) docker(['stop', container]) }, 30_000)
  it('developerQuota_fifthAndSixth_admitsFiveThenDeniesWithPositiveWait', () => {
    for (let i = 0; i < 5; i++) expect(reserve(developer)).toEqual({ allowed: true, retryAfterMs: 0 })
    const sixth = reserve(developer)
    expect(sixth.allowed).toBe(false)
    expect(sixth.retryAfterMs).toBeGreaterThan(0)
    expect(sixth.retryAfterMs).toBeLessThanOrEqual(300_000)
  })
  it('developerQuota_fiveMinuteOldAttempt_expiresAndFreesOneSlot', () => {
    sql(`insert into public.developer_question_quotas values ('${expiry}', array[clock_timestamp() - interval '5 minutes', clock_timestamp(), clock_timestamp(), clock_timestamp(), clock_timestamp()]);`)
    expect(reserve(expiry)).toEqual({ allowed: true, retryAfterMs: 0 })
    expect(reserve(expiry).allowed).toBe(false)
  })
  it('developerQuota_tenConcurrentReservations_admitsExactlyFive', () => {
    docker(['exec', '-i', container, 'pgbench', '-n', '-c', '10', '-j', '5', '-t', '1', '-f', '/dev/stdin', '-U', 'postgres', '-d', 'postgres'],
      `set role service_role; insert into public.quota_test_results values ((public.reserve_developer_question_attempt('${concurrent}')->>'allowed')::boolean);`)
    expect(sql('select count(*), count(*) filter (where allowed) from public.quota_test_results;')).toBe('10|5')
  })
  it('developerQuota_ordinaryRolesAndWrongProfile_cannotReserveOrRead', () => {
    for (const role of ['anon', 'authenticated']) {
      expect(sql(`select has_function_privilege('${role}', 'public.reserve_developer_question_attempt(uuid)', 'execute'), has_table_privilege('${role}', 'public.developer_question_quotas', 'select');`)).toBe('f|f')
      expect(() => sql(`set role ${role}; select public.reserve_developer_question_attempt('${developer}');`)).toThrow()
      expect(() => sql(`set role ${role}; select * from public.developer_question_quotas;`)).toThrow()
    }
    expect(() => reserve(tester)).toThrow()
    expect(() => reserve('00000000-0000-0000-0000-000000000099')).toThrow()
  })
  it('developerQuota_migrationAndReservations_preserveTesterHistoryAndAllowance', () => {
    expect(sql(`select cardinality(attempts) from public.tester_suggestion_quotas where actor_id = '${tester}';`)).toBe('1')
    for (let i = 0; i < 4; i++) expect(reserve(tester, 'tester').allowed).toBe(true)
    expect(reserve(tester, 'tester').allowed).toBe(false)
    expect(() => reserve(developer, 'tester')).toThrow()
  })
})
