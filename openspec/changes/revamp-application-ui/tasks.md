# Tasks

## 1. Baseline and shared workspace

- [x] 1.1 Coordinator: reconcile the implementation branch with the in-progress report submission/draft changes, confirm the `WorkspaceShell` and `ProjectsApp` prop contract in `design.md`, and create `workflow/revamp-application-ui/feature-plan.md` from the required template with exclusive file ownership; verify the plan links this proposal, spec, design, and task revision and records any changed baseline before delegation.
- [x] 1.2 Implementer: own `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/App.css`, and `src/features/auth/LoginPage.tsx` for one Mantine provider, core styles, a quiet theme, removal of starter layout constraints, and a focused login form; verify login fields, errors, loading, and existing auth tests still behave as before.
- [x] 1.3 Implementer: own `src/shared/components/WorkspaceShell.tsx`, `src/features/auth/AuthenticatedApp.tsx`, and `src/features/projects/ProjectsApp.tsx` for the desktop sidebar, header identity/logout, mobile menu, active destination, and existing routes; verify both roles' visible destinations, direct route reloads, session loss, and logout without repository interface changes.
- [x] 1.4 Tester: own `src/test/application-layout.test.ts` and scoped auth-entry test additions, using the agreed interface to cover tester/developer navigation, absent future links, mobile menu state and keyboard operation, active destination, logout/session loss, and navigation from a dirty report form; verify targeted Vitest runs against the completed shell.
- [x] 1.5 Documentation writer: update `docs/userGuide/Authentication.md` and the navigation guidance in `docs/userGuide/Projects.md` for the implemented header/sidebar/mobile menu; document the actual provider/shell structure in an appropriate Developer Guide topic. If a new topic is needed, coordinator owns its `_markbind/layouts/default.md` navigation entry. Verify the described controls against the built UI and run `npm run docs:build`.

## 2. Current page layouts

- [x] 2.1 Implementer: own `src/features/projects/ProjectListPage.tsx`, `ProjectDetailsPage.tsx`, `ProjectEditorPage.tsx`, and `ProjectForm.tsx` for scannable project entries, project-local Overview/Reports navigation, clear role actions, metadata/history hierarchy, and consistent editing feedback; verify existing project UI tests and direct `?tab=reports` behavior.
- [x] 2.2 Implementer: own `src/features/reports/ProjectReportsPanel.tsx`, `ReportDetailsPage.tsx`, `ReportCreatePage.tsx`, `ReportForm.tsx`, `DraftListPage.tsx`, and `DraftEditPage.tsx` for readable report rows/cards, key report facts, grouped form fields, and clear draft actions; verify all existing fields, role restrictions, statuses, errors, draft saves, and unsaved-change warnings through relevant report UI tests.
- [x] 2.3 Tester: own scoped additions to `src/test/project-ui.test.ts`, `src/test/project-report-list.test.ts`, `src/test/report-ui.test.ts`, and `src/test/report-drafts-ui.test.ts` for page hierarchy and route preservation, role-specific actions, all six report summary fields, draft resume/delete, recoverable errors, and dirty-form navigation; verify targeted Vitest runs without changing valid behavioral assertions.
- [x] 2.4 Documentation writer: update `docs/userGuide/Projects.md` and `docs/userGuide/Reports.md` for the implemented page navigation and action locations, and update the appropriate Developer Guide topic for material interface decisions; verify the text against the final functional pages and run `npm run docs:build`.

## 3. Visual finish and integration

- [x] 3.1 Coordinator: after functional implementation and tests stabilize, transfer exclusive ownership of presentation and style files from the implementer to the `ui_polisher`; verify the handoff and selected visual acceptance criteria are recorded in the feature plan before edits begin.
- [ ] 3.2 UI polisher: refine only the transferred presentation and style files for neutral surfaces, restrained accent, typography, focus visibility, responsive menu, and narrow-width report summaries while preserving behavior and semantics; verify desktop and narrow browser views in system light/dark modes and report actual observations.
- [x] 3.3 Documentation writer: reconcile the guide descriptions with the finished visual UI and update affected topics or navigation entries only where behavior or navigation changed; verify `npm run docs:build` and guide links.
- [x] 3.4 Coordinator: run `npm run test -- --run`, `npm run lint`, `npm run build`, `npm run docs:build`, strict OpenSpec validation, and `git diff --check`; inspect the combined diff and record actual outcomes, including any unavailable manual browser checks, in the feature plan.
- [x] 3.5 Reviewer: independently review every latest implementer, tester, and UI polisher completion or fix submission and the final combined UI, tests, accessibility, and guides; return explicit `approved`, `changes_requested`, or `blocked` decisions for each submission and the combined result. Coordinator verifies all findings are resolved and any affected later edit receives fresh review before marking work complete.
- [ ] 3.6 Coordinator: after current reviewer approval, obtain and check each participating implementer's and tester's template-based summary in `workflow/revamp-application-ui/`, finish the feature plan and one overall `logs/` interaction log, and verify all applicable completion criteria before reporting implementation complete.

## Workflow follow-up

- Archive or sync this change only after the implementation and project review requirements are satisfied, using the separate OpenSpec archive workflow.
