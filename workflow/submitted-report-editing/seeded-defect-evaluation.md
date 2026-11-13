# Seeded defect evaluation

Submission **EDIT-TEST-EFFECTIVENESS-1**, feature plan revision 5, is awaiting independent reviewer approval. This evaluates task 4.4 only. Two deliberately introduced defects were detected by the two selected existing UI tests. This result applies to these defects and tests; it does not estimate the suite's general defect detection rate.

## Scope and method

The coordinator declared both mutations and their target tests before execution. Each mutation changed exactly one occurrence in a disposable Windows Temp copy. The helper copied `src/`, `api/`, `package.json` and `vitest.config.ts`, then created a `node_modules` junction to the repository's existing dependencies. It did not install packages or copy environment files. The child test process received a small operating-system environment without application credentials. The selected tests use jsdom and mocked repositories. No live API, model, hosted service or database was called.

Both selected tests ran with the same command, test filter and two-worker limit at every stage. Each mutated TSX file passed TypeScript's syntax transpilation check before its test run. The helper required exactly one failing selected test and one passing selected test for each mutant. It restored the first file before introducing the second mutation. Both files were restored before the final baseline. The temporary copy was retained; no recursive deletion was performed.

The completed run used Node 24.19.0 and project-local Vitest 5.0.5. Its retained evidence directory is `C:\Users\jonat\AppData\Local\Temp\bugwatch-edit-effectiveness-IDFPMB`. The ignored helper and machine-readable run summary are `runtime.local/mutation-check.mjs` and `runtime.local/mutation-evidence.json`.

## Declared defects and observable checks

| ID | Exact temporary mutation | Existing test | Observable result |
| --- | --- | --- | --- |
| M1 | In `src/features/reports/ReportEditPage.tsx`, replace `revision.current = reason.severityConflict.latestSeverityRevision` with `revision.current = state.report.severityRevision`. | `reportEdit_severityABAAndRepeatedChange_retainsInputAndRequiresEachExplicitRetry` | The test requires save requests to use observed revisions `[0, 2, 4]` after repeated conflicts. The mutant sent `[0, 0, 0]`, causing the intended equality assertion to fail at test line 111. |
| M2 | In `src/features/mailbox/MailboxPage.tsx`, replace `if (action === 'delete') await repository.deleteItem(item.id)` with `if (action === 'delete') await repository.markRead(item.id)`. | `mailbox_deleteItem_removesOnlyItemWithoutOpeningReport` | The test requires Delete to call `deleteItem('item-a')` once. The mutant called it zero times, causing that assertion to fail at test line 85. |

M1 exercises the distinction between the original severity revision and newly observed conflict revisions, including a second intervening change. M2 exercises the distinction between deleting an item and marking it read. These are separate negative cases. Numeric boundary value analysis is not applicable to the selected mutations; revision values identify successive conflict observations rather than input limits. This is mocked UI evidence, separate from SQL race tests and rendered browser inspection.

## Exact execution and results

The invocation from the repository root was `node runtime.local/mutation-check.mjs`. Windows required the approved execution outside the sandbox to create the junction. For each of the four completed stages, the helper ran this exact child command from the temporary root:

```powershell
& 'C:\Program Files\nodejs\node.exe' 'E:\CS3227-2610-MP4\node_modules\vitest\vitest.mjs' run --root 'C:\Users\jonat\AppData\Local\Temp\bugwatch-edit-effectiveness-IDFPMB' --config 'C:\Users\jonat\AppData\Local\Temp\bugwatch-edit-effectiveness-IDFPMB\vitest.config.ts' src/test/report-edit-ui.test.ts src/test/mailbox-ui.test.ts -t 'reportEdit_severityABAAndRepeatedChange_retainsInputAndRequiresEachExplicitRetry|mailbox_deleteItem_removesOnlyItemWithoutOpeningReport' --maxWorkers=2 --reporter=json
```

| Evidence ID | UTC start on 2026-11-12 | State | Exit | Actual selected outcomes |
| --- | --- | --- | --- | --- |
| E1-baseline | 04:43:52.160 | Original copy | 0 | Passed: both selected tests. Failed: none. |
| E2-M1 | 04:44:05.814 | Only M1 introduced | 1 | Failed: severity retry assertion. Passed: mailbox deletion test. |
| E3-M2 | 04:44:14.872 | M1 restored; only M2 introduced | 1 | Failed: mailbox delete operation assertion. Passed: severity retry test. |
| E4-restored-baseline | 04:44:22.268 | Both files restored | 0 | Passed: both selected tests. Failed: none. |

Every stage skipped the other 34 tests in these two files because of the explicit name filter. The four completed stages therefore executed eight selected test cases: six passed and two failed as expected. Each defect was introduced once in this completed evaluation and detected once. The failures were behavioral `AssertionError` results from the declared tests, rather than compilation or environment failures. Detailed JSON reports are retained as `<evidence-ID>.report.json` in the evidence directory; the corresponding `.json` files contain command stdout and `.stderr.txt` files contain stderr. The machine-readable summary includes the exact assertion messages.

Two earlier attempts are retained as setup evidence. The first sandbox attempt failed to create the junction with `EPERM` before tests or mutations ran. The first approved attempt used `C:\Users\jonat\AppData\Local\Temp\bugwatch-edit-effectiveness-gRpwLq`; both selected baseline tests passed, but the helper then failed while parsing stdout because Vitest 5 wrote JSON to `.vitest/json/output.json`. No mutation was introduced in that attempt. Its baseline report remains at that path. The helper was corrected to read the actual JSON file before the four-stage evaluation. Across all attempts, five test commands ran, with ten selected test executions: eight passed and two intentionally failed. No additional mutation attempts or external benchmarks ran.

## Restoration and limits

The helper verified the original and restored Temp file bytes with SHA-256. The repository copies had the same hashes at the final check. It never wrote application source or tests in the repository.

| File | Original Temp, restored Temp and final repository SHA-256 |
| --- | --- |
| `src/features/reports/ReportEditPage.tsx` | `8415c3652d5c0c108fa079332473d774d435e27f2d7c3060ecd4e571205eb01d` |
| `src/features/mailbox/MailboxPage.tsx` | `b0de6d0e1d1972f96fe7b46cb8a6180d0ffbf089bc562a9811fa04be41ae1225` |

Only the declared two defects were evaluated. There was no random mutation search, coverage measurement, model comparison, database permission evaluation or live browser check in this exercise. Detecting these two defects supports the specific assertions described above. It does not establish that other defects, missing requirements or all concurrency errors would be detected. Raw output remains in disposable Temp and ignored local files; the exact mutations, commands, counts, failure assertions and restoration hashes are preserved here for review.
