/// <reference types="node" />
// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { summarizeExperiment } from '../../workflow/evaluation/summarizeExperiment'

type Session = {
  sessionId: string
  role: string
  inputTokens: number | null
  cachedInputTokens: number | null
  outputTokens: number | null
  usageEvidence: string | null
}
type Check = { id: string; status: 'passed' | 'failed' | 'skipped' | 'not_run' }
type Run = {
  runId: string
  pairId: string
  taskId: string
  condition: 'broad' | 'routed'
  order: 1 | 2
  startingCommit: string
  instructionRevision: string
  modelSetup: string
  toolSetup: string
  acceptanceCheckSet: string
  evidence: string
  elapsedMs: number | null
  humanReviewMs: number | null
  repairRounds: number
  checks: Check[]
  sessions: Session[]
}

function run(condition: Run['condition']): Run {
  return {
    runId: `synthetic-${condition}`, pairId: 'synthetic-task-repeat-1', taskId: 'synthetic-repair', condition,
    order: condition === 'broad' ? 1 : 2, startingCommit: 'fixed-start', instructionRevision: `${condition}-instructions`,
    modelSetup: 'same-model-and-effort', toolSetup: 'same-tool-versions', acceptanceCheckSet: 'frozen-checks-v1',
    evidence: 'Synthetic fixture; not a measured agent experiment.', elapsedMs: condition === 'broad' ? 10_000 : 8_000,
    humanReviewMs: condition === 'broad' ? 1_000 : 700, repairRounds: 0,
    checks: [{ id: 'correct-result', status: 'passed' }, { id: 'preserves-failure-handling', status: 'passed' }],
    sessions: [{ sessionId: `synthetic-${condition}-implementer`, role: 'implementer',
      inputTokens: condition === 'broad' ? 1_000 : 600, cachedInputTokens: condition === 'broad' ? 600 : 400,
      outputTokens: condition === 'broad' ? 100 : 80, usageEvidence: 'Synthetic fixture usage.' }],
  }
}

function experiment(runs = [run('broad'), run('routed')]) {
  return { schemaVersion: 1, experimentId: 'synthetic-comparison', runs }
}

function expectWithheld(pair: ReturnType<typeof summarizeExperiment>['pairs'][number]) {
  expect(pair.inputReductionPercent).toBeNull()
  expect(pair.totalReductionPercent).toBeNull()
  expect(pair.elapsedReductionPercent).toBeNull()
}

describe('experiment token accounting', () => {
  it('summarizeExperiment_multipleAgentsAndRepairSession_countsEverySessionWithoutAddingCachedInputTwice', () => {
    const input = experiment()
    input.runs[0].repairRounds = 1
    input.runs[0].sessions.push({ sessionId: 'synthetic-broad-repair', role: 'reviewer', inputTokens: 200,
      cachedInputTokens: 50, outputTokens: 40, usageEvidence: 'Synthetic repair-session usage.' })
    const result = summarizeExperiment(input)
    expect(result.runs[0]).toMatchObject({ runId: 'synthetic-broad', condition: 'broad', inputTokens: 1_200,
      cachedInputTokens: 650, uncachedInputTokens: 550, outputTokens: 140, totalTokens: 1_340,
      accepted: true, repairRounds: 1, elapsedMs: 10_000, humanReviewMs: 1_000 })
    expect(result.pairs[0]).toMatchObject({ comparable: true, qualityMaintained: true, inputReductionPercent: 50,
      elapsedReductionPercent: 20 })
    expect(result.pairs[0].totalReductionPercent).toBeCloseTo((1_340 - 680) / 1_340 * 100)
  })

  it('summarizeExperiment_unknownCachedInput_keepsKnownInputAndOutputButDoesNotInventUncachedUsage', () => {
    const input = experiment()
    input.runs[0].sessions[0].cachedInputTokens = null
    expect(summarizeExperiment(input).runs[0]).toMatchObject({ inputTokens: 1_000, cachedInputTokens: null,
      uncachedInputTokens: null, outputTokens: 100, totalTokens: 1_100 })
  })

  it('summarizeExperiment_oneUnmeteredSession_doesNotReportPartialTotalsAsCompleteUsage', () => {
    const input = experiment()
    input.runs[0].sessions.push({ sessionId: 'synthetic-unknown-review', role: 'reviewer', inputTokens: null,
      cachedInputTokens: null, outputTokens: null, usageEvidence: null })
    const result = summarizeExperiment(input)
    expect(result.runs[0]).toMatchObject({ inputTokens: null, cachedInputTokens: null,
      uncachedInputTokens: null, outputTokens: null, totalTokens: null })
    expect(result.pairs[0].inputReductionPercent).toBeNull()
    expect(result.pairs[0].totalReductionPercent).toBeNull()
    expect(result.pairs[0].elapsedReductionPercent).toBe(20)
  })

  it('summarizeExperiment_unknownOutput_preservesInputAndWithholdsOnlyUnknownTokenReduction', () => {
    const input = experiment()
    input.runs[1].sessions[0].outputTokens = null
    const result = summarizeExperiment(input)
    expect(result.runs[1]).toMatchObject({ inputTokens: 600, cachedInputTokens: 400,
      uncachedInputTokens: 200, outputTokens: null, totalTokens: null })
    expect(result.pairs[0].inputReductionPercent).toBe(40)
    expect(result.pairs[0].totalReductionPercent).toBeNull()
  })

  it('summarizeExperiment_observedZeroBaseline_preservesZeroAndAvoidsInfinitePercentage', () => {
    const input = experiment()
    input.runs[0].sessions[0] = { ...input.runs[0].sessions[0], inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 }
    input.runs[0].elapsedMs = 0
    input.runs[0].humanReviewMs = 0
    const result = summarizeExperiment(input)
    expect(result.runs[0]).toMatchObject({ inputTokens: 0, cachedInputTokens: 0, uncachedInputTokens: 0,
      outputTokens: 0, totalTokens: 0, elapsedMs: 0, humanReviewMs: 0 })
    expectWithheld(result.pairs[0])
    expect(JSON.stringify(result)).not.toMatch(/NaN|Infinity/)
  })

  it('summarizeExperiment_routedUsageIncreases_reportsNegativeReduction', () => {
    const input = experiment()
    input.runs[1].sessions[0].inputTokens = 1_500
    expect(summarizeExperiment(input).pairs[0].inputReductionPercent).toBe(-50)
  })

  it('summarizeExperiment_validInput_doesNotMutateEvidenceRecords', () => {
    const input = experiment()
    const before = structuredClone(input)
    summarizeExperiment(input)
    expect(input).toEqual(before)
  })
})

describe('experiment acceptance and comparison controls', () => {
  it.each(['failed', 'skipped', 'not_run'] as const)('summarizeExperiment_routedCheck%s_retainsRunButWithholdsImprovement', status => {
    const input = experiment()
    input.runs[1].checks[0].status = status
    const result = summarizeExperiment(input)
    expect(result.runs[1].accepted).toBe(false)
    expect(result.pairs[0]).toMatchObject({ comparable: true, qualityMaintained: false })
    expectWithheld(result.pairs[0])
  })

  it('summarizeExperiment_broadAcceptanceFails_doesNotClaimEqualQualityFromCandidateSuccess', () => {
    const input = experiment()
    input.runs[0].checks[0].status = 'failed'
    const result = summarizeExperiment(input)
    expect(result.runs[0].accepted).toBe(false)
    expect(result.runs[1].accepted).toBe(true)
    expect(result.pairs[0].qualityMaintained).toBe(false)
    expectWithheld(result.pairs[0])
  })

  it.each(['taskId', 'startingCommit', 'modelSetup', 'toolSetup', 'acceptanceCheckSet'] as const)(
    'summarizeExperiment_different%s_rejectsComparisonWithoutDiscardingRuns', field => {
      const input = experiment()
      input.runs[1][field] = `different-${field}`
      const result = summarizeExperiment(input)
      expect(result.runs).toHaveLength(2)
      expect(result.pairs[0].comparable).toBe(false)
      expect(result.pairs[0].reasons.length).toBeGreaterThan(0)
      expectWithheld(result.pairs[0])
    })

  it('summarizeExperiment_differentActualCheckIds_withholdsComparisonEvenWhenCheckSetLabelMatches', () => {
    const input = experiment()
    input.runs[1].checks[0].id = 'different-check'
    const pair = summarizeExperiment(input).pairs[0]
    expect(pair.comparable).toBe(false)
    expect(pair.reasons.length).toBeGreaterThan(0)
    expectWithheld(pair)
  })

  it('summarizeExperiment_sameCheckIdsInDifferentOrder_acceptsEquivalentCheckSet', () => {
    const input = experiment()
    input.runs[1].checks.reverse()
    expect(summarizeExperiment(input).pairs[0].comparable).toBe(true)
  })

  it('summarizeExperiment_routedConditionFirst_acceptsDistinctRunOrderAndDifferentInstructionRevision', () => {
    const input = experiment()
    input.runs[0].order = 2
    input.runs[1].order = 1
    expect(summarizeExperiment(input).pairs[0]).toMatchObject({ comparable: true, qualityMaintained: true })
  })

  it('summarizeExperiment_sameRunOrder_marksPairIncomparable', () => {
    const input = experiment()
    input.runs[1].order = 1
    const pair = summarizeExperiment(input).pairs[0]
    expect(pair.comparable).toBe(false)
    expectWithheld(pair)
  })

  it('summarizeExperiment_missingCondition_retainsIncompletePairWithoutReduction', () => {
    const pair = summarizeExperiment(experiment([run('broad')])).pairs[0]
    expect(pair.comparable).toBe(false)
    expect(pair.reasons.length).toBeGreaterThan(0)
    expectWithheld(pair)
  })

  it('summarizeExperiment_duplicateConditionWithUniqueIds_marksPairIncomparable', () => {
    const broad = run('broad')
    broad.runId = 'synthetic-second-broad'
    broad.sessions[0].sessionId = 'synthetic-second-broad-session'
    broad.order = 2
    const pair = summarizeExperiment(experiment([run('broad'), broad])).pairs[0]
    expect(pair.comparable).toBe(false)
    expectWithheld(pair)
  })

  it('summarizeExperiment_unknownTiming_doesNotSubstituteZero', () => {
    const input = experiment()
    input.runs[1].elapsedMs = null
    input.runs[1].humanReviewMs = null
    const result = summarizeExperiment(input)
    expect(result.runs[1]).toMatchObject({ elapsedMs: null, humanReviewMs: null })
    expect(result.pairs[0].elapsedReductionPercent).toBeNull()
    expect(result.pairs[0].inputReductionPercent).toBe(40)
  })

  it('summarizeExperiment_singleSyntheticPair_warnsAboutEvidenceLimits', () => {
    const result = summarizeExperiment(experiment())
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings.every(value => typeof value === 'string' && value.trim().length > 0)).toBe(true)
  })
})

describe('experiment record validation', () => {
  it.each([-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'summarizeExperiment_invalidInputTokens%j_throwsWithFieldContext', value => {
      const input = experiment()
      input.runs[0].sessions[0].inputTokens = value
      expect(() => summarizeExperiment(input)).toThrow(/inputTokens|sessions/i)
    })

  it.each(['cachedInputTokens', 'outputTokens'] as const)('summarizeExperiment_negative%s_rejectsInvalidCounter', field => {
    const input = experiment()
    input.runs[0].sessions[0][field] = -1
    expect(() => summarizeExperiment(input)).toThrow(new RegExp(`${field}|sessions`, 'i'))
  })

  it('summarizeExperiment_cachedInputExceedsInput_rejectsImpossibleAccounting', () => {
    const input = experiment()
    input.runs[0].sessions[0].cachedInputTokens = 1_001
    expect(() => summarizeExperiment(input)).toThrow(/cache|inputTokens|sessions/i)
  })

  it('summarizeExperiment_cachedInputWithoutKnownInput_rejectsUnverifiableSubset', () => {
    const input = experiment()
    input.runs[0].sessions[0].inputTokens = null
    expect(() => summarizeExperiment(input)).toThrow(/cache|inputTokens|sessions/i)
  })

  it.each([null, '', '   '])('summarizeExperiment_knownUsageWithoutEvidence%j_rejectsUnsupportedCounters', usageEvidence => {
    const input = experiment()
    input.runs[0].sessions[0].usageEvidence = usageEvidence
    expect(() => summarizeExperiment(input)).toThrow(/usageEvidence|evidence|sessions/i)
  })

  it('summarizeExperiment_duplicateSessionAcrossRuns_preventsDoubleCounting', () => {
    const input = experiment()
    input.runs[1].sessions[0].sessionId = input.runs[0].sessions[0].sessionId
    expect(() => summarizeExperiment(input)).toThrow(/session|duplicate/i)
  })

  it('summarizeExperiment_duplicateRunIds_rejectsAmbiguousEvidence', () => {
    const input = experiment()
    input.runs[1].runId = input.runs[0].runId
    expect(() => summarizeExperiment(input)).toThrow(/runId|duplicate/i)
  })

  it('summarizeExperiment_duplicateCheckIdsWithinRun_rejectsInflatedAcceptance', () => {
    const input = experiment()
    input.runs[0].checks[1].id = input.runs[0].checks[0].id
    expect(() => summarizeExperiment(input)).toThrow(/checks|duplicate/i)
  })

  it('summarizeExperiment_sumBeyondSafeInteger_rejectsInexactTotals', () => {
    const input = experiment()
    input.runs[0].sessions[0].inputTokens = Number.MAX_SAFE_INTEGER
    input.runs[0].sessions.push({ ...input.runs[0].sessions[0], sessionId: 'synthetic-overflow', inputTokens: 1 })
    expect(() => summarizeExperiment(input)).toThrow(/safe|overflow|tokens/i)
  })

  it.each(['elapsedMs', 'humanReviewMs', 'repairRounds'] as const)('summarizeExperiment_negative%s_rejectsInvalidMetric', field => {
    const input = experiment()
    input.runs[0][field] = -1
    expect(() => summarizeExperiment(input)).toThrow(new RegExp(field, 'i'))
  })

  it.each([
    null, {}, { schemaVersion: 2, experimentId: 'synthetic', runs: [] },
    { schemaVersion: 1, experimentId: 'synthetic', runs: [] },
  ])('summarizeExperiment_malformedEnvelope%j_rejectsWithoutProducingReport', input => {
    expect(() => summarizeExperiment(input)).toThrow()
  })

  it.each(['runId', 'pairId', 'taskId', 'startingCommit', 'instructionRevision', 'modelSetup', 'toolSetup', 'acceptanceCheckSet', 'evidence'] as const)(
    'summarizeExperiment_blank%s_rejectsMissingControlOrEvidence', field => {
      const input = experiment()
      input.runs[0][field] = '  '
      expect(() => summarizeExperiment(input)).toThrow(new RegExp(field, 'i'))
    })

  it.each(['checks', 'sessions'] as const)('summarizeExperiment_empty%s_rejectsVacuousEvidence', field => {
    const input = experiment()
    input.runs[0][field] = []
    expect(() => summarizeExperiment(input)).toThrow(new RegExp(field, 'i'))
  })
})

describe('experiment reporting CLI', () => {
  const cli = fileURLToPath(new URL('../../workflow/evaluation/report-experiment.js', import.meta.url))
  const sample = fileURLToPath(new URL('../../workflow/evaluation/example-experiment.json', import.meta.url))

  it('reportExperiment_syntheticExample_writesParseableReportWithoutExternalServices', () => {
    const result = spawnSync(process.execPath, [cli, sample], { encoding: 'utf8', timeout: 10_000 })
    expect(result.error).toBeUndefined()
    expect(result.status).toBe(0)
    const output = JSON.parse(result.stdout) as { runs: unknown[]; pairs: unknown[]; warnings: string[] }
    expect(output.runs.length).toBeGreaterThan(0)
    expect(output.pairs.length).toBeGreaterThan(0)
    expect(output.warnings.length).toBeGreaterThan(0)
  })

  it('reportExperiment_missingArgument_returnsNonzeroAndExplainsUsage', () => {
    const result = spawnSync(process.execPath, [cli], { encoding: 'utf8', timeout: 10_000 })
    expect(result.error).toBeUndefined()
    expect(result.status).not.toBe(0)
    expect(result.stderr.trim()).not.toBe('')
    expect(result.stdout.trim()).toBe('')
  })

  it('reportExperiment_invalidExperimentFile_returnsNonzeroInsteadOfPrintingMisleadingReport', () => {
    const invalidRecord = fileURLToPath(new URL('../../package.json', import.meta.url))
    const result = spawnSync(process.execPath, [cli, invalidRecord], { encoding: 'utf8', timeout: 10_000 })
    expect(result.error).toBeUndefined()
    expect(result.status).not.toBe(0)
    expect(result.stderr.trim()).not.toBe('')
    expect(result.stdout.trim()).toBe('')
  })
})
