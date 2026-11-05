# Tasks

Authority: [specification](specs/bug-reporting/spec.md) and [design/contracts](design.md). Coordinator owns this checklist and the linked workflow record. All boxes below describe future implementation work, not work performed during proposal creation. Each implementation/test completion and fix requires independent reviewer approval before its task is completed.

## 1. Establish the upstream baseline and agreed interfaces

- [x] 1.1 Coordinator: confirm the reviewed project PR is merged to development, rebase this feature branch onto that merge while preserving unrelated work, and record base SHA; verify actual project/auth/router/migration/test interfaces against design.md and update/notify owners if they differ.
- [x] 1.2 Coordinator: resolve the same-user SIGNED_IN form-reset prerequisite with its owner, reserve the report migration number and SQL error namespace, and record exclusive file assignments in workflow/2026-11-05-tester-report-submission.md; verify every planned contract and dependency is ready before starting parallel application/test edits.
- [x] 1.3 Coordinator: record feature submission identifiers, acceptance scenarios and commands, then start implementer and tester against the same design revision with separate file ownership; verify both acknowledge the contract and do not edit shared planning files.

## 2. Implement trusted persistence and the report repository

- [x] 2.1 Implementer owns src/features/reports/types.ts, validation.ts and reportRepository.ts: implement the designed contracts, explicit severity, normalized optional environment and runtime response validation; verify with tester's validation/repository suites and TypeScript build.
- [x] 2.2 Implementer owns src/features/reports/database/004_reports.sql (or the coordinator-reserved replacement number) and verify_report_transactions.sql: implement constrained reports/history, restricted grants/RLS, scoped reads and Tester-only transactional creation with locked active-project validation; verify ordinary role permissions and forced-history rollback in an isolated database, recording unavailable checks explicitly.
- [x] 2.3 Tester owns src/test/report-validation.test.ts and report-repository.test.ts: cover lower/upper/overlong and blank boundaries independently, Unicode counting, explicit/invalid severity, optional environment, UUID validation, row mapping and typed failures; verify targeted Vitest passes against completed implementation.
- [x] 2.4 Tester owns src/test/report-database.test.ts: cover Tester success, cross-user authenticated read, anonymous/Developer/unprofiled create denial, malformed/archived/missing projects, direct-write/metadata/history forgery denial, actual persisted inputs, scoped names and history; verify default runs skip clearly and configured isolated runs reject partial or production targets.
- [x] 2.5 Coordinator owns run-report-db-tests.ps1, .env.report-test.example and package.json/script/lock changes only if needed: reuse established isolated runner safeguards without changing unrelated dependencies; verify PowerShell syntax and safe missing-config refusal without hosted writes, then execute only with authorised isolated credentials.
- [x] 2.6 Documentation writer owns docs/developerGuide/Reports.md and its acknowledgement references; coordinator serializes docs/developerGuide/DeveloperGuide.md and _markbind/layouts/default.md navigation: describe actual implemented schema, contracts, migration order, isolated setup and verification limits; verify links/identifiers and npm run docs:build.
- [x] 2.7 Reviewer: review every latest persistence implementation/test submission and its completed group documentation against the spec, actual checks and security boundaries; verify explicit approved decisions or route changes back through fresh review.

## 3. Implement and test the submission/readback screens

- [x] 3.1 Implementer owns src/features/reports/ReportForm.tsx, ReportCreatePage.tsx and ReportDetailsPage.tsx: implement accessible fields, project selection/loading/empty/error states, pending lock, retained failed input, no-write cancel and saved-link navigation/readback; verify observable outcomes using tester's UI suite.
- [x] 3.2 Coordinator owns shared edits in src/features/projects/ProjectsApp.tsx, ProjectDetailsPage.tsx, src/features/auth/AuthenticatedApp.tsx and necessary App.css rules: connect report routes/repository and Tester-only entry link using existing auth/project infrastructure; verify Tester create/read, Developer read/denied create and direct saved-link reload without changing existing project behaviour.
- [x] 3.3 Tester owns src/test/report-ui.test.ts: cover form field errors, absent severity default, project failures/retry, success/reloadable detail, literal rendering, history labels, cancel, preserved inputs, duplicate local submits and unmounted completion; verify targeted Vitest passes.
- [x] 3.4 Tester owns src/test/report-auth-boundary.test.ts and any coordinator-assigned auth regression additions: cover same-user SIGNED_IN and TOKEN_REFRESHED input retention, real logout/session-loss clearing, user replacement and unauthorized persistence responses; verify no protected input leaks and no stale success navigation.
- [x] 3.5 Documentation writer owns docs/userGuide/Reports.md and adds implemented UI/error details to docs/developerGuide/Reports.md; coordinator serializes guide landing-page links and shared navigation additions: describe actual report fields, explicit severity, shared visibility, failure handling and excluded drafts/AI; verify all new topic links and npm run docs:build.
- [x] 3.6 Reviewer: review every latest UI, shared integration and test submission with updated guides; verify explicit approval against current code and preservation/security regressions, obtaining fresh review after fixes.

## 4. Verify the integrated feature and prepare development review

- [x] 4.1 Coordinator: run npm run test -- --run, npm run lint, npm run build, npm run docs:build, strict OpenSpec validation and git diff --check; verify actual success and resolve task-caused failures without weakening checks. Record skipped hosted checks separately.
- [x] 4.2 Coordinator: obtain final independent reviewer approval for all latest implementation/test submissions and combined implementation, tests and guides at the final state; verify no affected approval is stale and record findings/resolutions in the workflow record.
- [ ] 4.3 Coordinator: prepare the feature PR into development and review its Vercel preview with authorised development accounts/data; verify active-project submission, Tester/Developer restrictions, direct route reload, tab-return retention, logout and failed-save handling. If access or deployment configuration prevents preview checks, record the blocker and leave this task incomplete. Do not merge or promote to master as part of this task.
- [ ] 4.4 Coordinator: record actual checks, reviewer decisions, preview evidence, limitations and a concise resource/context reflection in the feature record and a single overall interaction log; verify all applicable completion criteria before reporting implementation complete.

## 5. Apply the agreed project discovery and recovery changes

Complete this section before 4.3–4.4. Checks and review in 4.1–4.2 record the original submission baseline only.

- [x] 5.1 Commit 1: add the inline archived-project notice, project-creator contact guidance and no-write Discard report action; preserve manual project switching, existing input and explicit retry on connection failure. Add the saved report breadcrumb and explicit return link. Verify archive rejection/retention/discard, manual selection retention, connection uncertainty/retry, repeated pending submissions and direct-link navigation with Vitest.
- [ ] 5.2 Commit 2: add project-scoped persistence and repository reads for all brief rows. Verify same-project results, exclusion of other projects, both roles, denied unauthenticated/unprofiled access, ordering and complete retrieval. Check migration numbering and run isolated SQL checks.
- [ ] 5.3 Commit 2: implement Overview and Reports on the existing project route, default Overview, deep links to Reports, both-role list and empty/error/retry states, and Tester-only reporting action on both tabs. Verify with UI tests including submit → saved detail → project Reports, and the Developer finding the report without its link.
- [ ] 5.4 Update the report and project guides for the implemented navigation, list and recovery. Run relevant tests, lint, production build, docs build and strict OpenSpec validation. Record fresh independent approval for the changed implementation/tests and the combined state before preparing one PR to development with both commits.

## Workflow follow-up

- After development review and explicit release decisions, use the archive/spec-sync workflow; preserve pending work and verification limits accurately.
- Promote development to master only through the agreed separate PR after preview review. Production data/migrations remain separately authorised release actions.
