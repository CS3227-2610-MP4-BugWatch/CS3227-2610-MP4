# Design

## Context

See proposal.md for scope and the two delta specifications for observable behavior. Decision sources and historical mockups are linked from `workflow/submitted-report-editing/workflow-evidence.md`.

The planning root is this repository. The initial implementation used development50d6c30; final reconciliation uses merged PR9/PR10 development39f4f08. Preserve unrelated uncommitted workflow work and historical evidence. Do not treat earlier coverage or browser checks as acceptance of the new combined tree.

Current contracts are in `src/features/reports/types.ts`, `reportRepository.ts`, `ReportForm.tsx` and `ReportDetailsPage.tsx`. Routes live in `src/features/projects/ProjectsApp.tsx`; session wrappers in `src/features/auth/AuthenticatedApp.tsx`; shared navigation in `src/shared/components/WorkspaceShell.tsx`. Migrations005/008/011 deny direct report/history writes and use authorized RPCs, project-before-report locks and atomic history. Migration011 constrains history to five existing event names. Existing comments and history refer to report ID, so a project move must update the same report row.

## Goals / Non-Goals

**Goals:** Use existing repository/session/form patterns; make saving, history and notification creation one transaction; provide a stable contract for parallel implementation and tests; preserve current discussion/navigation and existing assistant behavior.

**Non-Goals:** New lifecycle states, Developer severity UI, archive UI, all remaining mailbox event producers, external delivery, autosave, edit drafts, a second AI endpoint, speculative shared abstractions or a controlled model benchmark.

## Decisions

### Reconciliation amendment — confirmed after PR9 merged

The current integration base is merged development39f4f08. This amendment supersedes the earlier planning-only base/migration statements below. Keep the existing approved product contracts and reconcile PR9's resolution/canonical fields, parser branches, history rendering and session methods with editing/mailbox. Rename our new migration to `014_report_editing_mailbox.sql`, applied after012_report_resolutions.sql and013_developer_question_quota.sql. Preserve historical evidence filenames rather than relabelling their results as new runs.

Migration014 preserves all eight history events and PR9's get_report resolution/canonical projection; to_jsonb(r) exposes the added severity columns. Its extended history projection retains project_names. Replace all seven affected existing mutators, including resolve_report and link_duplicate_report, with source-project rechecks after locking the report. Keep their signatures, permission/state rules and no-op semantics.

For moves, inspect both incoming and outgoing current canonical and immutable resolution canonical references under the same project-before-report locking regime. If destination differs and any reference exists, raise P2011 before writes. The adapter maps P2011 to ReportError('validation', 'This report is linked to another report as a duplicate and must stay in this project. You can still edit its other fields.', { projectId: 'Duplicate-linked reports must stay in their current project.' }). No new public type is needed. Same-project edits remain permitted. Do not clear links, alter snapshots or move linked groups. Resolved/Closed remain read-only in the editor.

The field error uses the existing form validation presentation; no new layout or controls are introduced. Add deterministic tests for outgoing/incoming/current/captured references, permitted ordinary edits, unlinked moves, link-versus-move ordering and both new mutators versus movement. Merge all existing resolution fixtures with required severityRevision and all editing fixtures with nullable resolution/canonicalReport. Runner selects all six report suites and preserves PR9's optional SQL verifier.

### 1. Extend existing reports and add a focused mailbox repository

Keep report editing in `src/features/reports/`. Put mailbox-specific types, adapter and page under `src/features/mailbox/`; use WorkspaceShell only for shared navigation. Reuse existing Supabase clients and `withSession` wrappers. Do not add a service-role browser client or a separate HTTP backend for these database actions. RPC/RLS checks remain authoritative; hiding Edit report is only a convenience.

Alternatives: direct client table updates cannot safely coordinate history and notification; a new server framework duplicates existing session/RPC patterns.

### 2. Save using trusted database state, not a client-selected recipient

Append `014_report_editing_mailbox.sql` after013_developer_question_quota.sql. Add mailbox storage, recipient-scoped access and protected RPCs. Only the edit transaction creates this notification type. Authenticated recipients can list, mark read and delete their own items; direct insert/update privilege must not allow forging notification content or recipients. Keep PUBLIC/anon access and execute grants no broader than existing protected RPC patterns; fix security-definer search paths.

The edit transaction validates the caller, editable state, current/source and destination projects and normalized input. Lock relevant project rows in deterministic UUID order, then the report, matching existing project-before-report ordering. Recheck its source project after acquiring the report lock; if another move changed it, return a retryable state conflict without writing. Archive, state, assignment and recipient checks use locked/current values. Updating project_id preserves report ID, comments, history, state and assignment. No client metadata is trusted.

Project movement also changes an assumption in existing mutations. Migration014 replaces accept_report, start_report_investigation, await_tester_information, resume_report_investigation, post_report_comment, resolve_report and link_duplicate_report so each rechecks the locked report's current project against the project it actually locked. On mismatch, refuse/retry safely without writes; refresh and authorize against the current project, never a stale source. Preserve project-before-report ordering, actor/state checks, signatures, grants, comments and event formats. Do not edit historical migrations. Test a move between initial source read and report lock for affected actions, with archive fixtures and link creation racing with either endpoint's movement. Archive UI is not part of this change.

Compute a field diff against current normalized storage. A no-change result does not change updated_at, history or notifications. For real changes, commit the report, a `report_edited` history event and (if assigned) one recipient item together. Any failure rolls everything back. Extend SQL history constraints, the TypeScript discriminated union/parser and detail-history rendering together; preserve all seven PR9 event formats alongside report_edited.

Use a per-save request UUID and a recipient-independent edit receipt keyed by actor/report/request ID. Successful real/no-change attempts can be replayed only by the same authorized actor and matching payload; changed payload under the same ID is rejected. A transport retry reuses its key, while a new explicit edit/override uses a new key. Receipts are not mailbox items or extra history events. This handles lost responses without duplicate events. A replay returns the original committed result, not a second mutation; current authorization still applies.

Alternatives: independent client writes can leave a report without its audit/notification; treating every network retry as a fresh edit can duplicate attention items. Client-only change detection cannot enforce no-op semantics or race safety.

### 3. Compare severity revisions, then require an explicit retry

Add a server-maintained severity revision to the report read projection, initialized for existing reports. Increment it on every real severity change, including future Developer operations; keep it protected from caller writes. This detects change-and-change-back without mislabeling ordinary status/comments as severity changes. Do not use report updated_at as the severity revision or rely only on equality of the severity value.

The editor reads the revision with the report and submits it. On mismatch, the RPC returns a structured severity-conflict snapshot without a mutation. The page keeps every manual field unchanged, stores the newly observed revision separately and shows the inline comparison/notice. A later explicit Save changes submits the selected fields with that observed revision, so the Tester may deliberately override; another intervening severity change produces another notice. No acceptance button, live interruption, automatic merge or silent field replacement is added.

Use trusted actor information for Developer wording only when available. If attribution is unavailable or the change came from the Tester's other session, say severity changed rather than inventing an actor. The future Developer editor remains a separate feature and must participate in the same server-maintained revision discipline.

### 4. Shared contracts for implementation and tests

Names below are planning contracts; changes require a plan revision and notification of affected owners before coding diverges. Unchanged types/methods stay defined at their existing paths.

Apply contract revision3 fixes naming for parallel owners: export `ReportSeverityConflict = { latestSeverity: ReportSeverity; latestSeverityRevision: number; actorRole: 'developer' | 'tester' | null }`; add `ReportError.severityConflict?: ReportSeverityConflict` and a fourth optional constructor argument after the existing fieldErrors argument. A report_edited history entry can additionally carry `projectNames?: { before: string; after: string }`. These names do not change the approved behavior.

**Report contract — `src/features/reports/types.ts`:**

- Extend Report with `severityRevision: number`, a nonnegative server integer. Existing `getReport` returns it once migration014 is integrated; do not silently accept a missing revision as safe for editing. Preserve nullable resolution and canonicalReport fields from PR9.
- Add `ReportEditRequest = { input: ReportInput; expectedSeverityRevision: number; requestId: string }` and `ReportEditResult = { outcome: 'saved' | 'unchanged'; report: Report }`.
- Add `ReportRepository.editReport(id: string, request: ReportEditRequest): Promise<ReportEditResult>`; the authenticated actor/recipient are never arguments.
- Extend ReportError with `severity_conflict` and an optional conflict snapshot containing `latestSeverity`, `latestSeverityRevision` and trusted nullable actor-role information. Keep existing validation, unauthenticated, forbidden, archived, not_found, state_conflict and unavailable behavior. A conflict means no edit committed; unavailable can mean the commit outcome is uncertain.
- Add `report_edited` history with `changes: Partial<Record<keyof ReportInput, { before: string; after: string }>>`; normal actor/time/ID fields remain server-owned. Project changes carry before/after display context resolved by trusted reads; do not show only an opaque old project UUID when its name is available.

**Persistence adapter — `src/features/reports/reportRepository.ts`:**

- Validate/normalize using the current validation module and call an authenticated `edit_report` RPC. Parse the returned canonical report/result or typed conflict. Keep SQL signal-to-domain-error mapping explicit and tested; choose noncolliding database error signals during migration implementation.
- Return current canonical data only after commit; stale request completions must not populate a different account/report page.
- The backend owner also updates get_report/read projections, event constraints/parsers and any affected adapters. Tests exercise direct RPCs as well as the adapter.

**Mailbox contract — `src/features/mailbox/types.ts` and `mailboxRepository.ts`:**

- `MailboxItem` contains ID, report ID, actor identity/display information, report title, current project context, changed ReportInput keys, created time and nullable read time. Server queries supply these; user IDs are not caller-selected recipients.
- Exact fields: `id`, `reportId`, `actorId`, `reportTitle`, `projectId`, `projectName`, `createdAt` are strings; `actorUsername`, `actorDisplayName` and `readAt` are string or null; `changedFields` is `(keyof ReportInput)[]`. `MailboxError(code, message)` has codes unauthenticated, forbidden, not_found or unavailable. Export `createMailboxRepository(client: SupabaseClient): MailboxRepository` from mailboxRepository.ts.
- `MailboxRepository.listItems(filter: 'all' | 'unread'): Promise<MailboxItem[]>`, `markRead(id: string): Promise<void>` and `deleteItem(id: string): Promise<void>`.
- Use bounded keyset RPC pages ordered newest first with ID tie-breaker; the repository exhausts pages without silently truncating the list. Repeated mark-read and deletion are safe. Cross-recipient operations return no private contents; for deletion a missing/unowned ID can be an indistinguishable no-op.
- Normalize auth/forbidden/not-found/unavailable outcomes through a feature-owned MailboxError. The UI distinguishes successful empty lists from failed loads.

Persistence call shapes for the independently written adapter tests: `edit_report({ p_report_id, p_input, p_expected_severity_revision, p_request_id })`, where p_input is the normalized camelCase ReportInput object; `get_mailbox_items({ p_filter, p_cursor_created_at, p_cursor_id })` returns arrays of at most100 records; `mark_mailbox_item_read({ p_item_id })` and `delete_mailbox_item({ p_item_id })` return no payload. Mailbox SQL records use snake_case names matching the fields above. A severity conflict uses SQLSTATE P2010 with JSON details matching ReportSeverityConflict; preserve existing error codes otherwise. The repository exhausts keyset pages, validates returned records and rejects malformed pagination rather than looping indefinitely.

**Editor/page contracts — UI owner:**

- `ReportEditPage.tsx` consumes the existing user/project/report dependencies, canonical getReport, editReport and assistant transport. Add `/reports/:reportId/edit` and `/mailbox` alongside current routes, with the existing authentication boundary.
- Extend ReportForm with an explicit edit mode, preserving create/draft call behavior. In edit mode expose Save changes/Cancel and existing Generate suggestions; never call createReport, saveDraft or submitDraft. No new AI context or quota policy.
- A severity conflict updates the observed revision and notice, **not** ReportForm's savedInput. The current form replaces its fields when savedInput changes; using that prop for a conflict would erase the retained text. Cover this boundary with a regression case.
- Success and normalized no-op return to the same report. Cancel/back uses current unsaved-changes protection. Validation, archive, permission and connection errors keep input while authenticated. Expiry continues existing behavior; no autosave is added.
- MailboxPage loads private items and renders the approved card. Open report first persists mark-read, then navigates. On mark-read failure stay with retry feedback; this is the proposed minimal recovery choice, not a claim of atomic browser/database navigation. Delete removes only the item. Guard duplicate requests and stale account responses.

### 5. Ownership, execution and evidence

The coordinator owns the feature plan, shared planning records, integration baseline and final checks. Backend implementer owns report/mailbox contracts, repositories and SQL. Frontend implementer owns pages/form/navigation/session wiring. Tester owns `src/test/*.test.ts` changes and explains requirements, partitions, boundaries, negative/actor/state/timing cases. Implementation and tests can proceed independently once these interfaces are agreed. Give each agent fresh focused context and exact plan revision; retrieve extra sources when needed. Transfer presentation-file ownership to ui_polisher only after functional work stabilizes. Documentation follows actual behavior; independent reviewer decisions gate every submission and fix. Post-approval summaries use the existing templates.

Freeze coverage scope before tests: all newly added mailbox modules/editor and materially changed report form/detail/types/repository/validation, ProjectsApp, AuthenticatedApp and WorkspaceShell. Type-only modules can have provider-specific N/A denominators, with explanations; do not exclude executable paths to improve results. Initial target:80%lines and80%branches per scoped production file. Preserve counts, uncovered lines/branches and accepted risk exceptions. SQL permissions, transaction/locking cases and actual browser behavior need separate evidence.

Maintain the existing live evidence record and supplement the version snapshot at apply kickoff. Keep first-pass failures before fixes, human-discovered defects separate from new decisions, correction rounds, active human time if measured, all agent/retry/review usage and elapsed time. The current partial usage snapshot includes exploration/workflow overhead and does not prove a saving; do not double-count overlapping cumulative windows. Cache hits are observations, not a caching experiment. No extra model benchmark is implicitly authorized.

## Risks / Trade-offs

- [Older local base] → Integrate development50d6c30 or newer before implementation; preserve uncommitted workflow work and reconcile changed routes/history. Re-run baseline checks there.
- [Cross-project lock contention] → Deterministic project locks and recheck under report lock; test inverse moves, archive and assignment races without timing-only assertions.
- [Authorized Tester intentionally replaces severity] → This is the user's confirmed rule after warning, not an authorization defect. Record the actual before/after edit in history.
- [Future Developer severity feature bypasses revision] → Server-maintained change tracking rather than a UI-only increment; document and test the integration contract.
- [Mailbox snapshot becomes stale] → Link by stable report ID, use current project context and preserve immutable event information; history is the detailed source.
- [Required external checks unavailable] → Mark database/browser checks Not run/Unverified; do not claim completion from mocks or a build. Preserve unmet gates.

## Migration Plan

1. Preserve current work and integrate merged development39f4f08. PR9 owns migration012, PR10 owns013; this feature uses014. Record confirmed incoming/outgoing current/captured duplicate-linked move refusal and preserve ordinary edits.
2. Implement and test the additive migration against an explicitly isolated database using the existing guarded test pattern. Existing report, history and discussion reads must remain compatible; reconcile any versioned RPC projection changes before shipping the frontend.
3. Add editor/mailbox code and guide updates; run deterministic tests, scoped coverage, lint/build/docs and authorized database/browser checks. Record all independent approvals.
4. Open the eventual PR to development. Verify the correct preview Supabase migration/environment and signed-in behavior on Vercel before merge. No master PR or production database action is implicit here.
5. Roll back app exposure first if necessary. Do not delete report history or mailbox data to undo UI rollout; use reviewed forward database corrections. Do not run destructive rollback against live data.

## Open Questions

None blocking this planning draft. Exact noncolliding SQL error numbers, internal indexes and evidence capture tooling can be settled without changing observable contracts. User review of the complete artifacts and an explicit apply request are still required before implementation.
