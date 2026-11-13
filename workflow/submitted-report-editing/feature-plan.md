# Submitted-report editing and mailbox — Feature Plan

## Status and Revision

- **Status:** In progress. Local revision8 implementation, verification, renewed independent review and summaries are accepted. PR12 targets development; hosted migration and preview acceptance remain outstanding. The user has requested evidence cleanup and opening the PR for review.
- **Revision:** 8 (PR10 integration and editing migration014; confirmed product behavior unchanged).
- **Updated:** 2026-11-13.
- **Coordinator:** Root chat.
- **Publication follow-up, 2026-11-13:** User requested PR12 ready for review and evidence cleanup. EVIDENCE-CLEANUP-1 was independently approved and published as `6b12f50`; the PR is now ready, not merged. That head's CI exposed an existing asynchronous test assertion in project creation. CI-PROJECT-WAIT-1 adds a wait for visible history completion before checking the history request, preserving all original assertions and production behavior. Independent reviewer `review_evidence_cleanup` approved the fix and combined cleanup/test state. See [test follow-up](tester-ci-timing-summary.md). Earlier source manifests retain their historical approval scope; they are not rewritten to imply review of a later test revision. Hosted migration and manual preview acceptance remain outstanding.
- **Requirement sources:** User decisions D1–D10 in [live evidence](workflow-evidence.md); BugWatch.md C-16/C-18/C-21 and T-04; [OpenSpec proposal](../../openspec/changes/edit-submitted-reports/proposal.md), design, report-editing and attention-mailbox deltas, and tasks in the same change. User approved artifacts and explicitly authorized apply, then resumed after reviewing teammate PR9.

## Confirmed Requirements and Acceptance Criteria

| ID | Confirmed requirement | Observable acceptance criterion | Source |
| --- | --- | --- | --- |
| R1 | Original Tester edits eligible active-project reports | Separate prefilled editor; database denies other actors/read-only states/archives | C-21; D2 |
| R2 | Preserve report when project changes | Stable ID, discussion, history, state and assignment across source/destination lists | D4 |
| R3 | Warn before severity overwrite, then allow explicit override | First conflicting save has no write and retains input; subsequent deliberate save can use selected severity | D3/D5/D6 |
| R4 | Atomic real edit and no-op suppression | Changed fields/history/assigned-recipient item commit together; unchanged or failed requests create none | C-18/C-21; D1/D8 |
| R5 | Private usable mailbox | Recipient-only list/read/delete, approved changed-field card, All/Unread, open marks read, deletion leaves report intact | C-16/S-06; D7/D9 |
| R6 | Existing AI controls stay explicit | Generate/apply do not save; existing allowlist/limits/failure behavior remain | D10; existing assistant |
| R7 | Evidence-based delivery | First-pass results, repairs, actual scoped coverage, browser/database evidence and independent approvals recorded without invented success | User workflow decisions |
| R8 | Record user-directed code-quality measures | Preserve ESLint/TypeScript/build results, review findings and fixes, line/branch counts and uncovered behavior; do not replace quality with a percentage alone | Latest apply request |
| R9 | Keep duplicate-linked reports in their project | Clear project-field rejection for incoming/outgoing current/captured canonical references; ordinary same-project edits remain allowed | User: “i think we can keep the duplicate link lock for now, lets move on” |

Detailed scenarios are authoritative in the delta specs; this table is a coordination map, not a competing specification.

## Scope Exclusions and Open Decisions

- **Excluded:** Developer severity UI, archive UI, new lifecycle transitions, reply/retest notification producers, external notifications, edit drafts/autosave, expanded AI context and new model benchmarks in this implementation slice. Confirmed later product work remains in the backlog.
- **Open decisions:** None blocking coding. User confirmed proposal, design, both specs and task order, then explicitly requested apply. Revision3 fixes exact shared field/error/RPC names for independent owners; private implementation choices remain engineering work.

## Existing Code, Reuse, and Test Environment

- **Relevant code:** Implementation branch codex/edit-submitted-reports has HEAD50d6c30, matching development at kickoff. The earlier read-only audit used5b8d605; [baseline](development-baseline.json) preserves that historical distinction. Existing report form/detail, routes, authenticated wrappers, shell and migrations005–011 were extended.
- **Reusable functionality and dependencies:** Current React/TypeScript/Vite/Mantine/Supabase and Vitest; existing report normalization, RPC authorization, history, useBlocker and report assistant. No new runtime dependency planned.
- **Related tests:** Existing report validation/repository/UI/workflow/discussion/auth/suggestions and local-API tests. Add feature-specific tests listed below; preserve their current behavior and meaningful assertions.
- **Test environment:** Vitest src/test/*.test.ts with existing jsdom directives/mocks; isolated guarded Supabase/database suites are separate. No live database access or migration was performed by planning.
- **Visual evidence:** Current ordinary/conflict/mailbox/AI mockups v1–v4 are proposals, with source/feedback notes. Later actual dark desktop and narrow captures plus keyboard/error states go in `visual-review.md` and `screenshots/`, linked to tested commit/diff. No fake rendered pass.
- **Evaluation scope:** Observational feature evaluation in workflow-evidence.md, existing usage-observation-01.json.gz and instruction-version-02.json. Retain previous snapshots; create a new apply kickoff boundary. No controlled instruction/caching benchmark assigned; do not reuse old experiment results as evidence of this feature's benefit.

## File Ownership

### Active final integration ownership — revision8

Development advanced to39f4f0844a8601dac5e19222b0826670c3cec08a after the revision7 review. Root preserved unrelated tracked edits in a second retained stash, cleanly rebased the unpublished feature commit, and reapplied those unrelated edits. PR10 owns013_developer_question_quota.sql; root renames editing migration to014, updates active guides/specs, and adapts two upstream assistant test fixtures with severityRevision/editReport mock. No user-facing behavior beyond revision7 changes. Root is the sole writer for this small coupled correction; earlier implementation/test/documentation agents have completed their assignments. A fresh independent reviewer owns read-only acceptance. Runtime helper may change only disposable local configuration, outputs and private account setup.

Final verification must use the exact feature-only candidate on39f4f08, preserve PR10 assistant rendering/transport/.js imports, apply clean001–014 locally, and rerun six report DB suites and14 race schedules. Prior measured results remain historical until renewed. Final summaries retain historical authorship and receive an administrative revision8 addendum after approval. No master merge or hosted schema action is authorized.

### Active reconciliation ownership — revision7

The branch was fast-forwarded to merged development9909315 using a retained tracked-work stash, then prior edits were reapplied. Conflict resolutions and additive migration changes require new submissions. Exact contract amendment is in design.md “Reconciliation amendment”; unchanged report/mailbox interfaces remain as before. P2011 maps to the existing validation code with projectId feedback, not a new ReportErrorCode.

| Owner | Exclusive files/responsibility |
| --- | --- |
| Backend reconciliation implementer | reports/types.ts, reportRepository.ts, old012 editing migration renamed to013, verify_report_editing_mailbox.sql; preserve PR9 validation.ts and existing012 resolutions migration unchanged |
| Frontend reconciliation implementer | ReportDetailsPage.tsx conflict resolution; inspect AuthenticatedApp auto-merge and adjust only if needed; preserve both histories/actions/session wrappers |
| Reconciliation tester | All necessary src/test/*.test.ts fixture/conflict merges and new link/move/RPC race regressions; no production files |
| Documentation reconciliation writer | docs/userGuide/Reports.md and docs/developerGuide/Reports.md conflicts, both Mailbox.md topics; update013 prerequisites and new move rule only |
| Coordinator | Shared plan/OpenSpec/tasks/logs, run-project-db-tests.ps1 conflict, git staging/branch/backup, dependency/config scope, integration runtime/evidence |
| Reviewer | Independent read-only latest submissions and combined review; no edits |

All active writers read revision7 and its design amendment before editing. They are not alone; preserve other owners' work. Coverage scope remains all12 production files, with80%lines/branches each; the new resolution paths now belong to those combined files and cannot be excluded. Summaries are refreshed by original/contributing owners only after renewed approval. Existing runtime is an earlier isolated012 editing database; never apply PR9's012 over it blindly. Coordinator must use a clean disposable database or separate database for001–013 verification.

Active revision3 owners: editing_backend_resumed for backend, editing_frontend_resumed for frontend and editing_tester_resumed for tests. All use fresh focused sessions; prior interrupted sessions returned no handoffs. Root owns plans/tasks/log/evidence. Runtime setup owns ignored runtime.local/ and runtime-readiness.md only. Documentation/polish follow functional stabilization.

| File or exact file pattern | Planned change | Single active owner |
| --- | --- | --- |
| openspec/changes/edit-submitted-reports/**; this plan; workflow-evidence.md and new evidence snapshots; overall logs | Planning, revisions and integration evidence | Coordinator |
| src/features/reports/types.ts; reportRepository.ts; validation.ts | Edit/revision/history contracts and adapter; validation reuse | Backend implementer |
| src/features/reports/database/012_report_editing_mailbox.sql; verify_report_editing_mailbox.sql | Atomic authorized persistence and isolated SQL checks | Backend implementer |
| src/features/mailbox/types.ts; mailboxRepository.ts | Mailbox contract and adapter | Backend implementer |
| src/features/reports/ReportEditPage.tsx; ReportForm.tsx; ReportDetailsPage.tsx | Editor, assistant reuse and edit history | Frontend implementer, then explicit presentation transfer to ui_polisher |
| src/features/mailbox/MailboxPage.tsx; src/features/projects/ProjectsApp.tsx; src/features/auth/AuthenticatedApp.tsx; src/shared/components/WorkspaceShell.tsx; src/App.css | Page/routes/session/nav and scoped styles | Frontend implementer, then explicit presentation transfer to ui_polisher where applicable |
| src/test/report-edit-repository.test.ts; report-edit-database.test.ts; report-edit-ui.test.ts; mailbox-repository.test.ts; mailbox-database.test.ts; mailbox-ui.test.ts | New feature tests | Tester |
| src/test/report-edit-concurrency.test.ts | Explicitly gated disposable local multi-session lock/barrier tests | editing_race_tests tester only; excluded from other tester's ownership |
| src/test/report-*.test.ts; project-ui.test.ts; project-report-list.test.ts; application-layout.test.ts | Required existing mock/type/auth/route regression updates only | Tester |
| run-project-db-tests.ps1 | Serialize guarded database-suite wiring if needed | Coordinator |
| site.json | Exclude disposable local runtime/private files from generated docs | Coordinator |
| docs/developerGuide/Reports.md; Mailbox.md; DeveloperGuide.md; docs/userGuide/Reports.md; Mailbox.md; UserGuide.md; _markbind/layouts/default.md | Actual guides, topic links and navigation | Documentation writer, after related behavior stabilizes |
| visual-review.md; screenshots/** in this feature directory | Real UI evidence | ui_polisher |
| implementer-backend-summary.md; implementer-frontend-summary.md; tester-summary.md in this directory | Summaries only after independent approval | Respective backend/frontend implementer or tester |

Before optional extra files are edited, coordinator updates ownership/revision and notifies affected agents. No shared active writer; presentation transfer is recorded rather than assumed.

## Interfaces

### Interface I1: Submitted-report save

- **Module path:** src/features/reports/types.ts and reportRepository.ts.
- **Exports and types:** Report.severityRevision, ReportEditRequest, ReportEditResult, ReportRepository.editReport and structured severity_conflict error; exact signatures in design.md, Shared contracts.
- **Inputs:** Existing ReportInput plus report ID, observed nonnegative severity revision and request UUID. Actor/recipient/metadata are not caller inputs.
- **Outputs:** Canonical saved/unchanged ReportEditResult; history adds report_edited with before/after changed input fields.
- **Errors:** Existing validation/auth/forbidden/archive/not-found/state-conflict/unavailable plus severity_conflict with trusted latest revision/value and nullable actor information.
- **Side effects:** Real edit/history/optional assigned-recipient item and receipt are atomic; no-change/conflict create no report/history/mailbox mutations. Receipts only support safe replay.
- **Boundary behavior:** Existing normalized limits, missing IDs, unauthorized/state/archive denial, ABA severity change, explicit retry, same-request replay and rollback; see report-editing scenarios.
- **Consumers and owners:** Backend producer; frontend editor and tester consumers. Contract changes require a revision before affected work continues.

### Interface I2: Private mailbox

- **Module path:** src/features/mailbox/types.ts and mailboxRepository.ts.
- **Exports and types:** MailboxItem, MailboxError, MailboxRepository.listItems('all'|'unread'), markRead(id), deleteItem(id); exact signatures in design.md.
- **Inputs:** Filter/owned item ID, authenticated session; never a chosen recipient.
- **Outputs:** Recipient-only items with actor/report/project/changed-key context and persisted read state; mutations return completion or typed failure.
- **Errors:** Auth/profile/access or unavailable errors; missing/unowned delete can be indistinguishable harmless completion without information disclosure.
- **Side effects:** Mark-read changes read status only; delete removes mailbox item only; listing has none. Item creation belongs exclusively to I1.
- **Boundary behavior:** Empty/all/unread, idempotent actions, cross-account direct calls, paginated completeness, stale async completion and uncertain responses.
- **Consumers and owners:** Backend producer; frontend MailboxPage/session wrappers and tester consumers.

### Interface I3: Editor mode and session integration

- **Module path:** ReportForm.tsx, ReportEditPage.tsx, ProjectsApp.tsx, AuthenticatedApp.tsx and WorkspaceShell.tsx.
- **Exports and types:** Existing ReportForm public props remain compatible; explicit edit mode uses I1 and existing assistant. New editor/mailbox pages consume existing dependency-injection patterns.
- **Inputs:** Canonical original report/input, observed severity revision, current authenticated user and existing project/assistant dependencies.
- **Outputs:** Manual input, explicit save/cancel, visible typed feedback and current report navigation.
- **Errors:** Conflict/error feedback preserves manual fields; do not pass a conflict snapshot as savedInput because current form resets fields on that prop change.
- **Side effects:** Only explicit save calls I1; generation/application never saves or calls draft/create methods. Account change invalidates pending page results and temporary data.
- **Boundary behavior:** Existing create/draft callers unchanged; no overlapping saves, unsaved-navigation warning, no-op return, saved-response uncertainty, archive/state changes after opening.
- **Consumers and owners:** Frontend implementation; tester; ui_polisher after explicit transfer. Backend types remain backend-owned throughout.

## Implementation Tasks

| ID | Task and expected result | Owner | Status |
| --- | --- | --- | --- |
| 1.1–1.2 | Preserve/integrate development, freeze source/contracts/ownership and evidence start | Coordinator | Done at kickoff; development50d6c30, PR9 still open at resume |
| 2.1–2.2 | Protected atomic edit/mailbox persistence and adapters | Backend implementer | Implemented, verified and approved BACKEND2 |
| 2.3 | Persistence/adapter tests with partitions, boundaries and races | Tester | Approved TESTS1/2 and RACE2; local integrated179 and concurrency9 passed |
| 2.4 | Matching developer guide/setup updates | Documentation writer | DOCS2 approved; runner guide amendment awaiting renewed review |
| 2.5 | Review every backend/test submission and fix | Reviewer/coordinator | Latest backend/test submissions approved; historical failures preserved |
| 3.1–3.3 | Editor/AI reuse/mailbox/routes/session flow | Frontend implementer | Approved FRONTEND2 |
| 3.4 | UI/auth/async regressions | Tester | Approved TESTS1/2; coverage and mutation evidence separate |
| 3.5 | Matching user guides/navigation | Documentation writer | Approved DOCS2; generated report/mailbox targets verified |
| 4.1–4.2 | Rendered UI and scoped coverage | Polisher/tester/coordinator | UI2 approved; all12 files meet80%line/branch targets |
| 4.3–4.4 | Observational evidence and declared defect checks | Coordinator/race tester | Two declared defects detected; resource snapshot and manual evidence reconciled separately |
| 4.5–4.7 | Integration checks, review and post-approval summaries | Assigned roles | Revision5 approved; runner amendment and final records undergoing review |
| 4.8 | Development PR and preview verification | Coordinator | Not complete; no hosted preview or database changes claimed |

The authoritative checkbox tasks are [tasks.md](../../openspec/changes/edit-submitted-reports/tasks.md). Backend/frontend/test work can proceed with agreed contracts and separate owned files. Documentation and polish wait for affected functionality to stabilize.

## Required Test Outcomes

| ID | Behavior or risk to verify | Expected outcome | Test file and owner |
| --- | --- | --- | --- |
| T1 | Trimmed text boundaries and malformed fields | Required0 rejected,1/max accepted,max+1 rejected; optional0/max accepted,max+1 rejected; Unicode code points consistent | report-edit-repository.test.ts and existing report-validation.test.ts; tester |
| T2 | Original/other Tester, Developer, signed-out/missing profile; state/archive | Only original Tester in allowed current state/source/target may edit, including direct RPC | report-edit-database.test.ts and report-edit-ui.test.ts; tester |
| T3 | Severity ordinary/change/ABA/retry/new change | First conflict writes nothing and retains input; explicit observed-version retry can override; new conflict warns again | report-edit-repository.test.ts, report-edit-database.test.ts and report-edit-ui.test.ts; tester |
| T4 | Changed versus normalized no-op; assigned/unassigned | Atomic diff/history/recipient item or no writes; trusted current recipient | report-edit-database.test.ts and report-edit-repository.test.ts; tester |
| T5 | Lost response, repeat request and rollback | No duplicate event/item; same request payload replay only; failure rolls back all report writes | report-edit-database.test.ts and report-edit-ui.test.ts; tester |
| T6 | Cross-project move/archive/inverse move/assignment races, including each existing comment/workflow mutation | Stable records; deterministic serialization; locked current-project recheck prevents stale-source authorization or archived-destination writes | report-edit-database.test.ts and affected existing workflow/discussion database suites; tester |
| T7 | Mailbox read/mark/open/delete/privacy and pagination | Own items only, no silent truncation, persistent read, open marks read, deletion leaves report | mailbox-repository.test.ts, mailbox-database.test.ts and mailbox-ui.test.ts; tester |
| T8 | Pending/stale account/failed/empty request states | No overlapping writes, old-account rendering or false success/empty result | report-edit-ui.test.ts, mailbox-ui.test.ts and affected auth tests; tester |
| T9 | AI/manual boundaries and existing workflows | Explicit per-field application, separate save, preserved error input; no draft/create call and existing discussion unaffected | report-edit-ui.test.ts, report-suggestions-ui.test.ts and existing discussion/UI suites; tester |
| T10 | Rendered dark desktop/narrow/keyboard/error states | Actual inspectable captures and task observations, not mockup substitution | visual-review.md; ui_polisher and reviewer |

The tester can add justified cases. Test explanations must map partitions (groups expected to behave alike), boundaries, negative cases and actor/state/timing dimensions to exact executed tests. Seeded-defect checks are a declared optional local evaluation with safe restoration; Not run is not effectiveness evidence.

## Verification Commands and Gates

| Command or check | Purpose | Required when | Owner |
| --- | --- | --- | --- |
| npm run test -- --run --maxWorkers=2 | Full deterministic suite | Implementation integration | Coordinator |
| npm run test:coverage with explicit agreed include patterns and perFile lines80/branches80 | Scoped execution coverage including untested production | Feature acceptance | Tester/coordinator |
| npm run lint | ESLint | Application changes | Coordinator |
| npm run build | TypeScript and production build | Application changes | Coordinator |
| npm run docs:build | Guides/navigation and artifact rendering | Planning final check and guide changes | Coordinator |
| OpenSpec validate edit-submitted-reports --strict | Delta/planning structure | Planning and later changes | Coordinator |
| Guarded isolated database suite | Authorization, atomicity, locking and rollback | Before claiming persistence acceptance | Tester/coordinator |
| Real local/preview signed-in checks | Actual UI and integration | Before claiming rendered/preview acceptance | ui_polisher/coordinator |
| Independent reviewer approval | Latest submissions and final state | Before task completion | Reviewer |

Coverage include scope: ReportEditPage.tsx, ReportForm.tsx, ReportDetailsPage.tsx, reportRepository.ts, types.ts/validation.ts when executable/materially affected, mailbox production modules, ProjectsApp.tsx, AuthenticatedApp.tsx and WorkspaceShell.tsx. Include full scoped files; type-only N/A must be explained. Initially80%lines and80%branches per file; no automatic exception from aggregate totals. SQL and actual browser checks remain separate.

## Completion Handoffs and Submission Register

| Submission ID | Agent and plan revision | Changed files or reviewed scope | Reported behavior and actual checks | State |
| --- | --- | --- | --- | --- |
| EDIT-PLAN-1 | Coordinator; revision1 | Proposal/design/two delta specs/tasks/this plan and overall task log | Planning validation passed; reviewer found existing-action project race | Changes requested; corrected by EDIT-PLAN-2 |
| EDIT-PLAN-2 | Coordinator; revision2 | Design, report-editing scenarios, tasks and T6 current-project race correction | Strict validation, docs and artifact checks passed; fresh review complete | Approved |
| EDIT-BACKEND-1 | editing_backend_resumed; contracts3 | Report/mailbox adapters/types, migration012/verifySQL | Repo89passed; localSQLpassed; replay-after-archive and reporter-change tests reproduced review finding | Changes requested |
| EDIT-FRONTEND-1 | editing_frontend_resumed; contracts3 | Eight page/form/detail/route/auth/nav/style files | Lint passed; initial UI67passed2stale nav assertions; new tests developing | Blocked pending full evidence |
| EDIT-RACE-TESTS-1 | editing_race_tests; revision4 | Nine guarded local SQL cases | Actual8passed1inverse-wait assertion failure; default9skipped | Superseded by EDIT-RACE-TESTS-2; not approved |
| EDIT-RACE-TESTS-2 | editing_race_tests; revision4 | Transitive blocking-graph proof for queued inverse moves | Nine actual concurrency tests passed; endstate assertions retained | Approved |
| EDIT-DOCS-1 | editing_documentation; revision4 | Report/mailbox guide topics and navigation | Initial generated target evidence incomplete | Blocked, superseded by DOCS2 |
| EDIT-BACKEND-2 | editing_backend_resumed; contracts3 | Receipt authorization correction | Actual replay regressions repaired; integrated local DB evidence | Approved |
| EDIT-FRONTEND-2 | editing_frontend_resumed; contracts3 | Above-form focused conflict notice and integrated UI | Full tests and actual browser evidence | Approved |
| EDIT-TESTS-1 / EDIT-TESTS-2 | editing_tester_resumed; contracts3 | Six feature suites, ten affected files; reading-order regression |809passed210skipped full deterministic run; scoped coverage | Approved |
| EDIT-DOCS-2 | editing_documentation; revision4 | Final report/mailbox guide topics, links and navigation | Successful docs build and all four generated pages inspected | Approved |
| EDIT-UI-POLISH-1 | editing_ui_polish; revision5 | Responsive CSS and first browser checkpoint | Important additional browser operations unverified initially | Blocked, superseded by UI2 |
| EDIT-UI-POLISH-2 | editing_ui_polish; revision5 | Actual conflict/retry, move/history, loading, read action and representative keyboard evidence | No application changes after first polish; source correlation documented | Approved |
| EDIT-TEST-EFFECTIVENESS-1 | editing_race_tests; revision5 | Two declared temporary mutations with restored baselines | Both behavioral assertions detected intended defects; original files unchanged | Approved |
| EDIT-RUNNER-1 | Coordinator; revision6 | Add two feature database suites to existing hosted runner; matching guide | PowerShell syntax passed, same five selected suites121passed locally, docs build passed | Approved |

Earlier mockup submissions remain historical planning evidence. Backend1 is changes_requested, resolved by BACKEND2; FRONTEND1 is blocked and superseded by FRONTEND2. None of these first submissions is retrospectively counted as approved.

## Review Findings and Approval Decisions

editing_plan_review returned changes_requested for EDIT-PLAN-1 and combined revision1: new project movement invalidates existing comment/workflow RPC source-project assumptions. Reviewer explicitly approved EDIT-PLAN-2 and final combined revision2 after safe rechecks/regressions and final verification. EDIT-PLAN-1 remains changes_requested, resolved by replacement. This is planning approval only, not implementation approval or user approval to apply.

editing_implementation_review subsequently explicitly approved BACKEND2, FRONTEND2, TESTS1/2, RACE2, DOCS2, UI2, EFFECTIVENESS1 and final combined implementation/tests at revision5 source manifest `258f55435e99e03f7ebaab23d002ac11e4ba604bc97f76a5bb3f6aa73e2c2d95`. It verified112 file hashes, uncovered locations, actual mutant assertion failures, restored baselines, generated guide targets and representative captured screens. It reviewed retained test outputs rather than rerunning all commands. The manifest is postcapture and its correlation limits are recorded in visual-review.md. Root then changed only runner selection and its developer-guide paragraph, requiring new EDIT-RUNNER-1/docs/combined approval; application, SQL, tests and UI approvals remain applicable.

Renewed final decision: reviewer explicitly approved EDIT-RUNNER-1, updated guide/docs and combined implementation/tests against [manifest02](final-source-manifest-02.json), hash `00bdc146d34d5f2219a798381ac43a47a1422a2a3f378700052cac5b33badbe9`. All113 hashes verified; only the runner and matching guide differ from the preceding manifest. Same selected five DB suites passed121tests; docs build passed21.88seconds. No actionable implementation findings remain. Reviewer also checked four summary templates/content and usage arithmetic; telemetry selection and billing were not independently audited.

## Resolutions and Plan Revisions

Revision1 captures the approved flow; revision2 resolves the independent project-move race finding. Revision3 records apply authorization, successful fast-forward to50d6c30, preserved pre-apply patch/hash manifest,679passing/166skipped baseline tests, exact shared naming/RPC contracts and explicit user-directed code-quality metrics. Coding owners receive revision3 and route proposed contract changes through the coordinator before divergence. Planning approval remains historical; code submissions require fresh review.

Revision4 records ProjectsApp's optional mailbox dependency for compatibility with existing callers; authenticated production supplies it, and /mailbox must fail clearly if absent. MailboxPage/editor/repository signatures remain unchanged. Tester/frontend notified. Root also owns the necessary MarkBind exclusion for disposable runtime files; credentials stay outside the repository in Temp. Record initial frontend TypeScript issues and stale nav-test expectations as provisional first-pass evidence, not final quality claims.

Revision5 transfers App.css exclusively from frontend to editing_ui_polish; TSX remains frontend-owned. UI specialist also owns visual-review.md, screenshots/ and ignored visual-check.mjs. Adds independent concurrency tester ownership of report-edit-concurrency.test.ts; other tester excludes it. Backend receipt replay fix required by independent review; local tests reproduced it. One inverse-move lock-observation test is being corrected to include PostgreSQL queued blockers, with failure retained and no relaxed endstate assertion. Runtime secret files are outside repository, and current/legacy disposable runtime paths are excluded from MarkBind. All affected agents notified.

Revision6 records the original agents' four distinct post-approval summary paths, resumed execution, and coordinator-owned runner wiring of the two feature database suites. Existing eight environment settings suffice; no new credential or role contract is added. The reviewer received the amended runner/guide and final manifest and explicitly renewed approval. Product behavior, application source, SQL, tests and rendered source are unchanged. A later PR9 integration requires a new review and verification of affected work; it is still open at this checkpoint.

## Agent Summaries

| Agent and role | Unique summary file in this feature directory | Approved submissions covered | Coordinator check |
| --- | --- | --- | --- |
| editing_backend_resumed | implementer-backend-summary.md | BACKEND2, final revision5 combined | Required headings/functions/security/failure/test evidence checked; reviewer accepted |
| editing_frontend_resumed | implementer-frontend-summary.md | FRONTEND2, final revision5 combined | Required headings/functions/navigation/test/visual evidence checked; reviewer accepted |
| editing_tester_resumed | tester-summary.md | TESTS1/2, final revision5 combined | Required headings, partitions, boundaries, coverage counts and evidence levels checked; reviewer accepted |
| editing_race_tests | tester-race-summary.md | RACE2, EFFECTIVENESS1, final revision5 combined | Nine races, initial failure/repair and exact two-mutant limits checked; reviewer accepted; final coverage link corrected administratively |

Read-only planning explorer returned findings directly; no implementation/test summary due for it. Root owns this plan and final log; no competing subagent workflow logs.

## Final Verification

### Current final acceptance — base39f4f08, revision8

PR10-INTEGRATION-1 and the final combined source/tests/SQL/docs/visual scope were explicitly approved by the independent pr10_integration_review against131-file manifest `9278a2da997ba3ccb8ffdbbe50b6f465535da2e58fa7dc016f8a6b6ebd33529e`. The reviewer verified every hash, unchanged migration body except its prerequisite, preserved assistant/resolution behavior and additive fixture changes. Its execution assessment used retained outputs, not independent reruns.

| Final check | Actual outcome | Evidence and limits |
| --- | --- | --- |
| Feature-only PR candidate |1,122passed,251skipped; lint/build/docs passed | pr10-candidate-*; docs25.977seconds; no unrelated local workflow changes included |
| Scoped coverage | All12files >=80%lines/branches;908/924lines98.26%,1148/1257branches91.32% | pr10-candidate-coverage-summary/detail and pr10-coverage-locations.md; not SQL/browser proof |
| Local database |152passed across6report suites | pr10-db-tests.txt; clean001–014; no hosted database writes |
| SQL races |14passed,exit0,no unhandled errors | pr10-race-tests.txt; deterministic tested schedules only |
| Clean install and rollback SQL |001–014 applied in order, both verifiers passed | pr10-runtime-readiness.md and pr10-sqlverification-*; prior DB privately backed up |
| Actual browser |14new whole-view captures; all assigned assertions passed | pr10-visual-review.md;4images inspected by coordinator,3by reviewer; no liveAI/full accessibility/hosted claim |
| Strict spec validation |Passed after migration014/base updates | OpenSpec cached CLI; structural validation only |
| Summaries | Four contributor summaries checked; revision8 addendum retains original attribution and historical evidence | Current setup014 after001–013; older counts labelled historical |
| Source/docs whitespace |Scoped check passed | Raw command/patch evidence retains original terminal whitespace; no verification setting relaxed |

Known limits:251default skips are not passes; relevant152DB and14races ran separately, other opt-in checks are not claimed. User manual acceptance, hosted preview schema, live model calls and active human effort remain unmeasured/unverified. Usage snapshots02/03 stop before final PR10 reconciliation/publishing and are not a full feature invoice. Revision7 results below remain historical. No further source edits followed the renewed approval.

Publication: [draft PR12](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/pull/12) targetsdevelopment fromcodex/edit-submitted-reports. Corecommit8f6f4e1 contains49files; a separate evidence/specification commit follows. OpenSpec reconfirmed19/20tasks;4.8stays open because preview schema and signed-in hosted checks are unverified. Final CI status is available on the exact pushed PR head; no green status is inferred in this record. No master or production merge is authorized.

### Historical reconciliation acceptance — base9909315

The previous50d6c30 acceptance below is historical. Current application source includes merged PR9 and the approved duplicate-linked project-move restriction. Current source manifest is reconcile-source-manifest.json, with fresh source identifiers after test-only fixes. Detailed failures and repairs are retained in reconciliation-evidence.md.

| Check | Current result | Boundary |
| --- | --- | --- |
| Root deterministic/coverage |954passed246skipped; all12files >=80%line/branch,896/912lines98.24%,1117/1227branches91.03% | Includes61 unrelated local workflow tests excluded from PR |
| Exact PR candidate deterministic/coverage |893passed246skipped; all12 scoped files retain98.24%lines/91.03%branches | Source-only Node type header added afterward; runtime assertions unchanged |
| Local report DB |152passed6suites,exit0; reconcile-db-tests-accepted.txt | Fresh isolated001–013; no hosted schema changes |
| Local SQL races |14passed,exit0,no unhandled errors; reconcile-concurrency-tests-accepted.txt | Fourteen deterministic schedules, not all possible interleavings |
| Migrations/verifiers | Clean001–012resolutions+013editing and both rollback SQL verifiers passed | Existing local DB backed up privately before reset |
| Browser | RECON-UI-1 actual14whole-viewport captures and pre-run source manifest | Outgoing-link fixture; other reference variations proved separately by DB tests |
| Lint/build/docs | Root passed; exact candidate build exposed missing Node type reference in race test, fixed in RECON-TESTS-5; final candidate build/docs verification pending | First failed output preserved; no TypeScript relaxation |
| Review | Backend/frontend/docs/runner/UI and test4 approved in scoped decisions; test5/final exact-candidate combined decision pending | Earlier failed/blocked submissions retain their dispositions |
| Publication | Feature-only candidate staged; unrelated workflow/presentation changes remain local | No commit/push/PR yet at this checkpoint |

### Historical acceptance — base50d6c30

Local acceptance is supported by the checks below and explicit final independent approval at manifest02. The earlier pause checkpoint is preserved in the apply log; quota interruptions and repairs are not erased. PR9 uses migration012 too; renumber and reconcile ours if it lands first. These results apply to the current50d6c30-based implementation, not a future rebased tree.

| Command or check | Actual result and evidence | Remaining limitation |
| --- | --- | --- |
| Full deterministic scoped-coverage command |809passed210skipped; final-coverage-run.txt | Default skipped database/race suites were executed separately; skip is not pass |
| Scoped per-file coverage | All12files >=80%lines/branches;732/746lines98.12%,876/965branches90.77%; final-coverage-summary.json and coverage-source-locations.md | No percentage alone proves assertions, SQL or browser correctness |
| Local feature DB |35passed; local-feature-db-tests-final.txt | Synthetic isolated loopback Supabase, not hosted |
| Related integrated local DB |179passed across6files; local-integrated-db-tests.txt | Original full invocation absent from retained stdout; not an all-database-suite claim |
| Final runner-selected DB suites |121passed5files; runner-selected-db-tests.txt, exact invocation in tester-summary.md | Executed same selections via private local launcher, not interactive hosted login |
| Actual SQL concurrency |9passed; local-concurrency-tests-fixed.txt | Explicit disposable Docker gates, not all possible schedules |
| Migration/transaction SQL | Local migration012 and verify SQL executed successfully; local-migration-012.txt/local-sql-verification.txt | No hosted migration applied |
| Browser | Dark desktop/narrow, real conflict/retry and move/history, mark/open/delete/loading/error and representative keyboard paths; visual-review.md | AI output synthetic; no live model or exhaustive accessibility audit |
| Declared defect evaluation | Two temporary defects detected by intended assertions, baseline/restored checks passed; seeded-defect-evaluation.md | Not a general defect-detection score |
| Lint and TypeScript/Vite build | Passed; final-lint.txt/final-build.txt | Existing ineffective import warning retained |
| Documentation | Guide amendment build21.88seconds and final handoff build20.818seconds passed; runner-docs-build.txt/completion-docs-build.txt; generated report/mailbox HTML/navigation verified | Existing warnings retained; generated audit restored to preserved pre-apply copy |
| OpenSpec strict validation | Passed on resume using cached project-compatible CLI | Structural validation only |
| Diff check | Passed | Line-ending warnings are not whitespace errors |
| Usage | Fixed partial window snapshot02, arithmetic independently checked; usage-accounting.md | Later events/tool/image usage and actual charges unknown; no saving inferred |

- **Final diff inspection:** Application/test/SQL/guide scoped diff and both complete source manifests reviewed. Unrelated uncommitted workflow/presentation work preserved; generated audit restored to pre-apply copy, rather than discarding initial changes.
- **Final approval state:** All latest application, test, visual, documentation and runner submissions explicitly approved, including final combined manifest02. Original-agent summaries are present; administrative corrections do not change source approval.
- **Remaining limitations:** No hosted preview migration, Vercel walkthrough, user manual acceptance, commit or push for this feature. Actual user testing effort unknown. PR9 integration requires renumbering and renewed checks if it lands first.
- **Completion basis:** Local implementation is accepted; the overall plan stays In progress until development PR/preview requirements are addressed. No archive or master merge is implied.

Task reconciliation: cached OpenSpec apply instructions confirmed each completed checkbox immediately after its update. Final progress is19/20; only4.8remains unchecked. The prepared PR description and manual-checklist.md are handoff drafts, not an opened PR or completed preview check. All four required original-agent summaries exist, follow their templates and link existing source/evidence; final race coverage link now points to final-coverage-detail.json. Administrative updates made no subsequent application changes; manifest02 content hash reconfirmed unchanged.
