# Submitted-report editing and mailbox — Backend Implementation Summary

This summary covers EDIT-BACKEND-1 and its final correction EDIT-BACKEND-2, accepted under feature-plan revision 5. The coordinator confirmed final combined reviewer approval against source manifest `258f55435e99e03f7ebaab23d002ac11e4ba604bc97f76a5bb3f6aa73e2c2d95`. This summary records the backend contribution; other agents own the interface, tests and guides.

## User Flow and Decisions

An original reporting Tester can correct an assigned report, including moving it to another active project. The save preserves its identity, discussion, assignment and lifecycle state. Changed inputs, history and the assigned Developer's mailbox item save together or all roll back. Saving normalized identical inputs creates no edit event or notification.

A server-maintained severity revision detects an intervening change even if severity later returns to its original value. The first conflicting save returns a trusted snapshot without saving. A later explicit save can use that revision to deliberately replace severity. A request receipt stores a completed result so retrying after a lost response does not duplicate events. Replay still checks current locked permissions and project eligibility before returning the original result.

The implementation uses existing validation and authenticated RPC conventions. It adds no dependency or notification producer beyond report editing. Hosted deployment and hosted preview verification remain outside the local evidence recorded here.

## Files Added

- [mailbox/types.ts](../../src/features/mailbox/types.ts) defines mailbox items, typed errors and repository operations.
- [mailbox/mailboxRepository.ts](../../src/features/mailbox/mailboxRepository.ts) implements private mailbox RPC access, strict record parsing and complete bounded pagination.
- [012_report_editing_mailbox.sql](../../src/features/reports/database/012_report_editing_mailbox.sql) adds severity tracking, edit receipts, mailbox storage and authorized RPCs. It replaces five existing mutators to recheck project movement under locks and extends history reads.
- [verify_report_editing_mailbox.sql](../../src/features/reports/database/verify_report_editing_mailbox.sql) provides isolated transactional fixtures for forced-write rollback, replay, no-op, severity ABA and supplemental legacy guard inspection. Its fixtures and temporary trigger roll back.

## Files Changed

- [reports/types.ts](../../src/features/reports/types.ts) adds the required severity revision, edit request/result, conflict snapshot and edit-history contracts. `ReportError` accepts an optional fourth conflict argument.
- [reportRepository.ts](../../src/features/reports/reportRepository.ts) implements editing and parses the new revision, error and history shapes. Existing report validation is reused without changing `validation.ts`.

## Functions Created

### Report editing

[Repository `editReport`](../../src/features/reports/reportRepository.ts) takes a report ID and `{ input, expectedSeverityRevision, requestId }`. It validates and normalizes the input, sends only approved fields and returns a canonical saved or unchanged report. Invalid input fails before the network call; malformed responses become unavailable errors. An unavailable save response can represent an uncertain committed outcome, so callers retain the same request identity when retrying. Tests include `editReport_%s_returnsCanonicalReportAndRevision`, Unicode limit families, protected-property filtering, invalid revision/request IDs and `editReport_transportThrows_reportsUncertainStorageFailure` in [report-edit-repository.test.ts](../../src/test/report-edit-repository.test.ts).

[SQL `edit_report`](../../src/features/reports/database/012_report_editing_mailbox.sql) derives the actor and recipient from trusted database state. It requires the original Tester, one of the four editable states and active source/destination projects. Unknown or protected input fields are refused. It locks request identity, then projects in deterministic UUID order, then the report. A changed project observed after locking returns `P2007` so the caller can reload/retry. A severity mismatch returns `P2010` with the latest value, revision and nullable trusted actor role. Validation, authentication, forbidden, archive and missing-record failures retain existing SQL signals.

A real save changes only editable inputs and update time, inserts one changed-field history record and, when assigned, one recipient item. A normalized no-op changes none of those. Matching receipts return the original result only after current authorization checks, before comparing the older revision; a mismatched payload fails validation. Tests include original-Tester state families, archive cases, move continuity, severity ABA/explicit retry, matching replay and `editReport_receiptReplayAfter%s_rechecksCurrentAuthorization` in [report-edit-database.test.ts](../../src/test/report-edit-database.test.ts). The verification SQL separately injects failures into history and mailbox writes and checks complete rollback.

[SQL `track_report_severity`](../../src/features/reports/database/012_report_editing_mailbox.sql) runs before report updates. It increments the revision only for a real severity change and derives nullable actor-role attribution from the authenticated profile. Other updates retain the revision and attribution. It protects revision discipline for future trusted severity writers; the database ABA test verifies change-and-change-back detection.

### Mailbox access

[`createMailboxRepository`](../../src/features/mailbox/mailboxRepository.ts) returns `listItems`, `markRead` and `deleteItem`. `listItems` accepts All or Unread, exhausts 100-record keyset pages and preserves timestamp precision. It rejects duplicate, unordered, malformed or inappropriate unread records instead of returning a misleading partial result. `markRead` and `deleteItem` accept only an item ID. None accepts a recipient. Failures become `MailboxError` authentication, forbidden, not-found or unavailable outcomes; failed loads never become empty success. [mailbox-repository.test.ts](../../src/test/mailbox-repository.test.ts) covers filtering, page boundaries, microsecond precision, repeated pages, nullable attribution and error families.

The mailbox helper functions have separate validation responsibilities: `text` requires strings, `uuid` checks identifiers, `timestamp` checks parseable dates, `itemRow` validates the complete row and changed-field allowlist, `cursorKey` preserves ordering precision, `fail` maps safe domain errors, and the nested `rpc` handles transport failures. They have no database side effects themselves; malformed values fail closed through the same repository tests. `MailboxError` stores the safe code and message without exposing raw database internals.

[SQL `get_mailbox_items`](../../src/features/reports/database/012_report_editing_mailbox.sql) requires an authenticated valid profile and returns only its recipient rows, newest first, with current project context. It validates filter/cursor pairs and returns at most 100 records. `mark_mailbox_item_read` changes only an owned item's read time and preserves an existing read time. Missing/unowned items return `P2005`. `delete_mailbox_item` deletes only an owned item and safely does nothing for a missing/unowned ID. Direct client writes and public execution are revoked; authenticated callers receive only the intended RPC grants. [mailbox-database.test.ts](../../src/test/mailbox-database.test.ts) covers recipient read persistence, cross-recipient operations, repeated deletion, anonymous denial and direct-insert refusal.

The verification-only `report_edit_test_reject_write` deliberately raises `P2999` to prove transaction rollback. It is created inside the verification transaction and removed by rollback; it is not application functionality.

## Functions Changed

[Repository `fail`](../../src/features/reports/reportRepository.ts) now validates `P2010` JSON before producing a structured severity conflict. Invalid details produce unavailable instead of trusting malformed server data. `reportRow` requires a nonnegative safe integer revision; it refuses a missing revision rather than creating an unsafe editing snapshot. `historyRow` maps only approved changed inputs from snake_case to camelCase and carries optional trusted project names. It refuses protected or unchanged history fields. These parsers have no writes. Tests include conflict actor/malformed-detail families, `getReport_invalidSeverityRevision%j_refusesUnsafeEditSnapshot` and edit-history tests in the repository suite.

`ReportError` retains its existing constructor arguments and adds the optional fourth conflict snapshot. Existing callers remain compatible. The edit repository tests exercise the new error shape.

[SQL `accept_report`, `start_report_investigation`, `await_tester_information`, `resume_report_investigation` and `post_report_comment`](../../src/features/reports/database/012_report_editing_mailbox.sql) retain their existing inputs, actor restrictions, results, grants and successful side effects. Each now compares the report's current project after taking the report lock with the project checked and locked earlier. If movement intervened, it raises retryable `P2007` before writing. Acceptance still assigns the Developer; the next three actions still change only the prescribed lifecycle state/history; comments still create discussion without changing report/history. The parameterized `%s_sourceReadBeforeMoveToArchivedDestination_refusesStaleActionWithoutWrites` family in [report-edit-concurrency.test.ts](../../src/test/report-edit-concurrency.test.ts) exercises all five using observed blocking relationships. The same suite tests source/destination archival, inverse moves and assignment before editing.

[SQL `get_report_history`](../../src/features/reports/database/012_report_editing_mailbox.sql) adds nullable `project_names` to its result while preserving older events, ordering and actor/assignment labels. Report moves therefore retain readable before/after context. Repository history tests and database move tests cover this behavior. `get_report` itself needed no replacement: its existing `to_jsonb(r)` projection includes the new column automatically.

## Verification and Remaining Limits

The first implementation's early receipt return failed two actual authorization regressions. EDIT-BACKEND-2 moved that return behind locked current authorization; the recorded reruns passed. Earlier failed evidence remains available rather than being presented as an initial pass.

| Command or check | Actual outcome | Evidence and scope |
| --- | --- | --- |
| `npm run test -- --run src/test/report-edit-repository.test.ts src/test/mailbox-repository.test.ts` | Passed: 89 tests. | Backend adapter tests run by this implementer, including after the receipt correction. |
| Local feature database suites | Passed: 35 tests. | [Final feature database output](local-feature-db-tests-final.txt); disposable local Supabase, not hosted. |
| Local related database suites | Passed: 179 tests across six files. | [Integrated database output](local-integrated-db-tests.txt). |
| Local multi-session concurrency suite | Passed: nine cases. | [Fixed concurrency output](local-concurrency-tests-fixed.txt) and the concurrency test source. Blocking observations establish the intended interleavings. |
| Isolated SQL verification | Passed. | [SQL verification output](local-sql-verification.txt); forced persistence failures and transactional checks. |
| `npm run test:coverage` with explicit per-file includes and 80% line/branch thresholds | Passed: 809 tests; 210 skipped. | [Exact command/output](final-coverage-run.txt), [summary](final-coverage-summary.json), [detail](final-coverage-detail.json) and [uncovered source locations](coverage-source-locations.md). Skipped integration suites are separate from the successful local database executions above. |
| `npm run lint`; `npm run build`; `npm run docs:build` | Passed in the recorded final combined checks. | [Lint](final-lint.txt), [build](final-build.txt), [guide build](final-docs-build.txt). The implementer's earlier build failure concerned a test fixture subsequently corrected by its owner. |
| Hosted migration and hosted preview verification | Not run. | Local results do not establish hosted deployment correctness. |

Backend coverage is 230/231 lines (99.56%) and 249/270 branches (92.22%) for `reportRepository.ts`; 50/50 lines (100%) and 66/69 branches (95.65%) for `mailboxRepository.ts`. Report and mailbox error/type modules cover all executable lines (5/5 and 3/3 respectively); they have no instrumented branches. Reused validation covers 45/45 lines and 59/60 branches (98.33%). Across the agreed feature scope, coverage is 732/746 lines (98.12%) and 876/965 branches (90.77%). These figures describe JavaScript execution and do not replace SQL permission, rollback or race assertions. The linked uncovered-location record preserves the remaining paths.

Actual rendered interface evidence belongs to the frontend/presentation contribution and is recorded in [visual-review.md](visual-review.md). No UI or guide source was changed by this backend implementer. Migration numbering must be reconciled if another branch's migration 012 lands first; no renumbering or hosted migration was performed during this summary step.
