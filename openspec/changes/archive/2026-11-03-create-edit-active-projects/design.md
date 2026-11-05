# Design

## Revision 5 delivery status

The original proposed/simulation descriptions below record earlier stages. Current contracts are the concrete revision-3 bindings and revision-4 history RPC, with final cleanup tracked in `workflow/2026-11-03-projects-completion.md`. The user confirmed migration002, hosted tests, SQL rollback verification and browser checks, then confirmed display names and a passing hosted project suite after003. These are user-reported checks. Real authentication, persistence and routed screens are implemented; runtime simulation is being retired under task3.7. No production deployment is part of this change.

## Context

See `proposal.md` for motivation and `specs/project-management/spec.md` for observable requirements. The current `src/App.tsx` renders only a heading; no feature modules, tests, authentication integration, or database schema exist. React, TypeScript, React Router, Vite, and Vitest are declared; no Supabase or browser-test dependency is currently declared. The existing guides are template landing pages, with an agent-workflow topic only.

This design is required because persistence, authorization, unique-name races, concurrent updates, and atomic history cross application/database boundaries. The original design describes intended additions; current implementation status and verified exports are tracked in the revision-3 coordinator record. Existing simulation modules are reused, not recreated.

## Goals / Non-Goals

**Goals:** Keep presentation separate from validation/data access; make database guarantees authoritative; define contracts suitable for independent application and test work; integrate with a separately delivered identity foundation.

**Non-Goals:** Introduce an authentication implementation, generic repository framework, global state library, report system, archive workflow, project drafts, or provisioning/deployment changes. No new top-level directory is necessary.

## Decisions

### 1. Authentication is a release prerequisite; simulation unblocks development

Consume the prerequisite's configured Supabase client, authenticated user ID, permanent `tester | developer` role, auth-loading state, and expiry/logout notification. Database code must obtain the actor from the authenticated database context and resolve the role from a trusted administrator-managed source; neither actor nor role is accepted as a mutation argument.

Authentication is now implemented and separate production/test Supabase projects are available. The concrete integration contract is recorded in `workflow/2026-11-03-projects-integration.md`, revision 3. The preceding simulated stage was developed while hosted services were unavailable. The product owner approved development-only simulated authentication and storage. Define replaceable `SessionUser` and `ProjectRepository` interfaces first; exact simulation signatures, exclusive owners and acceptance criteria are in `workflow/2026-11-03-simulated-projects.md`, revision 2. A fixed sample session and in-memory adapter allow local UI/logic development without fake tokens or remote services. Real integration still needs concrete authentication exports, trusted role lookup, migration order, and database test identities; this gate does not block simulation.

The completed simulation used an explicit development-only flag, sample identity selector and volatile store. It remains temporary while real project integration is implemented. After real database tests and authenticated UI verification pass, task 3.7 removes the runtime simulation branch, demo shell, sample-session control, flag configuration and launch command. Extract reusable UI, validation and contracts first. Audit remaining memory/session helpers against named deterministic test consumers: remove unused helpers and simulator-only tests; any justified retained double is isolated as test support with no application runtime import. Preserve meaningful regression cases by moving them to tests of the real/shared code. Do not retain an offline demo or add fallback behaviour merely because simulation code already exists. Completed simulation records remain historical evidence, not a final requirement.

The setup uses local component navigation and a small create/edit/history workspace; production routing/session handling remain pending. No SQL migrations are applied. Proposed schema/RPC identifiers are recorded in `docs/developerGuide/Projects.md` as assumptions, including `public.profiles`, to reconcile with the authentication teammate before backend integration. They are not deployed tables.

Alternative: implement authentication inside this change. Rejected by the product owner. Hiding buttons without database enforcement is also insufficient.

### 2. Cohesive project feature and explicit data-access contract

Keep code under `src/features/projects/`:

| Proposed module | Public contract |
| --- | --- |
| `types.ts` | `ProjectInput { name, description, repositoryUrl: string }`; `Project { id, name, description, repositoryUrl, createdBy, createdAt, updatedAt, revision, archivedAt }`; `ProjectHistoryEntry { id, projectId, actorId, occurredAt, event, changes }`. IDs/timestamps are strings, revision is a positive integer, archivedAt is string or null; event is `created | edited`; changes map editable fields to `{ before: string | null, after: string }`. |
| `validation.ts` | `validateProjectInput(input: ProjectInput)` returns a discriminated valid result with normalized `value`, or invalid result with field-specific errors. Export `normalizeProjectName(name: string): string` for canonical comparison tests. |
| `projectRepository.ts` | `createProjectRepository(client)` returns `listActiveProjects(): Promise<Project[]>`, `getProject(id): Promise<Project | null>`, `listProjectHistory(id): Promise<ProjectHistoryEntry[]>`, `createProject(input): Promise<Project>`, and `updateProject(id, expectedRevision, input): Promise<Project>`. Use the prerequisite client's actual type when available. |
| `ProjectListPage.tsx`, `ProjectDetailsPage.tsx`, `ProjectForm.tsx`, `ProjectEditorPage.tsx` | Presentation and request state; form accepts initial input, pending/error state, save/cancel callbacks. List/detail receive repository access through normal React props/context consistent with the prerequisite. No extra framework is needed. |

Repository inputs are typed but still validated at runtime. Repository failures use a discriminated project error with codes `validation`, `duplicate_name`, `conflict`, `unauthenticated`, `forbidden`, `archived`, `not_found`, `unavailable`; validation errors include field messages. Do not return raw SQL errors to users. `getProject` returns null for a missing readable ID; mutation of a missing ID returns `not_found`. Unauthenticated operations fail before exposing data; network failures map to `unavailable`. All writes have side effects only on successful commit. Successful creates return revision 1; successful changed updates return the next revision.

List/detail reads and history reads have no side effects. History ordering uses timestamp and ID as a deterministic tie-breaker. Active lists use name and ID ordering for predictability; this is not a search/filter feature. Avoid relying on cached metadata after mutation: update from the returned record and reload associated history.

Alternative: put fetching/validation inline in every component. Rejected because independent security/error testing and shared create/edit validation are concrete needs.

### 3. Normalize consistently and keep the database authoritative

Trim surrounding whitespace on names and descriptions before checking lengths and saving. Use Unicode code-point counts consistently in frontend and database, rather than JavaScript UTF-16 `.length`; do not silently truncate values. Preserve internal whitespace, punctuation, and capitalization. Name comparison is lowercase after trimming; do not add accent folding or Unicode compatibility normalization. Use database canonical comparison as final authority and test representative mixed-case non-ASCII inputs for frontend/database parity.

For repository URLs, trim surrounding whitespace as an implementation normalization, validate the resulting stored value against the 2,048-character cap, require an absolute URL with HTTP/HTTPS and a nonempty host, and retain the valid input rather than fetching or rewriting the destination. Reject whitespace/control characters inside the URL and malformed addresses. Implement equivalent database checks, with shared valid/invalid fixtures; a scheme prefix alone is insufficient. Display description via normal React text escaping and render repository URLs as ordinary links. Do not add repository-host allowlists or ownership verification.

Alternative: browser-only constraints. Rejected because direct callers could bypass them. Length and normalization fixtures, including Unicode, must exercise both boundaries.

### 4. Versioned schema and narrowly scoped atomic writes

Keep versioned migrations under `src/features/projects/database/`, with instructions for applying them after the prerequisite's identity schema. Reuse the prerequisite migration mechanism if it defines one, updating these artifact paths before delegation rather than creating parallel runners.

Proposed `projects`: UUID primary key, required text metadata, immutable creator reference, server timestamps, positive integer revision, nullable `archived_at` defaulting to null. A unique canonical-name index covers every row, with no active-only predicate. This guarantees race safety and reserves archived names. Renaming to the same row's canonical name remains valid. Do not infer that a duplicate repository URL is invalid.

Proposed `project_history`: UUID ID, project reference, trusted actor reference, server timestamp, event, and changed-field JSON. Creation records null-to-initial values; editing records only changed fields. History stores IDs independently of later display-name changes. The user-facing history shows a suitable identity label supplied by prerequisite identity data, falling back to a stable actor ID if necessary; no profile page is required.

Expose `create_project(p_name, p_description, p_repository_url)` and `update_project(p_project_id, p_expected_revision, p_name, p_description, p_repository_url)` as atomic database operations returning the persisted project. They derive actor/role from trusted identity, validate inputs, and reject unsupported actions. Update locks the target row, checks active state and expected revision, writes metadata, advances revision/time, and appends history in one transaction. A stale expected revision fails even if submitted values happen to match current values. A fresh unchanged submission is a successful no-op with no revision/time advance or edit history.

Enable row-level read protection. Revoke ordinary direct project inserts/updates/deletes and all history writes; expose only permitted mutation operations. If privileged functions are needed, use fixed schema-qualified references/search paths, restricted execution grants, and explicit authenticated role checks. No operation accepts a caller-supplied actor or archival state. Unique-constraint errors map to `duplicate_name`; transaction failure rolls back both data and history. Database tests must use ordinary authenticated/anonymous credentials, not service-role credentials, for permission assertions.

Alternative: separate client project and history writes. Rejected because partial commits and forged attribution would be possible. Last-write-wins is rejected by the product owner's concurrency decision. A numeric revision avoids timestamp precision dependencies.

### 5. Minimal routed UI and recovery

Proposed routes: `/projects`, `/projects/new`, `/projects/:projectId`, `/projects/:projectId/edit`. Integrate using the installed router and prerequisite auth boundary; preserve unrelated entry-point work. Both roles browse active projects and see project details/history. Developer routes/actions require the role, while database policies remain the authority. Do not add archive controls/tabs or report placeholders.

Use one form for creation and editing with associated labels/errors, a description textarea, repository URL input, submit, and cancel. Show pending/read errors and retry separately from empty/not-found states. Disable repeat save submissions while pending. On successful save, navigate to details using the returned ID. On cancel, leave without saving. On recoverable save errors, retain input. On conflict, disable further save until an explicit reload replaces form data and revision; warn that reloading discards unsaved values. Session loss clears sensitive feature state and delegates navigation to authentication; no project draft is persisted.

Alternative: inline list editing. Routed details/editing provides a stable destination for history and later reports without combining data-access responsibilities into the list.

### 6. Verification and ownership boundaries

Coordinator owns `src/App.tsx`, any necessary `src/main.tsx` integration, dependency/lockfile and test configuration changes, and planning records. Implementer owns project application modules and database migrations. Tester owns `src/test/project-validation.test.ts`, `src/test/project-repository.test.ts`, `src/test/project-database.test.ts`, and, if justified by installed tooling, `src/test/project-ui.test.ts`. No `.tsx` tests or colocated tests are introduced.

Once simulation contracts in the revision-2 coordinator record are fixed, application and deterministic tests can run independently. Real integration additionally requires actual authentication bindings. Database integration tests require a disposable, explicitly configured environment, seeded tester/two-developer identities, and privileged fixture setup separate from application-client assertions. Run concurrent create/rename/update operations and induce history-write failure to prove rollback; mocks cannot prove these guarantees. Standard tests remain deterministic without network access; report absent integration execution as a verification gap, not a pass.

Existing dependencies do not provide a browser-like test environment. Prefer pure validation/repository tests; if component tests need additional tooling, coordinator selects only necessary compatible local dependencies and preserves the `.test.ts` convention (React element creation can avoid JSX). Also perform a browser walkthrough for keyboard/forms, both roles, save failures, refresh persistence, and two-editor conflicts.

Detailed user documentation belongs in a new `docs/userGuide/Projects.md`; architecture/migration/security guidance belongs in `docs/developerGuide/Projects.md`, since no existing topic covers them. Documentation writer owns those pages plus their landing-page topic links and `_markbind/layouts/default.md` navigation changes after behaviour stabilizes. Verify generated `.html` paths against `site.json`; existing guide links have differing prefixes and must not be copied blindly. No guide edits are part of proposal generation.

## Risks / Trade-offs

- [Authentication interfaces are not delivered] -> Treat exact binding as a prerequisite gate; do not claim the feature is implementable end to end before it is resolved.
- [Frontend/database normalization differs] -> Use matching Unicode and whitespace fixtures; unique database enforcement is authoritative and duplicate errors are recoverable.
- [Database privileges bypass business rules] -> Revoke direct writes, test all accessible operations with ordinary accounts, and harden any privileged functions.
- [Stale-save rejection costs developers unsaved work] -> Keep entered text visible after rejection, explain the conflict, and require deliberate reload before further saving; automatic merge is out of scope.
- [Real database tests require an isolated environment] -> Document setup and explicitly record unexecuted integration coverage; do not substitute mock results for permission/race/rollback verification.
- [A schema under feature source needs migration documentation] -> Version scripts and document ordering/application; reuse prerequisite tooling if present, without provisioning infrastructure here.

## Migration Plan

1. Deliver the approved simulated stage against revision-2 contracts. Before real backend integration, finish the independent authentication prerequisite, document concrete client/identity/role interfaces, and reconcile the proposed schema contract.
2. Implement and verify schema/mutation permissions in a disposable environment. Apply ordered migrations using the prerequisite's established mechanism; no production application or provisioning is authorized by this proposal.
3. Integrate browser/forms after database operations exist; complete tests, documentation, required commands, and independent review.
4. For a later authorized release, apply backward-compatible schema before the frontend. Roll back the frontend first if needed; preserve project/history rows and reserved names. Do not drop user data as an automatic rollback.

## Open Questions

None about approved product behaviour. Concrete prerequisite export paths and database role-source names are an explicit dependency gate, not permission to choose a second identity architecture.

## Revision 3 concrete integration bindings

- Authentication: `src/features/auth/AuthProvider.tsx` exports `useAuth`, with `authenticated` state supplying `src/shared/types/session.ts` SessionUser. Project types re-export that shared type. Shared client: `src/shared/lib/supabaseClient.js`; trusted role source: own-readable `public.profiles` from authentication migration `001_profiles.sql`. Do not broaden profile read policies. History actor labels are resolved through revision-4 project-scoped get_project_history RPC; creator/list labels retain their existing current-user/UUID fallback. Do not query a general profile directory.
- Migrations: `src/features/projects/database/002_projects.sql` after `001_profiles.sql`, first in isolated test project. Root runner `run-project-db-tests.ps1` / `npm run test:project-db` uses `.env.project-test.local` and explicit PROJECT_TEST_* process configuration, rejects production URL, prompts secrets without saving them. User applies SQL and runs hosted checks; agent has no privileged database connection.
- Adapter factory remains `createProjectRepository(client: SupabaseClient): ProjectRepository`; row/error mapping uses contract in revision-3 record. SQLSTATE P1001 unauthenticated, P1002 forbidden, P1003 validation, P1004 archived, P1005 not_found, P1006 conflict; 23505 duplicate_name.
- `ProjectsApp({repository,user})` owns production routes; authenticated shell supplies BrowserRouter, repository and actual identity, remounts on identity loss/change. Unauthenticated repository failures request auth-state re-resolution to clear protected UI.
- Deterministic interaction tests use @testing-library/react and jsdom in `src/test/project-ui.test.ts`; all tests retain .test.ts filenames. Hosted suites remain explicitly configured and network-free local runs report them skipped.
- SQL-only forced rollback verification is `database/verify_project_transactions.sql`: run in test project's SQL editor, entirely rolled back. No production failure hook is installed. URL/Unicode normalization parity must be verified in test project; local mocks cannot prove database semantics.

## Revision 4 history labels

The user reports all previous requested hosted tests/SQL/browser checks successful. A remaining issue is history labels displaying other actors as UUIDs. `workflow/2026-11-03-project-history-names.md` fixes the contract: additive003 migration introduces `get_project_history(p_project_id uuid)` returning only the requested project history fields plus current `actor_display_name`; derive authenticated actor/trusted profile and validate existing project inside a fixed-search-path security-definer function. Existing profiles SELECT remains own-only; no general directory or role/email exposure. Real history adapter uses the RPC and maps optional `actorDisplayName`; UI renders escaped names and an unavailable-name fallback, retaining immutable actor IDs in data. New RPC migration/hosted regressions still require user execution. This supersedes the earlier other-user UUID history fallback only, not creator/list metadata or mutation behaviour.
