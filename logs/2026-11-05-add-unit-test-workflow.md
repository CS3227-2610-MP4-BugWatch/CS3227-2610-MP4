# Agent Interaction Log

## User Prompt

Add a GitHub Actions file that runs Vitest unit tests on every push to `development` and `master`.

## Steps Taken

- Inspected the existing GitHub Pages workflow, npm scripts, Vitest configuration, hosted test opt-in rules, and Developer Guide layout.
- Added a unit test workflow using the repository's existing checkout/setup-node action versions and Node.js 24.
- Added a Developer Guide topic and navigation entry for the new CI workflow.
- Parsed the workflow YAML, ran the ordinary Vitest suite, built the documentation, and checked generated navigation.

## Reasoning Summary

`npm ci` installs the lockfile-resolved dependencies in CI. `npm run test -- --run` executes Vitest once. The hosted Supabase tests are deliberately opt-in and remain skipped without isolated credentials. A dedicated Developer Guide topic explains this development workflow; its new page is linked from the guide landing page and MarkBind navigation.

## Changes Made

- `.github/workflows/unit-tests.yml`: run tests on pushes to exactly `development` and `master`.
- `docs/developerGuide/ContinuousIntegration.md`: explain the workflow and hosted test scope.
- `docs/developerGuide/DeveloperGuide.md` and `_markbind/layouts/default.md`: link the new topic.
- This interaction log.

## Verification

- Parsed the workflow with `js-yaml` and checked its push branches and test command: passed.
- `npm.cmd run test -- --run`: 185 tests passed; 63 hosted tests skipped.
- `npm.cmd run docs:build`: passed with existing documentation warnings.
- Confirmed `_site/docs/developerGuide/ContinuousIntegration.html` was generated and linked in the navigation.
- `git diff --check`: passed before the final documentation adjustment; no whitespace issues were introduced by that adjustment.
- The GitHub-hosted workflow has not run yet because the file has not been pushed to a triggering branch.

## Final Output and Conclusion

The workflow and Developer Guide update are ready for review. Existing unrelated working-tree changes were preserved.
