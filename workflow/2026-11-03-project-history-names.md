# Project history display names

## Revision/status

Revision 4. User reports all requested hosted SQL/tests/browser checks successful; remaining issue history renders other users' UUIDs. This record continues `workflow/2026-11-03-projects-integration.md` rev3 and OpenSpec `create-edit-active-projects`. Preserve unrelated edits. The user has now confirmed both correct browser display names and a passing `npm run test:project-db` after migration003. The history-name correction is complete; hosted verification is user-reported, not agent-executed.

## Scope / acceptance

History displays each actor's current profile display_name as escaped text, including other developers' edits. Stable actor_id stays in data for audit identity, but raw UUID is not the visible history label. Missing/blank names display `Unknown user` (current identity can supply its own name). Existing own-profile-only SELECT, roles and mutation permissions must remain unchanged. No broader profile directory or creator/list-label enhancement is included. The original simulation cleanup remains a separate task after the new fix is verified.

## Interfaces and exclusive ownership

Implementer exclusively owns `src/features/projects/types.ts`, `projectRepository.ts`, `ProjectDetailsPage.tsx`, and new `database/003_project_history_names.sql`.

- Extend ProjectHistoryEntry with optional `actorDisplayName?: string | null` to preserve fixture/source compatibility; real adapter returns mapped value from `actor_display_name`. Do not change repository method signatures.
- SQL RPC `public.get_project_history(p_project_id uuid)` returns TABLE(id uuid, project_id uuid, actor_id uuid, occurred_at timestamptz, event text, changes jsonb, actor_display_name text). Security definer, fixed empty search_path/schema qualified references, stable read-only function. Derive auth.uid(); reject no session P1001, no trusted own profile P1002, nonexistent/null target P1005. Join public.profiles only through history.actor_id for requested existing project, left join so missing labels return null; trim/blank->null label only, no profiles writes. Ordered occurred_at/id. Revoke PUBLIC/anon/authenticated/service_role default execute and grant execute authenticated only. Existing authenticated project visibility is all projects/history; archived remains readable. Do not alter migration002/profiles policy or store name snapshots.
- Adapter listProjectHistory retains existing target/UUID validation, calls rpc('get_project_history',{p_project_id:id}), validates array and name null/string, maps actor_display_name to actorDisplayName. Null is valid; malformed/missing names in real RPC data are unavailable schema/response errors, not silent client lookup. Reuse safe error mapping. No extra from('profiles') requests.
- UI history actor label first uses nonblank entry.actorDisplayName, then current user name if matching actorId, else `Unknown user`. Render through normal React text, never HTML. Existing creator metadata stays unchanged.

Tester exclusively owns existing `src/test/project-repository.test.ts`, `project-ui.test.ts`, `project-database.test.ts`. Update history response fixtures/assertions for RPC; add other-user name regression, same/current name, blank/missing fallback, escaped markup, identical display names distinct actor IDs, malformed RPC names/error mapping. Hosted cases validate developer/tester history includes another actor's current display_name; RPC denies anon, bad-profile and missing target if available; direct profiles read remains own-only. No source/config edits; no live requests by default. Coordinate any contract changes before edits.

Coordinator owns OpenSpec/task/design changes, guides/logs and records user-reported preceding checks without rerunning/claiming them. No new dependencies or runtime simulation deletion in this narrow fix.

## Execution / checks

Spawn implementer/tester concurrently after contract. Run tests/lint/build/docs:build and strict OpenSpec validation. Independent reviewer must explicitly approve NAMES-IMPL-1 and NAMES-TEST-1 and combined current source; fixes require new submissions/re-review. User applies additive003 to test and reruns test:project-db + checks other actor labels. Do not silently rerun old create-table migrations against existing schema.

## Handoffs/review/verification

- Follow-up user verification: history now shows display names instead of user IDs. Record this as a successful user-reported browser check of the correction. The user subsequently explicitly confirmed a passing post-003 `npm run test:project-db`; task3.8 is complete. No application/test code changed during this status update.

- NAMES-IMPL-1: implementer submitted the four assigned source/migration files against revision 4. Build/lint passed; provisional targeted tests had one stale UUID expectation, subsequently updated by tester. Independently approved by `history_names_review`.
- NAMES-TEST-1: tester submitted the three assigned test files against revision 4. Targeted tests: 78 passed, 45 hosted skipped; lint/build passed. Missing-profile hosted denial is not exercised because the project suite provisions only trusted-profile accounts. Independently approved by `history_names_review`.
- Coordinator final checks: full Vitest 244 passed, 63 skipped (gated hosted suites); lint, TypeScript/Vite build, MarkBind build and strict OpenSpec validation passed. MarkBind retained existing template-link/nested dependency documentation warnings. The preexisting audit log bytes were preserved.
- Reviewer `history_names_review` explicitly approved both submissions and the combined source/tests/docs/artifacts for local delivery. Resolved stale guide statements about preceding verification and clarified null-name versus malformed-schema behaviour; documentation build passed again. No remote SQL or new hosted pass is claimed. User reported previous requested checks successful, as distinct from agent-executed results. Task3.8 is now complete based on the subsequent user-reported hosted/browser checks. Simulation cleanup remains separately tracked.
