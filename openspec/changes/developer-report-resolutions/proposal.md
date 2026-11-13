# Proposal

## Why

Developers can accept reports, start investigation, and request clarification, but cannot yet record an outcome. Fixed and reasoned non-fix resolutions, including traceable duplicate links, complete the developer's part of the manual bug-report lifecycle.

## What Changes

- Allow only the assigned Developer on an active-project In progress report to record Fixed, Duplicate, Invalid, Cannot reproduce, or Will not fix and move it to Resolved, preserving assignment.
- Fixed requires a fix summary, affected version, commit URL, and pull-request URL. Prefill the editable affected version from the report version; omit fixed version.
- Non-fix outcomes require an explanation instead of fix fields. Duplicate additionally requires a canonical report in the same project, including Resolved/Closed targets when present.
- Show canonical-report selection and link saving only inside the assigned Developer's open Duplicate resolution form; saving a link does not change state. Duplicate resolution must validate and use the persisted canonical link.
- Apply agreed trimmed-input validation: summary/explanation 1-5,000 Unicode code points, affected version 1-100, and required HTTP(S) commit/PR URLs up to 2,048 characters each without a provider restriction. Select a canonical report rather than accept arbitrary external URLs.
- Store server-managed resolution author/time and immutable activity with atomic persistence and trusted permission/state checks. Both roles can read resolution details and canonical links after reload.
- Extend detail/list/history/draft-receipt readers for Resolved without losing existing workflow or discussion behavior.

Scope is confirmed by the exploration conversation: the user explicitly added duplicate linking and accepted the validation recommendations. Product sources are BugWatch C-18, C-26, C-28, C-31, C-36, C-40 and developer-features.md MVP rows. Tester retesting, closure, reopening, release/transfer, archive controls, report editing, repository integration, fix execution, and AI resolution assistance are excluded. Resolved communicates a developer outcome; it does not close the report. Closed target compatibility does not authorize a close action.

## Capabilities

### New Capabilities

- `report-resolution`: Fixed/non-fix records, canonical duplicate linking, validation, authorized atomic saves, shared readback, and deliberate UI outcomes.

### Modified Capabilities

- `report-workflow`: Detail-only resolution/link controls and shared readback of Resolved reports, including existing draft submission receipts.

## Impact

- Extend `src/features/reports/types.ts`, `validation.ts`, `reportRepository.ts`, `ReportDetailsPage.tsx`, and existing report presentation as needed; reuse the Supabase RPC, Mantine form, authentication boundary, and pending/readback patterns.
- Add a migration after `011_report_clarification_discussion.sql` and an isolated SQL verification script under `src/features/reports/database/`. Extend report/history constraints and read RPC output; add trusted resolution/link mutation RPCs. Preserve protected tables and report-scoped identity lookup.
- Add Vitest validation, repository, UI, authentication-boundary, and isolated database coverage in `src/test/*.test.ts`; update existing typed fixtures only as required by the extended contracts.
- Update existing Reports topics in both guides during implementation, documenting limits, permissions, deployment order, and verification. No new dependency or provider integration is planned.
