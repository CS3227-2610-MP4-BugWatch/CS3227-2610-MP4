# Tester report assistant implementation

Revision 1. Baseline development 6a0f273 includes submission and drafts. Work on codex/tester-report-assistant.

## Authority

Use [spec](../openspec/changes/tester-report-assistant/specs/tester-report-assistance/spec.md), [design](../openspec/changes/tester-report-assistant/design.md), [tasks](../openspec/changes/tester-report-assistant/tasks.md), and [measurement plan](2026-11-07-tester-assistant-measurement.md). The server must keep live generation disabled unless explicitly enabled in server configuration after provider setup. Mocked tests inject a generator. No hosted writes, key use, deployment or push during local implementation.

## Contracts and ownership

- Coordinator owns shared DTO in src/features/reports/reportSuggestionTypes.ts, build configuration, OpenSpec, workflow, and guides.
- Endpoint implementer owns api/tester/report-suggestions.ts and api/_lib assistant server modules. Export `handleReportSuggestions(request: Request, dependencies: ReportSuggestionDependencies): Promise<Response>` from the endpoint or re-export there. Dependencies use async `authenticate(token): {id,role}|null`, `findProject(token,projectId): {name,description,archived}|null`, `reserve(actorId): {allowed,retryAfterMs}`, and `generate(context): unknown`. Model context is `{project:{name,description},report:{title,description,...allowedNonblankOptionalFields}}`. Default Vercel handler connects these to Supabase and gated SoCLaaS. Quota RPC is `reserve_tester_suggestion_attempt(p_actor_id uuid)` returning scalar JSON `{allowed,retryAfterMs}`, callable only as service role. User access token remains request scoped.
- Quota implementer owns migration 008 in src/features/reports/database. Use atomic DB time and concurrency-safe locking per verified Tester and reject callers other than service role. Roll back fixtures in standalone verification SQL if needed.
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
