# Submitted-report editing and mailbox — Race Test Summary

Revision 8 is independently approved on merged development `39f4f08`, against source manifest `9278a2da997ba3ccb8ffdbbe50b6f465535da2e58fa7dc016f8a6b6ebd33529e`. Apply editing migration `014_report_editing_mailbox.sql` after migrations 001–013.

The exact PR candidate passed 1,122 tests, with 251 skipped. All 12 scoped files meet 80% line and branch targets; aggregate coverage is 98.26% lines and 91.32% branches. Separate local checks passed 152 database tests and 14 race tests. Both SQL verifiers, lint, build, documentation and the 14 new browser captures passed. The coordinator executed these final checks; hosted preview and live AI remain unverified.

PR10 integration changed migration order and two upstream test fixtures. The contribution records below preserve their original authors and historical revision-7 results. See the current feature plan and pr10-* evidence for final acceptance.

This summary records the final race tests approved by the independent reviewer under feature-plan revision 7, submissions TESTS4/5 and FORMAT1, and final combined [manifest](reconcile-source-manifest.json) SHA-256 `71324d5f99b77c22e8021b35ae4bf92964596ca0a97603821d844b4685fb5145`. The original race tester authored nine schedules and the historical two-defect exercise below. The reconciliation tester added five schedules and repaired the session helper. The coordinator executed the final fourteen-case database run and confirmed exit 0; this is coordinator-supplied evidence.

## Test Design and Requirement Coverage

Equivalence partitioning groups operations or states expected to behave alike. The added schedules distinguish resolve versus duplicate-link actions, link source versus target movement, and which transaction commits first. Numeric boundary testing is N/A because these cases test transaction order. Each waiting operation must have an observed PostgreSQL blocking relationship before the competing transaction proceeds. Existing permission and end-state assertions remain intact.

| Requirement or risk | Input/state groups and why | Boundaries and negative cases | Expected behavior | Test source and exact names/family | Level and actual status |
| --- | --- | --- | --- | --- | --- |
| Seven mutators must recheck the locked current project. | Original five workflow/comment cases plus resolve_report in In progress and link_duplicate_report in Accepted. | Each stale action waits while a move and destination archive commit. | P2007 refuses the stale action without new writes. | [Suite](../../src/test/report-edit-concurrency.test.ts), `%s_sourceReadBeforeMoveToArchivedDestination_refusesStaleActionWithoutWrites`, seven cases including two added cases. | Actual local SQL: Passed. |
| A committed link must block movement of either endpoint. | Source and target movement are independent negative cases. | Link commits while the endpoint's move waits on the source project. | P2011 refuses the move; committed source/target snapshots remain identical. | `linkDuplicate_commitsBefore%sMove_refusesMoveWithoutPartialWrites`, two added cases. | Actual local SQL: Passed. |
| A target moved before link creation cannot become a cross-project canonical report. | Target movement before linking complements source movement before linking in the recheck family. | Move commits while linking waits. | P2003 refuses the cross-project link, preserving both snapshots. | `linkDuplicate_targetMovesBeforeLink_refusesCrossProjectLinkWithoutWrites`, one added case. | Actual local SQL: Passed. |
| Existing archive, inverse-move and notification races remain covered. | Source/destination archive, opposite-direction moves, assignment before edit. | Original held barriers and final assertions remain. | Refused archives change nothing; inverse moves commit; notification uses current assignment. | Four original cases described in the historical map below. | Actual local SQL: Passed. |

The fourteen schedules comprise seven stale-action cases, two archive cases, one inverse-move case, one assignment case and three link-versus-move cases. The main summary covers incoming/outgoing current references and incoming captured-only references. An editable outgoing-captured P2011 case is N/A because captured outgoing references require Resolved/Closed state; the separate database test checks its P2007 read-only refusal.

## Line and Branch Coverage

Line coverage measures executable lines run; branch coverage measures decision outcomes exercised. V8 does not instrument SQL, so no SQL percentage is claimed. The coordinator's exact candidate run measured 896/912 lines (98.24%) and 1117/1227 branches (91.03%) across all twelve agreed production files, each meeting the 80% line/branch target. [Main summary](tester-summary.md) records exact command, per-file counts and limits. It distinguishes 893 candidate tests from 954 workspace tests, which include 61 unpublished workflow tests. These figures do not measure SQL scheduling coverage.

| Production file | Lines covered/total and % | Branches covered/total and % | Uncovered locations and behavior | Target outcome or accepted exception |
| --- | --- | --- | --- | --- |
| [014_report_editing_mailbox.sql](../../src/features/reports/database/014_report_editing_mailbox.sql) | Not measured by V8. | Not measured by V8. | Fourteen selected schedules cover the named ordering risks; other SQL paths use separate persistence tests. | SQL percentage N/A; final actual database run passed. |
| Twelve scoped application files. | 896/912, 98.24%. | 1117/1227, 91.03%. | See [locations](reconcile-coverage-locations.md) and main summary. | Each agreed per-file target met in coordinator candidate run. |

## Files Added

None during reconciliation because the existing race test file was extended. The original tester added the race suite and seeded-defect record described in the historical appendix.

## Files Changed

Only [report-edit-concurrency.test.ts](../../src/test/report-edit-concurrency.test.ts) changed for this race assignment. It gained five schedules, guarded SQL-session input handling and an explicit Node type reference. No dependencies, test configuration or application files changed.

## Test Cases Added

Two cases extend `%s_sourceReadBeforeMoveToArchivedDestination_refusesStaleActionWithoutWrites` for resolve_report and link_duplicate_report. Two `linkDuplicate_commitsBefore%sMove_refusesMoveWithoutPartialWrites` cases independently move the linked source and canonical target. `linkDuplicate_targetMovesBeforeLink_refusesCrossProjectLinkWithoutWrites` checks the opposite target ordering. Each case checks SQL refusal and exact persisted state, rather than lock observation alone.

## Test Cases Changed

The shared Session helper now listens for stdin errors, checks closed/exited/destroyed/ended input before writing, and finishes empty input without writing an extra newline. It retains pipe diagnostics in the returned result. A process reporting success still fails if input was lost or required final SQL could not be sent. The helper retains SQL stderr and exit-code assertions, so the EPIPE repair does not turn an unexpected SQL failure into a pass. Cleanup uses the same guarded lifecycle. A file-local Node type reference fixes the isolated candidate build without changing runtime behavior or TypeScript settings. The coordinator trimmed trailing blank lines only; review confirmed equivalent source after trimEnd.

## Execution Evidence and Limits

| Exact command/check and revision | Passed | Failed | Skipped | Not run | Evidence and what it establishes |
| --- | --- | --- | --- | --- | --- |
| `node workflow/submitted-report-editing/runtime.local/run-local.mjs test --run src/test/report-edit-concurrency.test.ts --maxWorkers=1`, coordinator with EDIT_LOCAL_SQL_TESTS=true and Docker on PATH, final revision-7 race source. | 14 | 0; exit 0, no unhandled errors. | 0 | Other transaction schedules or hosted services. | [Accepted output](reconcile-concurrency-tests-accepted.txt). |
| Same selected race suite before lifecycle repair. | Fourteen assertions. | Unhandled write EPIPE; exit 1. | 0 | A successful overall run. | [Preserved failed output](reconcile-concurrency-tests.txt). Passed assertions did not make this a passing run. |
| `npx tsc -b --pretty false` and scoped `git diff --check`, reconciliation tester after lifecycle repair. | Both checks. | 0 | N/A | SQL execution. | Local static checks; coordinator owns database execution. |
| Coordinator exact candidate `npm run build` before/after Node type reference. | Final build. | First build lacked Node ambient declarations. | N/A | SQL behavior. | [First failure](pr-candidate-build-first-failed.txt), [final build](pr-candidate-build-final.txt). Root workspace had inherited those declarations from an unpublished test. |
| Coordinator six persistence suites. | 152 | 0 final. | 0 | Hosted services. | [Accepted database output](reconcile-db-tests-accepted.txt); earlier receipt sorting, no-op and payload failures are preserved in the main summary. |

The reconciliation tester made no database execution claim. Its separate restricted persistence attempt failed authentication setup and skipped 36 cases. No new seeded-defect exercise ran during reconciliation; the original exercise below remains historical. The old nine-case results and migration-012 label below describe the earlier base. Historical migration labels below link to the current renamed file. Current migration [013](../../src/features/reports/database/014_report_editing_mailbox.sql) follows PR9's resolution migration 012. Browser evidence is separately recorded in [reconcile-visual-review.md](reconcile-visual-review.md). All possible schedules, hosted services and live AI remain untested.

## Historical authorship and original race map

The following original revision-5 summary is retained for its authorship, nine-case test map and declared defect evidence. Its acceptance counts and source identifiers do not replace the final revision-7 results above.


This summary covers **EDIT-RACE-TESTS-2** and **EDIT-TEST-EFFECTIVENESS-1**, accepted by `editing_implementation_review` against feature plan revision 5 and final combined source manifest `258f55435e99e03f7ebaab23d002ac11e4ba604bc97f76a5bb3f6aa73e2c2d95`. The coordinator confirmed explicit approval before assigning this summary. The [feature plan](feature-plan.md) records ownership; the [source manifest](final-source-manifest.json) identifies the reviewed combined state.

### Test Design and Requirement Coverage

Equivalence partitioning groups inputs or states expected to behave alike. These tests divide cases by legacy operation, report state, actor, archived project and transaction order. They use real PostgreSQL sessions and observe `pg_stat_activity` and `pg_blocking_pids` before releasing a competing transaction. A waiting session must demonstrably depend on the held barrier. Elapsed time alone is not proof of the race. Boundary testing checks the edges of an allowed range; numeric boundaries do not apply to these transaction-order tests.

All database cases are in [report-edit-concurrency.test.ts](../../src/test/report-edit-concurrency.test.ts). The requirements are [project movement and atomic notification](../../openspec/changes/edit-submitted-reports/specs/report-editing/spec.md), implemented by [migration 012](../../src/features/reports/database/014_report_editing_mailbox.sql).

| Requirement or risk | Input/state groups and why | Boundaries and negative cases | Expected behavior | Test source and exact names/family | Level and actual status |
| --- | --- | --- | --- | --- | --- |
| An existing action must not authorize against a stale source project. | The five operations are `accept_report` in Open, `start_report_investigation` in Accepted, `await_tester_information` in In progress, `resume_report_investigation` in Awaiting tester information, and `post_report_comment` in Open. Workflow actors are Developers; the comment actor and moving actor are the original Tester. Assigned states retain their Developer. | Each action reads the source and waits on its project lock. The competing transaction moves the report and archives its destination before releasing that lock. Numeric boundaries are N/A. | Each stale action returns P2007. The report stays in its destination with its state and assignment preserved. Its complete post-move snapshot gains no comment, action history, mailbox item or receipt from the refused action. | `%s_sourceReadBeforeMoveToArchivedDestination_refusesStaleActionWithoutWrites`, five cases. | Actual database: all five Passed in the initial and corrected runs. |
| Archival must serialize with an edit. | Source and destination archival are separate cases because either project can invalidate the move. | The archive transaction holds the relevant project lock before the Tester edit starts, then archives and commits while the edit waits. Numeric boundaries are N/A. | The edit returns P2004. Report fields, timestamps, history, discussion, mailbox and receipts remain identical to the pre-edit snapshot. | `editReport_%sArchivesWhileEditWaits_refusesEntireMove`, source and destination cases. | Actual database: both Passed in the initial and corrected runs. |
| Inverse project moves must not deadlock. | Two original-Tester edits move distinct Open, unassigned reports in opposite directions between the same projects. | A third transaction holds the lower UUID project. Both edits must have an observed blocking chain that reaches this barrier before it is released. PostgreSQL can queue one waiter behind another. | Both edits commit after release, each report reaches its requested destination, and each has one edit event and receipt without a mailbox item. | `editReport_inverseMovesWaitingOnSameProject_bothCommitWithoutDeadlock`. | Actual database: initial observation check Failed; corrected test Passed. |
| Notification must use the assignment trusted at commit time. | The report starts Open and unassigned. A second Developer accepts it while the Tester edit waits on the project lock. | Assignment commits before the waiting edit proceeds. Numeric boundaries are N/A. | The edit preserves Accepted state and the new assignment. Exactly one item targets that second Developer, and accepted/edit history plus one edit receipt persist. | `editReport_assignmentCommitsWhileEditWaits_notifiesCurrentAssignedDeveloper`. | Actual database: Passed in both runs. |
| Severity retry and Delete assertions should detect two declared defects. | Existing mocked UI tests distinguish original versus latest conflict revisions and Delete versus Mark as read. | The two seeded defects run separately in a disposable copy. No numeric input limits are evaluated. | Each defect fails its intended assertion, while the other selected test passes. Restored source passes both tests. | [report-edit-ui.test.ts](../../src/test/report-edit-ui.test.ts): `reportEdit_severityABAAndRepeatedChange_retainsInputAndRequiresEachExplicitRetry`; [mailbox-ui.test.ts](../../src/test/mailbox-ui.test.ts): `mailbox_deleteItem_removesOnlyItemWithoutOpeningReport`. | Mocked UI: both baseline stages Passed; both declared defects detected by assertion failures. See [evaluation](seeded-defect-evaluation.md). |

### Line and Branch Coverage

Line coverage measures executable lines run by tests. Branch coverage measures decision outcomes exercised. The feature plan's application scope and 80% line/80% branch targets belong to the main feature tester's coverage work. This assignment adds real SQL concurrency evidence and a narrowly scoped mocked UI defect exercise. JavaScript coverage percentages cannot measure PostgreSQL lock behavior or SQL policy coverage, so no SQL coverage percentage is inferred from the nine passing cases.

| Production file | Lines covered/total and % | Branches covered/total and % | Uncovered locations and behavior | Target outcome or accepted exception |
| --- | --- | --- | --- | --- |
| [012_report_editing_mailbox.sql](../../src/features/reports/database/014_report_editing_mailbox.sql) | Not measured; V8 does not instrument PostgreSQL. | Not measured for the same reason. | This assignment tests the selected races, rather than every validation or authorization path. Other database tests cover those separate requirements. | SQL percentage N/A; actual database evidence is reported separately. |
| [ReportEditPage.tsx](../../src/features/reports/ReportEditPage.tsx) and [MailboxPage.tsx](../../src/features/mailbox/MailboxPage.tsx) | Not measured by this assignment. | Not measured by this assignment. | The defect exercise selected two existing tests, rather than measuring full-file execution. | No coverage acceptance claimed here; see the main feature tester's scoped evidence. |

No instrumented coverage command was run for this assignment. Its test selection, reviewed source identifier and limits are stated here; the [feature coverage detail](final-coverage-detail.json) remains separate evidence owned by the main feature tester. The race cases explicitly assert refused writes, preserved data, committed inverse moves and current-recipient delivery irrespective of JavaScript coverage totals.

### Files Added

- [src/test/report-edit-concurrency.test.ts](../../src/test/report-edit-concurrency.test.ts) was added to verify nine transaction races against the explicitly enabled disposable local database. It skips unless `EDIT_LOCAL_SQL_TESTS=true`, `PROJECT_TEST_ISOLATED=true` and `PROJECT_TEST_URL` equals `https://127.0.0.1:55421`. Its Docker target is fixed to `supabase_db_bugwatch-report-editing`. It cleans up only fixture report/project rows and their dependents; it does not delete account profiles.
- [seeded-defect-evaluation.md](seeded-defect-evaluation.md) was added to preserve the two declared mutations, exact commands, setup failures, results, restoration hashes and limitations. The disposable-copy helper and machine-readable outputs remain in ignored `runtime.local/` and Windows Temp.

### Files Changed

None. This tester added one test file and the evaluation record. Existing application source, SQL, shared test configuration and existing UI tests were not edited by this assignment.

### Test Cases Added

- The five `%s_sourceReadBeforeMoveToArchivedDestination_refusesStaleActionWithoutWrites` cases check each legacy workflow/comment action independently after a concurrent move and destination archive.
- The two `editReport_%sArchivesWhileEditWaits_refusesEntireMove` cases check source and destination archival independently and compare the complete report-related snapshot after refusal.
- `editReport_inverseMovesWaitingOnSameProject_bothCommitWithoutDeadlock` checks the observed blocking graph and successful final state of both inverse moves.
- `editReport_assignmentCommitsWhileEditWaits_notifiesCurrentAssignedDeveloper` checks that a newly assigned Developer receives the only edit item.

All nine cases are in [report-edit-concurrency.test.ts](../../src/test/report-edit-concurrency.test.ts). The two seeded-defect checks reuse existing UI tests; they add no test cases.

### Test Cases Changed

During the review cycle, `editReport_inverseMovesWaitingOnSameProject_bothCommitWithoutDeadlock` was corrected to accept a transitive blocking chain that reaches the barrier. Its first version required both waiters to name the barrier directly, which failed when a queued waiter could instead depend on another waiter. The original failure log establishes the missed direct relationship; it does not capture the exact initial graph. The corrected observer walks actual `pg_blocking_pids` relationships and deduplicates PIDs so a cycle cannot make traversal unbounded. Other race checks still require direct blocking. Deadlines and commit/end-state assertions were preserved. No existing test case was changed.

### Execution Evidence and Limits

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

