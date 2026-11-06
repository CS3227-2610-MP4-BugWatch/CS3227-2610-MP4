# Proposal

## Why

BugWatch's current screens use a single wide panel with limited navigation and little visual hierarchy. A consistent, responsive workspace will make existing project and report workflows easier to find and read as the application grows.

## What Changes

- Introduce a persistent desktop sidebar for the authenticated workspace, with Projects for both roles and My drafts for testers; collapse it into an accessible menu on smaller screens.
- Place account identity and Log out in a compact header, while retaining the existing login, session, and error behavior.
- Give the project browser, project overview and reports, project editor, report form, draft list, and report detail pages a consistent hierarchy, spacing, and action placement using the installed Mantine library.
- Keep project Overview and Reports as project-local, URL-backed views. Preserve existing routes, deep links, role restrictions, form state rules, loading/empty/error states, and report fields.
- Use a quiet, professional visual style: neutral surfaces, restrained accent color, readable text, and clear state and severity labels.
- Reserve layout space for later capabilities without showing inactive links or implementing planned features.

## Capabilities

### New Capabilities

- `application-layout`: Responsive navigation and clear presentation of the currently available login, project, report, and draft screens.

### Modified Capabilities

None. Authentication and project-management requirements remain unchanged; the pending report submission and draft changes retain their existing behavior.

## Impact

- Presentation and routing integration in `src/App.tsx`, `src/main.tsx`, `src/index.css`, `src/App.css`, `src/features/auth/`, `src/features/projects/`, and `src/features/reports/`.
- Use the existing `@mantine/core`, `@mantine/hooks`, and PostCSS setup; no new application dependency or persistence change is planned.
- Update focused UI tests in `src/test/*.test.ts` and the relevant User Guide topics after implementation. Record any material layout or Mantine setup decisions in the Developer Guide.
- Coordinate with the in-progress `tester-report-submission` and `tester-report-drafts` changes; this proposal covers only functionality present in the implementation when the redesign starts.
