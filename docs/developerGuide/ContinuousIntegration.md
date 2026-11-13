---
  layout: default.md
  title: "Continuous integration"
  pageNav: 3
---

# Continuous integration

The unit test workflow at `.github/workflows/unit-tests.yml` runs on every push to `development` and `master`, and for pull requests targeting either branch. It uses Node.js 24, installs the locked npm dependencies with `npm ci`, and runs Vitest once with `npm run test -- --run`. A failed test fails the workflow job.

The ordinary suite does not require Supabase credentials. Hosted authentication and project database tests are skipped unless their isolated test settings are supplied. Run those suites separately against an isolated Supabase project using the instructions in [authentication setup](Authentication.md) and [project development](Projects.md).

The documentation workflow at `.github/workflows/docs-pages.yml` runs on pushes to `master`. It installs dependencies, builds the MarkBind site with the GitHub Pages base path, and deploys the generated site to GitHub Pages.

These workflows do not run ESLint, the application production build, or hosted database tests. Run those checks separately as appropriate; the workflow definitions alone do not establish the state of any hosted environment.
