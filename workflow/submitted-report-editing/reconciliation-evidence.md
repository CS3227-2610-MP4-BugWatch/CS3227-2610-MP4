# Reconciliation with merged PR9

The user confirmed that duplicate-linked reports must stay in their project for this release. Other eligible fields remain editable. PR9 merged into development at `99093150dbaeef64dbae51fabc769acf822a21fc`; our editing migration is now `013_report_editing_mailbox.sql`, following `012_report_resolutions.sql`.

## Behavior and integration

- Preserve both resolution and editing types, session methods, readers and history rendering. The database history constraint accepts all eight events.
- Refuse project moves for incoming/outgoing current canonical links or captured resolution references. P2011 becomes a clear validation message and Project field error. Same-project edits and ordinary unlinked moves remain available.
- Add locked current-project rechecks to seven existing mutations, including resolution and duplicate linking, so a concurrent move cannot leave an action authorized against an old project.
- Keep the existing hosted database runner and optional resolution SQL verifier; its report selection now contains all six report suites.
- No unlinking, submitted-report deletion, new lifecycle state or live model behavior was added.

Outgoing captured resolution references exist only on Resolved/Closed reports under the schema, so an editable P2011 partition is not reachable. The test verifies their read-only P2007 rejection instead. Incoming captured-only references are a separate reachable move-refusal case.

## Actual checks and preserved failures

| Check | Observed outcome | Interpretation |
| --- | --- | --- |
| First combined database run |116 passed,36 failed | One shared helper sorted receipts by nonexistent id; these are not36 independent product defects. See reconcile-db-tests-first-failed.txt. |
| Receipt-ordering repair |151 passed,1 failed | Adding receipts to snapshots exposed a no-op assertion that incorrectly required no replay receipt. The approved contract permits that receipt while preserving report/history/mailbox. See reconcile-db-tests-fixed.txt. |
| Expanded no-op assertion |151 passed,1 failed | Expected payload used form keys; storage uses normalized SQL keys. Reviewer identified the mismatch. See reconcile-db-tests-final.txt. |
| Corrected no-op regression |1 passed,35 filtered skips | Exact normalized receipt payload/result and repeated-request equality verified. See reconcile-noop-regression.txt. |
| Final six database suites |152 passed,exit0 | All selected suites executed against clean local001–013. See reconcile-db-tests-accepted.txt. |
| First14-race run |14 assertions passed,1 unhandled EPIPE,exit1 | A SQL process had exited after an expected rejection while the helper tried to finish its input. This was not a successful run. See reconcile-concurrency-tests.txt. |
| Corrected14-race run |14 passed,exit0,no unhandled error | Guarded stream lifecycle retains SQL/exit assertions and fails apparent success if required input is lost. See reconcile-concurrency-tests-accepted.txt. |
| Root full deterministic coverage |954 passed,246 skipped | Includes61 unrelated local workflow tests. All12 scoped files meet80%line/branch targets:896/912lines98.24%,1117/1227branches91.03%. See reconcile-coverage-run.txt and counts/locations. |
| Migration and SQL rollback verifiers |Passed | Existing disposable database was backed up, clean001–012 loaded,013 applied, both verifier scripts passed with rolled-back fixtures. No hosted database changed. |
| Lint/build/docs |Passed | Current docs build32.314seconds; warnings retained. |
| Actual browser |14 dark whole-viewport captures,all assigned checks passed | Linked-move error/input retention, same-project recovery, combined histories, resolved read-only detail, mailbox read/open and representative keyboard focus. See reconcile-visual-review.md. |
| Exact PR candidate tests/coverage |893 passed,246 skipped; same12-file coverage totals | Isolated staged tree excludes61 unrelated local workflow tests and the other workflow/presentation changes. Results are in pr-candidate-* files; do not substitute root954. |
| First exact-candidate build |Failed: Node type declarations missing from the race test | An unrelated local test had supplied a global Node type reference, hiding this build dependency in the root workspace. See pr-candidate-build-first-failed.txt. |
| Type declaration correction | Added a Node types reference only to the Node race test | No runtime behavior, dependency or compiler setting changed. Final isolated build/docs results recorded separately after completion. |

The tester's restricted-environment database attempt failed during authentication setup and skipped36cases; it did not verify the repair. Root's approved loopback execution supplied the successful database evidence. No assertions were removed to turn failures into passes: negative-case receipt snapshots remain, no-op state equality remains, and exact receipt/replay checks were added.

## Review and measurement limits

The reviewer checked production compatibility, tests, actual database output, rendered captures and generated guide targets. The latest test/combined decisions are recorded in feature-plan.md once issued. Earlier base50d6c30 approvals and evidence remain historical.

Current root source manifest is reconcile-source-manifest.json; browser source was captured before its run in reconcile-browser-source.json. Later changes were test-helper corrections, with production hashes checked unchanged. Exact-candidate tests are separate because unrelated local workflow code is deliberately excluded from the PR.

This is another observational case, not a controlled demonstration of savings. The earlier usage snapshot ends before this reconciliation, so it is not a total for the published feature. Current phase usage, charges and active human testing minutes have not been measured here. The receipt assertions and process lifecycle needed multiple repair rounds; those costs remain visible. User manual acceptance, live AI and hosted preview verification remain pending.
