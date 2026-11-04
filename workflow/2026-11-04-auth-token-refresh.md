# Auth token refresh fix

Status: complete after independent review. Revision: 1.

## Scope and acceptance

Fix the auth-only PR review finding: a background Supabase `TOKEN_REFRESHED` event for the already authenticated user must preserve the current authenticated snapshot and mounted UI, without another profile lookup. A missing session must still remove protected identity immediately. A different user must still resolve a trusted profile, and stale lookups must not overwrite a newer auth state. Preserve the current explicit retry and sign-out behavior. Project management and database policy changes are outside this task.

## Existing implementation and contract

`src/features/auth/authService.ts` currently discards the Supabase event type. `src/features/auth/authSession.ts` clears identity for every non-null event. `AuthProvider` exposes the controller through `useSyncExternalStore`; `AuthenticatedApp` renders loading instead of authenticated content when that state changes. Existing Node-only Vitest suites in `src/test/auth-service.test.ts` and `src/test/auth-session.test.ts` cover service forwarding, restoration, stale lookup, sign-out, and errors.

Change `AuthService.onAuthStateChange` to accept `(event: AuthChangeEvent, session: Session | null) => void` using Supabase's exported event type, and forward both values unchanged. In the controller, `TOKEN_REFRESHED` with a non-null session whose `session.user.id` matches the current authenticated user's ID is a no-op: no revision increment, state publication, or profile lookup. For a null session, immediately publish signed out. For a different user, run the existing fail-closed profile resolution. Other event behavior stays within the existing controller contract. Keep Supabase's callback synchronous and defer profile work as before.

## Ownership and work

- Implementer owns only `src/features/auth/authService.ts` and `src/features/auth/authSession.ts`. Update the service callback contract and controller logic. Do not edit test, guide, workflow, or log files.
- Tester owns only `src/test/auth-service.test.ts` and `src/test/auth-session.test.ts`. Update event-emission helpers and existing tests for the new callback contract; add deterministic regressions for same-user refresh preserving the snapshot with no lookup/publication, null refresh/session loss clearing identity, and different-user refresh loading a trusted identity. Preserve existing race and sign-out coverage.
- Coordinator owns this plan, guide edits, overall log, integration checks, and review routing. Update the existing authentication guide topic pages after behavior stabilizes; no new navigation is expected.

Each writer preserves unrelated working-tree changes. Subagents must read this plan and `workflow/instructions/handoffs.md` before editing, must not spawn subagents, and must report changed files, actual commands/results, risks, and documentation needs. Send blockers or contract changes promptly.

## Verification and review gate

Run relevant Vitest tests, then `npm run test -- --run`, `npm run lint`, `npm run build`, and `npm run docs:build` after guide edits. Capture actual outcomes. Review each implementer/tester completion report and the combined change through an independent reviewer; require explicit approval before marking complete. Inspect the final diff and keep the unrelated project working-tree edits intact.

## Submissions, review, and final verification

AUTH-IMPL-1: implementer changed `authService.ts` and `authSession.ts` under revision 1, forwarding typed auth events and preserving same-user authenticated state on `TOKEN_REFRESHED`. The agent reported scoped ESLint and `git diff --check` passing. The independent reviewer approved this submission.

AUTH-REFRESH-T1: tester changed `auth-service.test.ts` and `auth-session.test.ts` under revision 1, updating event helpers and covering forwarding, same-user refresh stability, null session, different user, and signed-out refresh. The agent reported 33 targeted tests passed and scoped `git diff --check` passing. The independent reviewer approved this submission.

Coordinator extended the existing authentication User Guide and Developer Guide topics to describe the implemented behavior. No new guide page or navigation was needed. Combined working-tree checks after integration: `npm.cmd run test -- --run` passed (185 tests passed, 63 skipped across 11 files); `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run docs:build` passed. The documentation build emitted existing unrelated missing-link/asset warnings. These counts cover the shared working tree, including separate project work, and are not the earlier authentication-only PR's 60 passed/18 skipped snapshot.

Independent reviewer decisions against revision 1 and the integrated state: AUTH-IMPL-1 **approved**; AUTH-REFRESH-T1 **approved**; final combined implementation, tests, and scoped guide additions **approved**. The reviewer found no actionable finding, independently inspected source, tests, consumers, and documentation, and reported a passing scoped `git diff --check`. The reviewer confirmed that the unchanged controller snapshot prevents the auth provider from showing loading and unmounting authenticated content for a same-user refresh.

Coordinator inspected the scoped diff and ran `git diff --check` on the changed source, tests, and guide topics successfully. No live Supabase refresh or browser walkthrough was run for this fix; the reviewer approval covers the mocked event/controller path and UI wiring. Unrelated project work remains outside this task.
