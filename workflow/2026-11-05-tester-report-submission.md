# Tester report submission

Status: implementation and local verification approved; hosted preview and final close-out pending. Current implementation revision: 2.

## Authority and confirmed scope

- [Proposal](../openspec/changes/tester-report-submission/proposal.md)
- [Acceptance specification](../openspec/changes/tester-report-submission/specs/bug-reporting/spec.md)
- [Design and contracts](../openspec/changes/tester-report-submission/design.md)
- [Implementation tasks](../openspec/changes/tester-report-submission/tasks.md)

These artifacts are authoritative; this record tracks coordination rather than copying their contracts. User owns the Tester feature set. Submission/readback is the first slice; drafts, AI, editing, later lifecycle actions and full shared listing/discussion remain separate work.

User decisions on 2026-11-05: accept proposed trimmed field limits (title200; description/steps/expected/actual5000 each; version100; optional environment1000). Severity requires an explicit choice without a default. Severity meanings remain deferred. All feature PRs target development and need Vercel preview review before a later development-to-master PR.

## Baseline and dependencies

Branch: codex/tester-report-submission, created from origin/development at 1c5b66286285f66c0af757d5b06e67fe95a10b20. Authentication is present; project/report features are absent on this base. Project PR #2 remains open at d09f7008a57d9281ff20adfe3d9bc64663971e94 when planning started. Follow task1.1 before application implementation; do not duplicate or silently merge the pending project work.

Project/auth contracts and the same-user SIGNED_IN input-loss issue were inspected read-only. The project router, ProjectRepository, profiles identity and shared client are reuse points. Design reserves minimal saved-report detail ownership for this feature; full shared report-list ownership needs separate coordination.

## File ownership and execution

Coordinator alone owns these planning artifacts, tracked task checkboxes, shared router/auth/project entry/style integration, runner/config changes and serialized landing/navigation edits. The initial planned ownership is listed in tasks.md; see the revision 2 handoff for the actual assignments.

The root will start implementation and test work concurrently only after shared interfaces and prerequisites are ready. Each completion/fix receives a submission identifier and independent review; no checkbox marks unverified work complete. Guides follow the documentation skill and actual implementation.

## Discovery handoff

report_contract_discovery: read-only inspection of development auth and pending PR2 interfaces; recommended reusing project selection/routing, RPC-only persistence, scoped actor labels, atomic history and project row locking. Flagged same-user SIGNED_IN form lifetime, Unicode length parity, upstream dependency and distinct private-draft storage. No files edited or checks executed by explorer.

## Planning review

PLAN-1: coordinator-authored proposal/spec/design/tasks revision1; independently approved by report_plan_review, with no actionable planning inconsistencies. Review covered user decisions, narrow scope, permissions/atomicity, integration gates, ownership and review flow. Reviewer noted concrete component props must be settled under tasks1.2-1.3 before parallel UI/test work. This is planning approval, not implementer/tester completion or implementation approval.

## Implementation handoffs and review decisions

Revision 1 had no implementation submissions. See the revision 2 handoff and decisions below.

Apply preflight: the user elected to merge PR #2 and start report work. GitHub still showed the PR open and `origin/development` at `1c5b662` on the follow-up check. No branch update or application edits occurred. The reviewed PR head `c4783e5` supplies the same-user sign-in fix and occupies migration 004. Recheck the merged tree before reserving `005_reports.sql` and finalizing interface ownership. The remaining project URL mismatch is outside report scope.

## Verification and release evidence

OpenSpec1.16.0 strict validation passed with no issues; status confirms all four planning artifacts exist. Specification contains11 requirements and36 scenarios; all20 implementation tasks remain unchecked. npm.cmd run docs:build passed (82 pages), with existing template-link and nested undici variable warnings. Generated tracked audit output was restored. Whitespace checks passed for the new planning documents. Application tests, browser checks, hosted SQL, credentials, deployments and PR posting were not performed as part of this proposal operation. No production mutation authorised.

## Context and resource evidence

Used one scoped read-only explorer for existing interfaces while root prepared the proposal. Reused previous review findings and inspected current GitHub state instead of asking the user for repository facts. OpenSpec CLI was missing from PATH; ran repository-generated skill version1.16.0 through a temporary npm tool cache without adding a project dependency. Measured token savings are not claimed.

## Revision 2 implementation handoff

Merged development baseline e1f75c50be35e26e0a50bbf3f059ed6692771999; tree matches reviewed c4783e5. Project migration 004 is occupied, so reserve 005_reports.sql. Same-user SIGNED_IN fix is present; P2001-P2005 unused. No product requirements changed.

Implementer owns all src/features/reports files including SQL and verification SQL. Tester owns all new src/test/report-*.test.ts. Coordinator owns shared integration and test runner. Submission IDs IMPL-1 and TEST-1. ReportCreatePage props: projectRepository: ProjectRepository, reportRepository: ReportRepository, user: SessionUser. ReportDetailsPage props: reportRepository: ReportRepository; reads reportId from route. ProjectsApp gains reportRepository: ReportRepository. Follow spec scenarios; run targeted Vitest and build. Read linked design/spec/tasks before edits.

Both agents acknowledged the same contract and worked in parallel with separate file ownership. The coordinator connected the existing router and project entry point, used the existing isolated runner with a suite selector, and added the Vercel rewrite for direct report routes. The documentation writer owned the two report topics; the coordinator serialized navigation and landing-page changes.

### Revision 2 submission register

| Submission | Scope and result | Independent decision |
| --- | --- | --- |
| IMPL-1 | Report SQL, rollback verification SQL, validation, repository and pages. Initial build, focused lint and 69 targeted tests passed. | Approved by report_review. |
| TEST-1 | Five report test suites, including isolated hosted database cases and safe configuration checks. | Approved by report_review. |
| ROOT-1 | Initial shared router, auth error retry and repository integration. | Changes requested: a late unauthorized response from an old session could reset the current form. Superseded by ROOT-2. |
| TEST-2 | Two regressions: late unauthorized response after switching users or signing in again as the same user. Both failed on ROOT-1 and passed after ROOT-2. | Approved by report_review. |
| ROOT-2 | Auth retry bound to exact authenticated snapshot; keeps late errors from resetting later sessions. Shared routing, runner and Vercel config reviewed. | Approved by report_review. |
| Combined | Latest source, tests and user/developer guides after the auth fix. | Approved for local code review. Hosted Supabase and authenticated Vercel verification remain outstanding. |

### Revision 2 verification and remaining work

- Full Vitest: 270 passed, 102 hosted skipped across authentication, projects and reports. The report suites account for 72 local passes and 26 hosted skips. Targeted project/report auth integration: 9 passed after the fix. Lint and production build passed.
- MarkBind built 115 pages with existing template-link and nested-variable warnings; both report topics were generated. Generated audit output restored. Strict OpenSpec validation and diff whitespace checks passed.
- Ephemeral local PostgreSQL (PGlite) applied migrations 001–005 with a small auth-role stub; Tester create, Developer read, unauthorized writes/reads, scoped identity labels, invalid/missing/archived inputs, and the shipped rollback assertion passed. No live Supabase or hosted migration was used.
- PowerShell runner parsed and safely refused missing isolated configuration. No isolated Supabase settings are present here. Task 4.3 remains unchecked pending a development PR and an authenticated preview with migration 005 applied to isolated data. Task 4.4 remains unchecked pending that final evidence.
- Local individual MP4 presentation preparation maps actual decisions, handoffs and checks to the lectures. The paired regression result is evidence of a particular workflow benefit; no agent speedup or token savings were measured.

## Revision 3: user-approved two-commit delivery

User reviewed the normal flow, failure cases, design and checklist. Scope is the revised OpenSpec artifacts, with 5.1 before 5.2–5.4 and preview 4.3–4.4 last. Development remains e1f75c5; no migration numbered 006 exists. No change to role or creation permissions. Personal report views, drafts and AI remain excluded.

Commit 1: R3-IMPL-1 owns ReportCreatePage.tsx, ReportForm.tsx and ReportDetailsPage.tsx only. R3-TEST-1 owns report-ui.test.ts only. ReportForm internal prop may change; existing route page props remain unchanged. Archive feedback is inline, retains text, says not submitted, offers Discard report and contact guidance. A connection failure message says save could not be confirmed, with explicit retry. Saved report breadcrumb links Reports and Back to project reports to /projects/:projectId?tab=reports.

Commit 2: listProjectReports(projectId: string): Promise<ProjectReportSummary[]> on ReportRepository. Summary fields: id, projectId, title, projectName, severity, state, assignedDeveloperId, reporterDisplayName. Use list_project_reports(p_project_id uuid, p_before_created_at timestamptz default null, p_before_id uuid default null) in 006_project_report_listing.sql, RETURNS TABLE with matching snake_case columns plus created_at for keyset pagination, max 100 rows per call, ordered created_at/id descending. Only valid-profile authenticated users; missing project P2005; invalid cursor P2003. Keep precise timestamp strings in cursor. Project route tab query defaults Overview. Root owns shared shell/route and docs navigation. Implementer and tester file ownership for commit 2 will be reassigned only after first checkpoint.

The coordinator will verify actual checks, submit revisions for independent review and stage only this feature and its workflow records. Earlier unrelated local logs remain untouched. No hosted migration without an isolated target.

R3 checkpoint: R3-IMPL-1 and R3-TEST-1 approved by report_review for archive handling, explicit saved-report navigation and submission tests. Focused Vitest: 16 passed; lint and production build passed. The reports-link landing is completed by the second commit. Migration 006 was separately reviewed and passed local 205-row SQL verification; it belongs in commit 2.
