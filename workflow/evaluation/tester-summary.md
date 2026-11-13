# Workflow evaluation publication — Test Summary

This summary covers verification of the existing workflow helper and its 61 tests, accepted as `WF-HELPER-VERIFY-1` and `WF-HELPER-COVERAGE-1`. The coordinator confirmed independent approval of these submissions and combined `DOCS-PUBLICATION-1`. No feature plan revision applies to this documentation and publication task. The tester made no source or test edits.

## Test Design and Requirement Coverage

Equivalence partitioning groups inputs or states expected to behave alike. Boundary testing checks the edges of allowed ranges. The existing tests exercise supplied records and local CLI processes; they do not measure agents or authenticate evidence. Requirements come from [the evaluation protocol](../instructions/workflow-evaluation.md). All names below are in [workflow-evaluation.test.ts](../../src/test/workflow-evaluation.test.ts).

| Requirement or risk | Input/state groups and why | Boundaries and negative cases | Expected behavior | Test source and exact names/family | Level and actual status |
| --- | --- | --- | --- | --- | --- |
| Count all sessions without duplicating cached input. | Initial and repair sessions contain separate observations. | Cached input is a subset of total input. | Aggregate every session and compute total as input plus output. | `summarizeExperiment_multipleAgentsAndRepairSession_countsEverySessionWithoutAddingCachedInputTwice` | Pure logic: Passed. |
| Preserve unknown metrics. | Known, partially known and unmetered sessions differ. | Null differs from observed zero. | Keep unknown aggregates null and preserve independent known metrics. | `summarizeExperiment_unknownCachedInput_keepsKnownInputAndOutputButDoesNotInventUncachedUsage`; `summarizeExperiment_oneUnmeteredSession_doesNotReportPartialTotalsAsCompleteUsage`; `summarizeExperiment_unknownOutput_preservesInputAndWithholdsOnlyUnknownTokenReduction`; `summarizeExperiment_unknownTiming_doesNotSubstituteZero` | Pure logic: Passed. |
| Handle metric boundaries. | Zero, positive and increased routed usage differ. | Zero baseline; negative, fractional, nonfinite and unsafe token counts; aggregate overflow. | Avoid infinite percentages, report negative reductions and reject invalid counters. | `summarizeExperiment_observedZeroBaseline_preservesZeroAndAvoidsInfinitePercentage`; `summarizeExperiment_routedUsageIncreases_reportsNegativeReduction`; `summarizeExperiment_invalidInputTokens%j_throwsWithFieldContext`; `summarizeExperiment_sumBeyondSafeInteger_rejectsInexactTotals` | Pure logic: Passed. |
| Withhold improvements without acceptance. | Passed, failed, skipped and not-run checks differ. | Separate cases cover routed failures and broad failure. Numeric boundaries are N/A for statuses. | Preserve runs and suppress all reduction fields when quality is unestablished. | `summarizeExperiment_routedCheck%s_retainsRunButWithholdsImprovement`; `summarizeExperiment_broadAcceptanceFails_doesNotClaimEqualQualityFromCandidateSuccess` | Pure logic: Passed. |
| Require matching comparison controls. | Matching and mismatching task, start, model, tools and check identities differ. | Missing or duplicate conditions and equal run orders are separate cases. | Reject uncontrolled comparisons while retaining records; accept equivalent reordered checks and reversed condition order. | `summarizeExperiment_different%s_rejectsComparisonWithoutDiscardingRuns`; `summarizeExperiment_differentActualCheckIds_withholdsComparisonEvenWhenCheckSetLabelMatches`; `sameCheckIdsInDifferentOrder`, `routedConditionFirst`, `sameRunOrder`, `missingCondition` and `duplicateConditionWithUniqueIds` families | Pure logic: Passed. |
| Reject unsupported records. | Supported evidence differs from missing evidence, duplicate identities and malformed records. | Cache above input or without known input; negative metrics; blank controls; empty lists. | Throw contextual errors instead of reporting misleading totals. | `cachedInputExceedsInput`, `cachedInputWithoutKnownInput`, `knownUsageWithoutEvidence%j`, `duplicateSessionAcrossRuns`, `duplicateRunIds`, `duplicateCheckIdsWithinRun`, `negative%s`, `malformedEnvelope%j`, `blank%s` and `empty%s` families | Pure logic: Passed. |
| Provide local reporting with clear failures. | Valid sample, missing argument and invalid record are distinct states. | N/A for numeric boundaries; each failure has its own test. | Print parseable JSON on success; return nonzero with stderr and no report on failure. | `reportExperiment_syntheticExample_writesParseableReportWithoutExternalServices`; `reportExperiment_missingArgument_returnsNonzeroAndExplainsUsage`; `reportExperiment_invalidExperimentFile_returnsNonzeroInsteadOfPrintingMisleadingReport` | Local subprocess: Passed. |
| Preserve evidence and explain limits. | Valid records and a small synthetic sample require explicit handling. | N/A: no numeric acceptance edge applies. | Leave records unchanged and retain nonempty evidence warnings. | `summarizeExperiment_validInput_doesNotMutateEvidenceRecords`; `summarizeExperiment_singleSyntheticPair_warnsAboutEvidenceLimits` | Pure logic: Passed. |

Persistent storage, browser state and request races are N/A because the helper reads supplied records without a database or application UI. Session roles and repair sessions are included in the accounting fixture.

## Line and Branch Coverage

Line coverage measures executable lines run by tests. Branch coverage measures decision outcomes exercised. The agreed scope was only `summarizeExperiment.ts`, with at least 80% lines and 80% branches per file. These measures do not establish assertion quality or complete requirements.

| Production file | Lines covered/total and % | Branches covered/total and % | Uncovered locations and behavior | Target outcome or accepted exception |
| --- | --- | --- | --- | --- |
| [summarizeExperiment.ts](summarizeExperiment.ts) | 83/83; 100% | 106/113; 93.8% | Lines 100, 101, 108, 136, 158, 176 and 183 include invalid condition/order/status rejection and additional overflow, finite-percentage and missing-broad-run paths. | Both targets met. |
| [report-experiment.js](report-experiment.js) | Not measured. | Not measured. | Child-process execution was outside in-process instrumentation. | Independent reviewer accepted the exception based on three passing CLI behavior tests. |

The exact command was:

```sh
npm run test:coverage -- --run src/test/workflow-evaluation.test.ts --coverage.include=workflow/evaluation/summarizeExperiment.ts --coverage.thresholds.perFile --coverage.thresholds.lines=80 --coverage.thresholds.branches=80 --maxWorkers=2
```

V8 with Vitest 5.0.5 instrumented the explicit helper include, retaining exclusions `src/test/**` and `**/*.d.ts`. [coverage-summary.json](coverage-summary.json) preserves counts; [coverage-evidence.json](coverage-evidence.json) preserves the command and dirty-source SHA-256 `f03edd6e58cc47354defe3ec8552a4f1e55f9ea1fd3e7a31c0132209addc69ec`. Generated HTML and detailed JSON were written under ignored `coverage/`. Validation tests above cover allowed and rejected accounting records. Permissions, database policies and browser recovery are N/A for this local reporter.

## Files Added

The publication includes the existing [src/test/workflow-evaluation.test.ts](../../src/test/workflow-evaluation.test.ts), which was previously untracked. The tester did not create it during this assignment.

## Files Changed

None. Verification required no test or implementation corrections.

## Test Cases Added

The publication includes 61 existing cases covering the named families above. No additional cases were authored during this assignment.

## Test Cases Changed

None. Existing assertions were preserved.

## Execution Evidence and Limits

| Exact command/check and revision | Passed | Failed | Skipped | Not run | Evidence and what it establishes |
| --- | --- | --- | --- | --- | --- |
| `npm run test -- --run src/test/workflow-evaluation.test.ts`, existing dirty source identified above | 61 | 0 | 0 | None in selected file. | Tester observed Vitest 5.0.5 exit 0. |
| Scoped coverage command above, same helper source | 61 | 0 | 0 | CLI instrumentation. | Tester observed exit 0; saved coverage records establish the measured scope. |
| `node workflow/evaluation/report-experiment.js workflow/evaluation/example-experiment.json`, Node v24.19.0 | N/A | 0 | N/A | External services and agent experiments. | Tester observed exit 0 and JSON with two runs, one pair and three warnings. |
| `npm run test -- --run`, coordinator-reported initial parallel run | 1181 | 2 | 251 | N/A | Developer-question UI abort assertion and local API 5000 ms timeout failed. Resource contention was not established as the cause. |
| `npm run test -- --run --maxWorkers=2`, coordinator-reported final run | 1183 | 0 | 251 | Skipped cases remain unverified. | Coordinator reported 52.7 seconds and reviewer assessed the combined state. |
| `npm run lint` and `npm run build`, coordinator-reported checks | N/A | 0 | N/A | Browser and database checks. | Coordinator reported success with existing warnings. |

No new application input boundaries or runtime behavior were implemented. Synthetic fixtures establish reporter behavior only; they do not prove agent performance, lower charges or authenticated evidence. Seeded-defect testing was Not run. The coordinator owns the final documentation build and publication checks.
