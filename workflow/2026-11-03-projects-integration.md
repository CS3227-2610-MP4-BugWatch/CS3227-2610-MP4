# Project integration execution record

## Revision / status

Revision 3, source implementation staged and independently reviewed; full integration incomplete pending user-run hosted and browser verification. Use `openspec/changes/create-edit-active-projects/{proposal,design,tasks}.md` and `specs/project-management/spec.md` as requirements. Group 0 is historical, 23 integration tasks remained initially. Preserve unrelated user/authentication/config edits. No production migration/deployment authorized in this execution; stage SQL for test verification first.

## Confirmed bindings

Auth is implemented: `src/features/auth/AuthProvider.tsx` exports `useAuth`/`AuthProvider`; authenticated state has `user: SessionUser`, logout removes protected content. `src/shared/types/session.ts` owns SessionUser; project types already re-export it. Shared browser client is `src/shared/lib/supabaseClient.js`. Trusted role source is protected `public.profiles(id,username,display_name,role)` from `src/features/auth/database/001_profiles.sql`, own-profile select only. Do not broaden that profile policy. Authenticated shell is `src/features/auth/AuthenticatedApp.tsx`.

## Public contracts / ownership before parallel work

- Backend implementer exclusively owns `src/features/projects/projectRepository.ts`, new `src/features/projects/database/002_projects.sql`. Export `createProjectRepository(client: SupabaseClient): ProjectRepository` using existing types and validation. No types changes unless coordinated.
- SQL tables per Developer Guide: public.projects and public.project_history. RPCs `create_project(p_name text,p_description text,p_repository_url text)` and `update_project(p_project_id uuid,p_expected_revision integer,p_name text,p_description text,p_repository_url text)` return one projects row. SQL errors stable: P1001 unauthenticated, P1002 forbidden, P1003 validation, P1004 archived, P1005 not_found, P1006 conflict; 23505 duplicate_name. Auth/PostgREST401 errors -> unauthenticated; unknown/network errors -> unavailable. Messages mapped to user-safe ProjectError. Mutation inputs validated before RPC, only editable params accepted. Read queries select project fields; list active sorted name/id, detail maybeSingle; history validates target existence then selects history sorted occurred_at/id and maps snake_case JSON fields to camelCase. Invalid UUID route returns null/get or not_found/update/history without throwing raw database format errors.
- Identity labels: use stable actor UUID fallback already allowed by design; no additional public profile query/policy/RPC needed in this scope. UI may label current user from auth, others by UUID. Mention this limitation in guide. No caller-controlled attribution.
- UI implementer exclusively owns new `src/features/projects/ProjectListPage.tsx`, `ProjectDetailsPage.tsx`, `ProjectForm.tsx`, `ProjectEditorPage.tsx`, `ProjectsApp.tsx`. Root owns App/auth shell integration, package/config/styles. Export `ProjectsApp({repository,user}:{repository:ProjectRepository;user:SessionUser})` routes via installed React Router; root wraps BrowserRouter. Other page contracts: list `{repository,user}`, details `{repository,user}`, editor `{repository,user}`, form `{initialValue:ProjectInput;pending:boolean;error:string;fieldErrors?:Partial<Record<keyof ProjectInput,string>>;blocked?:boolean;onSubmit:(value:ProjectInput)=>void;onCancel:()=>void}`. Pages use routes `/projects`, `/projects/new`, `/projects/:projectId`, `/projects/:projectId/edit`. Reuse existing simulated UI behaviour. Guards enforce developer routes/actions and archived edit checks; async cleanup prevents stale responses after unmount/logout; duplicate submit ref guard; conflict requires reload. No SDK import in presentation. Root retains simulation until hosted checks (cleanup task dependencies).
- Tester exclusively owns new `src/test/project-repository.test.ts` and `project-database.test.ts`; no application/config changes. SDK mocked adapter tests follow exact backend contract above; hosted suite explicitly configured test project only, disallow production URL, no secrets/logging. Existing auth runner/environment is not changed by agents. Root adds project runner and may add UI tests separately.
- Root owns documentation, workflow/OpenSpec, shared config/App/auth integration and test runner. Existing simulation tests/runtime remain until hosted verification permits cleanup; record blocker honestly if credentials/migration access unavailable.

## Validation / concurrency / history

Preserve approved Unicode code-point limits and JS trimming parity; SQL authoritative checks, unique normalized name across all archived/active rows, row lock + revision check, no-op unchanged save (no revision/time/history), transactional history. No direct client writes/deletion/history tampering; functions restricted execute, fixed search_path. Report any SQL/frontend URL or Unicode parity gap rather than silently changing approved rules.

## Sequence and verification

Start backend and tests concurrently after this contract; UI independent against existing interface. Root integration follows. Run relevant tests, npm test -- --run, lint, build, docs:build; hosted database tests and browser flow when available. Do not mark tasks complete without actual specified verification and current independent reviewer approval. Reviewer approves every backend/UI/test submission and final integrated state; fixes require re-review.

## Submissions / approvals / checks

User confirmed they will apply migrations and asked which tests to run. Handoff: apply `002_projects.sql` in test after existing auth migration, configure `.env.project-test.local` from `.env.project-test.example`, run `npm run test:project-db`, run test-only `verify_project_transactions.sql` in SQL editor, then User Guide browser checklist. Root `.env` identifies production only for the test runner's forbidden-origin guard; `.env.development.local` can select test for manual browser use. No credentials were requested in chat, printed, or saved by the runner. No hosted pass claimed.

| Submission | Reviewer disposition |
| --- | --- |
| BACKEND-1 | changes_requested, superseded: URL percent wildcard defect |
| BACKEND-FIX-1 | changes_requested, superseded: further URL/ContextJ corrections needed |
| BACKEND-FIX-2 | changes_requested, superseded: interior Latin joiner handling incomplete |
| BACKEND-FIX-3 | approved for staged source handoff; actual SQL execution remains pending |
| UI-1 | approved for five routed UI modules |
| TEST-1, TEST-FIX-1, TEST-FIX-2, TEST-FIX-3, TEST-FIX-4 | each explicitly approved for submitted test-source scope; latest suite has 38 adapter cases and 41 hosted project cases |
| UI-TEST-1 | approved, 17 deterministic DOM interaction tests |
| ROOT-1 | approved for auth/session wrapper, 2 boundary DOM tests, runner/config/dependencies/docs/navigation/provenance |
| Final combined feature | blocked pending hosted migration, database/SQL rollback/browser results and dependent simulation retirement |

Resolved findings: invalid SQL wildcard percent detection; encoded numeric host decoding; RFC5892 ContextJ joiner handling; unauthorized repository response now triggers auth re-resolution and unmount; stale User Guide future-integration wording corrected. Static Unicode property data comes from local Unicode15.1/16; current Node Unicode17 parity and broader IDNA/casing behaviour remain verification limitations. No application changes followed final scoped approvals.

## Final local verification

- `npm.cmd run test -- --run`: 221 passed, 59 skipped (18 auth, 41 project hosted) across 13 files. A parallel earlier run emitted worker termination warnings with exit0; repeat with no concurrent checks passed in 2.73s without those warnings.
- `npm.cmd run lint`: passed, no warnings on final run.
- `npm.cmd run build`: passed, TypeScript and Vite production output.
- `npm.cmd run docs:build`: passed, existing template broken-link warnings plus a missing undici dependency-doc variable warning. No unrelated template fixes made; own generated audit changes restored to their pre-build content, preserving prior user edits.
- Production bundle marker scan: no simulation runtime/sample-user markers. Generated docs recursive filename check: no `.env*` files. Both existing project topic HTML outputs exist.
- PowerShell runner parse: passed. Hosted runner was not executed because interactive passwords/elevated test key must be supplied by user. It explicitly rejects the production origin, restores process variables, and never receives elevated keys via VITE settings.
- Strict OpenSpec validation and tracked diff whitespace checks passed.
- Added only DOM-test dependencies @testing-library/react/jsdom, no application dependency/TS relaxation. npm reported audit findings in the dependency tree; no broad automatic dependency fix was attempted.

## Remaining work and cleanup audit

OpenSpec progress after reviewed local work: 16/29 tracked tasks complete (six historical simulation tasks and ten reviewed local integration outcomes). Thirteen remain pending, including actual database application/guarantees, hosted/browser verification, dependent guide/cleanup work and final combined approval. Checkboxes do not imply the staged migration has run remotely.

Do not mark migrations/transaction guarantees, hosted DB suite, actual browser persistence, final review or overall acceptance complete until user evidence is supplied. Task3.7 explicitly depends on those checks, so the existing runtime simulation and its tests are retained temporarily, not declared necessary permanent production code. Shared types/validation/UI are reused. On successful hosted handoff, remove the demo/session/flag/script and migrate or remove helpers only after identifying named remaining test consumers. Final guide cleanup and independent re-review follow those edits.
