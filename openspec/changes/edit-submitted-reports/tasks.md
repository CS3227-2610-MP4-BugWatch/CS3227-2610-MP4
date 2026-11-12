# Tasks

## 1. Integration and execution baseline

- [x] 1.1 Coordinator preserves existing work, creates the implementation branch from current development including50d6c30, and reconciles migration order, navigation and repository contracts; verify the recorded base/diff, new migration number and unchanged discussion tests before delegation.
- [x] 1.2 Coordinator confirms feature-plan revision, design contracts, file ownership and scoped coverage files with implementers/tester; record fresh-context assignments and actual kickoff counters/time in the evidence record before coding starts.

## 2. Transactional report editing and mailbox persistence

- [x] 2.1 Backend implementer owns report/mailbox types and repository adapters plus migration014; implement protected edit, severity revision/conflict, normalized no-op, idempotent receipt, immutable edit history and atomic assigned-Developer notification. Replace affected existing comment/workflow RPC definitions additively with locked source-project rechecks while preserving their contracts. Verify scoped repository tests and guarded isolated database scenarios in2.3; do not edit historical migrations or add lifecycle actions.
- [x] 2.2 Backend implementer adds recipient-only mailbox list/mark-read/delete RPCs and repository pagination/error mapping. Verify private ownership, read persistence, replay safety and no report deletion with2.3.
- [x] 2.3 Tester owns report-edit-repository.test.ts, report-edit-database.test.ts, mailbox-repository.test.ts and mailbox-database.test.ts under src/test/, plus minimal affected existing mocks. Map requirements to partitions/boundaries, test normalized limits, unauthorized/state/archive cases, severity ABA/explicit retry, no-op, receipt replay, rollback and project/assignment races. Add deterministic interleavings for project movement versus each existing comment/workflow mutation and source/destination archive fixtures, checking no stale-project authorization. Record deterministic runs separately from isolated database checks and explain any unavailable prerequisites.
- [x] 2.4 Documentation writer updates docs/developerGuide/Reports.md and adds docs/developerGuide/Mailbox.md with migration, contracts, permissions, receipts/conflict semantics and verification setup; add its navigation/landing link and verify npm run docs:build against stabilized behavior.
- [x] 2.5 Coordinator assigns every backend/test submission and any fixes a unique ID; reviewer explicitly approves those submissions or requests scoped fixes. Verify decisions and the reviewed plan revision before treating this group as accepted.

## 3. Editor and mailbox user journeys

- [x] 3.1 Frontend implementer owns report editor/page/form/detail history integration. Add original-Tester Edit report eligibility, prefilled edit mode, protected Save changes/Cancel, input-preserving severity notice/explicit retry and canonical success/no-op navigation. Verify report-edit-ui.test.ts and existing report/discussion regressions.
- [x] 3.2 Frontend implementer reuses existing AI generation/edit/apply controls in edit mode without submission/draft methods, expanded context or changed limits; verify AI failure, explicit per-field application, stale suggestions and session/navigation cleanup in report-edit-ui.test.ts and affected report-suggestions-ui.test.ts.
- [x] 3.3 Frontend implementer owns MailboxPage, ProjectsApp routes, AuthenticatedApp session wrappers and WorkspaceShell navigation. Implement approved cards, All/Unread, read/open/delete, pending/error/empty and account-stale protection; verify mailbox-ui.test.ts and existing route/auth tests.
- [x] 3.4 Tester owns report-edit-ui.test.ts and mailbox-ui.test.ts and required existing UI/auth/suggestion test updates. Cover original versus other actors, four editable states, read-only states/archive races, unchanged save, retained text on conflicts/errors, explicit override, no accidental draft/submission, changed project continuity, mailbox privacy and asynchronous stale results. Provide the requirement/partition/boundary map and actual command results.
- [x] 3.5 Documentation writer updates docs/userGuide/Reports.md and adds docs/userGuide/Mailbox.md describing actual editing, severity warning/override, AI reuse and mailbox actions; add navigation/landing links, reconcile mockup wording with implemented screens and verify npm run docs:build.

## 4. Rendered polish, evaluation and integration

- [x] 4.1 After functional files stabilize, coordinator transfers exclusive presentation ownership to ui_polisher. Inspect actual dark desktop/narrow and relevant loading/empty/validation/conflict/request-error states plus keyboard/focus; preserve whole-screen captures and a revision-linked visual-review.md. Verify findings/fixes with affected tests; no mockup is a rendered acceptance pass.
- [x] 4.2 Tester runs feature-scoped coverage including every agreed production file with per-file80%lines/80%branches targets; preserve covered/total counts, uncovered paths and justified reviewer-accepted exceptions. Verify critical authorization/transaction/recovery scenarios separately even if numeric targets pass.
- [x] 4.3 Coordinator records first-pass independent acceptance before repairs, actual user manual results when available, distinct defects/omissions versus new decisions, correction rounds and observed human effort. Collect all agent/retry/review usage with unknown resources labeled; verify evidence accuracy against commands/source/captures, without inventing savings.
- [x] 4.4 Tester evaluates detection of a small declared set of local seeded defects in a disposable checkout if the required checks can safely execute; record exact mutations, detecting tests, restored clean diff and limits. If not run, record Not run without substituting test count or coverage as effectiveness evidence.
- [x] 4.5 Coordinator runs the complete Vitest suite, lint, TypeScript/production build, docs build, strict OpenSpec validation and diff checks against the integrated feature. Verify guarded database scenarios and signed-in actual UI separately, retaining failed/skipped/unverified results and unresolved gates.
- [x] 4.6 Reviewer explicitly decides every latest backend/frontend/tester/ui_polisher submission, fixes and the final combined implementation/tests/docs/visual evidence. Coordinator resolves findings, reruns affected checks and obtains fresh decisions after relevant changes; verify all approvals refer to final state.
- [x] 4.7 After approval, backend/frontend implementers and tester write their separately owned template-based summaries in workflow/submitted-report-editing/. Coordinator checks function explanations, partition/boundary map, source/test links and actual evidence, then records a short retrospective and final log.
- [ ] 4.8 Coordinator prepares one PR targeting development and verifies the correct isolated preview database migration/environment and signed-in Vercel journeys when access is available; record exact preview revision, evidence and remaining limitations before merge consideration. Do not claim unavailable preview checks passed.

## Workflow follow-up

- Archive/sync the change only after implementation, applicable verification and review requirements are satisfied, following the archive workflow.
- A later PR to master follows development integration and preview review; no production migration or merge is authorized by these planning artifacts.

## PR9 reconciliation verification

Earlier 19/20 completion applied to base50d6c30. Checkboxes are reopened for integrated-base9909315 acceptance. Apply design reconciliation amendment:013 after012, preserve all resolution readers/events, add seven locked-project RPC rechecks, refuse incoming/outgoing current/captured duplicate-linked moves with P2011 field feedback, retain ordinary edits, merge all fixtures and six hosted report suites. Verify new link/move and resolution/move cases, scoped coverage, local SQL and browser feedback; obtain fresh review and update contributing-agent summaries before preparing the draft development PR. Historical outputs remain unchanged.
