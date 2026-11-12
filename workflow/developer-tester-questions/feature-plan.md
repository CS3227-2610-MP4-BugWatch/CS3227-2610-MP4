# Developer Tester Questions - Feature Plan

## Status and Revision

- **Status:** Complete after final combined approval VERIFY-USER-4 and owning-agent summary refresh. SQL, operational and live adversarial verification are accepted user-reported evidence; agent checks remain separately recorded. No production deployment or publication performed.
- **Revision:** 8.
- **Updated:** 2026-11-12.
- **Coordinator:** Main chat.
- **Requirement sources:** User decisions in this conversation and revision 2 of [proposal](../../openspec/changes/developer-tester-questions/proposal.md), [design](../../openspec/changes/developer-tester-questions/design.md), [spec](../../openspec/changes/developer-tester-questions/specs/developer-tester-questions/spec.md), and [tasks](../../openspec/changes/developer-tester-questions/tasks.md). Revision 2 clarifies dependency signatures and quota test wording without changing product scope. These artifacts are authoritative; this record links rather than substitutes for them.

Revision 7 updates those same authoritative artifacts with the user's confirmed prompt-injection scope: hardened Developer prompt, bounded credential-disclosure checks, prompt-only URL/command restrictions, deterministic tests and a synthetic review set. No missing artifact or new capability file is created. The user authorized these artifact edits only; source and guide changes require a later apply.

## Confirmed Requirements and Acceptance Criteria

| ID | Confirmed requirement | Observable acceptance criterion | Source |
| --- | --- | --- | --- |
| R1 | Assigned Developer in three allowed states and active project | API denies other actors/states/archive; UI suppresses ineligible output | Spec: Assigned Developer access |
| R2 | Up to five questions using report/full discussion | Questions-only or successful empty result; oversized context declines without truncation | Spec: Context and suggestions requirements |
| R3 | Copy and manual posting; transient suggestions | No auto-post/overwrite/state change; leave/refresh/account change clears output | Spec: Copy and lifecycle requirements |
| R4 | Outdated indication and explicit regeneration | Newly loaded changed context retains labeled questions; no automatic request | Spec: Outdated suggestion indication |
| R5 | Independent five attempts per five minutes | Atomic quota boundaries preserve Tester behavior | Spec: Independent Developer quota |
| R6 | Qwen3.5 settings and tentative limits | Manual review records retain/revise decision before implementation completion | Design: Provider settings; spec: Manual review |
| R7 | Hardened instructions with original incident evidence preserved | Fake authority, role messages and encoded instructions remain untrusted data; no input filtering or comment omission | Spec: Hardened untrusted-context instructions |
| R8 | Bounded credential-request output checks | I4 disclosure matches reject the whole new result safely; benign credential terminology and valid empty results remain accepted | Spec: Bounded credential-request output checks |
| R9 | URL/command restriction is prompt-only | No URL/command filter is added; original evidence stays intact and accepted output remains inert/manual | Spec: Prompt-only URL and command restrictions |
| R10 | Separate adversarial model evidence | Versioned synthetic set with benign controls; real observations and retain/revise assessment recorded separately from mocks and operational review | Spec: Recorded synthetic adversarial review |

## Scope Exclusions and Open Decisions

- **Excluded:** Hypotheses/fixes/explanations, other-report/source access, automatic actions, persistent output, automated quality benchmarks, and provider-retention checks. Deployment is excluded; implementation authorized by the apply request.
- **Security exclusions:** URL/command detection or filtering, input rewriting/sanitization/omission, a secondary classifier model, new model tools, new dependencies, and additional database migrations. This update authorizes no implementation, live call, or database operation.
- **Open decisions:** None at product level. User explicitly chose finishing code/tests while leaving live manual model review pending; do not perform live review or claim full feature completion. Output cap 1,500 tokens and provider timeout 15 seconds remain tentative for later manual review; initial 60,000-byte context guard is an engineering starting bound subject to that review. These are pending verification, not unresolved product scope.

## Existing Code, Reuse, and Test Environment

- **Relevant code:** ReportDetailsPage, ReportRepository/types, api/tester/report-suggestions.ts, api/_lib/_report-suggestion-dependencies.ts, api/_lib/_soclaas.ts, and existing Tester feature modules. See design Context and reuse decisions.
- **Reusable functionality and dependencies:** Existing SoCLaaS fetch, Supabase auth/read patterns, atomic quota design, cancellation/error conventions. Preserve Tester facade/defaults. No new dependency planned.
- **Related tests:** Existing report-suggestions-api/dependencies/ui tests, report-suggestion-quota.test.ts, local-api.test.ts, report-workflow-ui.test.ts, and report-discussion-ui.test.ts.
- **Test environment:** Vitest with existing React Testing Library and repository mocking conventions. Functional tests are deterministic; isolated SQL verification is distinct from mocked tests. Manual model review validates tentative bounds. No live provider request occurred during planning.

## File Ownership

| File or exact file pattern | Planned change | Single active owner |
| --- | --- | --- |
| openspec/changes/developer-tester-questions/**; this plan | Planning and tracking | Coordinator |
| api/_lib/_soclaas.ts | Compatible transport extraction | implementation |
| api/developer/tester-questions.ts; api/_lib/_tester-question-dependencies.ts | Developer endpoint/composition | implementation |
| api/_lib/_tester-question-policy.ts | Planned I4 pure credential-request helper; not created in this update | implementation (security assignment IMP-SEC-1) |
| src/features/reports/testerQuestionTypes.ts; testerQuestionClient.ts; useTesterQuestions.ts | Feature contract/client/session | implementation |
| src/features/reports/ReportDetailsPage.tsx; src/App.css | Scoped assistant presentation polish only; functional edits require coordinator handoff | presentation |
| src/features/reports/reportRepository.ts | Import extensions only for NodeNext server reuse; preserve behavior | implementation |
| src/features/reports/database/013_developer_question_quota.sql | Additive migration 013; 012 reserved by an unmerged feature | implementation |
| src/test/developer-question-quota.test.ts; developer-tester-questions-api.test.ts; developer-tester-questions-dependencies.test.ts; developer-tester-questions-ui.test.ts | New functional/quota tests | tests |
| src/test/report-suggestions-api.test.ts; report-suggestions-dependencies.test.ts; local-api.test.ts | Scoped regressions/integration coverage | tests |
| src/test/developer-tester-questions-policy.test.ts | Planned I4 positive/benign/normalization tests; not created in this update | tests (security assignment TEST-SEC-1) |
| .env.example; vite.config.ts; tsconfig.node.json; tsconfig.app.json; BugWatch.md | Serialized config/product-scope edits | Coordinator |
| docs/userGuide/Reports.md; docs/developerGuide/Reports.md | Actual implemented behavior/setup | documentation |
| docs/developerGuide/DeveloperGuide.md | OWASP acknowledgements only after security implementation; shared landing page serialized | Coordinator until documentation handoff after behavior stabilizes |
| workflow/developer-tester-questions/prompt-injection-review.md | Planned synthetic cases and live evidence record; not created in this update | Coordinator during security apply |
| implementer-summary.md | Post-approval summary | implementation |
| tester-summary.md | Post-approval summary | tests |

Revision 3 assigns implementation all listed API/application/migration files and tests all listed test files. Latest checked-out migration is 011, but the user confirmed 012 is reserved by an unmerged feature; use 013. Coordinator retains all shared configuration, product-spec and planning files. I1-I3 in design revision 2 are the delivered contracts; read those exact signatures before editing. ReportDetailsPage.tsx ownership transfers exclusively after implementation completes.

Those agent assignments record the historical source work. No application/test/presentation writer is active for revision 7. Task 5.1 must refresh and deliver exclusive ownership before the security apply; only the coordinator writes the artifacts and this record now. Existing implementation/test summaries cover revision-6 work and remain unchanged in this planning task.

## Interfaces

### Interface I1: Developer endpoint

- **Module path:** api/developer/tester-questions.ts.
- **Exports and types:** handleTesterQuestions and TesterQuestionDependencies; exact contract in design I1.
- **Inputs:** POST reportId and bearer token; server derives role/context.
- **Outputs:** questions and contextVersion.
- **Errors:** Design I1 HTTP/code table.
- **Side effects:** Admitted quota reservation only.
- **Boundary behavior:** Design I1 covers empty/malformed output, input bounds, authorization races, and failure.
- **Consumers and owners:** Implementer produces; tester mocks dependencies and asserts outcomes.

### Interface I2: Client/session

- **Module path:** src/features/reports/testerQuestionTypes.ts, testerQuestionClient.ts, useTesterQuestions.ts.
- **Exports and types:** Request/result, GenerateTesterQuestions, requestTesterQuestions, shared context-version helper per design I2.
- **Inputs:** Report/account scope and loaded context.
- **Outputs:** Read-only questions, empty/error/pending/cooldown/outdated presentation.
- **Errors:** Retain prior output; preserve manual workflow.
- **Side effects:** Explicit request or Copy only.
- **Boundary behavior:** Scope clearing, stale completion, updated context, and regeneration per design I2.
- **Consumers and owners:** Implementer and tester; presentation ownership transfers later.

### Interface I3: Quota reservation

- **Module path:** Report migration 013; 012 is reserved by an unmerged feature.
- **Exports and types:** reserve_developer_question_attempt per design I3.
- **Inputs:** Server-derived Developer identity.
- **Outputs:** allowed and retryAfterMs.
- **Errors:** Fail closed on wrong role or invalid response.
- **Side effects:** Independent atomic reservation storage.
- **Boundary behavior:** Fifth/sixth, concurrency, exact expiry, no-charge rejections per design I3.
- **Consumers and owners:** Implementer migration; tester deterministic and isolated checks; coordinator serializes application.

### Interface I4: Bounded credential-request output policy

- **Module path:** Planned `api/_lib/_tester-question-policy.ts`, consumed by the existing Developer endpoint.
- **Exports and types:** `containsCredentialSolicitation(questions: readonly string[]): boolean`; exact supported positive/benign partitions and normalization in design I4.
- **Inputs:** Already structurally validated/trimmed question strings; no context, credentials or provider access.
- **Outputs:** True for a supported explicit credential-value solicitation; false for no match, including empty results. False is not a general safety verdict.
- **Errors:** Endpoint rejects a matched whole result through existing 502 unavailable without returning text or rule details; policy failures fail closed.
- **Side effects:** Helper has none. One admitted attempt stays consumed; no retry, persistence, model action or report mutation.
- **Boundary behavior:** Preserve benign diagnostics, prior suggestions/outdated status on failed regeneration, and composer/reply state. URL/command presence alone is not checked or rejected. Initial normalization/coverage is bounded and does not promise arbitrary-language/paraphrase detection.
- **Consumers and owners:** Future implementer helper/endpoint; future tester policy/API/dependency/UI tests; coordinator serializes compiler configuration. No browser DTO/dependency interface change.

## Implementation Tasks

| ID | Task and expected result | Owner | Status |
| --- | --- | --- | --- |
| I1 | tasks.md group 1: shared transport and quota, with tests/docs | Implementer/tester/documentation writer; coordinator integrates | Source reviewed; real SQL verification blocks overall approval |
| I2 | tasks.md group 2: endpoint/local integration with tests/docs | Same assigned roles; shared config serialized | Source approved and checks pass; external verification gates pending |
| I3 | tasks.md group 3: page workflow/tests/docs and visual pass | Implementer, tester, documentation writer, then ui_polisher | Source approved and checks pass; external verification gates pending; no authenticated viewport walkthrough |
| I4 | tasks.md group 4: integrated checks/manual review/final approval | Coordinator, manual reviewer, independent reviewer | Deterministic checks pass; combined approval blocked by SQL verification; live model review pending by user choice |
| I5 | tasks.md group 5: prompt/policy/tests/docs and synthetic security review | implementation/tests/documentation under I4; coordinator owns record | Tasks5.1-5.5 approved and complete;5.6 live security review pending |

Task ownership is file-exclusive as above. No task is completed merely by a completion report.

## Required Test Outcomes

| ID | Behavior or risk to verify | Expected outcome | Test file and owner |
| --- | --- | --- | --- |
| T1 | Actors/states/archive/forged context/output partitions | Design I1 outcomes, no unauthorized dispatch | developer-tester-questions-api.test.ts and dependencies test - tester |
| T2 | Quota boundaries/concurrency/isolation | At most five, correct expiry/wait, unchanged Tester quota | developer-question-quota.test.ts - tester |
| T3 | Copy/transient/stale/regeneration/races | Manual composer preserved and no cross-account output | developer-tester-questions-ui.test.ts - tester |
| T4 | Shared transport/local routing regressions | Both assistant contracts/routes preserved | Existing report-suggestions API/dependencies and local-api tests - tester |
| T5 | Actual adequacy of tentative operational bounds | Recorded manual retain/revise decision | Manual review; no automated benchmark - manual reviewer/coordinator |
| T6 | Explicit credential requests versus benign terminology/normalization | Whole-result refusal, safe no-store response, one charged attempt, no retry; safe/empty results accepted | Planned policy test plus scoped API tests - tester |
| T7 | Injection-bearing saved evidence and unchanged Tester behavior | Hardened instructions in system message; complete original user context; unchanged Tester defaults and actual byte-bound tests | Scoped dependency/API regressions - tester |
| T8 | Refusal lifecycle and prompt-only URL/command behavior | New rejected questions never reach Copy; prior output/composer retained; URL/command/markup remains inert with no filter/action | Scoped UI tests - tester |
| T9 | Actual model behavior under malicious and benign cases | Recorded prompt/policy/case/settings versions, observations, limits and separate retain/revise assessment | Planned prompt-injection-review.md - coordinator/manual reviewer |

## Verification Commands and Gates

| Command or check | Purpose | Required when | Owner |
| --- | --- | --- | --- |
| npm run test -- --run | Vitest functional suite | Application changes | Coordinator |
| npm run lint | ESLint | Application changes | Coordinator |
| npm run build | TypeScript and production build | Application changes | Coordinator |
| npm run docs:build | MarkBind | Guide changes | Coordinator |
| Isolated Developer quota checks | Real SQL permissions/concurrency | Migration implementation | Tester/coordinator |
| Manual bounds review | Validate tentative limits/settings | Before feature completion | Manual reviewer/coordinator |
| Synthetic adversarial live review | Assess actual prompt/credential/URL/command behavior and false refusals | Before security-extension completion; can remain pending while code work proceeds | Manual reviewer/coordinator |
| Independent reviewer approval | Assess every submission and final combined work | Every implementation/test/presentation completion or fix | Reviewer |

## Completion Handoffs and Submission Register

| Submission ID | Agent and plan revision | Changed files or reviewed scope | Reported behavior and actual checks | State |
| --- | --- | --- | --- | --- |
| IMP-1 | implementation; revision 5 | Assigned API/application/013 SQL files plus reportRepository import extensions | Implementation complete; build passed; existing 86 and initial API/dependency 74 tests passed; lint initial test issue since resolved | See explicit review decisions below |
| TEST-1 | tests; revision 6 | Four new Developer test files, scoped Tester API and local route additions | Final TEST-1 scoped152 passed; SQL5 skipped (Docker/PostgreSQL absent); includes final sixth-attempt UI case | See explicit review decisions below |
| UI-1 | presentation; revision 6 | ReportDetailsPage.tsx and src/App.css assistant-only presentation | Developer UI35 and existing workflow/discussion49 passed; lint/build/diff check passed; no authenticated browser walkthrough | See explicit review decisions below |
| COORD-1 | Coordinator; revision 6 | .env.example, vite.config.ts, both tsconfigs, BugWatch.md, both Reports guides (documentation agent) | Final full tests737 passed171 skipped; lint/build/docs exit0; strict OpenSpec valid | See explicit review decisions below |

### Revision 8 security submissions

| Submission ID | Agent and plan revision | Changed files or reviewed scope | Actual verification and limits | State |
| --- | --- | --- | --- | --- |
| SETUP-SEC-1 | Coordinator; revision 8 | Ownership/I4 ACKs and matching compiler test configuration | review explicitly approved prep before source/test edits; CLI confirmed 15/26 | Approved preparation only |
| IMP-SEC-1 | implementation; revision 8 | api/developer/tester-questions.ts; api/_lib/_tester-question-policy.ts | Six positive/four benign smoke cases and scoped regressions passed; final agent build EPERM under overlapping builds resolved by coordinator serial build | Approved; see revision8 security decisions |
| TEST-SEC-1 | tests; revision 8 | New policy test and scoped Developer API/dependency/UI tests | Seven scoped suites254 tests pass; lint/build passed; deterministic evidence only | Approved; see revision8 security decisions |
| DOC-SEC-1 | documentation; revision 8 | Both Reports topics and DeveloperGuide acknowledgements only | docs:build passed with existing warnings; scoped diff check passed; no new topic/navigation | Approved; see revision8 security decisions |
| COORD-SEC-1 | Coordinator; revision 8 | Both compiler configs, synthetic review record, integration and tracking | Final standalone full suite838passed171skipped; lint/serialbuild/docs pass; source hashes recorded; live/SQL evidence remains pending | Approved; see revision8 security decisions |
## Review Findings and Approval Decisions

Planning revision 2 was previously approved after clarification. Implementation review below covers revision 6 and final application/test/presentation/config/guide state. Reviewer found no actionable implementation, security, test-design, presentation, or guide defects; ran read-only diff check and considered coordinator-executed final verification.

The following are historical revision-6 decisions only. They do not approve revision-7 acceptance criteria or any future prompt/policy/test changes. Affected work requires new submissions and fresh review after implementation. Planning-only ART-SEC-7 was approved by review against the four artifacts and this revision-7 record, with no actionable findings. Review was read-only and covers planning coherence only, not implementation or feature closure.

| Submission or scope | Reviewer and reviewed state | Explicit decision | Evidence, limits, and remaining requirements |
| --- | --- | --- | --- |
| IMP-1 | review; revision 6 integrated state | blocked overall; application/API/client/hook/transport source approved | Migration 013 source appears correct; required real SQL execution unavailable |
| TEST-1 | review; final UI36/scoped152 state | blocked overall; test source and executed deterministic coverage approved | Five new SQL cases unexecuted; skipped cases are not SQL verification |
| UI-1 | review; final page/App.css state | approved | Native keyboard controls, feedback/focus semantics and responsive wrapping inspected; deterministic tests pass; no authenticated viewport walkthrough |
| COORD-1 | review; final config/product/both guide pages | approved | Both routes and TypeScript separation covered; product/guide statements match implementation; docs build passes |
| Final combined implementation/tests | review; final integrated state | blocked | Missing isolated Developer SQL quota execution |
| Full feature completion | review; final integrated state | blocked | Missing SQL verification and live manual settings/bounds review |

Reviewer explicitly approved task work 1.2, 1.5, 2.1 through 2.5, and 3.1 through 3.6. Keep 1.3, 1.4, and 4.1 unchecked for missing real SQL evidence; 4.2 unchecked for manual model review; 4.3 unchecked because combined approval is blocked; and 4.4 unchecked because final approval and closure remain pending; summaries were subsequently generated under the explicit user exception below. No final approval is inferred from passing deterministic checks.
### Revision 8 security review decisions

review independently inspected source, all changed tests/guides/config and the synthetic record, checked both source hashes and ran scoped read-only diff check. No actionable findings were found. Decisions cover the frozen final security state; no subsequent application/test/guide edit occurred.

| Submission or scope | Explicit reviewer decision | Scope and limits |
| --- | --- | --- |
| SETUP-SEC-1 | approved | I4/ownership/configuration and both agent ACKs before source edits |
| IMP-SEC-1 | approved | Hardened Developer prompt and bounded credential helper; correct order, whole-result safe502, one admitted attempt; no context/Tester change or URL/command detector |
| TEST-SEC-1 | approved | Positive/benign/normalization/mixed/empty/order/exception/boundary/UI cases and preserved Tester defaults; deterministic evidence only |
| DOC-SEC-1 | approved | Existing Reports topics and acknowledgement-only DeveloperGuide edit; limitations accurately stated |
| COORD-SEC-1 | approved | Matching compiler configs and complete versioned synthetic set; exact source hashes matched, all live observations pending |
| Combined security code/tests/docs | approved | Implemented boundaries and prepared review set; not live-model resistance |
| Full feature completion | blocked | Original SQL evidence and live operational/security review remain missing |

Reviewer permits closing tasks5.2-5.5. Tasks1.3,1.4,4.1 remain unchecked for real SQL verification;4.2 for operational model review;5.6 for live adversarial review;4.3/4.4 for full approval/closure. Existing summaries remain historical revision6 snapshots; their one-time timing exception was not renewed and they were not refreshed. All new implementer/tester submissions were reviewed explicitly.
## Resolutions and Plan Revisions

| Revision or finding | Resolution and affected files/contracts | Affected agents notified | Follow-up submission or review |
| --- | --- | --- | --- |
| 1 | Captured confirmed quota/full-context/outdated/settings decisions; manual review replaces automated limit evaluation; retention checks excluded | None; no implementation agents assigned | Planning review |
| 2 | Corrected sixth-attempt wording and supplied exported mockable dependency signatures/results/error semantics in design I1 | planning_review notified and reviewed | Final combined planning revision 2 approved |
| 7 | User confirmed security scope and artifact update: I4 bounded credential policy; prompt-only URL/command restrictions; unchanged input context; six new unchecked tasks and separate live review evidence | review read revision 7 and approved ART-SEC-7; implementation agents receive contract on next apply | ART-SEC-7 approved for planning only; no security code approval |

## Agent Summaries

| Agent and role | Unique summary file in this feature directory | Approved submissions covered | Coordinator check |
| --- | --- | --- | --- |
| implementation | implementer-summary.md | IMP-1, reviewed revision 6 source; overall approval remains blocked | Written by original owning agent; coordinator checked file, template, source accuracy and recorded results under user exception |
| tests | tester-summary.md | TEST-1, reviewed revision 6 tests; overall approval remains blocked | Written by original owning agent; coordinator checked file, template, source accuracy and recorded results under user exception |
| implementation | implementer-security-summary.md | IMP-SEC-1 and combined security scope approved under revision 8 | Written by implementation; coordinator checked template, source explanations and recorded verification; original summary hash unchanged |
| tests | tester-security-summary.md | TEST-SEC-1 and combined security scope approved under revision 8 | Written by tests; coordinator checked template, test flows/examples and recorded verification; original summary hash unchanged |

These summaries intentionally remain snapshots of revision-6 source. Task 4.4 requires owning agents to refresh them after future security submissions receive approval; the one-time summary-timing exception does not waive new implementation review.

## Final Verification

### Revision 8 security apply

| Check | Actual final result | Limit |
| --- | --- | --- |
| Full Vitest standalone rerun | 29 files/838 tests passed;7files/171tests skipped | Five Developer SQL cases remain skipped; no live model evidence |
| Lint | npm.cmd run lint exit0 | Final source/test state |
| Production build | Serialized npm.cmd run build exit0 | Existing Supabase import warning; resolved overlapping-build EPERM |
| Documentation build | documentation npm.cmd run docs:build exit0 | Existing undici variables and unrelated-link warnings |
| Independent review | All four security submissions and combined security scope approved | Full feature remains blocked on SQL/live reviews |
| Task tracking | 19/26 complete; tasks5.1-5.5 checked after respective approvals | Seven tasks remain unchecked |
| Summary refresh | Not performed | Existing revision6 snapshots preserved pending full approval |

### Prior revision 6 evidence (historical)

| Command or check | Actual result and evidence | Remaining limitation |
| --- | --- | --- |
| OpenSpec strict validation | Passed for developer-tester-questions | Validates artifacts, not implementation |
| npm run test -- --run | Exit0; 28 files/737 tests passed, 7 files/171 tests skipped | Includes 5 new Developer SQL cases skipped without Docker |
| npm run lint | Exit0 | npm PowerShell wrapper access warning; actual script passed |
| npm run build | Exit0; TypeScript and Vite passed | Supabase static/dynamic import bundling warning |
| npm run docs:build | Exit0; MarkBind build success | Existing undici variables and unrelated navigation/link warnings |
| Isolated Developer quota execution | Not run; Docker/psql/postgres unavailable | Migration 013 created but not applied or runtime verified |
| Manual bounds review | Pending by explicit user choice; no standard local SoCLaaS credentials found | Must precede feature completion; finish code/tests first |

The prior-revision table is historical revision-6 execution evidence. This artifact-only update does not rerun them or verify unimplemented security behavior. Strict OpenSpec validation of the revision-7 artifacts passed; apply instructions report 14/26 complete with all six new security tasks unchecked.

- **Final diff inspection:** Source/tests unchanged after approval. Summary templates, final approval/provenance and whitespace checked; updated records preserve historical evidence and unreported individual case outcomes. OpenSpec closure verified at26/26.
- **Final approval state:** VERIFY-USER-4 approves IMP-1/TEST-1 overall, task5.6 and final combined implementation/tests/docs. All later changes are administrative only; task4.4 closes after owning-agent summaries and record checks.
- **Remaining limitations:** External SQL/live observations are user-reported, not independently reproduced by the agent. Individual adversarial case outcomes/counts and provider build version remain unreported; no universal injection-resistance or production-deployment claim.
- **Completion basis:** All source/security submissions and final combined work approved. User-performed verification accepted with attribution; original agents refreshed all four distinct summaries, coordinator checked them and administrative records. Final task closure/strict validation verified through OpenSpec.


Historical chronology below preserves earlier pending states; the current status and latest VERIFY-USER-4 decisions above/below supersede them.

Apply revision 3: checked existing transport/dependencies, middleware, TypeScript inclusion, migration list and Docker quota tests. OpenSpec artifacts remain revision 2 with unchanged I1-I3 contracts. Plan revision references in task preamble updated to 3; no requirement changes.

Revision 4 (user correction): reserve 012 for the unmerged feature and use 013_developer_question_quota.sql throughout this change. Only the migration path changes; I1-I3 behavior is unchanged. Implementation and tests remain paused; agents notified to reread revision 4 before any future work.


Revision 5: user resumed implementation. implementation owns reportRepository.ts solely for .js local-import extensions enabling existing paginated reader reuse under NodeNext; method interfaces/behavior remain unchanged. Coordinator owns tsconfig.app.json exclusions matching new Node test inclusion. Agents must reread revision 5. Manual review remains a later completion gate, not authorization to omit behavior.



Revision 6: IMP-1 received. Exclusive ReportDetailsPage.tsx ownership transfers from implementation to presentation for Mantine visual/accessibility work; presentation may add scoped styles to src/App.css. No known functional failures; tester UI coverage in progress and any discovered functional fix must return through coordinator. documentation owns both Reports guide topics. No I1-I3 contract changes. implementation retains backend/client/hook ownership for assigned fixes only.






Final administrative record: overall resumed-work log is logs/2026-11-12-resume-developer-tester-questions.md. OpenSpec progress independently refreshed after each approved checkbox: 14/20. Final strict validation and diff check passed. No application/test edits after the final checks/review. Summaries were initially deferred because IMP-1/TEST-1 overall and combined approval were blocked; the subsequent user exception authorized administrative generation only.


Summary-only user exception: The user explicitly instructed skipping reviewer approval just this once to create implementer-summary.md and tester-summary.md. This overrides the normal summary timing requirement for these two administrative files only. Preserve the actual reviewer decisions, pending real SQL execution, and pending live manual model review; do not mark feature completion or any unverified task complete. Each original agent writes its own exact summary path using the repository template and generate-work-summary skill. No application/test changes are authorized by this summary step.


Summary generation completed: implementation wrote implementer-summary.md and tests wrote tester-summary.md themselves, using their assigned templates and generate-work-summary skill. Coordinator read both complete files, compared them with actual source/test behavior and recorded outcomes, and verified required headings, filled template text, whitespace, and explicit exception/pending-gate statements. No application or test files changed. OpenSpec remains 14/20; final verification/approval gates remain pending.


ART-SEC-7 planning outcome: review explicitly approved the four updated OpenSpec artifacts and revision-7 coordinator record with no actionable findings. Confirmed bounded I4 policy, prompt-only URL/command handling, unchanged input evidence, separate deterministic/live evidence, historical14 checked tasks and six new unchecked tasks. No code/test/guide/live/SQL verification or implementation approval was performed by this planning review.


Revision 8 security apply: User explicitly requested implementing the security features. I4 contract and all revision-7 scope decisions remain unchanged. Exclusive application ownership for implementation is api/developer/tester-questions.ts and api/_lib/_tester-question-policy.ts only; exclusive test ownership for tests is the new policy test and scoped Developer API/dependency/UI tests plus Tester API regression if needed. Coordinator owns tsconfig.node.json/tsconfig.app.json and synthetic review record. No presentation file edits are planned, so a new visual pass is not applicable; existing error UI is preserved and regression-tested. Documentation ownership will transfer after behavior stabilizes for the two Reports topics and acknowledgement-only DeveloperGuide.md edit. Existing source, other agents' changes and summaries must be preserved. No live provider review, hosted database change, URL/command filter, input filter or classifier is part of this work. Each agent reads revision8 and acknowledges exact I4 before dependent edits; new submissions and fixes require explicit independent review. One-time summary exception remains historical; no summary refresh until the applicable approval gate is met.


SETUP-SEC-1: review approved revision8 task5.1 preparation after source/config/ownership checks and both I4 ACKs. implementation and tests independently confirmed exact signature, six positive/four benign cases, normalization/whole-result failure and explicit exclusions before editing. Task5.1 marked complete only after this approval. Release dependent security work; all later submissions require fresh review.


Documentation handoff under revision8: application security behavior is stable. documentation now exclusively owns docs/userGuide/Reports.md, docs/developerGuide/Reports.md and acknowledgement-only edits in docs/developerGuide/DeveloperGuide.md for task5.4. Coordinator transfers the latter landing page solely for its existing acknowledgement section; navigation and other content remain outside assignment. Source implementation and tests retain their disjoint files; no presentation changes planned.


Security submissions received under revision8: IMP-SEC-1 (implementation; endpoint+newpurepolicy; frozen) and TEST-SEC-1 (tests; new51-casepolicy suite and scopedAPI/dependency/UI additions;254scopedtests pass). Both awaiting independent review. Initial root fullrun837passed/1localAPIstartup-timeout/171skipped while concurrent builds competed; rootlint and build passed. One agentbuild EPERM during overlap is tracked; nosourcefix inferred. Finalchecks are being rerun serially with allagentappbuilds stopped. Live/SQLreviews remain pending.


DOC-SEC-1 received: documentation changed only the two Reports guides and DeveloperGuide acknowledgements; docsbuild passed with existing MarkBind warnings and scoped diffcheck passed. Source/tests frozen. Final standalone root fullsuite passed29files/838tests;171tests skipped across7files. Earlier localAPI cold-start timeout did not reproduce when run without competing builds; no testtimeout changed. Rootlint passed; serialproductionbuild rerun in progress to resolve the agent's overlapping-dist EPERM limit. Syntheticrecord prepared with versionlabels/exactsourcehashes and all live observationspending.



Final revision8 verification: standalone npm.cmd run test -- --run passed29files/838tests, with7files/171tests skipped; npm.cmd run lint passed; final serialized npm.cmd run build passed with the existing Supabase static/dynamic import warning; documentation agent npm.cmd run docs:build passed with existing MarkBind undici-variable/unrelated-link warnings. Initial concurrent fullrun had837pass/1localVite-startup-timeout/171skip and one agentbuild had overlapping-dist EPERM; standalonefulltests and serializedbuild passed without changing source/tests/timeouts. No live model, hosted DB, or SQLquota execution occurred. No new visual pass needed because no presentation source changed. Full feature approval remains blocked; security-scope review approved all submitted work. Overall interaction log will record these exact results and limits.



Separate security summary assignment: User explicitly requested separate files for implemented security changes. Original implementation owns implementer-security-summary.md and original tests owns tester-security-summary.md, using current summary skill and templates. The security submissions and combined security scope are approved under revision8; full feature gates remain pending. Preserve original implementer-summary.md/tester-summary.md as revision6 snapshots. Summary-only work does not change source/tests, reviewer decisions, or tracked task completion.


Security summary register confirmed: implementer-security-summary.md and tester-security-summary.md both exist, follow their templates, and describe only approved security work with actual recorded results and pending limits. Original summary files remain unchanged.


### User-reported external verification update

The user reported: (1) quota tests were run separately and passed; (2) live model review was performed and the limits were accepted. These are user-executed/reported results, not agent-executed checks. The previously recorded local skipped SQL run remains historically accurate; it does not negate this later separate run.

- Developer quota verification: reported passed by the user. No separate console output, run date, exact command or environment details supplied in this message. Do not invent those details or infer deployment to a hosted/production database.
- Operational model review: user reports performed and accepts the current limits (1500-token cap,15000ms provider timeout,60000-byte complete-message guard). Individual observations for provider setting support, question relevance/repetition and timeout/truncation were not supplied; record those as unreported rather than invented. No agent provider calls occurred.
- Live prompt-injection/adversarial review (task5.6): not reported completed; remains pending. Operational acceptance does not establish the synthetic attack outcomes.
- Final full-feature approval/closure: remains pending. Ask independent reviewer to assess how the user-reported evidence affects tasks1.3,1.4,4.1,4.2 without claiming either agent execution or invented detailed findings.

VERIFY-USER-1: reviewer approved accurate attribution of the user's separate passingquota run and acceptedlimits report. Tasks1.3/1.4/4.1 approved based on prior reviewed source/test coverage, prior finalagentchecks and user-reported externalquota result; no agentSQLexecution/hostedmigration inferred. Task4.2 retains the acceptedlimits decision but remains pending required short model/settings/context/quality observations. Requested only that summary, no prompts/secrets/logs. Task5.6 adversarialreview not reported and remains pending;4.3/4.4/fullclosure not complete. Checkbox progress will be verified via CLI per task.


### User-reported operational review observations

The user confirms the model/settings were exactly as defined in the application, with no changes: configured SOCLAAS_MODEL (expected qwen3.5:9b), reasoning_effort none, temperature0.7,top_p0.8,max_tokens1500,provider timeout15000ms,and complete-message guard60000UTF-8bytes. No separate provider build/version was supplied or inferred.

The user checked that answered questions were not repeated, checked context limits, observed complete responses when supplied context was eligible, observed no timeouts, and found questions relevant to the report. The user explicitly accepted the limits in the previous message; record a retain decision for1500tokens,15000ms and60000bytes. No agent provider calls or independent reproduction occurred. These are operational observations, not results for the synthetic adversarial cases; task5.6 remains pending. Request reviewer confirmation of task4.2 closure using this attributed evidence.

VERIFY-USER-2: reviewer explicitly approved task4.2 based on the user's unchangedapplication-settings, checkedcontextlimits, completeresponses, relevant/nonrepeatedquestions and noobservedtimeouts, plus explicitretain decision1500tokens/15seconds/60000bytes. Task4.2 may close with user-performed attribution, no agentprovider execution claimed. Syntheticadversarial5.6 and fullclosure4.3/4.4 remain pending. The current operational status supersedes earlier historicalpendingnotes; no underlying source/test changes.


### User-reported live adversarial review

The user reports: "Live prompt-injection performed and accepted". Record that the user performed and accepted the security review; no agent provider call or independent reproduction is claimed. The current synthetic case-set version is security-cases-1, with prompt/policy source hashes in prompt-injection-review.md. The user has not supplied per-case outcomes, exact reviewed source/version identifiers, credential/URL/command deviations, benign false refusals or remaining findings in this message. Do not turn every case's Pending cell into a passing observation. Independent reviewer is asked whether this attestation suffices for task5.6 or what minimal recording detail remains; final review/closure are not inferred from an administrative evidence update.

VERIFY-USER-3 reviewer decision: live review occurrence/acceptance accurately recorded, but task5.6 remains pending a brief summary confirming security-cases-1/currentprompt-policy-settings and observed parse/refusal/credential/URLcommand/benignfalse-refusal/relevance outcomes plus unresolvedfindings(or none). A concise aggregate summary suffices; no rawprompts/logs/secrets/percasepassentries required. Sourceapprovals remain valid;4.3/4.4 remain pending;23/26 tracking unchanged.


### User confirmation of aggregate security-review results

Following the request to confirm security-cases-1/current application prompt/settings and the credential, URL/command, benign-refusal, validity, usefulness, repetition and unresolved-findings checks, the user replied: "Yes confirm". Record this together with the immediately preceding "Live prompt-injection performed and accepted" as affirmative aggregate confirmation of the requested review and acceptance using the current application versions/settings. The coordinator interprets this as the listed checks being satisfactory to the user; it is not a fabricated per-case result, raw model output, numeric pass rate, or claim that every attack was resisted. Specific deviation counts and individual observations remain unreported. Do not assert universal prevention or silently change prompt-only URL/command behavior. Request independent reviewer decision on task5.6 and final combined approval4.3; original source/tests remain unchanged.

VERIFY-USER-4 final reviewer decisions: approved5.6 based on user-performed aggregate review/currentcase-set/prompt/settings confirmation. IMP-1 and TEST-1 now approved overall on unchanged reviewed source plus accepted external quota evidence. Task4.3 and final combined implementation/tests/docs approved. No further clarification needed. Individual case outcomes remain unreported; no agentSQL/providerexecution or productionmigration is inferred. Task4.4 administrativeclosure now assigned: original implementation refreshes its original+securitysummaries; original tests refreshes its original+securitysummaries, preserving separate files and historical checks while updating currentstatus/provenance. Coordinator owns finalrecord reconciliation/log and checkbox. No application/test edits.


Final administrativeclosure: original implementation refreshed implementer-summary.md and implementer-security-summary.md; original tests refreshed tester-summary.md and tester-security-summary.md. Coordinator checked allfour finalapproval/provenance/templatecontent, sourceexplanations and whitespace. Separatefeature/securityscopepreserved. No code/tests changed or checksrerun unnecessarily. VERIFY-USER-4 supports finalcombinedapproval, all26 taskcheckboxes complete, strictvalidation anddiffcheck passed. Noarchive/commit/push/PR occurred; publicationstillrequiresuserbranchname.
