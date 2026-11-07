# Design

## Context

See `proposal.md` for motivation and `specs/application-layout/spec.md` for the behavior contract. `AuthenticatedApp.tsx` owns session and logout state, then mounts a browser router whose wildcard route renders `ProjectsApp.tsx`. `ProjectsApp` owns the existing project, draft, and report routes. Page components own their current loading, error, form, and repository behavior. The CSS still contains Vite starter layout rules, and Mantine packages and PostCSS are installed but no provider or core styles are mounted.

The report submission and draft changes are in progress. The current code already has project Overview/Reports links, project-scoped report discovery, private drafts, and a report form navigation blocker. The redesign must preserve these contracts and avoid treating future product requirements as implemented features.

## Goals / Non-Goals

**Goals:**

- Give authenticated pages a stable, responsive shell without changing the existing URL map or persistence interfaces.
- Make the currently implemented pages easier to scan, with a quiet visual system and consistent primary/secondary actions.
- Keep form values, error recovery, draft privacy, role restrictions, and direct-link behavior intact through navigation and responsive changes.

**Non-Goals:**

- New report lifecycle actions, discussions, mailbox, profiles, dashboards, archive controls, search, or filters.
- Database, Supabase policy, authentication semantics, or repository changes.
- A new route hierarchy, new component library, or new runtime dependency.

## Decisions

### Mount one Mantine provider and remove starter layout constraints

Import Mantine core styles once at the application entry and mount one `MantineProvider` above both the login and authenticated branches. Define restrained theme colors, typography, focus treatment, and spacing centrally, retaining the existing system light/dark preference. Replace the Vite `#root` fixed-width and starter selectors that constrain the workspace. Keep small feature-specific CSS where Mantine props do not express the layout clearly.

Alternative considered: restyle only the existing CSS. That would leave the newly installed Mantine dependency unused and make consistent focus, spacing, and component states harder to maintain.

### Keep the shell inside the router

Render a shared `WorkspaceShell` around the `Routes` in `ProjectsApp`, where React Router links and active-location state are available. `AuthenticatedApp` keeps ownership of logout and passes its action and state through `AuthenticatedRouter` to `ProjectsApp`. Do not recreate the router when the mobile menu opens or closes; only page-path navigation should perform the existing page remount behavior.

The proposed interface is `WorkspaceShell({ user, onSignOut, signOutPending, signOutError, children })` under `src/shared/components/WorkspaceShell.tsx`. `user` uses the existing `SessionUser`; `onSignOut` triggers the existing async logout flow and returns no application data; the pending/error props reflect its current state; `children` is the routed page. The shell performs no repository calls or authorization decisions. `ProjectsApp` receives the same sign-out inputs in addition to its existing `repository`, `reportRepository`, and `user` inputs. `AuthenticatedApp` remains responsible for auth errors, retry, incomplete-profile blocking, and state clearing. Existing repository interfaces remain unchanged.

Alternative considered: mount the shell outside `RouterProvider`. That would require a second navigation mechanism or extra router plumbing for active links and would increase the chance of disrupting draft navigation blocking.

### Separate global destinations from project-local views

The sidebar contains Projects for both roles and My drafts only for testers. The header contains BugWatch, current identity and role, and Log out. Use Mantine `AppShell` for the desktop header/sidebar and a collapsed mobile menu with a labeled toggle and explicit expanded state. Close the menu after a successful route change. Keep the project Overview/Reports selection driven by the existing `tab=reports` query parameter, so a reload or direct link selects the same view. The active sidebar destination remains Projects for project and report routes; draft routes select My drafts.

Alternative considered: list every project or add a global Reports destination in the sidebar. A project list would scale poorly and require a data load in the shell; global Reports has no current route or data contract. Future destinations can be added when their capabilities exist, without visible placeholders now.

### Restructure pages without moving business logic

Use Mantine layout, form, card, badge, and feedback components where they improve clarity, while retaining existing form validation and repository operations in the current feature components. Keep accessible labels and status roles. On the project browser, use scannable project entries; on project details, keep metadata and repository link prominent and history secondary. On report details, place title and key facts before the full report fields and creation history. On the report form, group identification, reproduction, and result fields while keeping required inputs, Save draft, Submit report, Cancel/Discard, validation messages, and the unsaved-change blocker. At narrow widths, render each report summary as a readable stacked item containing all six existing list fields and the title link; wide screens may retain a table. Preserve plain-text rendering for user content.

Alternative considered: replace the route/page components wholesale. That would couple visual changes to repository and form behavior and increase regression risk while the report changes are still in progress.

### Make visual behavior verifiable

Automated UI tests in `src/test/*.test.ts` will cover role-aware destinations, active route state, direct project Reports links, menu interaction and keyboard labels, and retention of report/draft actions and feedback. Existing project/report/auth suites remain the functional baseline. A manual browser pass at desktop and narrow widths will verify spacing, readable report summaries, focus visibility, and system light/dark appearance, which jsdom cannot reliably judge.

## Risks / Trade-offs

- [Mantine conversion changes form events or validation feedback] -> Adapt one form at a time and keep the existing controlled values, error state, labels, and behavior-focused tests.
- [Shell navigation bypasses the report form blocker or remounts it] -> Keep a single router, retain `useBlocker` inside `ReportForm`, and test dirty form navigation through the sidebar and mobile menu.
- [Fixed shell or wide report content clips on small screens] -> Use the responsive sidebar and stacked report summaries; verify at narrow viewport widths in a browser.
- [In-progress report changes alter the baseline before implementation] -> Recheck the target branch and active change artifacts at apply time, then adjust the feature plan and affected UI tasks before parallel work.

## Migration Plan

No data migration is required. Introduce provider/styles and shell integration first, then restyle pages while preserving routes. Verify with focused UI tests, full Vitest, lint, production build, MarkBind build, and a manual responsive review. Rollback is a UI code revert; persisted projects, reports, and drafts remain unchanged.
