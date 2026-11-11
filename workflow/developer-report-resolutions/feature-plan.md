# Developer report resolutions - Feature Plan

## Status and Revision

- **Status:** In progress: local implementation and independent review complete; hosted SQL/integration verification and browser walkthrough await user-owned manual review.
- **Revision:** 4.
- **Updated:** 2026-11-09.
- **Coordinator:** Main chat, /root.
- **Requirement sources:** User authorized apply, then explicitly assigned hosted checks and the two-role browser walkthrough to manual review, requiring PowerShell entry points and a reminder to apply migration 012. Authoritative design revision 1 artifacts: [proposal](../../openspec/changes/developer-report-resolutions/proposal.md), [resolution spec](../../openspec/changes/developer-report-resolutions/specs/report-resolution/spec.md), [workflow delta](../../openspec/changes/developer-report-resolutions/specs/report-workflow/spec.md), [design I1-I3](../../openspec/changes/developer-report-resolutions/design.md), [tracked tasks](../../openspec/changes/developer-report-resolutions/tasks.md). BugWatch proposals alone do not authorize additional scope.

## Confirmed Requirements and Acceptance Criteria

| ID | Confirmed requirement | Observable acceptance criterion | Source |
| --- | --- | --- | --- |
| R1 | Assigned Developer records Fixed from active In progress | Four required fields, trusted author/time, Resolved state, original version/assignment retained | Resolution spec |
| R2 | Duplicate, Invalid, Cannot reproduce, Will not fix | Explanation required; Duplicate uses saved canonical target; irrelevant fix fields rejected | Resolution spec |
| R3 | Independent canonical linking | Same-project non-self submitted target, including Resolved/Closed; no transition or snapshot rewrite; no-op and stale-link handling | Resolution spec |
| R4 | Trimmed validation at both boundaries | Unicode limits 5000/100/2048, HTTP(S) host, strict runtime types and fields | Design I1-I3 |
| R5 | Atomic permission-checked persistence, shared readback | Protected metadata, immutable events, project/report locks, strict readers, safe forms and guards | Both specs |
| R6 | User-owned hosted/manual review | Apply 012 manually, run integration plus rollback SQL through PowerShell, retain unexecuted checks as pending | Latest user direction |

## Scope Exclusions and Open Decisions

- **Excluded:** Tester retesting/closure/reopening, report editing, release/transfer/archive controls, link removal, graph traversal, AI resolution assistance, provider integrations, deployment or hosted execution during this run.
- **Open decisions:** None. Manual hosted and browser evidence remains outstanding at user direction. No ordinary close action is introduced by Closed reader compatibility.

## Existing Code, Reuse, and Test Environment

- **Relevant code:** Existing report domain, validation, repository, detail UI, auth wrapper, migrations 005-011, report listing and draft receipts.
- **Reusable functionality and dependencies:** Supabase RPC/error mappings, project-before-report locks, project URL validation, scoped identities, complete paginated listing, Mantine inputs, pending/generation/readback guards, withSession. No new dependencies.
- **Related tests:** Existing report/list/draft/workflow/discussion/auth tests; four new resolution suites and necessary typed fixture adaptations.
- **Test environment:** Local npm/Vitest and explicit jsdom UI suites; hosted tests remain opt-in with distinct HTTPS origins, guarded credentials, elevated fixture setup only and ordinary-client assertions. No secrets were read or hosted actions executed. Migration 012 was available and reserved.

## File Ownership

| File or exact file pattern | Change | Single owner |
| --- | --- | --- |
| `openspec/changes/developer-report-resolutions/**`, this plan, overall log | Tracking and coordination | Coordinator |
| `src/features/reports/types.ts`, `validation.ts`, `reportRepository.ts` | I1-I3 domain/validation/readers/RPCs | backend, submitted and approved |
| `src/features/reports/database/012_report_resolutions.sql`, `verify_report_resolutions.sql` | Migration and transactional verification | backend, submitted and approved |
| `src/features/auth/AuthenticatedApp.tsx` | Session wrappers | ui, submitted and approved |
| `src/features/reports/ReportDetailsPage.tsx` | Forms/readback/guards | ui initially; transferred exclusively to polish after ui-1; final polish-2 approved |
| `src/App.css` | Scoped report presentation only | polish, approved |
| Four `src/test/report-resolution-*.test.ts` files | New validation/repository/UI/hosted tests | tester, approved |
| `src/test/application-layout.test.ts`, `project-report-list.test.ts`, `project-ui.test.ts`, `report-auth-boundary.test.ts`, `report-discussion-ui.test.ts`, `report-repository.test.ts`, `report-suggestions-ui.test.ts`, `report-ui.test.ts`, `report-workflow-ui.test.ts` | Required fixtures and auth regressions | tester, approved |
| `run-project-db-tests.ps1` | Suite registration and optional SQL verification | Coordinator, reviewer approved |
| `docs/userGuide/Reports.md`, `docs/developerGuide/Reports.md` | Existing topics extended; no navigation additions | docs, approved |
| `implementer-backend-summary.md` | Post-approval summary | backend |
| `implementer-ui-summary.md` | Post-approval summary | ui |
| `tester-summary.md` | Post-approval summary | tester |

No active source writers remain. Pre-existing unrelated worktree edits are preserved.

## Interfaces

### Interface I1: Resolution records, validation, and repository

- **Module path:** `src/features/reports/types.ts`, `validation.ts`, `reportRepository.ts`, `database/012_report_resolutions.sql`.
- **Exports and types:** Exact design revision 1 I1-I3: discriminated `ResolutionInput`, `ReportResolution`, `ResolutionFieldErrors`, extended Report/state/history, `validateResolutionInput`, `resolveReport(id,input)`, `linkDuplicate(id,targetId,expectedTargetId)`.
- **Inputs:** Applicable fields only; no actor/time/state/assignment. Canonical ID must match saved link for Duplicate.
- **Outputs:** Full Report with separate current canonical link and immutable captured Duplicate target. Snake-case wire contracts match I3.
- **Errors:** Existing safe ReportError codes; validation fields, state/link conflict, authentication, permission, archive, missing source and unavailable.
- **Side effects:** Atomic resolution/state/time/history or link/time/history. No mutation retry or external resource fetching.
- **Boundary behavior:** Strict records/history, unfinished legacy-wire compatibility, no-op identical links, stale expected-link rejection, source/target validation and serialized project/report mutations.
- **Consumers and owners:** Backend producer; UI/auth consumers; tester independent assertions. All owners confirmed before editing; no I1-I3 revisions occurred.

### Interface I2: Manual verification runner

- **Module path:** `run-project-db-tests.ps1`.
- **Exports and types:** Existing `-Suite report` plus optional `-VerifyResolutionSql`; npm invocation `npm run test:report-db -- -VerifyResolutionSql`.
- **Inputs:** Existing isolated settings/accounts; optional SQL connection host/user/port in ignored `.env.project-test.local`, psql on PATH and secure database-password prompt. No password in command arguments.
- **Outputs:** Runs resolution rollback SQL then report Vitest suites; nonzero failures; no migration application.
- **Errors:** Reject wrong suite, non-isolated origins, mismatched direct/pooler project, invalid port, missing psql/settings/password, failed SQL/tests.
- **Side effects:** Isolated transactional fixtures roll back; hosted test fixtures clean up. Process connection/auth environment restored, including PGHOSTADDR cleared during SQL invocation.
- **Boundary behavior:** Existing HTTPS production-origin rejection retained; SQL direct host or pooler username must identify the same isolated Supabase project. Hosted execution remains manual.
- **Consumers and owners:** Coordinator implementation; reviewer approved; Developer Guide documents actual prerequisites and invocation.

## Implementation Tasks

| ID | Task and result | Owner | Status |
| --- | --- | --- | --- |
| I1 | Tasks 1.1-1.5 and 1.7: contracts, migration/readers, tests, runner and developer docs | Coordinator/backend/tester/docs | Local work reviewed and complete |
| I2 | Tasks 2.1-2.6: forms/linking/readback/auth, guides and presentation | ui/tester/docs/polish | Reviewed and complete |
| I3 | Task 1.6: rollback SQL script | backend | Script implemented/reviewed; execution pending manual evidence |
| I4 | Tasks 3.1,3.3,3.4: local checks, approvals, summaries and log | Coordinator/reviewer/agents | Complete after final tracking refresh |
| I5 | Task 3.2: hosted and two-role walkthrough | User manual review | Pending; intentionally not claimed passed |

## Required Test Outcomes

| ID | Behavior or risk | Coverage | Owner |
| --- | --- | --- | --- |
| T1 | Validation boundaries/runtime types | Four outcomes plus Fixed, Unicode boundaries, required URLs, providers/host/scheme, unknown/irrelevant/forged fields | tester |
| T2 | RPC/wire/history/receipt/list compatibility | Exact payloads, mapped errors, no retry, strict metadata/state/snapshots, legacy readers | tester |
| T3 | UI/auth guards and readback | Applicable forms, actor/state/archive partitions, saved links, retained input, safe text, conflicts, uncertainty, stale responses and expiry/logout/identity replacement | tester |
| T4 | Hosted authorization and races | 25 guarded cases, ordinary client assertions, outcomes/targets/no-op/stale links/archive and transition/link races | tester; manual execution pending |
| T5 | Transaction rollback | Full-row/history rollback for Fixed/Duplicate and initial/replacement link failures, no-op and snapshot preservation | backend SQL; manual execution pending |

## Verification Commands and Gates

| Command or check | Result | Owner |
| --- | --- | --- |
| `npm run test -- --run` | Final 760 passed, 191 skipped; 28 files passed, 7 skipped | Coordinator |
| `npm run lint` | Passed on final work | Coordinator/tester/polish |
| `npm run build` | Passed; existing ineffective dynamic import warning | Coordinator/tester/polish |
| `npm run docs:build` | Passed; 95 pages; existing missing undici variables/unrelated links warnings | Coordinator/docs |
| `openspec validate developer-report-resolutions --strict` | Passed | Coordinator |
| PowerShell parser and scoped `git diff --check` | Passed | Coordinator/reviewer |
| Apply 012, `npm run test:report-db -- -VerifyResolutionSql` | Not executed; manual prerequisites and invocation documented | User |
| Two-role browser walkthrough | Not executed; manual checklist documented | User |
| Independent submission and combined approval | Current backend/UI/test/polish/docs/runner and combined state approved | reviewer |

## Completion Handoffs and Submission Register

| Submission | Agent/revision | Scope and checks | State |
| --- | --- | --- | --- |
| backend-1 | backend; plan 2/design 1, manual override in plan 3 | Five backend files; 322 targeted tests and lint passed | Approved |
| ui-1 | ui; plan 2 | Detail UI/auth; initially exposed stale fixtures | Changes requested, superseded by ui-2/polish-2 |
| polish-1 | polish; plan 3 | Scoped CSS and description association; 71 existing UI tests passed | Changes requested, superseded by polish-2 |
| polish-2 | polish; plan 3 | Synchronous event capture fixes tester-discovered typing crash; lint/build passed | Approved |
| ui-2 | ui; plan 3 | Current corrected functional UI/auth, no edits; 66 UI/auth tests passed | Approved |
| tester-1 | tester; plan 3 | Four new suites and nine existing adaptations; 163 targeted passed/25 hosted skipped, lint/build passed | Approved |
| docs-1 | docs; plan 3 | Both existing Reports topics; docs build passed | Approved |
| Coordinator runner | Coordinator; plan 3 | Isolated suite plus SQL entry point and secure environment handling | Approved |

## Review Findings and Approval Decisions

| Submission or combined scope | Reviewer decision | Evidence and limits |
| --- | --- | --- |
| backend-1 | approved | Constraints, trusted metadata, permissions, locks, immutable history, strict readers reviewed; hosted execution manual |
| ui-1 and polish-1 | changes_requested | Deferred updater read event.currentTarget after React cleared it, crashing typing; preserved historical disposition |
| polish-2 | approved | All five resolution field handlers capture values synchronously; presentation/accessibility preserved |
| ui-2 | approved | Corrected current functional scope and session wrappers reviewed |
| tester-1 | approved | Meaningful positive/negative/boundary/regression tests; guarded hosted assertions; existing assertions preserved |
| docs-1 and coordinator runner | approved | Actual behavior, secure isolated runner, exact manual prerequisites and commands consistent |
| Final combined production/tests/guides/runner | approved | Explicit final reviewer decision after 759 passed/191 skipped, lint/build/docs passed; hosted/browser verification intentionally user-owned |

No actionable findings remain. A tentative reviewer ACE-host concern was investigated and withdrawn as unreproduced; it was not treated as a defect or patched.

## Resolutions and Plan Revisions

| Revision or finding | Resolution | Agents notified | Follow-up |
| --- | --- | --- | --- |
| 1 | Planning artifacts ready, no implementation authorization then | No agents assigned | User requested apply |
| 2 | Apply authorized, current worktree inspected, 012 reserved, exclusive backend/UI/test ownership and unchanged I1-I3 confirmed | backend/ui/tester before editing | Initial submissions |
| 3 | User assigned hosted/browser checks to manual review and required PowerShell entry points; runner contract added, docs aligned; presentation ownership transferred exclusively to polish | All affected owners and reviewer | Final manual handoff |
| Typing regression | Tester reproduced deferred React event crash; polish captured input values synchronously | ui/polish/tester/reviewer | polish-2 and ui-2 approved; regression tests pass |
| Initial integration failures | Required mock/fixture and test inference/query corrections, without weakening assertions | tester | Final local checks pass |

## Agent Summaries

| Agent | Summary | Approved submissions | Coordinator check |
| --- | --- | --- | --- |
| backend | `implementer-backend-summary.md` | backend-1 and combined | Exists; template sections and accurate five-file/function coverage inspected |
| ui | `implementer-ui-summary.md` | ui-2 and combined; acknowledges polish-2 | Exists; template sections and functional scope/checks inspected |
| tester | `tester-summary.md` | tester-1 and combined | Exists; template sections, added/changed files and behavioral coverage inspected |

Polisher and documentation writer summaries are not required by the repository templates; their completion reports are recorded above. All summaries were requested only after final explicit approval and changed no source/test files.

## Final Verification

- Final full test run: 760 passed, 191 skipped (951 total), 28 passing files and 7 skipped, exit 0. The skipped set includes 25 new hosted resolution cases and other opt-in suites; skips are not passes.
- Final lint, TypeScript/Vite production build and MarkBind build passed. Existing unrelated build/documentation warnings remain.
- OpenSpec strict validation, runner syntax parsing and scoped whitespace checks passed.
- Final scoped implementation/test/SQL/guide diffs inspected; initial unrelated `_markbind/logs/audit.json`, `docs/.gitkeep`, `site.json`, `.mcp.json` and prior logs remain outside scope and preserved.
- Overall interaction record: `logs/2026-11-08-apply-developer-report-resolutions.md`.
- Current approval covers all latest functional/presentation/test/documentation/runner submissions. No relevant source changes occurred after approval; summaries/tracking/logs are administrative.
- Tracked local work: 15/17 tasks complete after final tracking refresh. Tasks 1.6 and 3.2 remain open for manual execution evidence. The plan is intentionally not marked Complete and the change is not archived.
- Manual handoff: apply `012_report_resolutions.sql` after prerequisites 001-011 in the isolated project, configure SQL settings/psql per Developer Guide, run `npm run test:report-db -- -VerifyResolutionSql`, and perform the documented two-role walkthrough. No hosted or browser check was performed during this run.

### Revision 4: Duplicate-only canonical controls

The user requested that canonical selection appear only while the Developer is resolving an In progress report with Duplicate selected, as a field inside that resolution form instead of a standalone section. This supersedes the original UI placement without changing I1-I3, SQL, or the explicit link-save prerequisite. Saved canonical links remain readable. Root handled the small coupled amendment directly: ReportDetailsPage.tsx, associated scoped App.css selectors, report-resolution-ui.test.ts, report-auth-boundary.test.ts, both Reports guide topics, proposal/design and workflow delta. No other source owner is active; independent reviewer has read-only responsibility. Prior component/test/doc approval is stale for these amended files pending fresh review; backend/runner are unchanged.

Targeted UI/auth checks passed 67 tests. Regression coverage proves absence before resolution and for every non-Duplicate outcome; field/button belong to the resolution form; no nested form; switch/cancel hides controls; ineligible states/roles/archive stay hidden; link-save does not submit resolution; existing guards and auth boundaries continue through the Duplicate form. Existing saved readback is preserved. Whole-suite/lint/build/docs verification is in progress. No new implementer/tester summary is required for this root-handled follow-up; existing revision-3 summaries remain historical records of their approved submissions. Manual hosted/browser handoff and open tasks 1.6/3.2 remain unchanged. Submission canonical-placement-1 awaits independent approval, including combined amended behavior/tests/guides/specs.

Revision-4 completion: canonical-placement-1 received changes_requested for an outdated Developer Guide browser instruction to replace a link after resolution. Root corrected the walkthrough to use the unchanged isolated RPC suite/prepared fixture for that persistence check and to verify absent UI controls after resolution. Root shortened an overlong resolution requirement after strict CLI validation warned about the 500-character limit; strict validation then passed. Replacement canonical-placement-2 and final combined amended state were explicitly approved by independent reviewer against plan revision 4/design revision 2. No actionable findings remain. Final checks: 760 passed/191 skipped (951 total; 28 files passed/7 skipped), lint passed, build passed, docs build passed (95 pages), OpenSpec strict validation and scoped whitespace checks passed. Existing unrelated warnings remain. No source/test edits followed approval. This UI follow-up is complete; the overall change retains only its existing user-owned manual tasks 1.6/3.2. New interaction log: logs/2026-11-09-restrict-canonical-report-controls.md. Prior revision-3 agent summaries remain historical; root handled all implementation/tests/docs for this small amendment directly, so no new implementer/tester summaries apply.
