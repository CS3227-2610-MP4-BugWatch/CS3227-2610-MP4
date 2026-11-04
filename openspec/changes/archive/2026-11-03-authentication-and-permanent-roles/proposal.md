# Proposal

## Why

BugWatch has a shared Supabase client and a development-only project simulation, but no real login or trusted application identities. Authentication and permanent roles are prerequisites for connecting projects and subsequent report workflows to real persistence and permissions.

## What Changes

- Add email/password login and logout for pre-created tester/developer accounts, session restoration on reload, and shared authentication state with loading and recoverable-error handling.
- Establish `public.profiles` as the authoritative application identity source: Auth user ID, fixed username, display name, and exactly one permanent `tester` or `developer` role. Enforce case-insensitive username uniqueness.
- Block application access for missing or invalid profiles with "Account setup incomplete—contact the administrator." Never infer a default role or create a profile from browser input.
- Protect identity records at the database boundary: ordinary users cannot create, modify, or delete them in this feature. Derive authorization from trusted profile data, not editable Auth user metadata or UI controls.
- Keep account provisioning manual through the Supabase dashboard. Document creation of both Auth and profile records, disabled public signup, and setup verification; introduce neither a provisioning script nor an administrator UI.
- Expose session-loss/logout cleanup and a compatible shared identity contract for consuming features, while preserving the explicitly enabled development simulation.
- Keep one-hour refresh-based inactivity timeout configuration and its verification in the separate session-expiry feature. This change reacts to session loss but does not introduce an interaction timer, purchase a plan, or claim the timeout is delivered.

## Capabilities

### New Capabilities

- `authentication`: Pre-created email/password account access, session lifecycle, trusted permanent identities, profile validation, and protected identity provisioning.

### Modified Capabilities

None. The main capability inventory is empty. The in-flight `create-edit-active-projects` change consumes this prerequisite; its project requirements are not changed here.

## Impact

- Application: authentication feature code under `src/features/auth/`, shared identity types under `src/shared/`, and coordinator-owned application entry/routing integration. Reuse `src/shared/lib/supabaseClient.js` and installed Supabase/React/React Router dependencies.
- Database: versioned identity migrations under `src/features/auth/database/`, applied before future project migrations; protected profiles, constraints, read access and trusted role lookup. No project/report schema or hosted provisioning is included in this planning request.
- Compatibility: preserve the existing `SessionUser` shape and a compatibility type export from project types; publish concrete bindings for the project change without implementing its real repository or screens.
- Verification: deterministic Vitest tests in `src/test/*.test.ts`, controlled real Supabase permission/auth checks, browser interaction checks with suitable local tooling, existing simulation regressions, lint, build, documentation build, and independent implementation/test review.
- Documentation: dedicated authentication User and Developer Guide topics with navigation, manual dashboard provisioning and integration guidance; reconcile the existing project guide's identity assumptions when implemented.
- Exclusions: public registration, role switching/changes, profile pages/display-name editing, password-recovery/change flows, administrator UI, account-provisioning scripts, one-hour timeout setup/testing, project persistence, report workflows, deployment, and subscription purchases. Password recovery is not added by this change; it is not declared permanently excluded from the product.
