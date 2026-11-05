---
  layout: default.md
  title: "Report development and Supabase handoff"
  pageNav: 3
---

# Report development and Supabase handoff

The report feature adds Tester submission and authenticated readback through the shared Supabase client. See the [User Guide](../userGuide/Reports.md) for the form workflow and field limits. The [project handoff](Projects.md) describes the prerequisite project and identity setup.

## Configure an isolated environment

Use an isolated test project, with Supabase Auth and the profile and project migrations `001` through `004` applied in order. Then apply `src/features/reports/database/005_reports.sql` once, after checking which migrations have already been applied. It depends on `public.profiles`, `public.projects`, and the project trimming function. Provision a Tester and two Developers with matching profiles using the existing [account setup](Authentication.md) instructions. A Developer needs to create an active project for the browser walkthrough.

Set the application's Supabase URL and publishable key for the test environment as described in [project development](Projects.md). Never put a secret or service-role key in a `VITE_` variable. The project runner's ignored `.env.project-test.local` supplies the separate test URL, publishable key, isolated flag, and account emails; root `.env` must identify the separate production origin so the runner can reject it. The runner prompts for account passwords and the test-project elevated key.

## Architecture and boundaries

`src/features/reports/validation.ts` trims input and validates the required fields, explicit severity, and Unicode code-point limits. `reportRepository.ts` maps the application's camel-case contracts in `types.ts` to the report RPCs and converts failures into `ReportError` codes. `ReportCreatePage` loads active projects and owns submission; `ReportForm` owns field values and feedback. `ReportDetailsPage` reloads a saved report and its history from `/reports/:reportId`. The authenticated shell uses the existing shared Supabase client and rechecks authentication when a report operation reports an expired session.

The database remains the authorization boundary. `create_report` derives the actor from `auth.uid()`, requires a Tester profile, validates input, locks and checks the active project, and writes the report and creation history in one transaction. Callers cannot supply the reporter, state, assignment, ID, or timestamps. `get_report` and `get_report_history` provide report-scoped project and actor labels. Both roles can read submitted reports, but anonymous users and authenticated accounts without profiles cannot read them. Ordinary users have no direct report/history write grants; profile access is not broadened into a directory.

The current schema permits only Open, unassigned reports and creation history. Drafts, editing, discussion, assignment, resolution, and a shared report listing need separate implementation and any required schema changes. The report details page can be opened again by its saved link; it is not a listing.

## Verification

Run local checks from the repository root:

```sh
npm run test -- --run
npm run lint
npm run build
npm run docs:build
```

The ordinary suite skips hosted database tests when isolated settings are absent. To run the report database suite with the isolated setup above on Windows, use:

```powershell
npm run test:report-db
```

This selects the report suite through `run-project-db-tests.ps1`; it obtains fresh account tokens and restores process environment values afterward. Run it only against a separately configured test project. The suite creates temporary projects, reports, and an Auth user without a profile, then removes its fixtures. Fixture setup and cleanup require the test-project elevated key. A skipped hosted suite is not a hosted pass.

After applying migration `005` in the isolated test project, run `src/features/reports/database/verify_report_transactions.sql` in that project's SQL editor. It creates transaction-local fixtures and forces a history write failure to check rollback; its final statement rolls the transaction back. Do not run the fixture script against production.

For a browser walkthrough, sign in as a Tester, open an active project, select **Report bug**, submit valid information, and reload the saved report link. Check missing and overlong fields, unselected severity, project loading errors, cancellation, and retained input after a recoverable failure. Sign in as a Developer to read the saved link and confirm the Developer cannot create a report. Use isolated accounts and data. The repository's automated checks do not by themselves establish that a hosted migration or browser walkthrough passed.
