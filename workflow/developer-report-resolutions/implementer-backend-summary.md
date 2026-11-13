# Developer report resolutions — Implementation Summary

This summary covers the backend implementer's work for developer report resolutions, accepted as submission `backend-1` under feature-plan revision 3 and unchanged design interfaces I1-I3. Independent review approved the backend and final combined work. The implementer ran 322 targeted tests successfully and passed lint. The coordinator's final combined checks passed 759 tests with 191 skipped, lint, the production build, and the documentation build. Hosted migration, integration, rollback SQL execution, and browser walkthrough verification remain for manual review at the user's direction.

## Files Added

- `src/features/reports/database/012_report_resolutions.sql` adds resolution fields, canonical links, relational and outcome constraints, compatible report readback, and trusted atomic resolution and link RPCs. It preserves existing report and history write restrictions.
- `src/features/reports/database/verify_report_resolutions.sql` provides isolated transaction fixtures and deliberate history failures to check full rollback, unchanged-link behavior, and preservation of a duplicate resolution snapshot when its current link changes. The script rolls its fixtures back and has not been executed against a hosted database.

## Files Changed

- `src/features/reports/types.ts` defines discriminated resolution inputs and records, required resolution and canonical-link report metadata, resolution field errors, two history variants, and repository methods. It adds Resolved and read-compatible Closed states.
- `src/features/reports/validation.ts` validates the applicable fields for each outcome, trims text, enforces Unicode code-point limits, checks HTTP(S) URLs and canonical UUIDs, and exports limits and outcome labels for consumers.
- `src/features/reports/reportRepository.ts` maps resolution and link requests to their exact RPC contracts, decodes their persisted data and history, and retains compatibility with unfinished reports from the earlier wire format.

## Functions Created

- `validateResolutionInput` in `src/features/reports/validation.ts` normalizes valid resolution input and returns typed field feedback for invalid runtime values, unknown or inapplicable fields, text boundaries, URLs, and canonical IDs.
- `resolutionRow` in `src/features/reports/reportRepository.ts` strictly decodes outcome-specific wire fields and trusted author/time metadata, rejecting malformed or unnormalized records.
- `resolveReport` in `src/features/reports/reportRepository.ts` validates the source and input, sends only permitted snake-case resolution fields to `resolve_report`, and returns strict persisted readback without automatically retrying mutations.
- `linkDuplicate` in `src/features/reports/reportRepository.ts` validates report identities and sends the selected target and expected current target to `link_duplicate_report` for safe independent link changes.
- `public.resolve_report` in migration `012_report_resolutions.sql` derives the actor, checks Developer assignment and active-project In progress state under project-before-report locks, validates outcome fields and the saved duplicate target, and saves resolution, state, timestamps, and one immutable history snapshot atomically.
- `public.link_duplicate_report` in migration `012_report_resolutions.sql` applies the same identity, assignment, and archive boundary to same-project non-self canonical targets. It detects stale replacements, treats unchanged links as no-ops, and records changed links without altering workflow or existing resolution snapshots.
- `public.report_resolution_test_reject_history` in `verify_report_resolutions.sql` deliberately rejects new resolution and link history events so the transaction script can assert rollback of all associated report changes.

## Functions Changed

- `fail` in `src/features/reports/reportRepository.ts` maps trusted resolution-field error details into typed feedback while preserving existing safe error mappings.
- `assignment` in `src/features/reports/reportRepository.ts` recognizes Resolved and Closed while retaining assignment consistency checks for every state.
- `reportRow` in `src/features/reports/reportRepository.ts` decodes resolution and current canonical metadata, checks state and author consistency, rejects self-targets and malformed resolved records, and permits missing new fields only for unfinished legacy reports.
- `historyRow` in `src/features/reports/reportRepository.ts` decodes the two new history variants with strict change shapes and resolution actor/time consistency while retaining earlier history variants.
- `createReportRepository` in `src/features/reports/reportRepository.ts` exposes both new mutations. Its existing report-returning methods share the extended decoder, including consumed draft receipts.
- `public.get_report` in migration `012_report_resolutions.sql` returns outcome-specific resolution values with scoped author labels and a distinct current canonical report object. Existing creation and draft-receipt RPCs inherit this readback through their existing calls.
- The `ReportError` constructor in `src/features/reports/types.ts` accepts the extended typed field-error contract so existing report errors and new resolution errors use the same error boundary.
