# Tester report drafts

Revision 3. Local implementation began on codex/tester-report-drafts from submission commit da5775d. The user authorized opening the drafts PR into development before the submission PR merges. The drafts PR depends on PR #3 for merge. Development integration and hosted preview verification remain pending.

## Scope and contracts

Use [proposal](../openspec/changes/tester-report-drafts/proposal.md), [spec](../openspec/changes/tester-report-drafts/specs/report-drafts/spec.md), [design](../openspec/changes/tester-report-drafts/design.md), and [tasks](../openspec/changes/tester-report-drafts/tasks.md) as approved on Nov 6. The design defines ReportRepository draft methods. Use ReportInput values for save and submit. Add validateDraftInput in reports/validation.ts with the same discriminated result pattern as validateReportInput, returning ReportInput with an optional empty severity. Keep all existing report methods and contracts.

## Ownership and order

- Persistence implementer owns report types, repository, validation, and new SQL migrations. Do not edit existing SQL migrations.
- UI implementer owns report and project/auth route components and authenticated session adapter wiring.
- Tester owns draft and affected regression tests. Request RPC contract from persistence implementer before writing RPC-specific assertions.
- Coordinator owns integration, documentation and planning artifacts. Independent reviewer must approve each submission and the final combined change.

## Verification and approvals

- D1 storage, UI, tests and combined change received changes requested. Findings covered hosted draft links, dirty form state after normalized saves, list pagination, and router cleanup.
- D2-STORAGE approved. D2-UI, D2-TEST, and combined change received changes requested. After first save, the edit route must use the saved response even if a new read would fail.
- D2 verification passed 332 Vitest tests with 109 hosted tests skipped, lint, build, strict OpenSpec and tracked diff whitespace. MarkBind exited successfully with warnings, including an asset directory permission warning. Chromium against isolated local Supabase verified first save, direct reload, normalized save followed by navigation, reopening, and draft submission with a failed request and retry. Migration 007 and the rollback-only SQL verification passed for ownership, archive, rollback and retry.
- D3-UI received changes requested because a failed project lookup could still hide a saved draft. D3-TEST was approved for its scoped regression, with a timing correction reviewed in D4.
- D4-UI, D4-TEST, and the final combined implementation, tests, and guides were approved for local scope. D2-STORAGE remains approved. Final Vitest run passed 335 tests with 109 hosted tests skipped. Lint, production build, and tracked diff whitespace passed. The MarkBind rerun generated both report guide pages with existing site warnings. The isolated Chromium rerun blocked the follow-up draft GET and verified first save, reload, and submission; the final project lookup failure path was verified by the D4 integration test. Local services were stopped.
- Database scenarios are exercised by the rollback-only SQL script. The separately named draft database Vitest suite in task 2.2 remains outstanding. GitHub still requires approval on submission PR #3 before development integration.
