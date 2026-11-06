# Proposal

## Why

The local submission flow saves a bug and opens its detail page, but a Developer without the saved link cannot discover it in BugWatch. Deliver filing and project-scoped discovery together so both roles can find reports from the project.

## What Changes

- Add Tester-only report submission with project, title, description, version, reproduction steps, expected results, actual results, severity, and optional test environment.
- Apply the user's 2026-11-05 decisions: trim surrounding whitespace; title 1-200 Unicode code points; description, steps, expected and actual results 1-5,000 each; version 1-100; optional test environment 0-1,000. Require an explicit severity choice from Very Low, Low, Medium, High, with no preselection. Do not invent severity definitions.
- Persist an Open, unassigned report with trusted reporter identity and server-maintained ID/timestamps. Commit its creation activity atomically.
- Provide a minimal saved-report detail page and creation history for both authenticated roles. Keep invalid-input and recoverable service failures actionable without discarding entered text.
- Enforce permissions, active-project checks, validation, protected metadata, and read restrictions in Supabase independently of UI controls.
- Add deterministic validation/repository/UI tests, isolated hosted permission/transaction checks, and guides during implementation.

- Commit 1: retain submission and saved-report readback. For an archived project, reject the save, keep unsaved text visible, suggest contacting the project creator, and offer Discard report. Keep manual project switching and retry for connection failures. Add a slash-separated breadcrumb ending in the report title and a back link to the project's Reports tab.
- Commit 2: add Overview and Reports tabs. Overview defaults on ordinary project entry and retains details and project history. Reports lists every submitted report for that project to both signed-in roles. Keep Report bug visible to Testers on either tab for active projects.

Excluded: drafts, AI integration, report editing, assignment/resolution/retest actions, discussion, mailbox, cross-project or personal report lists, search/filter controls, evidence submission, deployment provisioning, and fixes to unrelated project functionality.

## Capabilities

### New Capabilities

- `bug-reporting`: Structured submission, trusted creation metadata and activity, and authenticated readback of submitted reports. This capability can later grow to include report editing; drafts and AI are not included here.

### Modified Capabilities

None. Reuse authentication requirements and the pending project-management interface without redefining them.

## Impact

- The report branch is based on project PR #2's merge `e1f75c5`; local submission and saved-link readback are implemented and previously reviewed. The tab, list, breadcrumb and archive notice/discard changes are pending. Automatic project-choice refresh after a rejected save is deferred.
- Keep both commits in one PR targeting `development`; review the combined Vercel preview before promotion.
- Add feature code under `src/features/reports/`, tests under `src/test/*.test.ts`, and the next available ordered SQL migration after upstream migrations. Extend the existing router and shared Supabase client; do not create parallel project/authentication implementations or a second router.
- Add scoped reporter/history name reads without broadening own-profile RLS. No new application dependency is expected once PR #2 lands.
- Future PR target is `development`; validate its Vercel preview using isolated development data before a later development-to-master promotion. No GitHub posting, hosted migration, or deployment is part of this planning operation.
