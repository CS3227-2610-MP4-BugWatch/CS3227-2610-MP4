# Agent Interaction Log

## User Prompt

Write and store a local script that initializes the isolated authentication integration-test environment, and add an integration-test command.

## Steps Taken

Inspected the existing hosted profile tests, local environment-file names, npm scripts, and authentication developer guide. Added a PowerShell runner at the repository root and an explicit npm script. Extended the existing Developer Guide authentication topic with its required local settings and usage. Updated the authentication workflow record to revision 6 and obtained independent review.

## Reasoning Summary

The hosted suite performs temporary profile writes and therefore needs an explicit isolated-project opt-in. The runner generates short-lived user tokens immediately before the suite, keeps account passwords out of files and output, and restores its process environment after the run. Ordinary tests remain independent of the hosted project.

## Changes Made

- `run-auth-db-tests.ps1`: reads ignored test-project settings, validates isolated URL and fixture ID, prompts for the elevated key and account passwords, signs in tester/developer accounts, and runs the existing hosted suite.
- `package.json`: adds `npm run test:auth-db`.
- `docs/developerGuide/Authentication.md`: documents the runner and local configuration.
- `workflow/2026-11-03-authentication-and-permanent-roles.md`: records the new workflow and reviewer decision.

## Verification

PowerShell parser accepted the script. `npm.cmd run test:auth-db` stopped with the expected missing `AUTH_TEST_ISOLATED=true` message before any hosted request. `npm.cmd run test -- --run` passed 164 tests with 18 hosted checks skipped. `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run docs:build` passed. `git diff --check` found no whitespace errors. An independent reviewer approved the runner, npm command, and documentation with no actionable finding; the updated combined authentication feature remains blocked on hosted and browser evidence. The real isolated database tests were not run because local opt-in and fixture settings were not yet supplied.

## Final Output and Conclusion

The local integration-test command is ready to use after the isolated settings and accounts are configured. No credential, token, or project key was added to tracked files. The overall authentication change remains incomplete until hosted and browser checks run and final combined review is approved.
