# Tasks

## 1. Contracts and coordination

- [x] 1.1 Coordinator: create `workflow/YYYY-MM-DD-authentication-and-permanent-roles.md` with revision, linked OpenSpec artifacts, confirmed `AuthService`/`AuthContextValue` contracts from `design.md`, exclusive owners and review tracking; verify owners agree on interfaces before parallel source/test work.
- [x] 1.2 Coordinator: reconcile the proposed `public.profiles` contract in `docs/developerGuide/Projects.md` with this design and record migration order for the project change; verify no conflicting identity schema or duplicate client is introduced.

## 2. Trusted identity foundation

- [x] 2.1 Implementer: add an ordered migration under `src/features/auth/database/` for protected `public.profiles`, required identity fields, constrained role and case-insensitive unique username; verify migration applies to an isolated Supabase database after Auth is available.
- [x] 2.2 Tester: add `src/test/auth-profile.test.ts` for runtime profile validation and controlled lookup outcomes, including both roles, missing/invalid fields, mismatched IDs and unavailable service; verify targeted Vitest passes.
- [x] 2.3 Tester: add `src/test/auth-database.test.ts` for configured isolated database checks of duplicate case variants, role/field constraints, authenticated self-read, anonymous read denial and ordinary insert/update/delete denial; verify the integration run with actual account tokens passes, recording an environment gap if unavailable.
- [x] 2.4 Implementer: move the `SessionUser` type to `src/shared/types/session.ts` and re-export it from `src/features/projects/types.ts`; verify existing simulation tests and TypeScript build still resolve the unchanged shape.
- [x] 2.5 Documentation owner: add the Developer Guide authentication topic covering migration order, manual Supabase dashboard account/profile setup, public signup setting, trusted role lookup and permission checks; link it from the landing page and MarkBind navigation, then verify `npm run docs:build` and the generated link.

## 3. Login and session lifecycle

- [x] 3.1 Implementer: add `src/features/auth/authService.ts` using the existing shared Supabase client contract for login, logout, session restoration, event subscription and trusted profile lookup; verify targeted service tests cover error mapping and no caller-supplied roles.
- [x] 3.2 Tester: add `src/test/auth-service.test.ts` with controlled client responses for valid tester/developer login, wrong credentials, service failure, missing/invalid profile, subscription cleanup and signout failure; verify targeted Vitest passes.
- [x] 3.3 Implementer: add `src/features/auth/AuthProvider.tsx` with authenticated/loading/signed-out/incomplete/unavailable states, stale-result protection and cleanup on session loss; verify controlled transition tests and a browser walkthrough.
- [x] 3.4 Tester: add `src/test/auth-session.test.ts` for restoration, no-session load, login/logout, missing profile, transient lookup retry, signout and stale async result ordering; verify targeted Vitest passes without depending on external services.
- [x] 3.5 Implementer: add `src/features/auth/LoginPage.tsx` with email/password input, pending/error feedback and no signup/role controls; verify invalid credentials and retry in a browser walkthrough.
- [x] 3.6 Coordinator: integrate normal-mode authentication in `src/App.tsx` (and `src/main.tsx` only if needed) while preserving the guarded simulation; verify visitor gating, both roles, logout, reload, incomplete-profile message and simulation production exclusion.
- [x] 3.7 Documentation owner: add a User Guide authentication topic for login, logout and incomplete account setup, plus landing and MarkBind navigation links; verify it describes implemented screens and `npm run docs:build` succeeds.

## 4. Combined verification and review

- [x] 4.1 Coordinator: verify the Supabase dashboard has public signup disabled and manual tester/developer identities with valid profiles; exercise the public signup endpoint, account login, missing-profile denial and direct profile mutation attempts against an isolated project, recording actual results or an environment blocker.
- [x] 4.2 Coordinator: run `npm run test -- --run`, `npm run lint`, `npm run build`, and `npm run docs:build`; inspect the combined diff, existing simulation behavior and production exclusion, recording exact outcomes.
- [x] 4.3 Reviewer: independently review every implementer/tester completion or fix submission and the final combined source/tests/docs, returning explicit `approved`, `changes_requested` or `blocked` per submission and combined state; verify findings are resolved and approvals are current.
- [x] 4.4 Coordinator: record final verification, review decisions, unresolved limits and the overall interaction log under `logs/`; verify no unapproved or stale implementation/test submission remains before marking the implementation complete.
