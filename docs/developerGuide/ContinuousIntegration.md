---
  layout: default.md
  title: "Continuous integration"
  pageNav: 3
---

# Continuous integration

The unit test workflow at `.github/workflows/unit-tests.yml` runs on every push to `development` and `master`, and for pull requests targeting either branch. It uses Node.js 24, installs the locked npm dependencies with `npm ci`, and runs Vitest once with `npm run test -- --run`. A failed test fails the workflow job.

The ordinary suite does not require Supabase credentials. Hosted authentication and project database tests are skipped unless their isolated test settings are supplied. Run those suites separately against an isolated Supabase project using the instructions in [authentication setup](Authentication.md) and [project development](Projects.md).

## Documentation deployment

The documentation workflow at `.github/workflows/docs-pages.yml` runs on pushes to `master`. It installs dependencies, builds the MarkBind site with the GitHub Pages base path, and deploys the generated site to GitHub Pages.

The unit-test and documentation workflows do not run ESLint, the application production build or hosted database tests. The separate hosted database workflow below runs selected database suites. Run lint and the application build separately; workflow definitions alone do not establish the state of any hosted environment.
## Hosted database workflow

`.github/workflows/hosted-db-tests.yml` runs separately on pushes to `development` and `master`, pull requests targeting either branch, and manual runs. It selects the authentication, project, report, report workflow, and report discussion database suites. Both Docker quota suites are excluded. The existing interactive PowerShell runners remain available for local use.

Add these **repository secrets** under **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
| --- | --- |
| `DB_TEST_URL` | Isolated Supabase project's HTTPS URL. |
| `DB_PRODUCTION_URL` | Production HTTPS URL, used only to reject a matching test origin. |
| `DB_TEST_PUBLISHABLE_KEY` | Isolated project's publishable key. |
| `DB_TEST_SERVICE_ROLE_KEY` | Isolated project's service-role/secret key. |
| `DB_TEST_TESTER_EMAIL` | Confirmed test Tester account email. |
| `DB_TEST_TESTER_PASSWORD` | That Tester's password. |
| `DB_TEST_DEVELOPER_EMAIL` | Confirmed test Developer account email. |
| `DB_TEST_DEVELOPER_PASSWORD` | That Developer's password. |
| `DB_TEST_SECOND_DEVELOPER_EMAIL` | A distinct confirmed test Developer account email. |
| `DB_TEST_SECOND_DEVELOPER_PASSWORD` | That second Developer's password. |
| `DB_TEST_UNASSIGNED_USER_ID` | A separate test Auth user's UUID with no `public.profiles` row. |

Use an isolated project with the applicable migrations and fixtures already provisioned: see [authentication setup](Authentication.md), [project setup](Projects.md), and [report migrations](Reports.md). The three login accounts must have the appropriate profiles. The workflow does not create accounts or apply migrations. These tests write temporary records and restore fixtures; use dedicated test accounts and avoid concurrent local runs against the same project.

Each run validates required settings and different test/production origins, signs in the three accounts for fresh access tokens, masks those tokens, and supplies the existing `AUTH_TEST_*` and `PROJECT_TEST_*` settings directly to Vitest. No local `.env` files or stored access-token secrets are needed. Passwords are removed from the child test environment. Missing settings or failed sign-in fails the job rather than leaving the hosted suites skipped.

The suites run sequentially, and a shared concurrency group prevents overlapping hosted workflow runs against the fixtures. Fork pull requests and Dependabot runs are skipped because they cannot receive these repository secrets. The workflow uses `pull_request`, not `pull_request_target`; only trusted same-repository contributions should have access to this isolated environment. A skipped job is not a passing hosted test run.

To start manually, open **Actions → Hosted database tests → Run workflow** and choose the branch. GitHub requires a `workflow_dispatch` workflow to exist on the default branch before manual triggering is available. Automatic runs use the event's checked-out code. The first real hosted result must be checked after secrets and fixtures are configured; local workflow validation does not establish a passing Supabase run.
