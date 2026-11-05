---
  layout: default.md
  title: "Project development and Supabase handoff"
  pageNav: 3
---

# Project development and Supabase handoff

Project routes use authentication and `src/features/projects/projectRepository.ts` with Supabase storage. The user reported successful hosted tests, the rollback script and browser checks, including a successful project test suite and display-name check after migration 003. Apply the ordered migrations in each target environment before using these routes. See the [project usage guide](../userGuide/Projects.md).

## Apply and verify the real integration

1. Verify `src/features/auth/database/001_profiles.sql` is already applied. Do not rerun its create-table migration over an existing profile schema.
2. In the **test project SQL editor**, apply `src/features/projects/database/002_projects.sql` once, after the auth migration. It creates project/history tables, constraints, validation helpers, read policies and transactional `create_project`/`update_project` functions. No users are provisioned and the own-profile read policy is unchanged.
3. Apply `src/features/projects/database/003_project_history_names.sql` once after migration 002. It adds the scoped history display-name lookup. Do not rerun any migration already applied to that environment.
4. Create a tester and two distinct developer Auth accounts with matching profiles, using real Auth UUIDs. The existing authentication suite's account-without-profile can remain separate.
5. Run the hosted suite and rollback script below, then the browser checklist. Apply reviewed migrations to production through your release process before deploying the frontend. No hosted migration/deployment is performed automatically.

The authenticated shell supplies BrowserRouter and routes `/projects`, `/projects/new`, `/projects/:projectId`, `/projects/:projectId/edit`. Logout/session loss unmounts protected content. An unauthenticated repository response requests auth re-resolution; ordinary storage failures retain the session and entered values. Hosting must serve the SPA entry on direct routes.

Identity is `src/shared/types/session.ts` SessionUser, supplied by `useAuth()`. History uses the project-scoped `get_project_history` RPC to resolve current display names for referenced actors, while keeping stable actor IDs in the data. Existing own-profile-only SELECT remains unchanged; creator/list metadata retains its prior current-user/UUID label behaviour. Project types and validation are shared by the UI and repository.

## History display-name correction (additive migration)

After migrations 001 and 002, apply `src/features/projects/database/003_project_history_names.sql` in the **test project SQL editor**. Do not rerun migrations already applied. The `get_project_history(p_project_id uuid)` function returns history columns plus `actor_display_name` for only actors referenced by that project. It checks the authenticated identity/profile and project existence, uses a fixed search path and restricted execution grants, and exposes no email, role, or unrelated profile directory. Existing direct profile reads remain own-only. The adapter maps that field to optional `actorDisplayName`; null/blank labels render as `Unknown user` (or the matching current identity name), with normal React escaping.

Names are resolved from current profiles at read time, including entries created before this migration. History actor IDs and changed values are not rewritten; names are not immutable snapshots. Creator/list metadata is outside this correction.

Run `npm run test:project-db` after applying migration 003. Hosted assertions check other users' display names, project-scoped results, tester/developer access, anonymous rejection, missing targets and unchanged own-profile restrictions. View a project edited by a second developer as a tester and a developer; verify the history shows that actor's display name. The user reported the post-003 hosted suite and display-name check passing in the test environment.

## Shared Supabase client setup

The shared browser client is initialized once on import in `src/shared/lib/supabaseClient.js`; its companion `.d.ts` provides TypeScript types. Use this instance for future authentication and database adapters instead of creating clients inside components.

The installed `@supabase/supabase-js` dependency supplies `createClient`. In the repository-root `.env` file, set:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

`.env.example` supplies these placeholder names; `.env` is Git-ignored. MarkBind's `site.json` also excludes `.env` and `.env.*` files from documentation assets so local configuration is not copied into the published site. If `.env` already exists, edit its values rather than copying the example over it. Restart Vite after changing environment variables. Vite reads browser variables through `import.meta.env` using the `VITE_` prefix; `NEXT_PUBLIC_` names are for a different framework and are not used here. Browser-exposed values must use a publishable key, never a Supabase secret or service-role key.

From a feature module, import the shared instance using the appropriate relative path, for example:

```js
import { supabase } from '../../shared/lib/supabaseClient.js'
```

The module trims both values and throws a configuration error before initialization if either is missing or blank. It does not log configuration values. The authentication feature uses this client for login and profile lookup. Its migration must be applied separately before real accounts can enter the application. The project adapter requires the project migrations before use. No additional environment-loading dependency is needed because Vite loads `.env`.

This setup follows [Supabase client initialization](https://supabase.com/docs/reference/javascript/initializing), [Supabase API key guidance](https://supabase.com/docs/guides/getting-started/api-keys), and [Vite environment variables](https://vite.dev/guide/env-and-mode).

## Application contracts

`src/features/projects/types.ts` defines `ProjectInput`, `Project`, `ProjectHistoryEntry`, `ProjectRepository`, and `ProjectError`. It re-exports the shared `SessionUser` contract from `src/shared/types/session.ts`. The authenticated shell supplies the current identity without exposing user-controlled role changes.

The repository exposes asynchronous `listActiveProjects()`, `getProject(id)`, `listProjectHistory(id)`, `createProject(input)`, and `updateProject(id, expectedRevision, input)`. Missing project reads return null; missing mutation/history targets return `not_found`. Errors have codes `validation`, `duplicate_name`, `conflict`, `unauthenticated`, `forbidden`, `archived`, `not_found`, or `unavailable`. Validation errors can carry field messages.

The Supabase adapter implements this interface and maps database snake_case fields to application fields. UI components use the repository contract rather than querying tables directly.

## Supabase schema contract

**The `public.profiles` identity contract is defined by the authentication change.** Its ordered migration belongs before any project migration. Project tables, mutation RPCs and policies below are supplied in `002_projects.sql`; history display-name lookup is supplied in `003_project_history_names.sql`. The user reports successful test-environment verification. Do not rerun applied migrations. Production rollout follows the release process.

### Schema and identity

The schema is `public`. Supabase Auth owns authentication identities; `public.profiles.id` references the corresponding Auth user ID. Never trust role values or actor IDs supplied by the browser. Database operations must derive the actor from `auth.uid()` and resolve the role from protected `public.profiles`.

| `public.profiles` column | Type / constraint | Application field |
| --- | --- | --- |
| `id` | UUID primary key, reference to Auth user | `SessionUser.id` |
| `username` | Required nonblank text, case-insensitively unique, administrator-set and fixed | `username` |
| `display_name` | Required nonblank text | `displayName` |
| `role` | Required `developer` or `tester`; administrator-set and permanent | `role` |

The authentication migration enables RLS for profiles, permits authenticated users to read only their own identity, and denies ordinary insert, update, and delete. Role values are lowercase strings; user-facing labels may use title case. No PostgreSQL enum type name is assumed. Apply this migration after Supabase Auth is available and before any project migration that references `profiles.id`.

### Projects

| `public.projects` column | Type / constraint | Application field |
| --- | --- | --- |
| `id` | Server-generated UUID primary key | `id` |
| `name` | Required trimmed text, 1–100 Unicode code points | `name` |
| `description` | Required trimmed plain text, 1–5,000 code points | `description` |
| `repository_url` | Required absolute HTTP/HTTPS URL, at most 2,048 code points | `repositoryUrl` |
| `created_by` | Immutable UUID reference to `profiles.id`, derived from session | `createdBy` |
| `created_at` | Server timestamp with time zone, immutable | `createdAt` |
| `updated_at` | Server timestamp with time zone | `updatedAt` |
| `revision` | Positive integer, initially 1; advance on changed saves | `revision` |
| `archived_at` | Nullable timestamp with time zone, initially null | `archivedAt` |

The unique index is named `projects_normalized_name_key`, on lowercase names after surrounding-whitespace trimming, covering **all rows**, including archived ones. There is no additional normalized-name column in the row. Preserve capitalization for display; do not fold accents, collapse internal whitespace, or add repository URL uniqueness. SQL uses the project trimming helper; Unicode and URL parity are covered by hosted fixtures, although full parity across all Unicode versions is not established.

Archive/restore remains a later feature. The state field supports active-edit checks and archived-name fixture tests only; the application exposes no archive, restore, or delete operation.

### Project history

| `public.project_history` column | Type / constraint | Application field |
| --- | --- | --- |
| `id` | Server-generated UUID primary key | `id` |
| `project_id` | UUID reference to `projects.id` | `projectId` |
| `actor_id` | UUID reference to `profiles.id`, derived from session | `actorId` |
| `occurred_at` | Server timestamp with time zone | `occurredAt` |
| `event` | Required `created` or `edited` | `event` |
| `changes` | JSON object of changed metadata fields | `changes` |

At the persistence boundary use JSON field keys `name`, `description`, and `repository_url`; map the last to application `repositoryUrl`. Each value has `{ "before": null-or-string, "after": "string" }`. Creation records initial values with null `before`; edits record only changed fields. No-op saves add no history or revision. Order history by `occurred_at`, then `id` as tie-breaker. The UI resolves actor IDs to labels; actor ID remains the historical identity if display names later change.

### Database operations

| RPC name | Named parameters | Result |
| --- | --- | --- |
| `public.get_project_history` | `p_project_id` | Project history rows with current `actor_display_name` |
| `public.create_project` | `p_name`, `p_description`, `p_repository_url` | Created project row |
| `public.update_project` | `p_project_id`, `p_expected_revision`, `p_name`, `p_description`, `p_repository_url` | Current project row after update/no-op |

Reads target `projects` and `project_history` under authenticated access rules. Database operations derive actor/role from trusted Auth/profile state; they do not accept actor IDs, roles, timestamps, or archival state. A changed update requires an active project and matching revision. Reject stale revisions before treating unchanged values as a no-op. A developer may update another developer's active project.

The database enforces validation, global uniqueness, role rules, protected columns, no deletion, and atomic history writes. Ordinary direct project writes and history manipulation are restricted; privileged RPC functions use restricted grants and fixed search paths. Creation/update plus history must be one transaction; browser-side sequential requests are insufficient. The implemented adapter maps SQLSTATE P1001/P1002/P1003/P1004/P1005/P1006 to unauthenticated/forbidden/validation/archived/not_found/conflict, and 23505 to duplicate_name. Unknown failures map to unavailable.

## Local verification

Run the project checks:

```sh
npm run test -- --run
npm run lint
npm run build
npm run docs:build
```

Local Vitest covers validation, repository response mapping, authenticated project UI behaviour, history and error handling. Hosted cases are skipped unless the isolated test environment is configured. `vitest.config.ts` restricts discovery to `src/test/*.test.ts`, preventing generated MarkBind copies from running twice. The lint configuration excludes generated `dist`/`_site` output and fixes the parser root so a documentation build does not introduce another candidate root.

## Hosted project tests you run

Create ignored `.env.project-test.local` in the root:

```dotenv
VITE_SUPABASE_URL=https://your-test-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-test-publishable-key
PROJECT_TEST_ISOLATED=true
PROJECT_TEST_TESTER_EMAIL=tester@example.com
PROJECT_TEST_DEVELOPER_EMAIL=developer-one@example.com
PROJECT_TEST_SECOND_DEVELOPER_EMAIL=developer-two@example.com
```

Root `.env` must identify the separate production project; the runner uses its URL as a forbidden target. For **manual browser checks against test**, use `.env.development.local` with the test URL/publishable key and restart Vite. The mode-specific file overrides root `.env`. Never put secret/service-role keys in `VITE_` settings or source control.

Run:

```powershell
npm run test:project-db
```

The Windows runner prompts for the test-project elevated key and each account password, signs in those ordinary accounts and does not save credentials/tokens. The optional email settings avoid email prompts. It sets child-process `PROJECT_TEST_ISOLATED`, `PROJECT_TEST_URL`, `PROJECT_TEST_PRODUCTION_URL`, `PROJECT_TEST_PUBLISHABLE_KEY`, `PROJECT_TEST_SERVICE_ROLE_KEY`, `PROJECT_TEST_TESTER_TOKEN`, `PROJECT_TEST_DEVELOPER_TOKEN`, `PROJECT_TEST_SECOND_DEVELOPER_TOKEN`, then restores prior process values. The suite rejects partial configuration and matching test/production origins. It creates uniquely named fixtures and removes only its returned project UUIDs/history through the privileged setup client. Permission assertions use ordinary accounts, not the elevated client.

Hosted cases cover persistence, history/actor attribution, reads, tester/anonymous write denial, editing another developer's project, global name uniqueness/races, stale/concurrent edits, no-op saves, archived restrictions, protected metadata/history/deletion and input boundaries. Ordinary tests keep hosted cases skipped unless explicitly configured; skips are not hosted passes. Run `npm run test:auth-db` separately when authentication/profile provisioning also needs verification.

Next run `src/features/projects/database/verify_project_transactions.sql` in the **test project's SQL editor**. It chooses an existing developer profile, creates transaction-local fixtures and a forced history-failure trigger, asserts failed creation/edit leaves no partial change, then rolls everything back. Expect the success notice and final rollback. On error, roll back the failed transaction and report the error; never run this script in production.

Complete the [browser checklist](../userGuide/Projects.md) for the target test environment. SQL URL parsing and Unicode casing are exercised by hosted fixtures; local mocked tests alone cannot prove database behaviour.

## Release and rollback

For a production rollout, apply the reviewed migrations in order before deploying the frontend. Roll back the frontend first if needed and preserve existing project/history data; do not automatically drop project tables or reserved names.

## References

The SQL ContextJ helper follows [RFC 5892 Appendix A](https://www.rfc-editor.org/rfc/rfc5892#appendix-A) to validate ZWJ/ZWNJ hostname contexts. Its static property classes were generated from Python Unicode 15.1 combining classes and the locally installed [python-idna Unicode 16 joining-type data](https://github.com/kjd/idna), under their respective [Unicode data terms](https://www.unicode.org/license.txt) and [idna licence](https://github.com/kjd/idna/blob/master/LICENSE.md). No Python runtime is needed by the migration. Browser/Node Unicode versions can differ; full IDNA/casing parity remains a limitation beyond the covered hosted fixtures.

Behaviour follows the repository's `BugWatch.md`, approved decisions captured in `openspec/changes/create-edit-active-projects/`, and the revision-2 coordinator record.
