# Design

## Context

See `proposal.md` for motivation and `specs/report-workflow/spec.md` for acceptance criteria. Revision 1 of these artifacts is the implementation contract.

Migration `005_reports.sql` restricts reports to Open and null assignment and history to created events. Repository row validators enforce the same restrictions. Detail and listing components hard-code Unassigned; detail history assumes creation. `ProjectsApp.tsx` has the trusted user but does not pass it to report details. `AuthenticatedApp.tsx` wraps repository operations for expired-session handling and keys protected routing by user. Reuse this structure, Supabase RPCs, and existing scoped identity joins.

Existing tests use Vitest, mocked RPCs, jsdom/Testing Library, and optional isolated Supabase integration. Hosted tests require explicit isolated configuration; an ordinary skipped suite is not database verification. The submission, draft, and application UI changes remain in flight and share these files.

## Goals / Non-Goals

**Goals:** Extend the existing report repository and database authorization boundary, preserving creation/draft contracts and keyset listing pagination. Keep transitions atomic and UI state derived from authoritative responses.

**Non-Goals:** Introduce a generic state engine, new package, assignment service, profile directory, polling, or general report editing. Product exclusions are in the proposal.

## Decisions

### 1. Narrow transactional RPCs

Create `src/features/reports/database/008_report_workflow.sql` after 007, leaving applied migrations unchanged. Add nullable `assigned_at` and constrain valid combinations: Open requires null assignment/time; Accepted and In progress require non-null assignment/time. Creation defaults remain Open/unassigned. Expand history events to `created`, `accepted`, and `investigation_started`.

Expose `accept_report(p_report_id uuid)` and `start_report_investigation(p_report_id uuid)`, each returning the updated report JSON using the extended read shape. Derive actor/role from authenticated identity; keep direct report/history mutations revoked. Security-definer functions use an empty search path, qualified names, and authenticated-only execute grants following existing migrations. A generic target-state update would expose unnecessary transitions and protected fields.

Lock the report's project row before its report row, using the existing project-mutation locking conventions. Check active status and source state under locks. Use the same lock order for both actions. This serializes report actions against archival and competing acceptance. Capture one server action timestamp after lock acquisition for the report update and event. Acceptance records assignment and Open to Accepted; investigation records only Accepted to In progress and preserves `assigned_at`. Any history failure rolls back the report mutation.

Use existing P2001 authentication, P2002 forbidden, P2004 archived, and P2005 missing errors. Add P2006 already assigned and P2007 invalid/current-state conflict. On acceptance, an existing assignment produces P2006, including repeated calls by the winner. Starting from Open or In progress produces P2007; another Developer starting an Accepted report produces P2002. Repeated actions do not create events or update timestamps. Malformed IDs are rejected in the repository as not_found without an RPC.

### 2. Extend existing report contracts

Cross-owner interface I1, produced by implementer and consumed by tester/UI:

- Module: `src/features/reports/types.ts` and `reportRepository.ts`.
- Export `ReportState = 'Open' | 'Accepted' | 'In progress'`; extend `Report` with `assignedDeveloperId: string | null`, `assignedAt: string | null`, `assignedDeveloperUsername: string | null`, and `assignedDeveloperDisplayName: string | null`.
- Add `ReportRepository.acceptReport(id: string): Promise<Report>` and `startInvestigation(id: string): Promise<Report>`. Inputs contain only a report ID. Success returns persisted report data; the side effects are the corresponding atomic transition and history event, without navigation.
- Extend `ReportError` codes with `already_assigned` and `state_conflict` mapped from P2006/P2007, retaining existing mappings and safe user messages.
- Extend `ProjectReportSummary` with assignee username/display-name labels (assignment time remains detail-only). Extend `get_report` and `list_project_reports` with report-scoped assignee joins; retain ordering, cursor precision, bounds, and access checks.
- Validate supported states, UUIDs, timestamps, and consistent assignment combinations. Unknown or malformed server data remains unavailable. No loosening of report input validation.
- Extend history as a discriminated union: preserve the existing created-entry shape; accepted entries contain `state`, `assignedDeveloperId`, and `assignedAt` before/after changes; investigation_started entries contain state before/after changes. Non-creation before values may be strings or null. Keep identity labels scoped and text-only.
- Add optional `actorUsername` and acceptance-specific `assignedDeveloperUsername`/`assignedDeveloperDisplayName` labels to history entries, populated by report-scoped reads, so rendering avoids raw UUIDs and handles blank names. Reuse stable IDs in data and meaningful unavailable-user fallbacks.
- Unchanged draft and creation inputs remain as declared in existing types. Existing create/submit calls return the extended report shape; fresh reports have null assignment metadata. Old draft submission receipts can read reports that have since progressed without failing strict decoding.

### 3. Detail page owns actions and refresh

Cross-owner interface I2, produced by implementer and tested by tester:

- Module: `ReportDetailsPage.tsx`; props become `{ reportRepository: ReportRepository; user: SessionUser }`, using the existing session type exported through project types. `ProjectsApp.tsx` passes user. `AuthenticatedApp.tsx` wraps both new methods with existing `withSession` handling.
- Place action controls near current state/assignment; show exactly the eligible action from the spec. No list action is added. Listing renders assignee labels instead of Unassigned for assigned rows.
- One local pending guard blocks overlapping mutations and exposes status feedback. After success, reload report/history. After already_assigned/state_conflict, keep the explanation and reload authoritative data before enabling another action.
- On uncertain network outcomes or readback failure, offer read-only Reload and do not automatically retry mutations. Keep action controls unavailable until authoritative readback succeeds. Other errors have appropriate safe messages; expired sessions use the authentication wrapper.
- Scope asynchronous load/action results to report ID, mounted page, and user identity. Existing keyed routing helps, but stale request guards must also prevent late results from changing a replacement page. No action navigates away.
- Rename the visible Creation history section to Activity history and render event-specific descriptions and changes while preserving creation fields and literal text.

### 4. File ownership and execution

The coordinator owns OpenSpec artifacts and `workflow/accept-and-start-report-investigation/feature-plan.md`. During apply, initialize that record from the required template and link revision 1 here rather than copying requirements. No application work is authorized by this planning run.

The implementer owns the new SQL migration, report source files, `src/features/projects/ProjectsApp.tsx`, and `src/features/auth/AuthenticatedApp.tsx`. The tester owns `src/test/report-workflow-repository.test.ts`, `report-workflow-ui.test.ts`, `report-workflow-database.test.ts`, and necessary fixture/regression updates in existing report tests. Agree on I1/I2 before parallel work; changes to these interfaces require a new artifact/plan revision and notification.

After functional work, transfer exclusive ownership of detail/list presentation files to ui_polisher for a scoped Mantine, responsive, and accessibility pass. Do not allow concurrent implementer edits. Documentation writer then owns the two existing Reports guide topics. Coordinator serializes any test-runner or shared-script changes if the database test discovery needs extension; inspect the runner before changing it. Reviewer is read-only and must explicitly approve every completion/fix submission and final combined state. Post-approval implementer/tester summaries belong in the feature directory.

## Risks / Trade-offs

- [Locking per project reduces concurrency across report actions in one project] -> Keep transactions short; correctness with archive protection outweighs premature optimization.
- [Older frontend rejects newly assigned rows] -> Deploy database first, then frontend promptly; do not enable workflow controls in old builds and document rollout compatibility.
- [Readback can fail after a committed mutation] -> Explain uncertainty and reload before allowing another action; never infer rollback from a network error.
- [The report integration suite currently consumes one Developer token although the runner already obtains a second] -> Reuse `PROJECT_TEST_SECOND_DEVELOPER_TOKEN` for ownership/race tests and validate distinct Developer identities. The runner currently selects only `src/test/report-database.test.ts` for report tests; extend its report selection to include the new workflow database suite. Do not require production access or log credentials.
- [Parallel OpenSpec changes share reports files and assumptions] -> Preserve their current functionality and tests; this workflow's capability owns lifecycle additions. Do not edit their planning artifacts as part of this change. Reconcile their creation-only wording during their own finalization rather than treating it as a permanent ban on workflow events.

## Migration Plan

1. Apply 008 after 001-007 in an isolated test database. Verify existing Open reports require no backfill beyond null assignment metadata.
2. Run hosted workflow tests with two Developers and the existing Tester; exercise simultaneous acceptance and start requests, role/ownership/archive denials, and existing submission/draft/list reads. Add `verify_report_workflow.sql` with transaction-local rollback fixtures to force history failure and verify atomicity.
3. Run the local suite, lint, build, docs build, and detail/list walkthrough. Record hosted checks separately from skipped tests and obtain independent review.
4. After implementation approval and deployment authorization, apply the migration to the target database and deploy the frontend. Planning does not apply hosted migrations.
5. If rollback is needed, disable workflow actions while retaining the compatible extended readers and database data. Do not roll back to an Open-only frontend or drop state/history metadata once assigned reports exist; use a forward corrective migration if necessary.
