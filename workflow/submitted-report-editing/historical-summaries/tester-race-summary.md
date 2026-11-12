# Submitted-report editing and mailbox — Race Test Summary

This summary covers **EDIT-RACE-TESTS-2** and **EDIT-TEST-EFFECTIVENESS-1**, accepted by `editing_implementation_review` against feature plan revision 5 and final combined source manifest `258f55435e99e03f7ebaab23d002ac11e4ba604bc97f76a5bb3f6aa73e2c2d95`. The coordinator confirmed explicit approval before assigning this summary. The [feature plan](feature-plan.md) records ownership; the [source manifest](final-source-manifest.json) identifies the reviewed combined state.

## Test Design and Requirement Coverage

Equivalence partitioning groups inputs or states expected to behave alike. These tests divide cases by legacy operation, report state, actor, archived project and transaction order. They use real PostgreSQL sessions and observe `pg_stat_activity` and `pg_blocking_pids` before releasing a competing transaction. A waiting session must demonstrably depend on the held barrier. Elapsed time alone is not proof of the race. Boundary testing checks the edges of an allowed range; numeric boundaries do not apply to these transaction-order tests.

All database cases are in [report-edit-concurrency.test.ts](../../src/test/report-edit-concurrency.test.ts). The requirements are [project movement and atomic notification](../../openspec/changes/edit-submitted-reports/specs/report-editing/spec.md), implemented by [migration 012](../../src/features/reports/database/012_report_editing_mailbox.sql).

| Requirement or risk | Input/state groups and why | Boundaries and negative cases | Expected behavior | Test source and exact names/family | Level and actual status |
| --- | --- | --- | --- | --- | --- |
| An existing action must not authorize against a stale source project. | The five operations are `accept_report` in Open, `start_report_investigation` in Accepted, `await_tester_information` in In progress, `resume_report_investigation` in Awaiting tester information, and `post_report_comment` in Open. Workflow actors are Developers; the comment actor and moving actor are the original Tester. Assigned states retain their Developer. | Each action reads the source and waits on its project lock. The competing transaction moves the report and archives its destination before releasing that lock. Numeric boundaries are N/A. | Each stale action returns P2007. The report stays in its destination with its state and assignment preserved. Its complete post-move snapshot gains no comment, action history, mailbox item or receipt from the refused action. | `%s_sourceReadBeforeMoveToArchivedDestination_refusesStaleActionWithoutWrites`, five cases. | Actual database: all five Passed in the initial and corrected runs. |
| Archival must serialize with an edit. | Source and destination archival are separate cases because either project can invalidate the move. | The archive transaction holds the relevant project lock before the Tester edit starts, then archives and commits while the edit waits. Numeric boundaries are N/A. | The edit returns P2004. Report fields, timestamps, history, discussion, mailbox and receipts remain identical to the pre-edit snapshot. | `editReport_%sArchivesWhileEditWaits_refusesEntireMove`, source and destination cases. | Actual database: both Passed in the initial and corrected runs. |
| Inverse project moves must not deadlock. | Two original-Tester edits move distinct Open, unassigned reports in opposite directions between the same projects. | A third transaction holds the lower UUID project. Both edits must have an observed blocking chain that reaches this barrier before it is released. PostgreSQL can queue one waiter behind another. | Both edits commit after release, each report reaches its requested destination, and each has one edit event and receipt without a mailbox item. | `editReport_inverseMovesWaitingOnSameProject_bothCommitWithoutDeadlock`. | Actual database: initial observation check Failed; corrected test Passed. |
| Notification must use the assignment trusted at commit time. | The report starts Open and unassigned. A second Developer accepts it while the Tester edit waits on the project lock. | Assignment commits before the waiting edit proceeds. Numeric boundaries are N/A. | The edit preserves Accepted state and the new assignment. Exactly one item targets that second Developer, and accepted/edit history plus one edit receipt persist. | `editReport_assignmentCommitsWhileEditWaits_notifiesCurrentAssignedDeveloper`. | Actual database: Passed in both runs. |
| Severity retry and Delete assertions should detect two declared defects. | Existing mocked UI tests distinguish original versus latest conflict revisions and Delete versus Mark as read. | The two seeded defects run separately in a disposable copy. No numeric input limits are evaluated. | Each defect fails its intended assertion, while the other selected test passes. Restored source passes both tests. | [report-edit-ui.test.ts](../../src/test/report-edit-ui.test.ts): `reportEdit_severityABAAndRepeatedChange_retainsInputAndRequiresEachExplicitRetry`; [mailbox-ui.test.ts](../../src/test/mailbox-ui.test.ts): `mailbox_deleteItem_removesOnlyItemWithoutOpeningReport`. | Mocked UI: both baseline stages Passed; both declared defects detected by assertion failures. See [evaluation](seeded-defect-evaluation.md). |

## Line and Branch Coverage

Line coverage measures executable lines run by tests. Branch coverage measures decision outcomes exercised. The feature plan's application scope and 80% line/80% branch targets belong to the main feature tester's coverage work. This assignment adds real SQL concurrency evidence and a narrowly scoped mocked UI defect exercise. JavaScript coverage percentages cannot measure PostgreSQL lock behavior or SQL policy coverage, so no SQL coverage percentage is inferred from the nine passing cases.

| Production file | Lines covered/total and % | Branches covered/total and % | Uncovered locations and behavior | Target outcome or accepted exception |
| --- | --- | --- | --- | --- |
| [012_report_editing_mailbox.sql](../../src/features/reports/database/012_report_editing_mailbox.sql) | Not measured; V8 does not instrument PostgreSQL. | Not measured for the same reason. | This assignment tests the selected races, rather than every validation or authorization path. Other database tests cover those separate requirements. | SQL percentage N/A; actual database evidence is reported separately. |
| [ReportEditPage.tsx](../../src/features/reports/ReportEditPage.tsx) and [MailboxPage.tsx](../../src/features/mailbox/MailboxPage.tsx) | Not measured by this assignment. | Not measured by this assignment. | The defect exercise selected two existing tests, rather than measuring full-file execution. | No coverage acceptance claimed here; see the main feature tester's scoped evidence. |

No instrumented coverage command was run for this assignment. Its test selection, reviewed source identifier and limits are stated here; the [feature coverage detail](final-coverage-detail.json) remains separate evidence owned by the main feature tester. The race cases explicitly assert refused writes, preserved data, committed inverse moves and current-recipient delivery irrespective of JavaScript coverage totals.

## Files Added

- [src/test/report-edit-concurrency.test.ts](../../src/test/report-edit-concurrency.test.ts) was added to verify nine transaction races against the explicitly enabled disposable local database. It skips unless `EDIT_LOCAL_SQL_TESTS=true`, `PROJECT_TEST_ISOLATED=true` and `PROJECT_TEST_URL` equals `https://127.0.0.1:55421`. Its Docker target is fixed to `supabase_db_bugwatch-report-editing`. It cleans up only fixture report/project rows and their dependents; it does not delete account profiles.
- [seeded-defect-evaluation.md](seeded-defect-evaluation.md) was added to preserve the two declared mutations, exact commands, setup failures, results, restoration hashes and limitations. The disposable-copy helper and machine-readable outputs remain in ignored `runtime.local/` and Windows Temp.

## Files Changed

None. This tester added one test file and the evaluation record. Existing application source, SQL, shared test configuration and existing UI tests were not edited by this assignment.

## Test Cases Added

- The five `%s_sourceReadBeforeMoveToArchivedDestination_refusesStaleActionWithoutWrites` cases check each legacy workflow/comment action independently after a concurrent move and destination archive.
- The two `editReport_%sArchivesWhileEditWaits_refusesEntireMove` cases check source and destination archival independently and compare the complete report-related snapshot after refusal.
- `editReport_inverseMovesWaitingOnSameProject_bothCommitWithoutDeadlock` checks the observed blocking graph and successful final state of both inverse moves.
- `editReport_assignmentCommitsWhileEditWaits_notifiesCurrentAssignedDeveloper` checks that a newly assigned Developer receives the only edit item.

All nine cases are in [report-edit-concurrency.test.ts](../../src/test/report-edit-concurrency.test.ts). The two seeded-defect checks reuse existing UI tests; they add no test cases.

## Test Cases Changed

During the review cycle, `editReport_inverseMovesWaitingOnSameProject_bothCommitWithoutDeadlock` was corrected to accept a transitive blocking chain that reaches the barrier. Its first version required both waiters to name the barrier directly, which failed when a queued waiter could instead depend on another waiter. The original failure log establishes the missed direct relationship; it does not capture the exact initial graph. The corrected observer walks actual `pg_blocking_pids` relationships and deduplicates PIDs so a cycle cannot make traversal unbounded. Other race checks still require direct blocking. Deadlines and commit/end-state assertions were preserved. No existing test case was changed.

## Execution Evidence and Limits

| Exact command/check and revision | Passed | Failed | Skipped | Not run | Evidence and what it establishes |
| --- | --- | --- | --- | --- | --- |
| `npm run test -- --run src/test/report-edit-concurrency.test.ts`, without explicit local enable flags. | None | None | 9 | Actual SQL in this invocation. | The default run safely skips the integration suite. |
| `node workflow/submitted-report-editing/runtime.local/run-local.mjs test --run src/test/report-edit-concurrency.test.ts --maxWorkers=1`, initial race test source before EDIT-RACE-TESTS-2. | 8 | 1 | None | None of the nine cases. | [Initial output](local-concurrency-tests.txt) preserves the inverse-move observer failure. |
| `node workflow/submitted-report-editing/runtime.local/run-local.mjs test --run src/test/report-edit-concurrency.test.ts --maxWorkers=1`, corrected EDIT-RACE-TESTS-2, reviewed under plan 5. | 9 | None | None | None of the nine cases. | [Corrected output](local-concurrency-tests-fixed.txt) establishes actual database outcomes for all nine races. The coordinator supplied the exact launcher command; the retained output contains its Vitest results. |
| `npx eslint src/test/report-edit-concurrency.test.ts`, final race test source. | Scoped lint check. | None | N/A | None. | No diagnostics and exit 0. |
| `npx tsc -b --pretty false`, initial race-test integration state. | None claimed. | One unrelated/concurrent unused `MailboxError` import in `report-auth-boundary.test.ts`. | N/A | A passing full build in that invocation. | Reported to the coordinator; this tester did not change the other owner's file. Later combined checks are coordinator evidence. |
| `node runtime.local/mutation-check.mjs`, exact child command and source hashes in the [evaluation](seeded-defect-evaluation.md). | 6 selected executions across four completed stages. | 2 intended assertion failures, one per declared defect. | 34 unselected tests at each stage. | All other defect candidates. | Original and restored baselines each passed both selected tests; each mutated stage passed the unrelated selected test and failed its intended assertion. |
| Earlier defect-evaluation setup attempts. | 2 selected baseline executions. | One junction setup error before testing; one report-parser error after that passing baseline. | 34 unselected tests in the baseline command. | Mutations during these attempts. | Retained in the evaluation rather than counted as behavioral detection. |

The two seeded defects were stale severity revision reuse and Delete calling Mark as read. Each was introduced once in the completed evaluation and detected once. The files were restored byte-for-byte, and both original/restored Temp hashes matched the final repository hashes. Across all attempts, five test commands executed ten selected test cases: eight passed and two intentionally failed. Setup and parser repair overhead is included in the evaluation record. No generalized mutation score or comparison with other testing approaches is claimed.

The coordinator ran both database commands with `EDIT_LOCAL_SQL_TESTS=true` and the Docker binary directory in PATH. Its private launcher supplied the isolated fixture settings and `NODE_EXTRA_CA_CERTS` through `runtime.env`; no private values are recorded here.

Database results and combined approval above were supplied by the coordinator with saved output; the seeded-defect runs and scoped local checks were executed by this tester. Real browser behavior, hosted services, all possible scheduling orders and defects beyond the two declared mutations were not evaluated by this assignment. Summary writing changes no tests, source or evaluation evidence.

