# Project feature completion

## Revision / status

Revision 5, complete; all30 tracked tasks complete. Continue OpenSpec `openspec/changes/create-edit-active-projects/` proposal, design, tasks and `specs/project-management/spec.md`; preserve prior integration/name-review submissions and unrelated edits. Initial progress 17/30. User reports all requested migration002/rollback/browser checks passed, then browser names and `npm run test:project-db` after003 passed. These are user-reported, not agent-executed. No hosted credentials or deployment needed for cleanup.

## Scope and acceptance

Complete unfinished feature tasks without recreating delivered code. Audit simulation consumers; remove runtime demo/selector/flag/script and obsolete helpers/tests. Preserve shared validation, real repository, routed UI, auth boundary and meaningful regressions. Final guides describe real services and actual schema. All local checks, strict validation and independent final review must pass. No production deployment, archive action, authentication implementation or unrelated refactor.

## Contracts and exclusive owners

Public interfaces remain unchanged: shared SessionUser, ProjectRepository operations and ProjectError, createProjectRepository, ProjectsApp routes, history actorDisplayName mapping. No dependency changes expected.

- Implementer: four files in `src/features/projects/development/` only, audit and remove once tester confirms no retained consumer. Inspect production pages to confirm extraction complete; propose needed fixes before touching unowned files. Submission CLEAN-IMPL-1.
- Tester: `src/test/simulated-projects.test.ts`, `simulated-session.test.ts`, `simulation-shell.test.ts`, existing `project-ui.test.ts`, `project-repository.test.ts`, new `src/test/app-entry.test.ts` if justified. Audit meaningful simulated cases against actual/shared coverage; remove simulator-only tests; preserve real shell loading test and add any material missing regressions. Do not retain a simulated implementation just to test itself. Inform implementer when runtime files have no remaining consumers. Submission CLEAN-TEST-1.
- Documentation writer: existing `docs/userGuide/Projects.md`, `docs/developerGuide/Projects.md` only. Read skill/landing/navigation, preserve schema/identifiers and test setup; remove demo instructions, stale pending-hosted claims and sample fixture tables; explain actual auth/repository/RPC contracts, migrations001/002/003, rollback/release guidance. Describe verification as user-reported. No nav change needed unless proposing new topic. Submission CLEAN-DOC-1.
- Coordinator: App.tsx, App.css simulation-only rules, package.json dev:simulated removal, .env.simulated deletion, workflow/artifacts/log. Preserve other edits. Audit helper decisions and existing source/test review evidence. Submission CLEAN-ROOT-1.

## Verification and handoffs

Run full Vitest/lint/build/docs build; preserve preexisting `_markbind/logs/audit.json` bytes. Reference scans across source/config/guides show no dangling demo imports/runtime setting/selector. Production bundle has no demo markers; generated guides exist and no env assets. Hosted results rely on explicit user report, no rerun claim. Independent reviewer must approve every completion/fix and final combined source/tests/docs/artifacts after final edits.

## Audit / submissions / review

Archive follow-up: the user selected sync and archive. The approved project-management delta was promoted to `openspec/specs/project-management/spec.md`, preserving Purpose and every requirement/scenario verbatim with canonical main-spec headings. Strict main-spec validation passed for both capabilities. Change artifacts now live at `openspec/changes/archive/2026-11-03-create-edit-active-projects/`; .openspec.yaml preserved, active change list empty. Previous source approvals and verification above remain unchanged; archival introduced no application/test behaviour changes.

- CLEAN-IMPL-1: removed all four development files after tester confirmed no remaining consumer; production extraction audit found list/forms/conflicts/history already preserved. Build passed. Approved by completion_review against revision5.
- CLEAN-TEST-1: removed three obsolete simulation suites; added App loading/authentication-boundary regression in app-entry.test.ts. Meaningful domain cases remain in validation, adapter, UI, auth-boundary, hosted tests and rollback SQL. Memory isolation/fixture clock/sample-selector tests had no remaining implementation consumer. Targeted121 passed; full181 passed/63 hosted skipped. Approved by completion_review against revision5.
- CLEAN-DOC-1: finalized two existing project topics; no navigation changes. Docs build passed with existing warnings. Approved by completion_review against revision5.
- CLEAN-ROOT-1: removed App demo branch, launch script, .env.simulated and four selector/badge styles; recorded user-reported verified prior tasks, preserved other configuration/lockfile changes. Approved by completion_review against revision5.
- No simulation helper retained. Source/config/project-guide scan and production bundle demo-marker scan found no runtime/demo references. Generated project guide HTML files exist; generated docs contain no .env assets.
- Root final verification: full Vitest181 passed/63 hosted skipped, lint/build/docs build passed. Docs build retained known template-link and nested undici variable warnings; preexisting audit bytes preserved. Hosted execution was not rerun by agents; user reports cover the unchanged backend/UI flow. Strict validation passed; completion_review explicitly approved all four cleanup submissions and the final combined implementation/tests/guides/artifacts with no actionable findings. Prior revision3/4 approvals reconciled.
- Tasks2.2,2.3,2.7,3.1,3.2,3.3,4.2 reconciled as complete from preceding approved source plus explicit user verification; progress24/30. The final six cleanup/docs/review tasks were subsequently completed after explicit independent approval; final progress30/30. Overall log: logs/2026-11-03-complete-project-feature.md. No further source edits followed approval.
