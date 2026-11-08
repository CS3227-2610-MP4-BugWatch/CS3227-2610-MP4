# Manage clarification and discussion - Feature Plan

## Status and Revision

- **Status:** Complete and archived at `openspec/changes/archive/2026-11-08-manage-clarification-and-discussion/`. All 22 tasks are complete and both capability deltas are synced to main specs. Implementation/closeout approvals and user-reported external verification remain recorded separately from agent-run local results.
- **Revision:** 9.
- **Updated:** 2026-11-08.
- **Coordinator:** Main chat (`/root`).
- **Requirement sources:** User exploration decisions in this conversation; [proposal](../../openspec/changes/archive/2026-11-08-manage-clarification-and-discussion/proposal.md), [discussion delta](../../openspec/changes/archive/2026-11-08-manage-clarification-and-discussion/specs/report-discussion/spec.md), [workflow delta](../../openspec/changes/archive/2026-11-08-manage-clarification-and-discussion/specs/report-workflow/spec.md), [design revision 3](../../openspec/changes/archive/2026-11-08-manage-clarification-and-discussion/design.md), and [tasks](../../openspec/changes/archive/2026-11-08-manage-clarification-and-discussion/tasks.md). These are the authoritative planning artifacts; existing implementation and confirmed requirements are distinguished in the proposal.

## Confirmed Requirements and Acceptance Criteria

| ID | Confirmed requirement | Observable acceptance criterion | Source |
| --- | --- | --- | --- |
| R1 | Independent assignee-only clarification transitions | Wait without any comment; resume without a reply; neither posting nor replying changes state | Workflow delta: Explicit clarification state |
| R2 | One chronological shared conversation | Both authenticated roles post; references navigate to earlier same-report comments without nested threads | Discussion delta: Shared report conversation; Replies reference the same conversation |
| R3 | Conversation and Activity layout | Details initially expanded/collapsible above discussion; header/actions outside tabs; history accessible separately | Discussion delta: Conversation and Activity navigation |
| R4 | Compact, complete history | Actor/time/action visible; recorded changes and original creation snapshot expandable | Discussion delta: Compact complete activity |
| R5 | Persistence authorization and reliable outcomes | Forbidden/archived/concurrent requests preserve data; successful transitions commit one event; errors, expiry and stale completions handled | Both delta specs: access boundaries and deliberate outcomes |
| R6 | Return navigation and visibly selected tabs | Breadcrumb removed; Back to project reports highlights on hover with centered text/icon; Conversation/Activity retain flat tabs with a distinct selected underline and text | User UI follow-ups, latest 2026-11-08 supersedes breadcrumb styling request |

## Scope Exclusions and Open Decisions

- **Excluded:** Product exclusions in proposal.md; unrelated changes; production deployment or hosted migration without separately confirmed environment authorization. This apply workflow implements source, tests, local SQL artifacts and guide changes.
- **Open decisions:** None. Product owner confirmed the 5,000-code-point limit; numeric spec/design updated before implementation.
- **Integration prerequisite:** Upstream development `5b8d605` integrated on 2026-11-08. Its Tester assistant owns quota migrations 009 and 010; our unapplied clarification migration is now 011. Both feature implementations and guides must remain intact. Earlier 009 references in revision/submission history describe their original reviewed state.

## Existing Code, Reuse, and Test Environment

- **Relevant code:** `src/features/reports/ReportDetailsPage.tsx`, `types.ts`, `reportRepository.ts`, `validation.ts`; `src/features/auth/AuthenticatedApp.tsx`; `src/App.css`; migration `008_report_workflow.sql`.
- **Reusable functionality and dependencies:** Existing ReportRepository/ReportError, strict row decoding, Unicode validation, authenticated `withSession`, project-before-report locking, immutable workflow history, Mantine tabs/disclosures and existing React Router report route. No dependency changes planned.
- **Related tests:** `src/test/report-workflow-ui.test.ts`, `report-workflow-repository.test.ts`, `report-workflow-database.test.ts`, `report-auth-boundary.test.ts`, `report-ui.test.ts`, and report/draft regression suites.
- **Test environment:** Local Vitest; jsdom and Testing Library for UI; mocked Supabase repositories for deterministic cases. Hosted suites require explicit isolated PROJECT_TEST configuration via the existing runner; SQL fault injection requires an isolated database. None of these application checks ran during proposal creation.

## File Ownership

Revision 2 assigns `backend` implementer to types/repository/validation/auth/database files, `page` implementer to ReportDetailsPage and scoped App.css, and `tests` tester to all src/test changes. No agent may change another owner's files. The page owner consumes the exact design interfaces while backend creates them. UI polish will receive page/style ownership only after page implementation is submitted. No agents may spawn further agents.

Exact existing test scope: `src/test/application-layout.test.ts`, `project-report-list.test.ts`, `project-ui.test.ts`, `report-auth-boundary.test.ts`, `report-drafts-ui.test.ts`, `report-repository.test.ts`, `report-ui.test.ts`, `report-workflow-repository.test.ts`, `report-workflow-database.test.ts`, `report-workflow-ui.test.ts`; add `report-discussion-validation.test.ts`, `report-discussion-repository.test.ts`, `report-discussion-database.test.ts`, and `report-discussion-ui.test.ts`. Other tests only if a typed ReportRepository fixture requires the same new methods; notify coordinator before expanding assertions.

| File or exact file pattern | Planned change | Single active owner |
| --- | --- | --- |
| `openspec/changes/archive/2026-11-08-manage-clarification-and-discussion/**` | Planning artifacts and task tracking | Coordinator |
| `workflow/manage-clarification-and-discussion/feature-plan.md` | Ownership, contracts and review tracking | Coordinator |
| `logs/2026-11-07-propose-manage-clarification-and-discussion.md` | This proposal interaction record | Coordinator |
| `src/features/reports/types.ts` | State/history/comment contracts | backend - implementer |
| `src/features/reports/reportRepository.ts` | Workflow/comment RPC mapping and decoding | backend - implementer |
| `src/features/reports/validation.ts` | Comment validation after limit confirmation | backend - implementer |
| `src/features/auth/AuthenticatedApp.tsx` | New method session wrapping | backend - implementer |
| `src/features/reports/database/011_report_clarification_discussion.sql` | New migration; confirm number before assignment | backend - implementer |
| `src/features/reports/database/verify_report_clarification_discussion.sql` | Transaction verification | backend - implementer |
| `src/features/reports/ReportDetailsPage.tsx` | Navigation button presentation; original PAGE-1 behavior retained | Coordinator exclusively for revision 6 follow-up |
| `src/App.css` | Scoped navigation hover and flat active-tab styles | Coordinator exclusively for revision 6 follow-up |
| `src/test/*.test.ts` | Scoped new suites and required existing fixtures/assertions listed in tasks | tests - tester; exact scope listed above |
| `run-project-db-tests.ps1` | Include new database suite, preserve isolation safeguards | Coordinator, serialized |
| `docs/userGuide/Reports.md` | Implemented conversation/clarification instructions | Documentation writer, planned |
| `docs/developerGuide/Reports.md` | Implemented persistence/migration/verification handoff | Documentation writer, planned |
| `_markbind/layouts/default.md` | None expected; only if a justified new guide topic is approved | Coordinator, serialized |
| `workflow/manage-clarification-and-discussion/implementer-backend-summary.md` | Post-approval summary only | backend after review |
| `workflow/manage-clarification-and-discussion/implementer-page-summary.md` | Post-approval page summary only | page after review |
| `workflow/manage-clarification-and-discussion/tester-summary.md` | Post-approval summary only | Participating tester after review |

## Interfaces

### Interface I1: Clarification operations

- **Module path:** `src/features/reports/types.ts` and `reportRepository.ts`.
- **Exports and types:** Authoritative signatures and state/history additions in [design I1](../../openspec/changes/archive/2026-11-08-manage-clarification-and-discussion/design.md).
- **Inputs:** UUID report ID; no actor/time/arbitrary target state.
- **Outputs:** Persisted Report; all existing read paths support waiting state.
- **Errors:** Existing ReportError mapping; see design I1.
- **Side effects:** One atomic state/history change preserving assignment.
- **Boundary behavior:** No comment prerequisite; permissions, archived state, stale state, duplicate concurrent requests and uncertain outcomes per workflow delta.
- **Consumers and owners:** Implementer produces; tester consumes; coordinator records revisions before affected work.

### Interface I2: Discussion data access

- **Module path:** `src/features/reports/types.ts` and `reportRepository.ts`.
- **Exports and types:** ReportComment, CommentInput, listReportComments and postReportComment exactly as defined in design I2 and persistence contract.
- **Inputs:** UUID report ID, text body, optional same-report reply reference.
- **Outputs:** Complete ordered comment array or one saved comment with scoped author labels/time.
- **Errors:** Safe ReportError codes/messages per design I2, never raw SQL.
- **Side effects:** Append one comment; no report state, assignment or workflow-history change.
- **Boundary behavior:** Valid-profile reads; active-project writes; reply integrity; empty vs failed reads; paging/cursor precision and uncertain-post safeguards.
- **Consumers and owners:** Implementer produces; tester owns assertions and all affected typed doubles.

### Interface I3: Comment validation

- **Module path:** `src/features/reports/validation.ts`.
- **Exports and types:** COMMENT_TEXT_LIMIT = 5000 and validateCommentInput signature in design I3, confirmed by user.
- **Inputs:** Runtime-validated CommentInput.
- **Outputs:** Normalized body/reference or safe message.
- **Errors:** Invalid result rather than thrown validation error; repository maps to ReportError.
- **Side effects:** None.
- **Boundary behavior:** Blank/non-text, code-point boundaries, multiline, whitespace parity, malformed references.
- **Consumers and owners:** Implementer produces; tester verifies numeric boundaries after task 1.1.

## Implementation Tasks

| ID | Task and expected result | Owner | Status |
| --- | --- | --- | --- |
| I1 | [Tasks 1.1-1.3](../../openspec/changes/archive/2026-11-08-manage-clarification-and-discussion/tasks.md): confirmed limit/contracts and exclusive assignments | Coordinator | Complete |
| I2 | Tasks 2.1-2.4: approved transition source/tests/guide; external checks reconciled to user-reported success | backend, tests, docs | Complete |
| I3 | Tasks 3.1-3.5: approved comment source/validation/tests/runner/guide; external checks reconciled to user-reported success | backend, tests, docs, coordinator | Complete |
| I4 | Tasks 4.1-4.5: functional UI/recovery, deterministic UI tests and guides approved | page, tests, docs | Complete |
| I5 | Tasks 5.1-5.2: serialized visual work approved; final UI acceptance confirmed by user | Coordinator, polish | Complete |
| I6 | Tasks 5.3-5.5: local checks/reviews and role summaries complete; external evidence accepted by CLOSE-1 | Coordinator and review | Complete |

## Required Test Outcomes

| ID | Behavior or risk to verify | Expected outcome | Test file and owner |
| --- | --- | --- | --- |
| T1 | Wait/resume permissions, concurrency and persistence | Only current assignee transitions; no prerequisites; one event; unchanged assignment | Existing workflow repository/database suites - tester |
| T2 | Comment validation boundaries and SQL parity | Correct code-point/whitespace behavior; invalid inputs never store comments | `src/test/report-discussion-validation.test.ts` and database suite - tester |
| T3 | Scoped comments/references and paginated reads | All comments ordered; no cross-report reply; auth/archive protection | `src/test/report-discussion-repository.test.ts`, `report-discussion-database.test.ts` - tester |
| T4 | Header/tabs/disclosures/replies/accessibility | Agreed layout, complete activity, references and actions accessible | `src/test/report-discussion-ui.test.ts`, existing report UI suites - tester |
| T5 | Pending, partial errors, uncertainty and composer lifetime | No automatic retries or stale results; local text retained and expiry handled | Discussion/workflow UI and auth-boundary suites - tester |
| T6 | SQL rollback for clarification history failures | State and timestamp roll back with failed event insertion | Transaction SQL verifier - implementer; independently reviewed |

The tester may add justified cases within confirmed requirements.

## Verification Commands and Gates

| Command or check | Purpose | Required when | Owner |
| --- | --- | --- | --- |
| `npm run test -- --run` | Vitest regression suite | Application edits | Coordinator |
| `npm run lint` | ESLint | Application edits | Coordinator |
| `npm run build` | TypeScript/production build | Application edits | Coordinator |
| `npm run docs:build` | MarkBind | Guide edits | Documentation writer and coordinator |
| `npm run test:report-db` | Real persistence and authorization | Implementation with isolated prerequisites | Tester and coordinator |
| Transaction SQL verifier | Forced rollback checks | Migration applied to isolated database | Implementer and coordinator |
| `openspec validate manage-clarification-and-discussion --strict` | Planning consistency | Artifact changes | Coordinator |
| `git diff --check` and scope review | Patch hygiene and preserved unrelated work | Each final integration | Coordinator |
| Browser desktop/narrow light/dark review | Presentation and cross-role flow | Functional UI stabilized | UI polisher and coordinator |
| Independent review and fresh re-review | Explicit submission and combined approval | Each implementer/tester/UI-polisher completion/fix | Reviewer |

## Completion Handoffs and Submission Register

| Submission ID | Agent and plan revision | Changed files or reviewed scope | Reported behavior and actual checks | State |
| --- | --- | --- | --- | --- |
| BD-1 | backend; revision 3 | Report types/validation/repository, auth wrapper, migration 009 and SQL verifier | Exact I1-I3; existing suites 199 passed, new discussion/workflow suites 162 passed; targeted ESLint/diff check passed. SQL unexecuted. | Approved for submitted source; hosted verification pending |
| CO-1 | Coordinator; revision 3 | `run-project-db-tests.ps1` | Adds discussion suite only; PowerShell parser passed; isolated prerequisites absent | Approved source; execution blocked by credentials |
| PAGE-1 | page; revision 3 | ReportDetailsPage.tsx and report-scoped App.css | 91 focused UI/auth tests passed, lint/build passed, scoped diff check passed. Browser unverified. | Approved; page TSX unchanged during polish |
| DG-1 | docs; revision 3 | Existing User/Developer Reports guides | docs:build passed (174 pages), scoped diff check passed; existing unrelated warnings | Approved |
| TEST-1 | tests; revision 4 | Scoped src/test/*.test.ts changes including four new discussion suites | Full suite 578 passed, 162 hosted skipped; 21 files passed, 5 skipped; lint/build/scoped diff check passed. 33 new hosted scenarios unrun. | Approved; tests frozen |
| POLISH-1 | polish; revision 4 | Five report-scoped App.css guards/spacing rules; no TSX changes | 95 UI/auth tests, lint/build/diffcheck passed. No browser observation. | Approved; page/styles frozen |
| INT-1 | Coordinator; revision 5 | Upstream development integration, validation/guide conflict resolutions, migration 011 renumbering and assistant test fixture | Combined suite 619 passed, 166 skipped; lint/build/docs/strict validation/diff checks passed. Recovery stash retained. | Independently approved by review |
| UI-NAV-1 | Coordinator; revision 6 | ReportHeader link rendering, scoped App.css navigation/tab rules, Reports User Guide paragraph | 619 tests passed/166 skipped; lint/build/docs/diff checks passed. No new rendered visual observation. | Independently approved by review |
| UI-NAV-2 | Coordinator; revision 7 | Remove breadcrumb, restore default button height/leftSection, revise retained navigation test and both Reports guides/design/task wording | 618 tests passed/166 skipped; lint/build/corrected docs/diff checks passed. | Approved after stale developer walkthrough correction |
| CLOSE-1 | Coordinator; revision 8 | Task-evidence reconciliation, refreshed role summaries and final closeout records; no source/test changes | Strict OpenSpec validation, summary/template/whitespace checks and diff checks passed; prior local results and user-reported external verification separately recorded | Approved by independent review; CLI confirms 22/22 and all_done |

## Review Findings and Approval Decisions

| Submission ID or combined work | Reviewer and reviewed revision/state | Decision | Findings, limits, and outstanding requirements |
| --- | --- | --- | --- |
| BD-1 | review; revision 3 backend submitted files | approved | No actionable production defects. Read-only inspection; implementer reported passing local checks. Hosted migration/SQL/database and browser unverified. |
| CO-1 | review; revision 3 runner diff | approved | Adds only discussion suite; isolation unchanged. Noninteractive execution stopped for missing service-role secret. |
| PAGE-1 | review; revision 4 final TSX and submitted CSS | approved | Correct functional behavior; TSX remains unchanged after polish. |
| TEST-1 | review; revision 4 final tests | approved | Meaningful partitions/regressions; incorrect source-state fixture repaired before submission. Hosted cases unexecuted. |
| DG-1 | review; revision 4 both Reports topics | approved | Describes actual implemented controls and persistence handoff. |
| POLISH-1 | review; revision 4 final CSS | approved | Overflow/spacing changes preserve semantics and behavior; actual viewport unverified. |
| Final combined local source/tests/guides | review; revision 4 frozen final code | approved | No actionable findings. Root final tests/lint/build/docs/strict validation all passed; 162 hosted tests skipped. Does not approve closing external verification tasks. |
| INT-1 and final combined integration | review; revision 5, upstream 5b8d605 plus local work | approved | Both features preserved; SQL body unchanged apart from prerequisite comment, no assertions weakened, 619 tests passed/166 skipped and all local checks passed. External verification remains open. |
| UI-NAV-1 and combined local state | review; revision 6 final navigation/tab source and guide | approved | Links preserve routes/semantics; scoped tab reset and selected:hover rule win the cascade; focus/wrapping preserved. Final local checks pass; browser host unavailable. |
| UI-NAV-2 initial review | review; revision 7 initial source/test/guide changes | changes_requested | Only finding: Developer Guide still referenced removed breadcrumb. Runtime/test changes otherwise had no actionable finding. |
| UI-NAV-2 final and combined local state | review; revision 7 after guide correction | approved | Stale walkthrough corrected; existing task wording aligned. All local checks pass, 618 tests passed/166 skipped. Actual rendered alignment unverified. |
| CLOSE-1 and final combined work | review; revision 8 closeout evidence plus unchanged approved implementation | approved | Refreshed summaries accurate; user-reported successful manual/automated checks and final UI acceptance support closing external gates without claiming new agent execution. No actionable findings. |

All implementation submissions through UI-NAV-2 and the final combined revision 8 work have explicit approval, including CLOSE-1. The source-state fixture uses an assigned Accepted report; unassigned attempts separately assert forbidden. Integration added the four required repository mocks to the assistant UI fixture without changing its assertions. No application or test fixes remained after final approval. The user's earlier confirmation that all manual/automated checks passed and latest confirmation that the final UI issues are resolved provide the external verification evidence accepted by CLOSE-1. These are user-reported results, not agent-executed hosted or browser checks. No review gate or required behavior was waived.

## Resolutions and Plan Revisions

| Revision or finding | Resolution and affected files/contracts | Affected agents notified | Follow-up submission or review |
| --- | --- | --- | --- |
| Revision 1 | Captures user-confirmed layout, chronological replies, and independent wait/resume without comments; keeps numeric limit explicitly proposed | None; no agents assigned | Product decision before coding; implementation review later |
| Revision 2 | User confirmed 5000; spec/design numeric boundary added. Backend/page production ownership split without changing interfaces; tester exclusively owns tests. UI revamp has no active writer; migration 009 is available. | Assignments delivered with revision 2 | Implementation and independent review pending |
| Revision 3 | SQL post_report_comment p_body is jsonb, requiring JSON string before extraction to stored text. Prevents PostgREST coercion from bypassing the existing non-text rejection requirement. JavaScript CommentInput/methods remain unchanged. | backend, page and tests notified immediately | Verify numeric/object/null direct payload rejection in database tests |
| Revision 4 | PAGE-1 stable and frozen; exclusive page/report-style ownership transferred to polish. No contract or acceptance change. Browser host unavailable; visual source/accessibility pass can proceed, actual viewport checks remain unverified. | page, tests, docs, review, polish | PAGE-1 and POLISH-1 to be independently reviewed |
| Revision 5 | Integrated upstream development 5b8d605 (Tester assistant). Retained CommentInput with upstream types.js import; merged both guides and corrected obsolete unavailable-feature text. Renamed unapplied clarification migration 009 to 011 after upstream 009/010; SQL body unchanged. Added required assistant test-double methods, no assertions changed. No product/interface changes. | review notified; root owned resolution files | INT-1 and combined local checks approved; external verification remains outstanding |
| Revision 6 | User confirms all prior manual/automated feature checks passed. Root handled requested presentation-only changes directly: navigation destinations become button-styled links and flat report tabs regain an active underline/text indicator despite generic workspace button rules. No repository/lifecycle/interface changes. | review assessed UI-NAV-1; root owns page/styles/guide | UI-NAV-1 and combined local state approved; new visual browser check unavailable to agent |
| Revision 7 | User removes breadcrumb and requests centered return-button text. Root removes breadcrumb/dead CSS, restores Mantine height and arrow leftSection, adjusts existing navigation test and guides/design/task wording. No lifecycle/repository/interface change. Root exclusively owns src/test/report-ui.test.ts for this direct follow-up. | review assessed initial and corrected UI-NAV-2 | Stale Developer Guide reference resolved; UI-NAV-2 and combined local state approved |
| Revision 8 | User confirms final breadcrumb/button issues resolved and authorizes remaining feature work. Reconciled verification against prior user-reported manual/automated success plus final UI acceptance. Refreshed summaries and closeout records without changing source/tests/spec requirements; preserved actual historical execution limits/counts. | backend/page/tests summaries refreshed; review explicitly approved CLOSE-1 | No findings remain; CLI confirms all_done, 22/22 tasks complete |
| Revision 9 | User requests archival and selects spec sync first. Synced approved report-discussion/report-workflow deltas, preserved existing workflow Purpose and unrelated requirements, validated all main specs, then archived all six change files unchanged. Updated current artifact links to archived paths. No application, test or requirement-meaning changes. | Coordinator-owned administrative archive; prior implementation and CLOSE-1 approvals remain applicable | Strict validation and sync comparison passed; active change removed and archived metadata/content hashes verified |

## Agent Summaries

| Agent and role | Unique summary file in this feature directory | Approved submissions covered | Coordinator check |
| --- | --- | --- | --- |
| backend - implementer | `implementer-backend-summary.md` | BD-1, current path from INT-1 | Refreshed by owner at revision 8; template, current 011 filename, historical checks and user-reported external results checked |
| page - implementer | `implementer-page-summary.md` | PAGE-1; later root changes attributed separately | Refreshed by owner at revision 8; current navigation, original PAGE-1 results and user visual acceptance checked |
| tests - tester | `tester-summary.md` | TEST-1; later root UI regression attributed separately | Refreshed by owner at revision 8; historical 578/162, final root 618/166 and user external verification distinctly attributed |

## Final Verification

| Command or check | Actual result and evidence | Remaining limitation |
| --- | --- | --- |
| OpenSpec context/list/spec inventory | Passed using installed CLI; root resolves to this repository | CLI requires access outside sandbox |
| OpenSpec apply progress | Passed: all_done, 22/22 complete, zero remaining; each task update matched current CLI path/line/description and was confirmed afterward | None |
| `npm.cmd run test -- --run` | Revision 7 passed: 618 tests passed, 166 skipped; 25 files passed, 6 skipped; one obsolete removed-control case eliminated | Hosted/Docker suites skipped, including 33 clarification scenarios |
| `npm.cmd run lint` | Passed; exit 0 | None |
| `npm.cmd run build` | Latest source revision 7 passed; TypeScript and Vite, 1008 modules | Existing mixed static/dynamic Supabase import warning |
| `npm.cmd run docs:build` | Revision 7 passed, rerun after developer walkthrough correction; 201 pages | Existing undici variables and unrelated link warnings |
| Strict OpenSpec validation | Passed after confirmed numeric limits and JSONB contract update | Not evidence of hosted execution |
| Runner PowerShell parse | Passed | None |
| Noninteractive isolated runner attempt | Exit 1 at credential prompt before tests/mutations | Service-role secret/account sign-in tokens unavailable |
| Transaction SQL verifier | Prepared/reviewed by agents; outstanding external verification closed on user-reported successful manual/automated checks | No agent execution or raw external outputs claimed |
| Browser inventory | Agent browser host unavailable; user supplied manual verification and final UI acceptance | User observation, not agent-rendered observation |
| User verification report, 2026-11-08 | User states feature works as intended and all manual/automated checks passed; CLOSE-1 accepts this for external gates | User attestation, distinct from agent-executed checks |
| Final user UI acceptance, 2026-11-08 | User states breadcrumb removal and return-button alignment are resolved and authorizes remaining feature tasks | User-verified result; no new agent browser observation |
| `git diff --check` and scope inventory | Passed; CRLF warnings only | Existing unrelated audit, gitkeep, config and log changes preserved |

- **Final diff inspection:** Application/auth/report styles, scoped tests, runner, existing Reports guides, migration/verifier, selected OpenSpec artifacts and workflow records only. Pre-existing unrelated changes retained; MarkBind updates its already-modified audit log.
- **Final approval state:** All latest implementation/test/presentation submissions through UI-NAV-2 remain approved. CLOSE-1 explicitly approves revision 8 combined work and verification reconciliation. No actionable findings or stale affected approvals remain.
- **Remaining limitations:** No feature-completion blocker remains. Hosted/SQL/manual results and final UI acceptance are user-reported; agent-local execution still records its actual skipped counts. No deployment, hosted mutation or new browser observation occurred during closeout.
- **Completion basis:** Requirements are implemented, guides current, all source/test submissions independently approved, local checks passed, external checks and final UI acceptance confirmed by user, role summaries refreshed and checked, final scope inspected, and all 22 tracked tasks complete. User-authorized sync and archive completed at revision 9; no commit or push performed.

### Archive and spec-sync verification

- **User choice:** Sync specs and archive, 2026-11-08.
- **Schema:** spec-driven.
- **Archive path:** `openspec/changes/archive/2026-11-08-manage-clarification-and-discussion/`.
- **Main specs:** `openspec/specs/report-discussion/spec.md` created with seven requirements; `openspec/specs/report-workflow/spec.md` has three requirements added and two modified, ten total.
- **Sync comparison:** All delta requirement blocks matched their main counterparts. Existing workflow Purpose and five unmentioned requirements preserved; new discussion Purpose copied verbatim. No delta operation headers remain in main specs.
- **Validation:** `openspec validate --specs --strict` passed all four durable capabilities; change strict validation passed before the move.
- **Move verification:** All six change-file SHA-256 hashes unchanged after the move, including `.openspec.yaml`. Target did not previously exist; source/target roots and link boundaries checked before moving.
- **Post-archive state:** Completed feature absent from active `openspec list --json`; unrelated active changes preserved. Current workflow links point to archived artifacts.

### Revision 8 task evidence reconciliation

The user reported "Feature verified to be working as intended, all manual and automated checks passed" and subsequently confirmed "Breadcrumb removal and back button alignment are resolved. Proceed with any remaining tasks for this feature." These reports are accepted as user verification of the feature's outstanding external checks. No specific hosted test counts, SQL output, viewport measurements, credentials or agent-run commands are inferred from them.

| Closed task | Existing implementation/review evidence | Completion verification evidence |
| --- | --- | --- |
| 2.1 | BD-1 migration/verifier approved; INT-1 confirms current migration 011 preserves the reviewed SQL body | User-reported manual/automated checks passed, covering outstanding migration/rollback verification |
| 2.3 | TEST-1 workflow/auth tests and final local suite approved | Recorded local results plus user-reported isolated automated verification |
| 3.1 | BD-1 comment persistence and access boundaries approved | User-reported automated database verification and working feature acceptance |
| 3.3 | TEST-1 discussion suites and 33 isolated scenarios defined and reviewed | Recorded local partitions plus user-reported automated verification; no invented hosted scenario counts |
| 3.4 | CO-1 isolated runner approved; PowerShell syntax checked | User-reported automated checks satisfy the previously unavailable isolated run; original agent credential limitation remains historical |
| 5.2 | POLISH-1, UI-NAV-1 and UI-NAV-2 approved | User-reported manual checks plus explicit final breadcrumb/button visual acceptance |
| 5.3 | Local tests/lint/build/docs and diff checks passed; strict validation refreshed successfully at closeout | Existing actual local results combined with user-reported external results, clearly attributed |
| 5.5 | Required role summaries already exist; all latest source/test submissions approved | Refresh and check summaries, final plan/log, independent CLOSE-1 review and confirmed CLI completion |
