# Accept and start report investigation — Feature Plan

## Status and Revision

- **Status:** Complete: implementation, verification, independent approval and post-approval summaries are complete.
- **Revision:** 5.
- **Updated:** 2026-11-07.
- **Coordinator:** Main chat /root.
- **Requirement sources:** Revision 1 of [proposal](../../openspec/changes/archive/2026-11-07-accept-and-start-report-investigation/proposal.md), [spec](../../openspec/changes/archive/2026-11-07-accept-and-start-report-investigation/specs/report-workflow/spec.md), [design](../../openspec/changes/archive/2026-11-07-accept-and-start-report-investigation/design.md), and [tasks](../../openspec/changes/archive/2026-11-07-accept-and-start-report-investigation/tasks.md). User explicitly authorized apply.

## Confirmed Requirements and Acceptance Criteria

| ID | Confirmed requirement | Observable acceptance criterion | Source |
| --- | --- | --- | --- |
| R1 | Developer accepts Open unassigned reports in active projects | First acceptance assigns caller and enters Accepted atomically; concurrent/repeated attempts cannot replace assignment | Spec: Developer acceptance |
| R2 | Explicit assignee-only investigation start | Accepted enters In progress with preserved assignment/time; other actors/states rejected | Spec: Explicit investigation start |
| R3 | Trusted authorization and atomic history | Role/archive/identity checks at persistence, no direct bypass, one event per transition, rollback on history failure | Spec: Trusted workflow authorization; Atomic workflow history |
| R4 | Detail-only actions and shared persisted readback | Eligibility matrix, pending guard, labels/time/history, no listing actions, safe literal identity labels | Spec: Detail-only workflow controls; Shared workflow readback |
| R5 | Deliberate outcomes and compatibility | Authoritative refresh, read-only uncertain recovery, session/stale completion handling; preserve submission/drafts/navigation/pagination | Spec: Deliberate workflow outcomes; design I1/I2 |

## Scope Exclusions and Open Decisions

- **Excluded:** Release/transfer, resolution, discussion, generic report editing, notifications, profile directory, new dependencies, production deployment, and changes to other in-flight OpenSpec artifacts.
- **Open decisions:** None. Required migrations, SQL, hosted tests and manual checks now reported passed by user; agent-local checks passed as recorded below.

## Existing Code, Reuse, and Test Environment

- **Relevant code:** `src/features/reports/{types.ts,reportRepository.ts,ReportDetailsPage.tsx,ProjectReportsPanel.tsx}`, migrations 005–007, `src/features/projects/ProjectsApp.tsx`, `src/features/auth/AuthenticatedApp.tsx`.
- **Reusable functionality and dependencies:** Existing Supabase scoped RPCs, profile checks, project locking, ReportError, session wrapper, Mantine badges and project presentation classes. No dependency changes.
- **Related tests:** `src/test/report-repository.test.ts`, `report-ui.test.ts`, `report-drafts-ui.test.ts`, `project-report-list.test.ts`, `report-auth-boundary.test.ts`, `report-database.test.ts`.
- **Test environment:** Local Vitest, Testing Library/jsdom per-file setup, mocked RPCs. Hosted suite requires distinct isolated origin, service role and two Developer/Tester tokens; runner prompts for secrets. `.env.project-test.local` exists; no secrets are recorded here. Ordinary hosted skips are not passes.

## File Ownership

| File or exact file pattern | Planned change | Single active owner |
| --- | --- | --- |
| `src/features/reports/types.ts`, `reportRepository.ts` | Workflow contracts/readback/actions | implementer |
| `src/features/reports/ReportDetailsPage.tsx`, `ProjectReportsPanel.tsx` | Functional work released by implementer; scoped presentation pass | ui_polisher |
| `src/features/reports/database/008_report_workflow.sql`, `verify_report_workflow.sql` | Migration and rollback verification | implementer |
| `src/features/projects/ProjectsApp.tsx`, `src/features/auth/AuthenticatedApp.tsx` | Trusted identity/session integration | implementer |
| `src/test/report*.test.ts`, `src/test/project-report-list.test.ts`, affected `src/test/*auth-boundary.test.ts`, `src/test/application-layout.test.ts`, `src/test/project-ui.test.ts` | Workflow tests and necessary fixture updates only | tester |
| `run-project-db-tests.ps1` | Report suite selection only | coordinator |
| `docs/userGuide/Reports.md`, `docs/developerGuide/Reports.md` | Final implemented behavior | documentation_writer after stabilization |
| This plan; selected OpenSpec tasks; overall log | Tracking and integration | coordinator |
| `implementer-summary.md` | Post-approval summary | implementer after approval |
| `tester-summary.md` | Post-approval summary | tester after approval |
| `preview.html`, `preview.tsx` in this feature directory | Temporary mocked visual harness, remove after verification | ui_polisher |

Presentation ownership transferred exclusively to ui_polisher after IMP-1 released detail/list files. Documentation writer owns the two Reports guide topics now that functional work is submitted. Unrelated existing changes include MarkBind audit, deleted docs placeholder, .mcp.json, historical logs, and untracked selected proposal artifacts. Preserve them. In-flight submission/drafts/UI changes share current source assumptions; preserve their implemented behavior and do not edit their artifacts.

## Interfaces

### Interface I1: Report persistence contract

- **Module path:** `src/features/reports/types.ts`, `reportRepository.ts`, migration 008.
- **Exports and types:** Exact revision-1 design section 2 contract: ReportState; extended Report/ProjectReportSummary identity metadata; discriminated history; `acceptReport(id: string): Promise<Report>`; `startInvestigation(id: string): Promise<Report>`.
- **Inputs:** Only UUID report ID for mutations; existing creation/draft inputs unchanged.
- **Outputs:** Persisted report including assignment metadata; scoped identity labels; existing pagination preserved. SQL RPCs `accept_report(p_report_id uuid)` and `start_report_investigation(p_report_id uuid)` return extended report JSON.
- **Errors:** Existing P2001–P2005 preserved; P2006 → already_assigned; P2007 → state_conflict; malformed IDs → not_found without RPC; malformed rows → unavailable.
- **Side effects:** Atomic authorized transition plus immutable event; no navigation.
- **Boundary behavior:** First-wins accept; assignee-only start; preserve assignment time; no writes/events after rejection; history failure rollback; old draft receipt can decode progressed report.
- **Consumers and owners:** Implementer produces; tester consumes. Both must acknowledge exact design I1 before edits; proposed revisions route to coordinator.

### Interface I2: Detail actions

- **Module path:** `src/features/reports/ReportDetailsPage.tsx`.
- **Exports and types:** `ReportDetailsPage({reportRepository, user}: {reportRepository: ReportRepository; user: SessionUser})` per design section 3.
- **Inputs:** Trusted session user passed from ProjectsApp; wrapped repository from AuthenticatedApp.
- **Outputs:** Eligible detail-only action, Activity history, state/assignee/time, safe outcome feedback and Reload recovery.
- **Errors:** Conflicts refresh; uncertain outcome/readback failure disables mutations until reads succeed; expiry uses existing wrapper.
- **Side effects:** Explicit actions only; one pending request; report/history refresh; no navigation.
- **Boundary behavior:** Guard report, mount and user identity; no stale completion on replacement page; literal labels/fallbacks; no listing actions.
- **Consumers and owners:** Implementer produces; tester verifies; ui_polisher later owns presentation exclusively.

## Implementation Tasks

| ID | Task and expected result | Owner | Status |
| --- | --- | --- | --- |
| 1.1–1.2 | Initialize plan and confirm I1/I2 before independent edits | coordinator | Complete; both acknowledged |
| 2.1–2.2, 2.5 | Migration, persistence, rollback SQL | implementer | Complete; IMP-1 approved with user-reported isolated results |
| 2.3–2.4, 3.3 | Repository/UI/database coverage and regressions | tester | Complete; TEST-1/TEST-2 approved and user reports hosted suite pass |
| 2.6 | Extend isolated report-suite discovery | coordinator | Complete; runner syntax checked and user reports both-suite command passed |
| 3.1–3.2 | Detail actions and readback | implementer | Complete; final review and user manual checks passed |
| 3.4 | Scoped responsive/accessibility pass after ownership transfer | ui_polisher | Complete; user reports manual checks passed and reviewer approves UI-1 |
| 2.7, 3.5 | Final guides | documentation_writer | Complete; DOC-1 approved |
| 4.1–4.3 | Verification, browser walkthrough and review | coordinator/reviewer | Complete; final review approved |
| 4.4 | Summaries and final administrative closure | coordinator | Complete; both template-based summaries inspected and overall logs finalized |

Authoritative descriptions and completion checkboxes remain in the linked tasks artifact. Checkboxes require specified verification and current approval.

## Required Test Outcomes

| ID | Behavior or risk to verify | Expected outcome | Test file and owner |
| --- | --- | --- | --- |
| T1 | I1 decoding/errors/labels/pagination/receipt regressions | All valid states decode; malformed combinations fail; RPC contract/error mapping preserved | `src/test/report-workflow-repository.test.ts` and affected report fixtures — tester |
| T2 | I2 role/state/archive, pending, conflicts, uncertain reads, stale identity/session | Only eligible explicit actions, authoritative updates, no automatic retries or stale completion | `src/test/report-workflow-ui.test.ts` and affected UI/auth fixtures — tester |
| T3 | Authorization, race, atomicity and persisted readback | One winner/event; forbidden writes unchanged; history rollback | `src/test/report-workflow-database.test.ts` — tester; rollback SQL — implementer |

## Verification Commands and Gates

| Command or check | Purpose | Required when | Owner |
| --- | --- | --- | --- |
| `npm run test -- --run` | Full Vitest suite | Application edits | coordinator |
| `npm run lint` | ESLint | Application edits | coordinator |
| `npm run build` | TypeScript/Vite | Application edits | coordinator |
| `npm run docs:build` | MarkBind | Guides | coordinator |
| `npm run test:report-db` | Both report hosted suites, isolated only | Migration/workflow | coordinator |
| `verify_report_workflow.sql` in isolated SQL editor | Forced history rollback | Migration | coordinator |
| Isolated two-Developer/Tester browser walkthrough | Responsive/keyboard and actual persisted flow | Final verification | coordinator/ui_polisher |
| Independent explicit approval | Every submission and final combined state | Before completion | reviewer |

## Completion Handoffs and Submission Register

Implementer and tester acknowledged exact I1/I2 before editing at revision 1; no interface change.

| Submission ID | Agent and plan revision | Changed files or reviewed scope | Reported behavior and actual checks | State |
| --- | --- | --- | --- | --- |
| IMP-1 | implementer; revision 2 | All eight assigned source/SQL files | I1/I2, migration and rollback SQL; local checks passed, isolated success now user-reported | Approved against final revision-5 state |
| TEST-1 | tester; revision 4 | Three new workflow suites; affected existing repository/UI/auth/list/layout fixtures | 451 passed/129 local hosted skips; user now reports hosted runner passes with TEST-2 | Approved with TEST-2 correction |
| DOC-1 | documentation_writer; revision 3 | Existing User/Developer Reports topics | Usage, migration, security, locking, recovery and verification; docs build 159 pages passed with existing warnings | Approved by reviewer |
| UI-1 | ui_polisher; revision 4 | ReportDetailsPage.tsx and ProjectReportsPanel.tsx | Mantine buttons/action group, state badge colors, stronger actor labels; 58 focused UI tests passed; manual success user-reported | Approved |
| TEST-2 | tester; revision 5 | Only report-workflow-database.test.ts timeout/comment | 30-second budget for 24-request investigation scenario; unchanged assertions/Promise.all; scoped checks passed; user reports hosted rerun pass | Approved |

## Review Findings and Approval Decisions

| Submission ID or combined work | Reviewer and reviewed revision/state | Decision | Findings, limits, and outstanding requirements |
| --- | --- | --- | --- |
| IMP-1 core | reviewer; revision 4 core source/SQL | blocked | No actionable static defect; pending isolated migration/race/rollback evidence and final UI-1 presentation state |
| TEST-1 | reviewer; revision 4 stable tests | blocked | No actionable test defect; actual isolated execution required by task 2.4 remains pending; 20 workflow cases skipped locally |
| DOC-1 | reviewer; revision-3 submission/current guides | approved | Matches actual source/runner, no actionable documentation findings; relies on reported 159-page build; no hosted/browser claim |
| IMP-1 final | reviewer; final revision-4 state | blocked | No actionable defects; isolated migration, concurrent transitions and rollback SQL evidence pending |
| TEST-1 final | reviewer; final revision-4 state | blocked | No actionable defects; actual isolated execution including 20 workflow cases pending |
| UI-1 | reviewer; final revision-4 state | blocked | No actionable defects; observed narrow/wide layout and keyboard checks pending |
| Final combined implementation/tests/docs/runner | reviewer; final revision-4 state after all coordinator checks | blocked | No requested code fixes; all local checks passed, but required external verification prevents approval |
| UI-1 refreshed | reviewer; revision-5 user evidence and unchanged presentation | approved | User reports all requested manual checks passed; visual evidence is user-reported, not agent-observed |
| TEST-2 | reviewer; revision-5 exact timeout/comment change | approved | Finite deadline appropriate for 24 requests; all assertions and concurrency preserved; local lint/tsc/diff checks passed, actual hosted rerun remains required |
| IMP-1 final refreshed | reviewer; final revision-5 state plus user hosted success | approved | No actionable defects; migration/rollback/manual/hosted checks user-reported passed |
| TEST-1 with TEST-2 | reviewer; final revision-5 state plus user hosted success | approved | Initial TEST-1 hosted blocker resolved; TEST-2 approved separately and in combined scope; no assertions or concurrency removed |
| TEST-2, UI-1 and DOC-1 final | reviewer; final revision-5 state | approved | Each explicitly approved; hosted/browser evidence user-reported, local checks as recorded |
| Final combined implementation/tests/docs/runner refreshed | reviewer; final revision-5 state | approved | No actionable defects or verification blockers; independent diff-check passed; precise hosted counts not supplied |

## Resolutions and Plan Revisions

| Revision or finding | Resolution and affected files/contracts | Affected agents notified | Follow-up submission or review |
| --- | --- | --- | --- |
| 1 | Adopt exact revision-1 I1/I2; both owners acknowledged before editing | implementer/tester acknowledged | Confirmed |
| 2 | Extend tester ownership to fixture-only application-layout.test.ts/project-ui.test.ts; interfaces unchanged | Both notified before affected edits | TEST-1 final approved |
| 3 | IMP-1 submitted; transfer detail/list presentation ownership exclusively to ui_polisher; guides assigned to documentation writer | Owners notified in assignments | UI-1, DOC-1 and combined work approved |
| 4 | Authorize temporary local mocked preview files for visual QA only; no backend access, app entry/config/dependency edits; remove after checks | ui_polisher notified; remaining owners informed | Preview removed/server stopped; actual manual walkthrough user-reported passed |
| 5 | Give long hosted investigation scenario finite 30-second budget; preserve concurrency/assertions and application contracts; user subsequently reports all hosted tests pass | Tester/reviewer notified in follow-up assignments | TEST-2 and final combined review approved; blocker resolved |

## Agent Summaries

| Agent and role | Unique summary file in this feature directory | Approved submissions covered | Coordinator check |
| --- | --- | --- | --- |
| implementer | `implementer-summary.md` | IMP-1 final approved | Exists; template headings, files/functions and scope inspected; summary-only edit |
| tester | `tester-summary.md` | TEST-1 and TEST-2 final approved | Exists; template headings, case families, changed fixtures and evidence attribution inspected; summary-only edit |

## Final Verification

| Command or check | Actual result and evidence | Remaining limitation |
| --- | --- | --- |
| OpenSpec list/status/apply | Final apply refresh confirms 18/18 complete, 0 remaining, state all_done | None |
| Required repository/skill/artifact reads | Completed | None |
| Runner PowerShell AST parse | Passed after report-suite discovery extension; user subsequently reports both-suite command passes after TEST-2 | Hosted execution user-reported |
| Hosted verification handoff | User reports all requested migrations/SQL checks/manual checks passed, and final hosted rerun now passes | No credentials requested in chat; precise hosted counts not supplied |
| `npm run test -- --run` | Coordinator rerun passed: 451 passed, 129 skipped; 18 passed files, 4 skipped hosted files | Hosted skips are not passes |
| `npm run lint` | Passed final coordinator check after UI-1 | None |
| `npm run build` | Passed final coordinator check after UI-1 | None |
| `npm run docs:build` | Passed final coordinator check, 159 pages; existing undici variables and unrelated intra-link warnings | No hosted/browser validation implied |
| OpenSpec strict validation | Passed final `openspec validate accept-and-start-report-investigation --strict` after all tasks completed | None |
| Browser verification | Agent runtime unavailable; user subsequently reports all requested manual checks passed | User-reported evidence, not agent browser observations |
| Temporary fixture cleanup | Preview HTML/TSX removed; ui_polisher confirms Vite session 36996 terminated with Ctrl+C | None |
| `git diff --check` | Passed final check | None |
| User follow-up verification | Initial single 5000ms timeout led to TEST-2; user subsequently reports all hosted report tests pass | No database or product code change was required |
| TEST-2 local validation | Tester reports focused Vitest: 20 skipped without isolated credentials; scoped ESLint, tsc -b --pretty false and diff-check passed | Successful hosted rerun separately user-reported |
| Final hosted rerun | User reports all tests from `npm run test:report-db` pass after TEST-2 | User-reported execution; precise hosted counts not supplied and not inferred |

- **Final diff inspection:** Combined source, test fixture, guide, runner and workflow scope inspected; new SQL/test files independently reviewed. Unrelated existing files preserved; MarkBind build also updates its already-modified audit artifact.
- **Final approval state:** IMP-1, TEST-1 with TEST-2, TEST-2, UI-1, DOC-1 and final combined work explicitly approved against final revision-5 state. No later source/test/presentation edits.
- **Remaining limitations:** No unresolved implementation or verification blockers. Hosted/database/browser evidence is user-reported rather than agent-observed, with no precise hosted counts supplied. Existing unrelated documentation warnings remain.
- **Completion basis:** Confirmed requirements implemented; required local and user-run checks passed; every submission and final combined work explicitly approved; both assigned agents wrote their own template-based summaries and coordinator verified them; final scoped diff/logs inspected. Main report-workflow spec synced and validated; change archived at openspec/changes/archive/2026-11-07-accept-and-start-report-investigation/. No production deployment performed.

### Archive record

- Archived on 2026-11-07 after user selected sync then archive. All four planning artifacts and 18/18 tasks were complete, and current explicit reviewer approvals and post-approval summaries were confirmed. The seven added requirements were synced into openspec/specs/report-workflow/spec.md with Purpose and scenarios preserved; all three main specs and strict report-workflow validation passed. Archive metadata is preserved. Existing implementation approval is unaffected by this administrative move.

### Pull request publication

- Published as draft [PR #6](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/pull/6) from upstream `feature/accept-and-start-report-investigation` to upstream `development`.
- Branch starts at PR #5's `ui-polish` head `9a298e6`. The description explicitly requests reviewers merge PR #5 first, then recheck comparison and CI; a squash merge may require rebasing away prerequisite commits.
- Feature changes are grouped into database/security/hosted checks, application/local tests, guide updates, specification/workflow records, and publication handoff commits. Detailed description is preserved in `pull-request.md`.
- Unrelated local modifications remain uncommitted. No implementation/test edits were introduced by publication, so final review approvals remain current. Publication evidence is in `logs/2026-11-07-create-report-workflow-feature-pr.md`.
