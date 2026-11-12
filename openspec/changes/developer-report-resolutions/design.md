# Design

## Context

See [proposal.md](proposal.md) for motivation and confirmed scope. This design is revision 2: canonical controls are placed inside Duplicate resolution only, as requested after implementation. Persistence interfaces I1-I3 remain unchanged from revision 1. Requirements are in the two delta specs; the coordinator record links to these contracts rather than duplicating them.

`ReportState` and the repository's strict decoders currently recognize only Open, Accepted, In progress, and Awaiting tester information. Migration `011_report_clarification_discussion.sql` is the latest report migration. All mutations use security-definer RPCs with trusted profile checks and project-before-report locking; report/history tables reject ordinary direct writes. `ReportDetailsPage` has independent report/history/comment reads, a common pending guard, and generation checks. `AuthenticatedApp.tsx` wraps each repository method with session handling. `listProjectReports` already retrieves all pages and can supply a same-project selector. Existing tests use Vitest, explicit jsdom UI files, Testing Library, mocked RPCs, and opt-in isolated Supabase integration.

## Goals / Non-Goals

**Goals:** Extend these boundaries with one resolution record per report, an independently managed canonical link, attributable atomic history, safe readback, and agreed input validation. Establish explicit contracts so implementation and tests can proceed independently after apply authorization.

**Non-Goals:** No new service, dependency, repository-provider API, generic state-transition endpoint, resolution editing, link removal UI, duplicate graph traversal, or tester lifecycle implementation. No closure/reopening RPC is introduced. Future reopening will need a separate design for successive resolution records; it is not simulated here.

## Decisions

### 1. Extend existing report data and RPCs

Use additive columns on `public.reports` for nullable resolution fields and nullable `canonical_report_id`, with protected author/time fields. A same-project composite foreign key (project ID and report ID) and a self-reference check enforce target identity. Outcome-dependent constraints enforce applicable fields: no resolution on current unfinished states, required resolution on Resolved/Closed, four fixed fields for Fixed, explanation for non-fix, and a captured canonical ID for Duplicate. Existing rows receive nulls and preserve state/assignment/history. Use database checks and RPC validation together; never trust client validation alone.

One record per report fits the current lifecycle, which cannot reopen. A separate resolution collection is unnecessary for this change. Capture the canonical ID used for a Duplicate outcome in the saved resolution and its activity; keep the independently editable current link separate. A subsequent link save preserves resolution fields and original snapshot and records old/new current links. Show both identities with clear labels if they differ. Do not make a link action silently rewrite a resolution.

Add Resolved to writable lifecycle constraints, retaining assignment requirements. Recognize Closed in readers/target eligibility and permit structurally valid privileged Closed fixtures for compatibility; no ordinary caller can set Closed. Ordinary data creation remains exclusively through the supported lifecycle. Do not infer a closure timestamp or retest record.

Alternative: storing links only inside a resolution would prevent independent linking; allowing arbitrary JSON without outcome constraints would weaken readback and invariants.

### 2. Public application contracts

Producer owner: implementer. Consumers: tester, detail UI, authenticated wrapper, and existing fixtures. Extend existing modules rather than introduce parallel repositories.

#### Interface I1: Domain records and mutation inputs

- **Module path:** `src/features/reports/types.ts`.
- **Exports and types:** Extend `ReportState` with `Resolved` and read-compatible `Closed`. Add `ResolutionInput`, discriminated by `kind`: `fixed` has `fixSummary`, `affectedVersion`, `commitUrl`, `pullRequestUrl`; `duplicate` has `explanation`, `canonicalReportId`; `invalid`, `cannot_reproduce`, and `will_not_fix` have only `explanation`. Add `ReportResolution` with the corresponding applicable values and `authorId`, `authorUsername: string | null`, `authorDisplayName: string | null`, `resolvedAt`. For Duplicate, `canonicalReportId` is the resolution snapshot target. Add required `Report.resolution: ReportResolution | null` and `Report.canonicalReport: { id: string; title: string } | null` (the current saved link). Extend `ReportHistoryEntry` with `resolved` and `duplicate_linked` variants.
- **Inputs:** Fixed/non-fix fields as specified; Duplicate input's canonical ID must equal the saved current link. No actor/time/state/assignment input.
- **Outputs:** A complete saved report; old rows and unfinished reports have null resolution. Current canonical link and captured Duplicate target are distinguishable.
- **Errors:** Continue `ReportError` codes; extend its field-errors union to cover resolution inputs and canonical selection without weakening existing report-input typing. `validation` identifies user-correctable input; `state_conflict` covers stale state or stale expected canonical link.
- **Side effects:** Type declarations alone have none; mutations below change persisted data.
- **Boundary behavior:** Reject malformed known-state records and mismatched outcome/field/assignment metadata. Missing new fields in pre-migration wire responses decode as null only for existing unfinished states during reader-first deployment. Unknown states still fail. Resolved/Closed without valid resolution metadata fail safely.

#### Interface I2: Validation

- **Module path:** `src/features/reports/validation.ts`.
- **Exports and types:** `validateResolutionInput(input: ResolutionInput)` returns `{ valid: true; value: ResolutionInput } | { valid: false; errors: ResolutionFieldErrors }`. Export the typed resolution field-error contract from `types.ts` and named validation limits for UI/test reuse.
- **Inputs:** I1 fields. Trim surrounding whitespace; count code points with the established pattern. Require summary/explanation 1-5,000, version 1-100, links up to 2,048 each; absolute HTTP(S) with a host. Canonical selection requires a UUID. Reject inapplicable/unknown fields and invalid runtime types, even if TypeScript callers are typed.
- **Outputs:** Trimmed input or actionable per-field errors. Preserve the trimmed URL spelling rather than rewriting provider paths through URL serialization.
- **Errors:** Validation results rather than exceptions for ordinary invalid input.
- **Side effects:** None; URL parsing never fetches a resource.
- **Boundary behavior:** Cover empty/whitespace, exact limits, one over, supplementary Unicode, invalid schemes/host, and absent mandatory links separately. Align SQL whitespace/character handling with the current application conventions.

#### Interface I3: Repository and persistence

- **Module paths:** `types.ts`, `reportRepository.ts`, and `database/012_report_resolutions.sql` under `src/features/reports/`.
- **Exports and types:** Extend `ReportRepository` with `resolveReport(id: string, input: ResolutionInput): Promise<Report>` and `linkDuplicate(id: string, canonicalReportId: string, expectedCanonicalReportId: string | null): Promise<Report>`.
- **Inputs:** Valid source UUID and I1/I2 fields; expected canonical ID is the value from the loaded report. No unlink operation. The selector reuses `listProjectReports(projectId)` and excludes the source.
- **Outputs:** Persisted report from `resolve_report(p_report_id uuid, p_resolution jsonb)` or `link_duplicate_report(p_report_id uuid, p_canonical_report_id uuid, p_expected_canonical_report_id uuid)`. Resolution JSON uses snake_case counterparts of I1; omit irrelevant fields. `get_report` returns nullable `resolution` and `canonical_report` objects with snake_case metadata inside resolution and `{id,title}` for current canonical target. Old fields stay unchanged. Both mutations return `get_report` readback.
- **Errors:** Existing P2001 authentication, P2002 permission, P2003 validation, P2004 archive, P2005 missing source, P2007 state conflict mappings. Malformed source IDs map locally to `not_found`; malformed/missing/cross-project/self targets map to `validation` without disclosing draft content. Generic service failures map to `unavailable` without SQL details. Neither operation retries mutations automatically.
- **Side effects:** Resolution saves state, applicable resolution values, derived actor/time, update time, and one history event atomically. Link saving changes only current target/update time and one link event; an identical existing target is a no-op. Preserve assignee/assignment time in both operations.
- **Boundary behavior:** Resolution requires In progress; linking follows C-36 assignment/active-project checks without adding a source-state restriction. Both functions check authentication/profile, lock project then source report, and validate again under lock. Changed links compare the expected old canonical ID under lock, returning conflict on stale replacement. Identical current target returns current data without a duplicate event. Duplicate resolution compares its input canonical ID against the current saved link; a different current ID returns conflict rather than resolving against an unseen target. Project lock also serializes same-project target-link races; check the target under that lock before saving. An invalid/missing required current link returns validation. All checks precede writes.

For history, add events without weakening existing variants: `resolved` has `changes.state` from In progress to Resolved and `changes.resolution` from null to the captured normalized resolution record (snake_case on the wire). `duplicate_linked` has `changes.canonical_report_id` with nullable old UUID and new UUID. History identity/time remains in the existing envelope. Decode all fields and display recorded IDs as internal report links; resolve labels only within the requested report context. Snapshot text remains immutable even if labels later change. Keep existing history readers, labels, creation snapshots, and compact disclosure behavior.

### 3. Detail UI and authentication integration

Keep actions on `ReportDetailsPage` above both tabs. Resolve report opens an inline form; default Fixed, prefill affected version, show only fields for the chosen kind, and discard inapplicable fields when constructing a request. Keep entered applicable text on validation and uncertain outcomes. Duplicate shows the saved canonical target and requires the separate link action first. No fixed-version control. Cancel leaves persisted data unchanged. Unsubmitted resolution text is page-local and is lost on leaving, logout, or expiry; no drafts are added.

Provide canonical selection only inside the open resolution form when Duplicate is selected, using existing same-project report summaries with title plus stable ID to disambiguate duplicates; use the existing complete paginated repository read. Place loading/retry/empty states and the non-submitting Save canonical link button inside that same form, without a standalone section or nested form. Hide these controls for all other outcomes, after cancellation, and outside In progress resolution. Existing saved canonical readback remains available to both roles. The source report is absent from options. Save link uses the loaded current ID as its expected value, refreshes authoritative report/history, and never changes the chosen outcome or state. The independent persistence RPC remains unchanged. Avoid building a new search backend for this selector.

Use the existing pending guard for comments, clarification, linking, and resolution. Recoverable validation retains input. Success/conflict refreshes report/history; unconfirmed saves/readbacks block further mutations until authoritative reads succeed. Ignore stale reads and action completions after report/identity replacement, including selector loads. Keep comment input/tab behavior intact and comments available on active Resolved reports. Render saved resolution near report details with plain text, validated anchors, author/time, and outcome-specific tester guidance; do not add unavailable tester actions.

Wrap both new methods in `AuthenticatedApp.tsx` using its existing `withSession` helper. Reuse its existing account-remount behavior. Update typed repository mocks and report fixtures in affected tests; do not change unrelated behavioral assertions to accommodate the new interfaces. Mantine controls and existing report CSS provide the base presentation; any extracted form stays inside this feature folder.

### 4. Verification and ownership

Implementation owns report domain/validation/repository/UI, the new migration and SQL verification, and the two auth-wrapper additions. Tester owns `src/test/report-resolution-validation.test.ts`, `report-resolution-repository.test.ts`, `report-resolution-ui.test.ts`, `report-resolution-database.test.ts` plus necessary existing fixture/auth-boundary regressions. Run deterministic tests independently of hosted services. Use existing isolated database guards and the report DB runner; explicitly add the new suite to the runner's selected file list. Service credentials are fixture setup only; permission assertions use ordinary authenticated/anonymous clients. SQL failure injection must roll back link, resolution, report timestamps, and history together. Concurrency integration covers resolution/resolution, resolution/clarification, stale link replacement, and link/resolution.

After functional work, transfer exclusive ownership of the detail presentation and any affected report styles to ui_polisher. Finalize both existing Reports guide topics with the documentation skill. Coordinator serializes the runner, any shared configuration, plan/artifacts, and future navigation changes. No guide changes are made in this planning task. Each implementer/tester/ui_polisher report and fix requires independent reviewer approval, followed by current combined approval and template-based implementer/tester summaries. Ownership and submission tracking live in `workflow/developer-report-resolutions/feature-plan.md`.

## Risks / Trade-offs

- [Strict readers can reject new states] -> Ship compatible readers and receipt/history decoding before enabling new mutation RPCs; test all report-returning paths, including consumed draft receipts.
- [URL parsing differs between JavaScript and SQL] -> Specify shared accepted cases and boundary fixtures; validate at both boundaries, render only accepted HTTP(S) destinations, and do not fetch links.
- [A canonical link changes after resolution] -> Keep the resolution's captured target immutable and display the independently current link distinctly; activity explains each change.
- [Hosted checks need an isolated service and privileged fixtures] -> Keep standard tests deterministic, document exact migration/SQL prerequisites, and report unexecuted integrations explicitly. Mocks do not prove transaction rollback or locks.
- [Large projects produce long selection lists] -> Reuse complete listing initially; this change adds no search service or arbitrary paging omission.
- [Resolution without tester closure leaves reports Resolved] -> State the limitation in the guide; do not invent retest details or grant Developer closure.

## Migration Plan

1. Reconfirm migration numbering and current files at apply time; reserve `012_report_resolutions.sql` unless another task has taken it. Apply prerequisites 001-011 only where not already applied.
2. Deploy compatible domain/repository/history/detail readers with no enabled new action until the database contract is present. Existing unfinished rows with absent new wire fields continue to read; malformed resolved rows do not.
3. On the isolated test project, apply the new additive migration transactionally, run the opt-in integration suite and new `verify_report_resolutions.sql`, and complete the two-role browser walkthrough. Include privileged Closed target fixtures only in the isolated project; no close RPC is added.
4. Deploy the tested schema to the target environment through the authorized database process, then release the new UI actions with compatible readers. Stage reader support and action enablement in separate releases: reader release, migration, then action release. New RPC grants must not become a way to write new states before compatible readers are deployed. No new runtime capability service or feature-flag dependency is required.
5. Roll back by disabling resolution/link controls or their new execute grants and retaining compatible readers plus recorded data. Do not revert to old state-rejecting readers or delete resolution/history data. A destructive schema downgrade needs a separate reviewed data-preservation plan.
