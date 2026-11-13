# Revamp application UI — Feature Plan

## Status and Revision

- **Status:** In progress: code, tests and documentation approved; browser verification and overall closure remain pending by user instruction.
- **Revision:** 4.
- **Updated:** 2026-11-06.
- **Coordinator:** Root agent.
- **Requirement sources:** Authoritative artifacts at `openspec/changes/revamp-application-ui/`: `proposal.md`, `design.md`, `specs/application-layout/spec.md`, and `tasks.md`, baseline revision read 2026-11-06 before implementation. User authorized application of this change.

## Confirmed Requirements and Acceptance Criteria

| ID | Confirmed requirement | Observable acceptance criterion | Source |
| --- | --- | --- | --- |
| R1 | Responsive authenticated shell | Identity, logout, Projects, tester-only My drafts; keyboard menu and active location | application-layout spec |
| R2 | Preserve current workflows | Existing routes, query-backed project tabs, auth, fields, drafts, errors and dirty-form warnings work | spec and design |
| R3 | Quiet legible presentation | Mantine provider, restrained theme, grouped pages, six readable report summary fields at narrow widths | spec and design |
| R4 | Verified and documented integration | Tests, builds, browser observations, independent approvals and summaries | tasks and repository instructions |

## Scope Exclusions and Open Decisions

- **Excluded:** Persistence, repository interfaces, future destinations, lifecycle actions, dependencies, unrelated untracked files.
- **Open decisions:** Browser verification remains pending by explicit user instruction; continue code, documentation and review without claiming visual observations. Existing report submission and draft code is the baseline; other changes' unchecked tasks do not authorize additional work.

## Existing Code, Reuse, and Test Environment

- **Relevant code:** Current branch `ui-polish`; AuthenticatedApp owns auth, retry and logout; ProjectsApp owns routes, per-user draft cache and pathname page keys. Both submitted reports and private drafts already exist.
- **Reusable functionality and dependencies:** Installed Mantine core/hooks and PostCSS; existing repositories, useBlocker, controlled forms, role checks, route URLs remain intact.
- **Related tests:** app-entry, auth-session/profile/service, project-ui, project-report-list, report-ui, report-drafts-ui and auth-boundary suites.
- **Test environment:** Vitest, jsdom and Testing Library with repository mocks; no external service required for UI tests. Inspect local test setup before adding browser API shims. Browser visual checks require a separate running app.

## File Ownership

| File or exact file pattern | Planned change | Single active owner |
| --- | --- | --- |
| src/main.tsx, src/App.tsx, src/index.css, src/App.css, src/features/auth/LoginPage.tsx, src/features/auth/AuthenticatedApp.tsx, src/features/projects/ProjectsApp.tsx, src/shared/components/WorkspaceShell.tsx | Provider, shell and auth integration | polishing (presentation only; App/main/auth behavior frozen) |
| src/features/projects/ProjectListPage.tsx, src/features/projects/ProjectDetailsPage.tsx, src/features/projects/ProjectEditorPage.tsx, src/features/projects/ProjectForm.tsx | Project presentation | polishing |
| src/features/reports/ProjectReportsPanel.tsx, src/features/reports/ReportDetailsPage.tsx, src/features/reports/ReportCreatePage.tsx, src/features/reports/ReportForm.tsx, src/features/reports/DraftListPage.tsx, src/features/reports/DraftEditPage.tsx | Report and draft presentation | polishing |
| src/test/application-layout.test.ts, src/test/app-entry.test.ts, src/test/project-auth-boundary.test.ts, src/test/report-auth-boundary.test.ts, src/test/project-ui.test.ts, src/test/project-report-list.test.ts, src/test/report-ui.test.ts, src/test/report-drafts-ui.test.ts | Focused regression coverage | testing |
| docs/userGuide/Authentication.md, docs/userGuide/Projects.md, docs/userGuide/Reports.md, existing appropriate docs/developerGuide topic | Final documentation | documentation (after functional stabilization) |
| workflow/revamp-application-ui/feature-plan.md, openspec/changes/revamp-application-ui/tasks.md, _markbind/layouts/default.md, logs/2026-11-06-apply-ui-revamp.md | Coordination and navigation if necessary | coordinator |
| workflow/revamp-application-ui/implementer-summary.md | Post-approval summary | implementation |
| workflow/revamp-application-ui/tester-summary.md | Post-approval summary | testing |

Presentation ownership transferred exclusively to polishing at revision 3 after I1/T1 handoffs. Implementation must not edit application files until coordinator reassigns them. Browser verification remains pending; polishing is a source-level visual/accessibility pass.

## Interfaces

### Interface I1: Authenticated workspace

- **Module path:** src/shared/components/WorkspaceShell.tsx and src/features/projects/ProjectsApp.tsx.
- **Exports and types:** WorkspaceShell with user: SessionUser, onSignOut: () => void, signOutPending: boolean, signOutError: string, children: ReactNode. ProjectsApp adds the same sign-out inputs to existing repository/reportRepository/user inputs; optional defaults may preserve standalone test consumers.
- **Inputs:** Existing session and repository types; auth supplies current logout state.
- **Outputs:** Shell around the existing routed pages, identity, accessible menu, Projects and role-specific My drafts.
- **Errors:** Logout errors appear in shell; auth retains ownership of retry and incomplete profile handling.
- **Side effects:** Router navigation only; shell makes no repository calls. Mobile toggle must not recreate router or form.
- **Boundary behavior:** Developers lack drafts destination; project/report routes select Projects, drafts select My drafts; successful route changes close menu, blocked changes retain form and warning. Session loss unmounts protected content.
- **Consumers and owners:** Implementation produces interface; testing exercises it. Existing repository contracts are unchanged.

## Implementation Tasks

| ID | Task and expected result | Owner | Status |
| --- | --- | --- | --- |
| 1.1 | Baseline, contract and this plan | coordinator | Complete |
| 1.2–1.3, 2.1–2.2 | Provider, shell and current page presentation, authoritative tasks.md | implementation | Approved |
| 1.4, 2.3 | Shell and workflow regression tests | testing | Approved |
| 1.5, 2.4, 3.3 | Final guides reflecting actual UI | documentation | Approved |
| 3.1–3.2 | Exclusive presentation transfer and visual pass | coordinator / polishing | Transfer complete; source polish approved, browser observations pending |
| 3.4 | Full verification and combined diff | coordinator | Complete; browser limitation recorded |
| 3.5 | Independent review of each submission and combined result | review | Approved for final code/tests/docs at revision 4 |
| 3.6 | Approved summaries and final records | coordinator | Summaries/log checked; overall closure pending browser verification |

## Required Test Outcomes

| ID | Behavior or risk to verify | Expected outcome | Test file and owner |
| --- | --- | --- | --- |
| T1 | Role, active location, mobile keyboard, future links | Correct destinations/current/expanded states; no placeholders | application-layout.test.ts — testing |
| T2 | Logout and session loss | Protected UI disappears, errors recover | scoped auth-entry coverage — testing |
| T3 | Project tabs, actions and report summaries | Deep links preserved; all six summary fields readable | project-ui.test.ts, project-report-list.test.ts — testing |
| T4 | Dirty navigation, drafts and errors | Inputs retained, blocker respected, resume/delete intact | report-ui.test.ts, report-drafts-ui.test.ts — testing |

## Verification Commands and Gates

| Command or check | Purpose | Required when | Owner |
| --- | --- | --- | --- |
| npm run test -- --run | Vitest suite | Application changes | coordinator |
| npm run lint | ESLint | Application changes | coordinator |
| npm run build | Types and production build | Application changes | coordinator |
| npm run docs:build | MarkBind | Guide changes | coordinator |
| openspec validate revamp-application-ui --strict | Spec integrity | Final integration | coordinator |
| git diff --check | Whitespace | Final integration | coordinator |
| Desktop/narrow and light/dark browser checks | Visual behavior | Final presentation | polishing |

## Completion Handoffs and Submission Register

| Submission ID | Agent and plan revision | Changed files or reviewed scope | Reported behavior and actual checks | State |
| --- | --- | --- | --- | --- |
| I1 | implementation; revision 2 | Assigned application files; DraftEditPage unchanged because it reuses updated ReportCreatePage | Provider/shell/pages implemented; targeted 76 passed, full 348 passed/109 skipped, lint/build/diff check passed | Approved in final revision 4 with P2/T2 integration |
| T1 | testing; revision 2 | Eight owned test suites, including new application-layout.test.ts | Final focused 90/90 passed; targeted ESLint passed; matchMedia shims added | Approved in final revision 4 with P2/T2 integration |
| P1 | polishing; revision 3 | src/App.css, src/shared/components/WorkspaceShell.tsx | Two-row mobile header/offset, wrapping and focus/action refinements; targeted 42 passed, lint/build/diff passed; browser checks pending | Approved in final revision 4 with P2/T2 integration |
| P2 | polishing; revision 4 | src/shared/components/WorkspaceShell.tsx | Guarded menu state reset on committed navigation; shell tests/lint/build passed | Approved in final revision 4 with P2/T2 integration |
| T2 | testing; revision 4 | src/test/application-layout.test.ts | Back/Forward regression, existing dirty blocker unchanged; shell suite 12 passed and scoped lint/diff passed | Approved in final revision 4 with P2/T2 integration |
| D1 | documentation; revision 3 | User Guide Authentication/Projects/Reports; Developer Guide Projects and acknowledgements | Source reconciled with P1; docs build 147 pages, existing link/dependency warnings | Approved in final revision 4 |

## Review Findings and Approval Decisions

| Submission ID or combined work | Reviewer and reviewed revision/state | Decision | Findings, limits, and outstanding requirements |
| --- | --- | --- | --- |
| I1 | review; revision 3 pre-fix | changes_requested | F1 (P2): historical location key reopens menu after Back; otherwise no actionable findings |
| T1 | review; revision 3 pre-fix | changes_requested | Add history Back/Forward regression for F1 |
| P1 | review; revision 3 pre-fix | changes_requested | Final shell includes F1 |
| D1 | review; revision 3 | approved | Guides accurate from source; browser observations pending by user instruction |
| Combined | review; revision 3 pre-fix | changes_requested | Await P2/T2 correction and fresh review; no other actionable findings |
| P2, T2 | review; revision 4 final state | approved | F1 resolved with reset on committed navigation and Back/Forward regression; blocked dirty navigation preserved |
| I1 + P2, T1 + T2, P1 + P2, D1 unchanged | review; revision 4 final state | approved | Each submission explicitly approved; earlier changes_requested dispositions preserved above |
| Combined source/tests/docs | review; revision 4 final state | approved | No actionable findings; reviewer independently passed diff check, relied on reported full tests/lint/build; browser observations excluded and pending |

## Resolutions and Plan Revisions

| Revision or finding | Resolution and affected files/contracts | Affected agents notified | Follow-up submission or review |
| --- | --- | --- | --- |
| 4 | Reviewer found historical menu key reopens on browser Back; polishing fixes shell reset on committed navigation, testing adds Back/Forward regression; contract unchanged | polishing and testing notified | P2/T2 pending |
| 3 | User authorized continued code/review with browser checks pending; exclusive application presentation transfer to polishing, documentation begins against stabilized behavior | implementation, testing, polishing, documentation notified | I1/T1/P1 review pending |
| 2 | Test ownership extended to auth-boundary suites for provider wrappers and session/logout coverage; provider mounts in App and stable router may receive logout via context | implementation and testing notified | Pending |
| 1 | Baseline confirms report/draft workflows already implemented; no merge required, unrelated untracked files preserved | Initial assignments reference revision 1 | Pending |

## Agent Summaries

| Agent and role | Unique summary file in this feature directory | Approved submissions covered | Coordinator check |
| --- | --- | --- | --- |
| implementation — implementer | implementer-summary.md | I1 integrated with P2 | Exists, template headings/content checked; accurate attribution and browser limitation |
| testing — tester | tester-summary.md | T1 supplemented by T2 | Exists, template headings/content checked; cases/files/results accurate |

## Final Verification

| Command or check | Actual result and evidence | Remaining limitation |
| --- | --- | --- |
| OpenSpec status/list/apply | Ready, spec-driven, 13/15 tasks complete; every newly checked task confirmed through apply instructions | CLI npm folder requires elevated access |
| npm.cmd run test -- --run | Passed after P2/T2: 353 tests; 109 skipped, 16 files passed/3 skipped | Hosted DB suites skipped without configured test credentials |
| npm.cmd run lint | Passed | None |
| npm.cmd run build | Passed TypeScript and Vite production build | None |
| Desktop/narrow/light/dark browser verification | Pending by user instruction | Browser host unavailable; native Chrome automation stopped because URL could not be determined safely |
| npm.cmd run docs:build | Passed: 147 pages | Existing warnings for dependency documentation and legacy links outside edited topics |
| Strict OpenSpec validation | Passed for revamp-application-ui | None |
| git diff --check | Passed after final guides and generated audit cleanup | Line-ending warnings only |

- **Final diff inspection:** Inspected application, new shell and test, existing test adaptations, five guide topics, selected task checkboxes and workflow records. Existing unrelated untracked files preserved. Removed generated MarkBind audit content churn. No dependency or repository contract changes.
- **Final approval state:** All I1/T1/P1/D1 integrated submissions and P2/T2 fixes explicitly approved by review against revision 4 final source/tests/docs; browser observations excluded and pending.
- **Remaining limitations:** Browser verification pending.
- **Completion basis:** Requested remaining code, documentation, automated checks and independent source review are complete. OpenSpec remains at 13/15: task 3.2 manual desktop/narrow/light/dark verification is pending by user instruction, and task 3.6 overall closure remains pending that verification. Summaries and interaction log are otherwise complete. Do not archive or claim browser-verified completion.
