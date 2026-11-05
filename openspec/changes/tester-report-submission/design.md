# Design

## Context

See [proposal](proposal.md) and [behaviour contract](specs/bug-reporting/spec.md). The branch already includes project PR #2's merged tree and local report submission. Reuse its router, project repository, authentication and Supabase client. The new work adds recovery, report navigation and project-scoped discovery.

User-confirmed limits and explicit severity choice are recorded in the proposal. Severity definitions remain deferred. Discovery is limited to the current project; personal and cross-project views, discussion and resolution are separate.

## Goals / Non-Goals

**Goals:** A testable report repository, trusted atomic persistence, and a small create/read path integrated into the existing authenticated router. Provide stable contracts before parallel implementation/testing.

**Non-Goals:** Additional frameworks, a second Supabase client/router, a replacement project model, drafts in the submitted-report table, or client-only authorization. See proposal for feature exclusions.

## Decisions

### 1. Integrate after the project dependency lands

Create planning on `codex/tester-report-submission` from `origin/development`. Before application edits, fetch and rebase onto the reviewed project merge, re-read its actual contracts, and record the new base/revision in the coordinator record. Changes to contracts require a planning update and notification to affected agents. Do not silently merge the unreviewed PR head. This preserves the requested feature-to-development workflow and avoids parallel project implementations.

Coordinate the existing same-user SIGNED_IN form-loss finding with the project/auth owner. Either upstream has fixed it or a narrowly owned prerequisite fix must be reviewed before this feature passes its form-lifetime acceptance scenarios. Do not weaken logout cleanup to preserve input.

### 2. Feature-local types and validation

New `src/features/reports/types.ts` exports:

- `ReportSeverity = 'very_low' | 'low' | 'medium' | 'high'`; render labels Very Low, Low, Medium, High. The form starts with `''`.
- `ReportInput`: strings `projectId`, `title`, `description`, `version`, `reproductionSteps`, `expectedResults`, `actualResults`; `severity: ReportSeverity | ''`; optional string `testEnvironment`.
- `ValidatedReportInput`: same fields with valid severity and required string `testEnvironment`; absent/blank environment becomes `''`.
- `Report`: validated input plus `id`, `reporterId`, `createdAt`, `updatedAt`, `state: 'Open'`, `assignedDeveloperId: null`, `projectName`, `projectArchivedAt: string | null`, `reporterUsername`, `reporterDisplayName`. Broaden state/assignment types when the later lifecycle implementation introduces those values; this slice writes only Open/unassigned.
- `ReportHistoryEntry`: `id`, `reportId`, `actorId`, `actorDisplayName: string | null`, `occurredAt`, `event: 'created'`, and `changes` keyed by report input fields with `{ before: null; after: string }` values.
- `ReportError`: code `validation | unauthenticated | forbidden | archived | not_found | unavailable`, message, optional `fieldErrors: Partial<Record<keyof ReportInput, string>>`.
- `ReportRepository`: `createReport(input: ReportInput): Promise<Report>`, `getReport(id: string): Promise<Report | null>`, `listReportHistory(id: string): Promise<ReportHistoryEntry[]>`.

`validation.ts` exports `validateReportInput(input: ReportInput)` returning `{ valid: true; value: ValidatedReportInput }` or `{ valid: false; errors: Partial<Record<keyof ReportInput, string>> }`. Validate runtime shapes, UUID project ID, nonblank required strings, explicit enum and confirmed lengths. Use `String.trim()` and `Array.from(text).length` to match existing project code; SQL uses `project_trim` and `char_length`. Preserve internal whitespace; do not interpret Markdown. Native `maxLength` alone counts UTF-16 units and cannot establish this contract.

### 3. Submitted report and creation history schema

The first commit uses the existing local `src/features/reports/database/005_reports.sql` after 001–004, including `project_trim`. Add the listing function in the second commit's next numbered migration (006 if still available); verify the number against the branch before implementation.

`public.reports` stores server UUID `id`, FK `project_id`, required normalized input fields, `severity` checked against the four lowercase storage values, `test_environment` default `''`, FK `reporter_id`, `created_at`/`updated_at` timestamptz, `state` initially constrained to Open, and nullable `assigned_developer_id` initially constrained to null. Direct client writes are revoked. Later lifecycle work explicitly migrates these constraints/types; do not implement its transitions here.

`public.report_history` stores server UUID `id`, FK `report_id`, FK `actor_id`, `occurred_at`, event initially constrained to `created`, and JSONB `changes` containing initial values with null before values. Index report/time/ID for stable history order. Avoid cascade deletion of submitted records; no ordinary delete operation exists. Record project ID in history, not a mutable project-name snapshot.

All constraints mirror validation even for elevated fixture writes. No uniqueness constraint on title: two bugs can have identical titles. No project repository fetch occurs.

### 4. Trusted RPCs and scoped reads

Use fixed empty search paths, schema-qualified objects, restricted execution grants and authenticated role/profile checks, following upstream project RPCs.

| RPC | Parameters | Output / errors |
| --- | --- | --- |
| `create_report` | `p_project_id`, `p_title`, `p_description`, `p_version`, `p_reproduction_steps`, `p_expected_results`, `p_actual_results`, `p_severity`, `p_test_environment` | A JSON object matching report row plus scoped labels; failures roll back report and history |
| `get_report` | `p_report_id` | Same JSON object, or SQL null if missing; authenticated profile required |
| `get_report_history` | `p_report_id` | Ordered creation history rows plus actor display name; `not_found` if missing |

Creation derives actor from `auth.uid()`, requires its protected profile role to be Tester, validates input, then locks the project row `FOR SHARE` and rejects missing/archived targets. This serializes creation with a future archive update. Insert report and creation history in the same database function/transaction. Capture server timestamps once so report/history agree. Do not accept actor, state, assignment, ID or timestamps as parameters.

Use SQLSTATE P2001 unauthenticated, P2002 forbidden, P2003 validation, P2004 archived, P2005 not_found (recheck availability after rebase). Validation detail can identify fields with controlled keys; never render arbitrary database exception text. Unknown transport/database errors map to unavailable; HTTP401/JWT rejection maps to unauthenticated.

Reports and history have RLS SELECT for authenticated users with valid profiles, no anon access and no ordinary INSERT/UPDATE/DELETE grants. Restrict RPC execution to authenticated; elevated test fixture access is separate. Read RPCs expose only the requested report, project name/archived state, reporter username/display name, and referenced history actor names. They do not expose email, a profile directory, or broaden profiles' own-read policy. Render labels as text. Handle missing/blank labels deliberately, keeping stable actor IDs for attribution.

`projectRepository.ts` already demonstrates field mapping and response checking. New `reportRepository.ts` exports `createReportRepository(client: SupabaseClient): ReportRepository`, validates writes before RPC, maps snake_case fields, rejects malformed responses as unavailable, returns null for invalid/missing getReport IDs, and returns not_found for invalid/missing history IDs. Returned report data must contain valid metadata and normalized field values. Read operations never mutate.

### 5. UI and shared-file ownership

Reuse the single upstream BrowserRouter and authenticated shell:

- `/reports/new`: Tester form with required active-project selector; optional `?projectId=<uuid>` preselection is accepted only if that project is in the loaded active list. No automatic first-project selection is necessary.
- `/reports/:reportId`: minimal read-only saved report detail and creation history, available to both roles. No placeholder discussion/resolution controls.
- `ProjectDetailsPage`: add a Report bug link only for Testers on active projects. The form also links back to projects.
- Cancel returns to the selected project's details when valid, otherwise the project list, with no mutation. Success navigates to `/reports/<id>`.

`ReportForm.tsx` owns controlled fields and accessible validation presentation. `ReportCreatePage.tsx` owns active-project loading, retry, a synchronous submit lock and pending state, save errors and navigation. `ReportDetailsPage.tsx` owns saved report/history loading, not-found/error/retry views and literal rendering. Key routed pages by user and pathname like upstream; ignore late completions after unmount/user replacement.

Coordinator alone edits `ProjectsApp.tsx`, `ProjectDetailsPage.tsx`, `AuthenticatedApp.tsx` and necessary shared `App.css` rules. Extend existing route props with `reportRepository`, instantiate it using the shared Supabase client, and wrap unauthenticated errors with auth re-resolution just like project operations. Do not pass a caller-chosen role to persistence. Keep same-user session notifications from unmounting the form while retaining real session-loss cleanup.

### 6. Recovery, breadcrumb and project tabs

- Keep the existing database rejection for archived or missing projects. On an archived response, show an inline notice confirming the report was not submitted, suggest contacting the Developer who created the project outside BugWatch, and offer Discard report. Do not claim to know who archived it. Discard reuses the no-write cancel path; keep text available until the Tester leaves or their session ends. No draft, automatic choice refresh, or automatic switch. Manual project selection still changes only the project field. A missing project continues to show an error without losing input.
- On a connection failure, keep the form open and make submission available for an explicit retry. If the save could not be confirmed, say so rather than claiming no write occurred. The pending lock ignores any further submit attempts until the request completes. Preserve existing session-loss cleanup.
- Keep successful submission navigation to `/reports/:reportId`. Render an accessible breadcrumb with literal slash separators and the report title as the current item. Projects opens the project list; the project name opens its Overview; Reports and Back to project reports link to `/projects/:projectId?tab=reports`. Links are explicit destinations rather than history-back actions.
- Use the existing project route and URL query to select the tab, so refresh and shared links preserve the selected tab. Missing or unrecognised tab values select Overview. Overview retains project details/history. Reports loads independently so a report-list failure does not disable Overview. Report bug stays available on both tabs for Testers on active projects.
- Extend `ReportRepository` with a project-scoped read for brief report rows. Return IDs for navigation plus title, project, severity, state, assignee/unassigned, and reporter. Add a scoped database read with a valid-profile check and stable newest-first ordering (created_at descending, ID as a tie-breaker). Avoid silently dropping reports at the database/API row cap; use bounded pages internally as needed. Scope reporter labels to returned reports and preserve own-profile policies. Do not expose drafts, unrelated project rows, email, or a profile directory. Render names and titles literally.
- Keep each commit buildable: Commit 1 introduces recovery and links to the project route with the Reports query; Commit 2 adds the tab handling and complete list landing. Review and ship the two commits together.

### 7. Verification and guide placement

Use existing Vitest configuration and upstream Testing Library/jsdom. Tests stay in `src/test/*.test.ts` with `createElement` as needed. Test validation boundaries per field (including emoji), independent negative cases, adapter errors/read shapes, create/detail UI, active-project races and role denial. Add the same-user SIGNED_IN/TOKEN_REFRESHED preservation and actual signout/user-change cleanup cases. Check literal rendering and no protected state leakage.

Hosted tests require explicitly isolated Supabase configuration, ordinary Tester/Developer/anonymous clients for permissions, and a separate elevated fixture client. Guard against production origins and partial setup, create unique fixtures and clean only their IDs. Use a rollback SQL script in a throwaway test project to force history failure and prove atomicity. Local mocks cannot establish RLS, row locking, or rollback correctness. Coordinator owns any test runner/npm script; never put secrets in browser variables or logs.

Add distinct `docs/userGuide/Reports.md` and `docs/developerGuide/Reports.md` topics during implementation because no report topic exists. Follow the documentation skill; coordinator/documentation writer serialize landing-page and `_markbind/layouts/default.md` edits. Describe actual implemented submission/readback only. Update Developer Guide acknowledgement if adapting external material. Run full tests/lint/build/docs build; preserve pre-existing generated audit bytes.

## Risks / Trade-offs

- [Upstream PR may change] -> Gate implementation on its reviewed merge, rebase and contract comparison; do not silently approve its known findings.
- [Scope creep from report discovery] -> Include only the selected project's submitted reports. Defer personal tabs, all-project browsing, search and filters.
- [Network failure after a successful commit is ambiguous] -> Do not promise exactly-once creation across retries or say the server definitely saved nothing. Local pending locks prevent overlapping submissions only; durable retry idempotency is outside this contract.
- [Session reconfirmation can lose input] -> Include preservation regression and resolve the upstream defect before final acceptance; actual expiry still discards unsaved input.
- [Concurrent archiving] -> Recheck under a project row lock; add isolated concurrent/rollback verification when an environment is available.
- [Scoped reads bypass own-profile RLS internally] -> Restrict outputs and grants, test anonymous/unrelated-profile denial, and never expose a general profile endpoint.
- [Future lifecycle work needs broader schema] -> Keep current constraints explicit and migrate them alongside authorised later transitions, rather than exposing unused mutation APIs now.

## Migration Plan

1. Rebase after reviewed project merge and reserve the migration number. Review SQL locally before applying anything.
2. Apply prerequisite and report migrations in order to an isolated development/test Supabase project only, with separate authorised setup access.
3. Run hosted permission checks and rollback assertions there; record actual outcomes or explicit limits.
4. Run local verification and independent final review; open a feature PR to `development` when implementation is ready.
5. Test the Vercel preview with development-only Supabase settings: Tester create/read, Developer read/denied create, validation/retry, reload saved route, tab-return input retention, and logout cleanup. Confirm direct route reload works on hosting.
6. Only later promote reviewed development to master. No production migration/deployment is authorised by this proposal. Roll back frontend first if needed; preserve report/history data and do not automatically drop tables.
