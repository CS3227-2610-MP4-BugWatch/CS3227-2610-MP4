/// <reference types="node" />
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

const enabled = process.env.EDIT_LOCAL_SQL_TESTS === 'true'
  && process.env.PROJECT_TEST_ISOLATED === 'true'
  && process.env.PROJECT_TEST_URL === 'https://127.0.0.1:55421'
const container = 'supabase_db_bugwatch-report-editing'
const quote = (value: string) => `'${value.replaceAll("'", "''")}'`
const uuid = () => randomUUID()

// Each connection is a real PostgreSQL session. Markers acknowledge completed SQL,
// while pg_blocking_pids establishes ordering before the competing transaction proceeds.
class Session {
  readonly name = `edit-race-${uuid()}`
  readonly child = spawn('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atq'])
  output = ''
  errors = ''
  inputErrors = ''
  closed = false
  readonly done: Promise<number | null>
  constructor() {
    this.child.stdout.on('data', chunk => { this.output += String(chunk) })
    this.child.stderr.on('data', chunk => { this.errors += String(chunk) })
    this.child.stdin.on('error', error => { this.inputErrors += String(error) })
    this.done = new Promise((resolve, reject) => {
      this.child.once('error', reject)
      this.child.once('close', code => { this.closed = true; resolve(code) })
    })
    this.send(`set application_name=${quote(this.name)}; set statement_timeout='15s'; set lock_timeout='12s';`)
  }
  private get acceptsInput() {
    return !this.closed && this.child.exitCode === null && this.child.signalCode === null
      && !this.child.stdin.destroyed && !this.child.stdin.writableEnded
  }
  send(sql: string) {
    if (!this.acceptsInput || this.inputErrors) throw new Error(`SQL input unavailable: ${this.inputErrors} ${this.errors}`)
    this.child.stdin.write(`${sql}\n`)
  }
  async execute(sql: string) {
    const marker = `done-${uuid()}`
    const offset = this.output.length
    this.send(`${sql}\nselect ${quote(marker)};`)
    const deadline = Date.now() + 18000
    while (!this.output.includes(marker)) {
      if (this.closed || this.inputErrors) throw new Error(`SQL session failed: ${this.errors} ${this.inputErrors}`)
      if (Date.now() > deadline) throw new Error('SQL acknowledgement deadline exceeded')
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    return this.output.slice(offset, this.output.indexOf(marker)).trim()
  }
  async finish(sql = '') {
    const acceptsInput = this.acceptsInput && !this.inputErrors
    if (acceptsInput) {
      if (sql) this.child.stdin.end(`${sql}\n`)
      else this.child.stdin.end()
    }
    const code = await this.done
    // ON_ERROR_STOP may close stdin before an expected SQL refusal is collected.
    // Keep that pipe diagnostic observable, and fail any apparently successful
    // session whose input was lost instead of accepting a false success.
    if (code === 0 && (this.inputErrors || (sql && !acceptsInput))) {
      throw new Error(`SQL input failed: ${this.inputErrors || 'Session closed before final SQL'} ${this.errors}`)
    }
    return { code, errors: this.errors, inputErrors: this.inputErrors, output: this.output }
  }
}

const sessions = new Set<Session>()
function session() { const value = new Session(); sessions.add(value); return value }
async function query(sql: string) {
  const connection = session()
  const output = await connection.execute(sql)
  const result = await connection.finish()
  expect(result.code, result.errors).toBe(0)
  return output
}
function actor(id: string) {
  return `set request.jwt.claims=${quote(JSON.stringify({ sub: id, role: 'authenticated' }))};`
}

describe.skipIf(!enabled)('isolated local SQL report edit concurrency', () => {
  let tester: string
  let developer: string
  let secondDeveloper: string
  const projects: string[] = []
  const reports: string[] = []
  beforeAll(async () => {
    const identity = (name: string) => {
      const value = process.env[name] ?? ''
      if (!/^[0-9a-f-]{36}$/i.test(value)) throw new Error(`Missing valid local fixture identity: ${name}`)
      return value
    }
    tester = identity('PROJECT_TEST_TESTER_ID')
    developer = identity('PROJECT_TEST_DEVELOPER_ID')
    secondDeveloper = identity('PROJECT_TEST_SECOND_DEVELOPER_ID')
    expect(await query(`select count(*) from public.profiles where (id=${quote(tester)} and role='tester') or (id in (${quote(developer)},${quote(secondDeveloper)}) and role='developer');`)).toBe('3')
  })
  afterEach(async () => {
    // Terminate sessions first so failed assertions cannot leave fixture locks behind.
    for (const connection of sessions) if (!connection.closed) {
      await connection.finish('rollback;')
    }
    if (reports.length) for (const table of ['report_edit_receipts', 'mailbox_items', 'report_comments', 'report_history', 'reports']) {
      await query(`delete from public.${table} where ${table === 'reports' ? 'id' : 'report_id'} in (${reports.map(quote).join(',')});`)
    }
    if (projects.length) for (const table of ['project_history', 'projects']) {
      await query(`delete from public.${table} where ${table === 'projects' ? 'id' : 'project_id'} in (${projects.map(quote).join(',')});`)
    }
    projects.length = 0; reports.length = 0; sessions.clear()
  }, 30000)
  async function fixture(state = 'Open', source?: string, destination?: string) {
    const s = source ?? uuid(); const d = destination ?? uuid(); const report = uuid()
    if (!source) {
      projects.push(s, d)
      await query(`insert into public.projects(id,name,description,repository_url,created_by) values
        (${quote(s)},${quote(`Race ${s}`)},'Fixture','https://example.test/repo',${quote(developer)}),
        (${quote(d)},${quote(`Race ${d}`)},'Fixture','https://example.test/repo',${quote(developer)});`)
    }
    reports.push(report)
    await query(`${actor(tester)} insert into public.reports(id,project_id,reporter_id,title,description,version,reproduction_steps,expected_results,actual_results,severity,test_environment,state,assigned_developer_id,assigned_at)
      values(${quote(report)},${quote(s)},${quote(tester)},'Original','Description','1','Steps','Expected','Actual','low','',${quote(state)},${state === 'Open' ? 'null' : quote(developer)},${state === 'Open' ? 'null' : 'clock_timestamp()'});`)
    return { s, d, report }
  }
  function edit(report: string, destination: string, title = 'Original') {
    const input = { projectId: destination, title, description: 'Description', version: '1', reproductionSteps: 'Steps', expectedResults: 'Expected', actualResults: 'Actual', severity: 'low', testEnvironment: '' }
    return `${actor(tester)} select public.edit_report(${quote(report)},${quote(JSON.stringify(input))}::jsonb,0,${quote(uuid())});`
  }
  async function blocked(waiter: Session, blocker: Session, includeQueuedWaiters = false) {
    const deadline = Date.now() + 8000
    while (Date.now() < deadline) {
      // A queued tuple-lock waiter can name another waiter rather than the row
      // owner. For inverse moves, prove the actual blocking graph reaches the
      // held barrier. UNION deduplicates PIDs even if a defect creates a cycle.
      const observed = await query(includeQueuedWaiters
        ? `with recursive blocking_chain(pid) as (
            select unnest(pg_blocking_pids(pid)) from pg_stat_activity
            where application_name=${quote(waiter.name)} and wait_event_type='Lock'
            union
            select unnest(pg_blocking_pids(pid)) from blocking_chain
          ) select exists(select 1 from blocking_chain c join pg_stat_activity b on b.pid=c.pid
            where b.application_name=${quote(blocker.name)});`
        : `select exists(select 1 from pg_stat_activity a join pg_stat_activity b on b.application_name=${quote(blocker.name)} where a.application_name=${quote(waiter.name)} and a.wait_event_type='Lock' and b.pid=any(pg_blocking_pids(a.pid)));`)
      if (observed === 't') return
      if (waiter.closed) throw new Error(`Expected blocked session exited: ${waiter.errors}`)
    }
    throw new Error('Required PostgreSQL blocking relationship was not observed')
  }
  async function snapshot(report: string) {
    return JSON.parse(await query(`select jsonb_build_object('report',(select to_jsonb(r) from public.reports r where id=${quote(report)}),
      'history',(select coalesce(jsonb_agg(to_jsonb(h) order by id),'[]') from public.report_history h where report_id=${quote(report)}),
      'comments',(select coalesce(jsonb_agg(to_jsonb(c) order by id),'[]') from public.report_comments c where report_id=${quote(report)}),
      'mailbox',(select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.mailbox_items m where report_id=${quote(report)}),
      'receipts',(select count(*) from public.report_edit_receipts where report_id=${quote(report)}));`))
  }
  const actions = [
    ['accept_report', 'Open'], ['start_report_investigation', 'Accepted'],
    ['await_tester_information', 'In progress'], ['resume_report_investigation', 'Awaiting tester information'],
    ['post_report_comment', 'Open'], ['resolve_report', 'In progress'], ['link_duplicate_report', 'Accepted'],
  ] as const
  it.each(actions)('%s_sourceReadBeforeMoveToArchivedDestination_refusesStaleActionWithoutWrites', async (action, state) => {
    const f = await fixture(state)
    const target = action === 'link_duplicate_report' ? await fixture('Open', f.s, f.d) : null
    const mover = session()
    await mover.execute(`begin; select id from public.projects where id=${quote(f.s)} for update;`)
    const stale = session()
    stale.send(`\\set VERBOSITY verbose\n${actor(action === 'post_report_comment' ? tester : developer)} select public.${action}(${quote(f.report)}${action === 'post_report_comment' ? `,'"Race comment"'::jsonb,null` : action === 'resolve_report' ? `,'{"kind":"invalid","explanation":"Race resolution"}'::jsonb` : action === 'link_duplicate_report' ? `,${quote(target!.report)},null` : ''});`)
    await blocked(stale, mover)
    await mover.execute(`${edit(f.report, f.d)} update public.projects set archived_at=clock_timestamp() where id=${quote(f.d)};`)
    const moveResult = await mover.finish('commit;')
    expect(moveResult.code, moveResult.errors).toBe(0)
    const moved = await snapshot(f.report)
    const result = await stale.finish()
    expect(result.code).not.toBe(0)
    expect(result.errors).toContain('P2007')
    expect(await snapshot(f.report)).toEqual(moved)
    expect(moved.report).toMatchObject({ project_id: f.d, state, assigned_developer_id: state === 'Open' ? null : developer })
    expect(moved.history).toHaveLength(1)
    expect(moved.history[0].event).toBe('report_edited')
    expect(moved.comments).toHaveLength(0)
    expect(moved.mailbox).toHaveLength(state === 'Open' ? 0 : 1)
    expect(moved.receipts).toBe(1)
  }, 30000)
  it.each(['source', 'destination'])('editReport_%sArchivesWhileEditWaits_refusesEntireMove', async side => {
    const f = await fixture()
    const before = await snapshot(f.report)
    const archive = session()
    const project = side === 'source' ? f.s : f.d
    await archive.execute(`begin; select id from public.projects where id=${quote(project)} for update;`)
    const editor = session()
    editor.send(`\\set VERBOSITY verbose\n${edit(f.report, f.d)}`)
    await blocked(editor, archive)
    const archiveResult = await archive.finish(`update public.projects set archived_at=clock_timestamp() where id=${quote(project)}; commit;`)
    expect(archiveResult.code, archiveResult.errors).toBe(0)
    const result = await editor.finish()
    expect(result.code).not.toBe(0)
    expect(result.errors).toContain('P2004')
    expect(await snapshot(f.report)).toEqual(before)
  }, 30000)
  it('editReport_inverseMovesWaitingOnSameProject_bothCommitWithoutDeadlock', async () => {
    const first = await fixture()
    const second = await fixture('Open', first.d, first.s)
    const barrier = session()
    await barrier.execute(`begin; select id from public.projects where id=${quote([first.s, first.d].sort()[0])} for update;`)
    const a = session(); const b = session()
    a.send(edit(first.report, first.d)); b.send(edit(second.report, second.d))
    await blocked(a, barrier, true); await blocked(b, barrier, true)
    expect((await barrier.finish('commit;')).code).toBe(0)
    const results = await Promise.all([a.finish(), b.finish()])
    for (const result of results) expect(result.code, result.errors).toBe(0)
    for (const f of [first, second]) {
      const after = await snapshot(f.report)
      expect(after.report.project_id).toBe(f.d)
      expect(after.history).toHaveLength(1)
      expect(after.receipts).toBe(1)
      expect(after.mailbox).toHaveLength(0)
    }
  }, 30000)
  it.each(['source', 'target'] as const)('linkDuplicate_commitsBefore%sMove_refusesMoveWithoutPartialWrites', async endpoint => {
    const source = await fixture('Accepted')
    const target = await fixture('Open', source.s, source.d)
    const moving = endpoint === 'source' ? source : target
    const linker = session()
    await linker.execute(`begin; select id from public.projects where id=${quote(source.s)} for update;`)
    const editor = session()
    editor.send(`\\set VERBOSITY verbose\n${edit(moving.report, moving.d)}`)
    await blocked(editor, linker)
    await linker.execute(`${actor(developer)} select public.link_duplicate_report(${quote(source.report)},${quote(target.report)},null);`)
    const beforeSource = await snapshot(source.report)
    // Uncommitted link is intentionally invisible to this observer.
    expect(beforeSource.report.canonical_report_id).toBeNull()
    expect((await linker.finish('commit;')).code).toBe(0)
    const committedSource = await snapshot(source.report)
    const committedTarget = await snapshot(target.report)
    const result = await editor.finish()
    expect(result.code).not.toBe(0)
    expect(result.errors).toContain('P2011')
    expect(await snapshot(source.report)).toEqual(committedSource)
    expect(await snapshot(target.report)).toEqual(committedTarget)
    expect(committedSource.report.canonical_report_id).toBe(target.report)
    expect(committedSource.history.map((entry: { event: string }) => entry.event)).toEqual(['duplicate_linked'])
  }, 30000)
  it('linkDuplicate_targetMovesBeforeLink_refusesCrossProjectLinkWithoutWrites', async () => {
    const source = await fixture('Accepted')
    const target = await fixture('Open', source.s, source.d)
    const mover = session()
    await mover.execute(`begin; select id from public.projects where id=${quote(source.s)} for update;`)
    const linker = session()
    linker.send(`\\set VERBOSITY verbose\n${actor(developer)} select public.link_duplicate_report(${quote(source.report)},${quote(target.report)},null);`)
    await blocked(linker, mover)
    expect((await mover.finish(`${edit(target.report, target.d)} commit;`)).code).toBe(0)
    const beforeSource = await snapshot(source.report)
    const beforeTarget = await snapshot(target.report)
    const result = await linker.finish()
    expect(result.code).not.toBe(0)
    expect(result.errors).toContain('P2003')
    expect(await snapshot(source.report)).toEqual(beforeSource)
    expect(await snapshot(target.report)).toEqual(beforeTarget)
    expect(beforeTarget.report.project_id).toBe(target.d)
    expect(beforeSource.report.canonical_report_id).toBeNull()
  }, 30000)
  it('editReport_assignmentCommitsWhileEditWaits_notifiesCurrentAssignedDeveloper', async () => {
    const f = await fixture()
    const assignment = session()
    await assignment.execute(`begin; select id from public.projects where id=${quote(f.s)} for update;`)
    const editor = session()
    editor.send(edit(f.report, f.s, 'Edited after assignment'))
    await blocked(editor, assignment)
    expect((await assignment.finish(`${actor(secondDeveloper)} select public.accept_report(${quote(f.report)}); commit;`)).code).toBe(0)
    const result = await editor.finish()
    expect(result.code, result.errors).toBe(0)
    const after = await snapshot(f.report)
    expect(after.report).toMatchObject({ title: 'Edited after assignment', assigned_developer_id: secondDeveloper, state: 'Accepted' })
    expect(after.history.map((entry: { event: string }) => entry.event).sort()).toEqual(['accepted', 'report_edited'])
    expect(after.mailbox).toHaveLength(1)
    expect(after.mailbox[0].recipient_id).toBe(secondDeveloper)
    expect(after.receipts).toBe(1)
  }, 30000)
})
