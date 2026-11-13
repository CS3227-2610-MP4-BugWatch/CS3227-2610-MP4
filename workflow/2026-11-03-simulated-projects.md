# Simulated project development setup

## Status and revision

Revision 2, simulated stage completed and independently approved. User authorized lightweight simulated authentication/storage and a recorded future Supabase schema contract. This is a development-only stage of `create-edit-active-projects`, not completion of its database/authentication requirements. All prior user decisions remain in force. Data is process-memory only and resets on page reload; no cross-tab persistence is promised.

## Authoritative context

- `openspec/changes/create-edit-active-projects/{proposal,design,tasks}.md`
- `openspec/changes/create-edit-active-projects/specs/project-management/spec.md`
- Prior coordinator record: `workflow/2026-11-03-create-edit-active-projects.md`

## Scope and acceptance

Development simulation explicitly enabled with `npm run dev:simulated`, backed by `.env.simulated` and `import.meta.env.DEV`. Normal development and all production builds must not load simulated identities/store or fall back to simulation on failure. UI clearly labels simulated mode and volatile storage. Seed identities: two developers, a tester, and signed-out selection. No accounts or cloud resources are created.

Provide callable repository operations and a small browser UI for browsing, creating, editing, and reading history using existing product validation, normalized name uniqueness, stale revision errors, and role boundaries. Keep repository/session interfaces replaceable. Document all assumed tables, columns, values, constraints and RPC names as proposed contracts, never as deployed tables. Real auth/database integration/security/race/rollback tests remain pending.

## Exact interfaces (agreed before delegation)

Implementer owns these modules under `src/features/projects/`:

- `types.ts`: `ProjectInput { name: string; description: string; repositoryUrl: string }`; `SessionUser { id: string; username: string; displayName: string; role: 'developer' | 'tester' }`; `Project` extends input with `id`, `createdBy`, `createdAt`, `updatedAt` (strings), `revision` (number), `archivedAt` (string|null). `ProjectHistoryEntry { id: string; projectId: string; actorId: string; occurredAt: string; event: 'created'|'edited'; changes: Partial<Record<keyof ProjectInput, { before: string|null; after: string }>> }`.
- `types.ts`: `ProjectError` extends Error with `code` union `'validation'|'duplicate_name'|'conflict'|'unauthenticated'|'forbidden'|'archived'|'not_found'|'unavailable'`, optional `fieldErrors: Partial<Record<keyof ProjectInput,string>>`; constructor `(code, message, fieldErrors?)`.
- `types.ts`: `ProjectRepository` has Promise-returning `listActiveProjects(): Project[]`, `getProject(id: string): Project|null`, `listProjectHistory(id: string): ProjectHistoryEntry[]`, `createProject(input: ProjectInput): Project`, `updateProject(id: string, expectedRevision: number, input: ProjectInput): Project` (listed values describe Promise resolutions). No deletion/archive mutation interface.
- `validation.ts`: `validateProjectInput(input: ProjectInput)` -> `{ valid:true; value:ProjectInput } | { valid:false; errors:Partial<Record<keyof ProjectInput,string>> }`; `normalizeProjectName(name: string): string`. Unicode code-point length; trim fields; reject internal URL whitespace/control chars, malformed/relative/non-http(s) URL; nonempty host; limit normalized URL to 2048. Preserve URL spelling. Pure validation functions and no network.
- `development/simulatedSession.ts`: exported readonly `SIMULATED_USERS: readonly SessionUser[]` with fixed UUID fixture IDs and roles/display labels; `createSimulatedSession(initialUserId: string|null = SIMULATED_USERS[0].id)` -> `{getUser(): SessionUser|null; setUser(id:string|null): void}`. Unknown IDs throw; returned identities must not be mutable shared references.
- `development/simulatedProjectRepository.ts`: `createSimulatedProjectRepository(getUser:()=>SessionUser|null, options?:{ projects?:Project[]; history?:ProjectHistoryEntry[]; now?:()=>string; createId?:()=>string }): ProjectRepository`. Options support deterministic tests and archived fixtures; clone seed and output data. Default IDs are `crypto.randomUUID()`, time ISO strings. Reads require a session, mutations require developer; updates permitted for non-creators, archived edits rejected. No actor arguments accepted. Creator/time/revision protected; construct input whitelist, validate, globally unique canonical name check (including archive), revision 1 on create, changed update increments; unchanged fresh save no-op. Stale revisions reject before no-op. Atomic synchronous memory commit with history prepared first; thrown ID/time generation must leave state unchanged. Returned values are isolated clones. Missing get -> null, missing update/history -> not_found. Concurrency calls serialize synchronously within each async method: no awaits between checks and commit.
- `development/simulationConfig.ts`: `isSimulationEnabled(isDevelopment:boolean, flag:string|undefined):boolean`, true only when development and flag exactly `'true'`. No browser globals at import; tests can check production exclusion via function plus bundle inspection.

Coordinator owns UI integration: `src/App.tsx`, `src/App.css`, `src/features/projects/development/SimulatedProjectsApp.tsx`, `.env.simulated`, `package.json` (only add `dev:simulated` script), guides/navigation and planning/logs. No new dependency required. UI consumes interfaces above and can use component state for local view navigation (full production routing stays pending); changing sample identity remounts workspace to discard old forms. Store persists during identity switches within one page.

Tester exclusively owns `src/test/project-validation.test.ts`, `src/test/simulated-projects.test.ts`, `src/test/simulated-session.test.ts`, and the subsequently assigned `src/test/simulation-shell.test.ts` (initial SSR markup). Follow repository `.test.ts` convention; Vitest's existing Node environment is sufficient. No shared-file edits or real network calls. Tests independent of implementation, with boundary, role, mutation isolation, stale-save, atomic-memory-failure and uniqueness cases derived from specs.

## Execution and ownership

1. Coordinator updates existing artifacts coherently to allow simulated stage while retaining real integration tasks; this contract is fixed before delegation.
2. Spawn implementer and tester concurrently; both read revision 2. They are not alone in the codebase and must preserve other owners' changes. No subagents spawn further agents.
3. Coordinator builds minimal development UI, adds launch script/gate, and writes User/Developer Guide topics using documentation skill. Concrete schema assumptions live in Developer Guide and are referenced by design.
4. Run tests/lint/build/docs build, verify production exclusion (including build with simulated mode), collect submissions SIM-IMPL-1 and SIM-TEST-1, then obtain independent reviewer approval per submission plus coordinator UI/docs and combined setup. Any later affected edit requires re-review.

## Required schema record

Proposed schema `public`: `profiles` keyed by auth user ID (`id`, `username`, `display_name`, `role` with `developer|tester`); `projects` (`id`, `name`, `description`, `repository_url`, `created_by`, `created_at`, `updated_at`, `revision`, `archived_at`); `project_history` (`id`, `project_id`, `actor_id`, `occurred_at`, `event`, `changes`). Canonical name uniqueness covers archived rows; history editable field keys map to snake_case at persistence boundary. RPCs `create_project(p_name,p_description,p_repository_url)` and `update_project(p_project_id,p_expected_revision,p_name,p_description,p_repository_url)`. Actual authentication prerequisite must reconcile this assumed profile shape before database integration. No SQL migrations or fake tokens created now.

## Submissions / review / final verification

| Submission | Owner/scope | Final disposition |
| --- | --- | --- |
| SIM-IMPL-1 | Implementer: types, validation, session, flag predicate, simulated repository | Reviewer approved against revision 2 and final core state |
| SIM-TEST-1 | Tester: four `src/test/*.test.ts` files, 104 tests | Reviewer approved against revision 2 and final test state |
| Combined stage | Coordinator App/UI/config/docs plus both submissions | Reviewer explicitly approved final App gate, Vitest discovery, schema handoff, and combined setup |

Review finding: exact database RPC parameter names differed between design and schema handoff. Coordinator aligned design to `p_*` names; reviewer confirmed resolution and approved the updated state. No actionable findings remain. No application/test changes followed final approval.

Final actual checks:

- `npm.cmd run test -- --run`: 104 tests passed in 4 files, including after documentation build. The first post-docs run had 208 tests because `_site` copied test sources; root-owned `vitest.config.ts` now restricts discovery to required `src/test/*.test.ts`.
- `npm.cmd run lint`: passed after excluding generated `_site` output and setting explicit parser root. This addresses generated files/root ambiguity without relaxing source rules.
- `npm.cmd run build`: passed.
- `npm.cmd run build -- --mode simulated`: passed. Both normal and simulated-mode production bundles were scanned and contain no simulation identity/workspace/store markers.
- `npm.cmd run docs:build`: passed. Existing template navigation/index links still emit unrelated warnings; both new `_site/docs/userGuide/Projects.html` and `_site/docs/developerGuide/Projects.html` exist.
- `openspec validate create-edit-active-projects --strict`: passed for revised simulation artifacts.
- `npm.cmd run dev:simulated -- --host 127.0.0.1`: launched; HTTP 200 and served explicit flag confirmed. Browser automation attempt failed because the browser access host was unavailable; no browser interaction/visual verification is claimed.
- `git diff --check`: passed. The docs builder's own tracked audit change was restored from initial HEAD content; no generated site output is part of the implementation.

New guide topics were necessary because existing landing pages/template content did not cover projects or database setup; both have new guide-tree navigation and landing-page links. No dependency or lockfile changes were needed. Root owns new test-discovery configuration and the minimal lint configuration adjustment.

Overall product change remains incomplete until real backend/auth work and required verification are complete. Simulation cannot prove database authorization, concurrency, transaction atomicity, shared persistence or actual session-expiry behaviour.
