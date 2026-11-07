---
  layout: default.md
  title: "Report development and Supabase handoff"
  pageNav: 3
---

# Report development and Supabase handoff

The report feature supports Tester submission, private drafts, Developer acceptance and investigation, a project-specific report listing, and authenticated readback through the shared Supabase client. See the [User Guide](../userGuide/Reports.md) for the workflows and field limits. The [project handoff](Projects.md) describes the prerequisite project and identity setup.

## Configure an isolated environment

Use an isolated test project, with Supabase Auth and the profile and project migrations `001` through `004` applied in order. Then apply `src/features/reports/database/005_reports.sql` followed by `src/features/reports/database/006_project_report_listing.sql`, checking which migrations have already been applied before running either. Migration `005` depends on `public.profiles`, `public.projects`, and the project trimming function; `006` depends on `005`. Provision a Tester and two Developers with matching profiles using the existing [account setup](Authentication.md) instructions. A Developer needs to create an active project for the browser walkthrough.

Set the application's Supabase URL and publishable key for the test environment as described in [project development](Projects.md). Never put a secret or service-role key in a `VITE_` variable. The project runner's ignored `.env.project-test.local` supplies the separate test URL, publishable key, isolated flag, and account emails; root `.env` must identify the separate production origin so the runner can reject it. The runner prompts for account passwords and the test-project elevated key.

Apply `src/features/reports/database/007_report_drafts.sql` after migration `006`, then `src/features/reports/database/008_report_workflow.sql` after `007`. Migration `008` adds the assignment timestamp, permits the Accepted and In progress states, extends workflow history and report reads, and adds the two workflow RPCs. Existing Open reports remain unassigned with a null assignment time. Provision a second Tester in the isolated database to verify draft ownership.

## Architecture and boundaries

`src/features/reports/validation.ts` trims input and validates the required fields, explicit severity, and Unicode code-point limits. `reportRepository.ts` maps the application's camel-case contracts in `types.ts` to the report RPCs and converts failures into `ReportError` codes. `ReportCreatePage` loads active projects and owns submission; `ReportForm` owns field values and feedback. `ReportDetailsPage` reloads a saved report and its history from `/reports/:reportId` and links back to its project's Reports tab. `ProjectReportsPanel` loads the project's list independently of the Overview and its history; the `?tab=reports` query selects that tab, while the project route defaults to Overview. The authenticated shell uses the existing shared Supabase client and rechecks authentication when a report operation reports an expired session.

The database remains the authorization boundary. `create_report` derives the actor from `auth.uid()`, requires a Tester profile, validates input, locks and checks the active project, and writes the report and creation history in one transaction. Callers cannot supply the reporter, state, assignment, ID, or timestamps. `get_report` and `get_report_history` provide report-scoped project and actor labels. `list_project_reports` returns summaries only for the requested project to authenticated users with profiles. Both roles can read submitted reports, but anonymous users and authenticated accounts without profiles cannot read them. Ordinary users have no direct report/history write grants; profile access is not broadened into a directory.

`accept_report(p_report_id)` and `start_report_investigation(p_report_id)` derive the actor from `auth.uid()` and require a Developer profile. Both lock the project before the report and reject an archived project under the lock. Acceptance requires an Open, unassigned report and atomically sets Accepted, the caller as assignee, and a server assignment time. The first acceptance wins; repeated or competing attempts return `P2006` without replacing ownership. Starting requires an Accepted report assigned to the caller, changes it to In progress, and preserves assignment and assignment time. A stale state returns `P2007`; a non-assignee is forbidden. Each transition and its corresponding history event are in the same transaction, so a history failure rolls back the report update. The RPCs are security-definer functions with an empty search path and authenticated-only execute grants; direct report and history writes remain unavailable to ordinary callers.

The report detail read returns assignment ID, time, username, and display name alongside state and existing report fields. The project listing returns assignment ID and scoped labels; assignment time remains detail-only. History reads retain creation entries and add acceptance and investigation entries with actor labels and before/after state; acceptance also records assignment identity and time. Labels are scoped to the requested report and rendered as text. Repository decoding rejects unsupported states and inconsistent assignment data. The authenticated wrapper applies existing session-expiry handling to both workflow methods. The detail page refreshes report and history after a successful action or conflict; after an uncertain result or failed readback, it offers read-only reload before another action.

The project listing shows title, project, severity, state, assignee and reporter, newest first. The `list_project_reports` RPC returns one JSON array containing up to 100 reports, ordered by creation time and ID descending. Returning one value prevents a lower API row limit from silently shortening a page. The repository fetches successive pages using the original timestamp and ID as a keyset cursor so reports beyond the first page are included. A missing project returns `P2005`; an incomplete cursor returns `P2003`. The timestamp is retained at its database precision for ordering.

Drafts and submission receipts live in separate tables. Owner-scoped RPCs require an authenticated Tester profile and check the target project's archive status at save and submit time. Draft submission creates the report and its history, records the receipt, and consumes the draft in one transaction. A retry with the same draft ID can return the report already created for that author. Draft routes use the authenticated data router for the unsaved-navigation warning, and the Vercel rewrite serves the app on direct draft URLs.

Deploy migration `008` before the updated frontend, then deploy the frontend promptly. An older Open-only frontend cannot decode reports after they are assigned. If rollback is needed, disable workflow actions while retaining the extended readers and stored workflow data; do not revert to an Open-only frontend or drop assignment and history metadata once assigned reports exist. Use a forward corrective migration where needed.

## Tester assistant

For local development, fill the ignored `.env` or `.env.local` from `.env.example` and run `npm run dev`. Vite's development middleware runs the existing suggestion endpoint at `/api/tester/report-suggestions` on the same local address as the app. Restart the dev server after editing env settings. The middleware loads the server keys into the Node process and exposes only Vite's normal public variables to browser code.

The middleware applies only to Vite's development server. Vercel uses `npm run build` for the frontend and runs `api/tester/report-suggestions.ts` as a function, using the project environment settings. Set the keys separately for the review deployment. Local files supply local development values.

Apply `src/features/reports/database/009_tester_suggestion_quota.sql` after `008` in the isolated database, then apply `010_tester_suggestion_quota_five.sql` to raise the limit to five attempts per rolling five minutes. Migration `010` preserves existing attempt timestamps and updates both the quota function and storage constraint. Apply both migrations for a fresh database; apply only `010` if `009` is already installed. The quota function can be invoked by the server's service role. It checks the Tester profile and serializes requests per Tester using a row lock and database time. Only the latest admitted timestamps are needed.

To verify the quota migrations in disposable PostgreSQL, set `QUOTA_TEST_DOCKER=true` and `QUOTA_TEST_DOCKER_PATH` to your Docker executable, then run `npm run test -- --run src/test/report-suggestion-quota.test.ts`. Docker must be running. This opt-in suite uses `postgres:17.6-alpine3.22`, checks upgrade preservation, the sixth-attempt limit, expiry, concurrent requests and permissions, and removes its temporary container afterward. It does not connect to hosted Supabase.

The form calls `POST /api/tester/report-suggestions` with the current Supabase bearer token. The Vercel Function verifies the session and exact `tester` role, loads the active project through the user's authorized Supabase client, and reserves quota before contacting SoCLaaS. It forwards only allowed form fields and the server-looked-up project name and description. Severity and the project ID stay in BugWatch. The provider request disables reasoning with `reasoning_effort: 'none'` so the configured Qwen model can return its JSON answer within the 1,500-token output budget and 15-second timeout. The endpoint filters malformed suggestion and question entries and returns a safe error when no entries are usable.

Keep `TESTER_SUGGESTIONS_ENABLED` disabled until the live model, account quota handling and retention are confirmed. For isolated preview setup, configure the function's `SOCLAAS_API_KEY`, `SOCLAAS_MODEL`, and `SUPABASE_SERVICE_ROLE_KEY` as server settings. The server reuses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the frontend. The earlier server names are accepted as a fallback. Use a service-role key from that same isolated project. Keep both secret keys outside `VITE_` variables. Mocked tests exercise the contract without contacting SoCLaaS.

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

This selects both `src/test/report-database.test.ts` and `src/test/report-workflow-database.test.ts` through `run-project-db-tests.ps1`; it obtains fresh Tester and two Developer tokens and restores process environment values afterward. Run it only against a separately configured test project. The suites create temporary projects, reports, and an Auth user without a profile, then remove their fixtures. Fixture setup and cleanup require the test-project elevated key. A skipped hosted suite is not a hosted pass.

After applying migrations `005` and `006` in the isolated test project, run `src/features/reports/database/verify_report_transactions.sql` in that project's SQL editor. It creates transaction-local fixtures and forces a history write failure to check rollback; its final statement rolls the transaction back. Do not run the fixture script against production.

After applying migration `007`, run `src/features/reports/database/verify_report_drafts.sql` in the isolated test project's SQL editor. It checks ownership, archived-project rejection, reassignment, rollback, and repeated submission. The script rolls back its fixtures.

After applying migration `008`, run `src/features/reports/database/verify_report_workflow.sql` in the isolated test project's SQL editor. It forces history writes to fail for acceptance and investigation, checks that each report update and its event roll back together, and rolls back its final fixtures. Run the script only against the isolated project.

For a browser walkthrough, sign in as a Tester, open an active project, select **Report bug**, submit valid information, and reload the saved report link. Use **Back to project reports** and the breadcrumb to open the project's listing and Overview; check report ordering and retry behaviour. Check missing and overlong fields, unselected severity, project loading errors, cancellation, and retained input after a recoverable failure. With two Developers, verify detail-only acceptance, a competing acceptance conflict, assignee-only investigation start, persisted assignment and activity after reload, and labels in the listing. Check that the Tester can read the result and neither role can take workflow actions on an archived project. Confirm Developers cannot create reports and existing drafts and navigation still work. Use isolated accounts and data. The repository's automated checks do not by themselves establish that a hosted migration or browser walkthrough passed.
