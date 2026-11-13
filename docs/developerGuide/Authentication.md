---
  layout: default.md
  title: "Authentication and account setup"
  pageNav: 3
---

# Authentication and account setup

BugWatch authenticates administrator-created accounts with Supabase Auth email and password. The browser resolves the application identity from `public.profiles`, rather than from user-editable Auth metadata. The [User Guide](../userGuide/Authentication.md) describes the login screens.

The migration is supplied in the repository. The user reported that the isolated Supabase profile integration suite passed against a separate test project; this does not establish the configuration of any other hosted project. Apply and verify the migration in each target environment before using it there.

## Configure the project

1. In the Supabase dashboard, disable public signup in the Auth settings. Hiding the registration screen alone does not disable the public signup endpoint.
2. Once Supabase Auth is available, apply `src/features/auth/database/001_profiles.sql` using the dashboard SQL editor or your reviewed migration process. Apply it before any future project migration that references `public.profiles`.
3. Configure the existing shared browser client with the project URL and a publishable key as described in the [project development guide](Projects.md). Restart Vite after changing environment variables. Never place a secret or service-role key in browser configuration.

### Profile schema and permissions

The migration creates `public.profiles` with an `id` referencing `auth.users.id`, nonblank `username` and `display_name`, and a role of `tester` or `developer`. A unique index compares usernames using `lower(username)`. Row-level security and grants permit authenticated users to read only their own profile; ordinary clients receive no insert, update, or delete grant. Account and profile provisioning requires an administrator with appropriate dashboard access.

## Create an account and profile

For each person, use the Supabase dashboard to create an email/password user under Authentication. Record the generated Auth user ID. In the Table Editor, create the corresponding `public.profiles` row with:

| Column | Value |
| --- | --- |
| `id` | The exact Auth user ID |
| `username` | A nonblank, administrator-set username unique ignoring case |
| `display_name` | A nonblank name shown in BugWatch |
| `role` | Exactly `tester` or `developer` |

Provide the account credentials through your established secure process. The normal application has no signup, role selector, or profile editor. A missing, mismatched, or invalid profile blocks access and displays the setup-incomplete message. Correct the profile through the administrator workflow rather than assigning a browser-side default role.

## Identity and authorization boundary

### Identity resolution

`src/features/auth/authService.ts` uses the shared Supabase client to restore sessions, sign in and out, subscribe to auth events, and read the matching profile. It validates the returned ID and fields before exposing a `SessionUser` from `src/shared/types/session.ts`. `AuthProvider` supplies loading, signed-out, authenticated, incomplete-profile, and unavailable states. A session loss removes the authenticated user and unmounts protected content; a temporary profile lookup failure offers a retry.

### Authentication events

The auth service forwards both the Supabase event type and session to the session controller. `TOKEN_REFRESHED` and `SIGNED_IN` events for the currently authenticated user preserve the existing identity and mounted content without repeating the profile lookup. Supabase can emit `SIGNED_IN` when a tab regains focus.

A missing session still clears identity immediately, while a session for a different user must pass the trusted profile lookup before protected content is shown.

### Database authorization

The browser state is not the authorization boundary. Database operations for later features must derive the actor from `auth.uid()` and look up its role in protected `public.profiles`. Do not accept an actor ID or role supplied by the caller, or rely on editable Auth user metadata. See the [project handoff](Projects.md) for the pending project database contract.

## Verify an isolated setup

Before enabling protected flows, use an isolated Supabase project and test accounts to verify:

1. Public signup through the Auth endpoint is rejected when signup is disabled.
2. A manually created Tester and Developer can each log in and see their assigned identity. A valid Auth user without a profile is blocked with the setup-incomplete message.
3. Duplicate usernames differing only by case and invalid or blank required fields are rejected.
4. An anonymous client cannot read profiles; an authenticated account can read its own profile and cannot read another account's profile. Ordinary accounts cannot insert, update, or delete profile rows, including changing a role or username.
5. Reload restores a valid session; logout and an auth session-loss event return to login and clear protected in-memory content.

Run these checks with ordinary account tokens as well as administrator setup access. The database checks and public signup setting require a configured isolated project; local unit tests cannot prove the hosted configuration or its permissions. The separate session-expiry feature owns the one-hour inactivity setting and its verification.

### Run the profile integration tests

On Windows, the repository's `npm run test:auth-db` command runs the hosted `src/test/auth-database.test.ts` suite. It keeps the ordinary `npm run test -- --run` independent of Supabase. The command reads the ignored `.env.auth-test.local` file, obtains fresh tester and developer access tokens, sets the `AUTH_TEST_*` variables for the test process, and restores the previous process environment when it finishes. It does not provision accounts or apply the migration.

#### Test configuration

Add these settings to `.env.auth-test.local` after creating the three Auth accounts and the two matching profiles described above:

```dotenv
VITE_SUPABASE_URL=https://your-isolated-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-isolated-project-publishable-key
VITE_ENABLE_SIMULATION=false
AUTH_TEST_ISOLATED=true
AUTH_TEST_UNASSIGNED_USER_ID=uuid-of-auth-user-with-no-profile
AUTH_TEST_TESTER_EMAIL=tester-account@example.com
AUTH_TEST_DEVELOPER_EMAIL=developer-account@example.com
```

#### Credentials and isolation

The two email settings are optional; the runner prompts for either one if omitted. It always prompts for account passwords. It also prompts for the test project's secret/service-role key unless `AUTH_TEST_SERVICE_ROLE_KEY` is already set in the terminal environment.

Keep that elevated key out of every `VITE_` variable and out of source control. The runner rejects a test URL matching the normal `.env` URL and requires `AUTH_TEST_ISOLATED=true` before making hosted requests. From the repository root, run:

```powershell
npm run test:auth-db
```

#### Execution and cleanup

The runner requires PowerShell and the repository's installed npm dependencies. Refresh the account passwords or confirmation status if sign-in fails; access tokens are generated on each invocation and are not saved to a file. The test suite makes temporary profile writes in the isolated project and restores its fixture rows after each check. Run the normal test, lint, build, and documentation commands separately for the full repository verification.
