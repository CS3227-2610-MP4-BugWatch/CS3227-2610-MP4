# Tester report assistant implementation

Revision 2. Work on codex/tester-report-assistant. Original baseline development 6a0f273 includes submission and drafts. On 8 November, rebased onto reviewed teammate PR #6 at 32ed84a, which includes PR #5 at 9a298e6. These PRs remain open, and the assistant branch is locally stacked on their reviewed heads.

## Authority

Use [spec](../openspec/changes/tester-report-assistant/specs/tester-report-assistance/spec.md), [design](../openspec/changes/tester-report-assistant/design.md), [tasks](../openspec/changes/tester-report-assistant/tasks.md), and [measurement plan](2026-11-07-tester-assistant-measurement.md). The server must keep live generation disabled unless explicitly enabled in server configuration after provider setup. Mocked tests inject a generator. No hosted writes, key use, deployment or push during local implementation.

## Contracts and ownership

- Coordinator owns shared DTO in src/features/reports/reportSuggestionTypes.ts, build configuration, OpenSpec, workflow, and guides.
- Endpoint implementer owns api/tester/report-suggestions.ts and api/_lib assistant server modules. Export `handleReportSuggestions(request: Request, dependencies: ReportSuggestionDependencies): Promise<Response>` from the endpoint or re-export there. Dependencies use async `authenticate(token): {id,role}|null`, `findProject(token,projectId): {name,description,archived}|null`, `reserve(actorId): {allowed,retryAfterMs}`, and `generate(context): unknown`. Model context is `{project:{name,description},report:{title,description,...allowedNonblankOptionalFields}}`. Default Vercel handler connects these to Supabase and gated SoCLaaS. Quota RPC is `reserve_tester_suggestion_attempt(p_actor_id uuid)` returning scalar JSON `{allowed,retryAfterMs}`, callable only as service role. User access token remains request scoped.
- Quota migration is now 009_tester_suggestion_quota.sql after teammate migration 008_report_workflow.sql. The SQL body retains the reviewed atomic per-Tester reservation contract.
- UI implementer owns ReportForm and supporting report UI/client modules. Calls same-origin POST /api/tester/report-suggestions with current Supabase bearer. Use shared DTO, keep generation independent of saving, and preserve existing forms. Coordinate fixture needs with tester. Do not modify server files.
- Tester owns src/test changes. Test deterministic auth, exact allowlist, partial output, quotas and fail-safe UI. Coordinate test shape with implementers.

Success response is `{suggestions,questions,partial:boolean}`. Partial is true when an invalid entry was filtered or a suggestion field is absent. Failure response is `{code,retryAfterMs?}`. Live provider quota/reset units and retention remain unverified. Candidate model qwen3.5:9b. The user reported allowance 50 daily and 500 monthly.

## Verification and approvals

- A1-QUOTA approved by independent reviewer. Agent verified 10 concurrent requests in disposable PostgreSQL admitted three; coordinator separately verified 8 concurrent requests admitted three in isolated local Supabase, grants, per-user separation and expired slot reuse. No hosted writes.
- A1-ENDPOINT and coordinator DTO/build wiring approved by independent reviewer for local scope. API tests passed 20 cases. Live generation stays gated and unverified.
- Provisional combined run passed 366 tests and failed one immediate-unmount cleanup assertion. Build passed. UI and test agents are reconciling final cleanup behavior and first-save handoff regression. Final review is pending.
- A1-UI and A1-TEST received changes requested. The reviewer identified a StrictMode first-save handoff cancellation missed by the initial tests. The tester wrapped the existing handoff case in StrictMode and reproduced a failure: 7 passed, 1 failed because the transferred signal was aborted. A2-UI restored microtask cleanup with a listener guard. A2-TEST passed all 36 assistant cases, including handoff and ordinary leave cancellation, and fixed two existing draft tests to await enabled controls. Final coordinator run passed 371 tests with 109 hosted tests skipped.
- MarkBind generated the updated guides with existing site warnings. Live provider requests and output-quality scoring remain pending. Implementation usage counters for the four dedicated sessions are captured in the measurement plan and exclude coordinator and reviewer work.
- Final independent review approved A2-UI, A2-TEST and the combined implementation, tests and guides for local scope. A1 quota and endpoint approvals remain current. The reviewer independently ran 59 related tests. Coordinator final full run passed 371 tests with 109 hosted tests skipped; lint and build passed, with a bundler notice about the shared Supabase client's dynamic/static import. Strict OpenSpec validation and tracked diff whitespace checks passed. No live SoCLaaS calls or deployed preview checks occurred. Local stack was stopped after quota verification.
- Nine of eleven tasks are complete. Live setup task 1.2 and preview/content evaluation task 4.3 stay open. No commit, push, deployment or merge was performed for this assistant change.

## 8 November integration

The user requested review and approval of PRs #5 and #6 followed by rebase. Independent source reviews found no actionable findings after the browser evidence gap for PR #5 was addressed. On the PR #6 snapshot containing PR #5's UI, 451 tests passed (129 hosted skips), lint and build passed. Chromium against isolated Supabase verified report submission and retry, Developer acceptance and explicit investigation, and menu/overflow behavior at 390/1440 widths in light/dark modes. Both GitHub PR reviews were approved at the exact reviewed heads. PR #6 remains a draft.

Checkpointed assistant implementation, rebased onto PR #6, combined report form sections and assistant controls, combined guide text, and renamed the unpublished quota migration to 009. A malformed map closure in conflict resolution was caught by review and repaired. Suggestion tests required the new Mantine test wrapper and expanded repository mocks. Final verification and integration approval are pending.

A3-ROOT integration, A3-TEST adaptation and the final combined local implementation were explicitly approved by the independent reviewer. Final checks passed 487 tests with 129 hosted skips, lint, build and MarkBind (199 pages, existing warnings). The provider remains disabled. The isolated local services were stopped. Neither teammate PR was merged by this task.

## 8 November publication update

PR5 and PR6 are now merged into development (tip786fbe2). Approved amendments DEV1/LIVE1/TIME15/Q5-ROOT/Q5-TEST1 add shared Supabase settings, npm run dev API wiring, disabled provider reasoning, a15-second timeout and five attempts per rolling five minutes. Apply009 then010 on a fresh database; existing009 installations need010. Latest full run492passed133skipped, plus4/4 opt-in disposable PostgreSQL tests; lint/build/docs passed. Independent reviewer approved the final combined source/tests/docs. Synthetic live provider generator returned valid JSON; signed-in preview walkthrough, broader model-quality evaluation, aggregate budget decisions and provider retention remain pending. Historical entries above describe earlier states.
