# Design

## Context

See `proposal.md` and `specs/authentication/spec.md`. `src/App.tsx` currently shows an unconfigured shell except under explicit development simulation. `src/shared/lib/supabaseClient.js` already exports one configured Supabase client. `src/features/projects/types.ts` owns a provisional `SessionUser` shape and the project change waits for real auth/roles. There is no identity migration or real auth UI. Vitest runs `src/test/*.test.ts` without a browser environment.

## Goals / Non-Goals

**Goals:** Provide one trusted identity contract and an auth lifecycle usable by project/report features. Enforce identity immutability and authorization at the database boundary. Preserve the existing opt-in simulation and avoid real credentials in source.

**Non-Goals:** Implement project persistence or project routes, a general account-management layer, password recovery, profile editing, or the one-hour Supabase session-limit setting.

## Decisions

### Identity data and database authority

Add an ordered migration under `src/features/auth/database/` for `public.profiles`: `id` UUID primary key referencing `auth.users(id)`, required nonblank `username` and `display_name`, and role constrained to `tester | developer`. Add a unique index on case-folded username; preserve entered case for display. The Auth account and profile are created manually in the Supabase dashboard. Enable RLS and grant the client only the profile read access needed to resolve its own identity; deny ordinary insert/update/delete. Future features must determine actor via `auth.uid()` and role from protected `public.profiles`, not from request parameters or user-editable Auth metadata. A missing profile fails closed. Database grants/policies must be tested with ordinary account tokens, including direct writes.

Alternative: store role in `user_metadata` or infer it in the browser. Rejected because users can control client input and user metadata. Alternative: a provisioning script or administrator UI. Deferred by the product owner's manual dashboard choice. The migration should not create real account rows or hold secrets.

### Shared identity and auth contracts

Move the shape of `SessionUser { id: string; username: string; displayName: string; role: 'tester' | 'developer' }` to `src/shared/types/session.ts`; re-export it from `src/features/projects/types.ts` so the simulation's existing import stays valid. This is a type/interface move, not a role-changing API.

`src/features/auth/authService.ts` exports `createAuthService(client: SupabaseClient): AuthService`. `AuthService` exposes `getCurrentSession(): Promise<Session | null>`, `signIn(email: string, password: string): Promise<void>`, `signOut(): Promise<void>`, `loadIdentity(authUserId: string): Promise<SessionUser>` and `onAuthStateChange(callback: (session: Session | null) => void): () => void`. `Session` is the installed Supabase session type. Calls use the existing shared client in production; tests inject a controlled client. `loadIdentity` reads only the matching profile and checks ID, nonblank username/display name and known role at runtime. It rejects missing/invalid data with `AuthError('incomplete_profile')`, service failures with `AuthError('unavailable')`, and an HTTP 401/expired-session rejection with `AuthError('session_lost')`; invalid credentials use `AuthError('invalid_credentials')`. `signOut` surfaces an error if Supabase refuses logout rather than falsely reporting success. No service method accepts caller-supplied role or actor for mutation.

`src/features/auth/AuthProvider.tsx` exposes `useAuth(): AuthContextValue` with discriminated `status: 'loading' | 'signed_out' | 'authenticated' | 'incomplete_profile' | 'unavailable'`, `user: SessionUser | null`, and `signIn`, `signOut`, `retry` actions. Only `authenticated` has non-null `user`. Initial restoration and auth events each resolve the profile before exposing protected content. Ignore stale async profile results when a later auth event changes the session. On signout/session loss, including a rejected profile request, synchronously remove the authenticated user and unmount protected feature content, clearing its in-memory state. A retry reloads profile after transient failure; missing/invalid profile shows the agreed setup message and no role. Consumer features may use `useAuth` but must enforce permissions in their database operations too.

Alternative: have each page call Supabase independently. Rejected because it risks inconsistent loading, identity and cleanup. The provider is the shared lifecycle boundary, not a database authorization boundary.

### UI and integration

`src/features/auth/LoginPage.tsx` handles email/password input, pending state and error display, without signup or role controls. `src/App.tsx` retains its guarded dynamic simulation import and renders the real auth provider/screen only in normal mode. Keep protected application content behind the provider's authenticated state. `src/main.tsx` only changes if integration requires it. Reuse the existing client module; credentials stay in local ignored `.env`, with a publishable key only. Configure Supabase Auth to disable public signup in the dashboard and verify the public endpoint is denied; hiding signup UI is insufficient.

### Ownership and test interface

Before parallel implementation/test work, the coordinator records this exact contract and exclusive paths in `workflow/YYYY-MM-DD-authentication-and-permanent-roles.md`. Implementer owns auth source, migration and the shared type; tester owns `src/test/auth-*.test.ts`. Coordinator serializes `src/App.tsx`, `src/main.tsx`, shared config and any lockfile changes. Documentation owner handles auth topics/navigation after behavior stabilizes. Vitest uses controlled Supabase responses to test service/provider transitions, while an isolated configured Supabase project verifies real Auth settings, RLS, constraints, direct-write denial and both roles. Browser checks cover reload/logout and the incomplete-profile screen. The existing `supabase-client.test.ts` and simulation tests remain regression checks.

## Risks / Trade-offs

- Manual creation can leave an Auth account without a profile -> fail closed with the setup message and document a dashboard checklist.
- A transient profile read failure can resemble incomplete setup -> distinguish service errors from missing/invalid records and allow retry.
- Cached session/UI state can outlive a signout event -> clear the user immediately and unmount protected children; verify stale request results are ignored.
- Auth client access tokens may remain valid until expiry -> do not claim instant server-side revocation or the later inactivity requirement; database policies remain the authority for role actions.
- Concurrent project work may assume another profile schema -> bind and reconcile its proposed columns/migration order before project database integration.

## Migration Plan

1. Apply identity migration to a controlled Supabase project before project migrations. Configure public signup disabled; use only a publishable key in the browser.
2. Manually create Auth test accounts and matching profiles in the dashboard. Verify one tester, one developer, missing-profile denial, duplicate username rejection and ordinary-user write denial before enabling protected application flows.
3. Deploy application auth integration after checks and guide updates. Existing development simulation remains explicitly opt-in and never appears in production.
4. If migration must be rolled back before dependent tables exist, stop serving protected flows and remove the identity objects through a reviewed database rollback. Once project foreign keys depend on profiles, coordinate rollback with those migrations; do not drop profiles independently.
