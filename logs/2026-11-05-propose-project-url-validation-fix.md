# Agent Interaction Log

## User Prompt

The user asked for a proposed solution after confirming that a malformed project URL was saved directly in a test Supabase project and later rejected by the BugWatch edit form.

## Steps Taken

- Clarified that Supabase stored `https://xn--♥.com/repo` and the app rejected it when editing the project.
- Revisited the SQL validator, browser validator, and existing project database tests from the preceding review analysis.
- Developed a database-first fix and regression-test approach without modifying application code.

## Reasoning Summary

The database accepts writes that bypass browser validation, so the database constraint must reject malformed hosts. A label starting with the ASCII Compatible Encoding prefix `xn--` cannot also contain raw non-ASCII characters. Rejecting that case addresses the confirmed example without removing support for other valid internationalized hostnames. Existing rows require a separate cleanup step because changing the validation function does not automatically recheck stored rows.

## Changes Made

- Added this interaction log only. No application, migration, test, or guide files were changed.

## Verification

- The user reported the hosted Supabase create-and-edit reproduction. The agent did not independently run a hosted database test in this turn.
- No test, lint, or build commands were run in this turn.

## Final Output and Conclusion

Propose rejecting malformed ACE labels in the database validator, testing both RPC and direct table paths, cleaning affected rows, and then adding a validated constraint for existing data. Review the broader URL parity policy separately if more cases appear.
