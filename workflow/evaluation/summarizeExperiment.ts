type Condition = 'broad' | 'routed'
type CheckStatus = 'passed' | 'failed' | 'skipped' | 'not_run'
type NullableNumber = number | null

interface Session {
  sessionId: string
  role: string
  inputTokens: NullableNumber
  cachedInputTokens: NullableNumber
  outputTokens: NullableNumber
  usageEvidence: string | null
}

interface Run {
  runId: string
  pairId: string
  taskId: string
  condition: Condition
  order: 1 | 2
  startingCommit: string
  instructionRevision: string
  modelSetup: string
  toolSetup: string
  acceptanceCheckSet: string
  evidence: string
  elapsedMs: NullableNumber
  humanReviewMs: NullableNumber
  repairRounds: number
  checks: { id: string; status: CheckStatus }[]
  sessions: Session[]
}

interface RunSummary {
  runId: string
  condition: Condition
  inputTokens: NullableNumber
  cachedInputTokens: NullableNumber
  uncachedInputTokens: NullableNumber
  outputTokens: NullableNumber
  totalTokens: NullableNumber
  accepted: boolean
  repairRounds: number
  elapsedMs: NullableNumber
  humanReviewMs: NullableNumber
}

interface PairSummary {
  pairId: string
  comparable: boolean
  reasons: string[]
  qualityMaintained: boolean
  inputReductionPercent: NullableNumber
  totalReductionPercent: NullableNumber
  elapsedReductionPercent: NullableNumber
}

interface ExperimentSummary {
  runs: RunSummary[]
  pairs: PairSummary[]
  warnings: string[]
}

function invalid(path: string, expected: string): never {
  throw new Error(`${path}: ${expected}`)
}

function object(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalid(path, 'expected an object')
  return value as Record<string, unknown>
}

function text(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim()) invalid(path, 'expected a nonempty string')
  return value
}

function list(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value) || value.length === 0) invalid(path, 'expected a nonempty array')
  return value
}

function number(value: unknown, path: string, integer = false, nullable = true): NullableNumber {
  if (value === null && nullable) return null
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0
    || (integer && !Number.isSafeInteger(value))) invalid(path, `expected a nonnegative ${integer ? 'safe integer' : 'finite number'}${nullable ? ' or null' : ''}`)
  return value
}

function unique(id: string, seen: Set<string>, path: string) {
  if (seen.has(id)) invalid(path, 'duplicate identifier')
  seen.add(id)
}

function parseRun(value: unknown, path: string, runIds: Set<string>, sessionIds: Set<string>): Run {
  const source = object(value, path)
  const identity = Object.fromEntries(['runId', 'pairId', 'taskId', 'startingCommit', 'instructionRevision',
    'modelSetup', 'toolSetup', 'acceptanceCheckSet', 'evidence'].map(key => [key, text(source[key], `${path}.${key}`)])) as Pick<Run,
      'runId' | 'pairId' | 'taskId' | 'startingCommit' | 'instructionRevision' | 'modelSetup' | 'toolSetup' | 'acceptanceCheckSet' | 'evidence'>
  unique(identity.runId, runIds, `${path}.runId`)
  if (source.condition !== 'broad' && source.condition !== 'routed') invalid(`${path}.condition`, 'expected broad or routed')
  if (source.order !== 1 && source.order !== 2) invalid(`${path}.order`, 'expected 1 or 2')
  const checkIds = new Set<string>()
  const checks = list(source.checks, `${path}.checks`).map((item, index) => {
    const checkPath = `${path}.checks[${index}]`
    const check = object(item, checkPath)
    const id = text(check.id, `${checkPath}.id`)
    unique(id, checkIds, `${checkPath}.id`)
    if (typeof check.status !== 'string' || !['passed', 'failed', 'skipped', 'not_run'].includes(check.status)) invalid(`${checkPath}.status`, 'expected passed, failed, skipped or not_run')
    return { id, status: check.status as CheckStatus }
  })
  const sessions = list(source.sessions, `${path}.sessions`).map((item, index): Session => {
    const sessionPath = `${path}.sessions[${index}]`
    const session = object(item, sessionPath)
    const sessionId = text(session.sessionId, `${sessionPath}.sessionId`)
    unique(sessionId, sessionIds, `${sessionPath}.sessionId`)
    const inputTokens = number(session.inputTokens, `${sessionPath}.inputTokens`, true)
    const cachedInputTokens = number(session.cachedInputTokens, `${sessionPath}.cachedInputTokens`, true)
    const outputTokens = number(session.outputTokens, `${sessionPath}.outputTokens`, true)
    if (cachedInputTokens !== null && (inputTokens === null || cachedInputTokens > inputTokens)) {
      invalid(`${sessionPath}.cachedInputTokens`, 'requires known inputTokens and cannot exceed them')
    }
    const usageKnown = inputTokens !== null || cachedInputTokens !== null || outputTokens !== null
    const usageEvidence = session.usageEvidence === null && !usageKnown ? null : text(session.usageEvidence, `${sessionPath}.usageEvidence`)
    return { sessionId, role: text(session.role, `${sessionPath}.role`), inputTokens, cachedInputTokens, outputTokens, usageEvidence }
  })
  return { ...identity, condition: source.condition, order: source.order, checks, sessions,
    repairRounds: number(source.repairRounds, `${path}.repairRounds`, true, false) as number,
    elapsedMs: number(source.elapsedMs, `${path}.elapsedMs`), humanReviewMs: number(source.humanReviewMs, `${path}.humanReviewMs`) }
}

function sum(values: NullableNumber[], path: string): NullableNumber {
  let total = 0
  for (const value of values) {
    if (value !== null) {
      total += value
      if (!Number.isSafeInteger(total)) invalid(path, 'token sum exceeds safe integer range')
    }
  }
  return values.includes(null) ? null : total
}

function summarizeRun(run: Run): RunSummary {
  const inputTokens = sum(run.sessions.map(session => session.inputTokens), `${run.runId}.inputTokens`)
  const cachedInputTokens = sum(run.sessions.map(session => session.cachedInputTokens), `${run.runId}.cachedInputTokens`)
  const outputTokens = sum(run.sessions.map(session => session.outputTokens), `${run.runId}.outputTokens`)
  return {
    runId: run.runId, condition: run.condition, inputTokens, cachedInputTokens, outputTokens,
    uncachedInputTokens: inputTokens === null || cachedInputTokens === null ? null : inputTokens - cachedInputTokens,
    totalTokens: sum([inputTokens, outputTokens], `${run.runId}.totalTokens`),
    accepted: run.checks.every(check => check.status === 'passed'), repairRounds: run.repairRounds,
    elapsedMs: run.elapsedMs, humanReviewMs: run.humanReviewMs,
  }
}

function reduction(broad: NullableNumber, routed: NullableNumber, allowed: boolean): NullableNumber {
  if (!allowed || broad === null || routed === null || broad === 0) return null
  const percent = (broad - routed) / broad * 100
  return Number.isFinite(percent) ? percent : null
}

function summarizePair(pairId: string, runs: Run[], summaries: Map<string, RunSummary>): PairSummary {
  const reasons: string[] = []
  const broad = runs.filter(run => run.condition === 'broad')
  const routed = runs.filter(run => run.condition === 'routed')
  if (runs.length !== 2 || broad.length !== 1 || routed.length !== 1) reasons.push('A pair requires exactly one broad run and one routed run.')
  const first = broad[0]
  const second = routed[0]
  if (first && second) {
    for (const field of ['taskId', 'startingCommit', 'modelSetup', 'toolSetup', 'acceptanceCheckSet'] as const) {
      if (first[field] !== second[field]) reasons.push(`Different ${field}.`)
    }
    const checkIds = (run: Run) => JSON.stringify(run.checks.map(check => check.id).sort())
    if (checkIds(first) !== checkIds(second)) reasons.push('Different acceptance check IDs.')
    if (first.order === second.order) reasons.push('The pair must use distinct run orders 1 and 2.')
  }
  const broadSummary = first ? summaries.get(first.runId) : undefined
  const routedSummary = second ? summaries.get(second.runId) : undefined
  const comparable = reasons.length === 0
  const qualityMaintained = comparable && Boolean(broadSummary?.accepted && routedSummary?.accepted)
  return { pairId, comparable, reasons, qualityMaintained,
    inputReductionPercent: reduction(broadSummary?.inputTokens ?? null, routedSummary?.inputTokens ?? null, qualityMaintained),
    totalReductionPercent: reduction(broadSummary?.totalTokens ?? null, routedSummary?.totalTokens ?? null, qualityMaintained),
    elapsedReductionPercent: reduction(broadSummary?.elapsedMs ?? null, routedSummary?.elapsedMs ?? null, qualityMaintained) }
}

/** Reports supplied observations; it does not run experiments or authenticate their evidence. */
export function summarizeExperiment(input: unknown): ExperimentSummary {
  const source = object(input, 'experiment')
  if (source.schemaVersion !== 1) invalid('experiment.schemaVersion', 'expected 1')
  text(source.experimentId, 'experiment.experimentId')
  const runIds = new Set<string>()
  const sessionIds = new Set<string>()
  const runs = list(source.runs, 'experiment.runs').map((run, index) => parseRun(run, `experiment.runs[${index}]`, runIds, sessionIds))
  const summaries = runs.map(summarizeRun)
  const summaryById = new Map(summaries.map(run => [run.runId, run]))
  const groups = new Map<string, Run[]>()
  for (const run of runs) groups.set(run.pairId, [...(groups.get(run.pairId) ?? []), run])
  return { runs: summaries, pairs: [...groups].map(([pairId, members]) => summarizePair(pairId, members, summaryById)), warnings: [
    'Small samples do not establish a general performance improvement; repeat matched tasks and counterbalance condition order across pairs.',
    'Supplied records and evidence references are not independently authenticated by this report.',
    'Token reductions are not measured credit or monetary savings. Include every agent and repair session; record actual charges separately.',
  ] }
}
