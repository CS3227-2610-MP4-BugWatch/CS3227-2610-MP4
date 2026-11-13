# Project creation CI timing — Test Summary

This summary covers CI-PROJECT-WAIT-1 under [feature plan revision 8](feature-plan.md). The coordinator confirmed that independent reviewer review_evidence_cleanup approved this submission and the combined cleanup and tests.

## Test Design and Requirement Coverage

Equivalence partitioning groups inputs or states expected to behave alike. This change preserves the existing valid padded-input case. Boundary testing checks the edges of an allowed range. No input ranges changed, so new boundary cases were not needed.

| Requirement or risk | Input/state groups and why | Boundaries and negative cases | Expected behavior | Test source and exact names/family | Level and actual status |
| --- | --- | --- | --- | --- | --- |
| Project creation must submit trimmed values and open project details with history loaded. | A developer submits valid padded fields. The mocked project request and nested history request complete separately. | N/A for new boundaries and negative cases because only synchronization changed. Existing negative tests and assertions remain intact. | Creation receives trimmed values, navigation loads the saved project, and history is requested for its ID. The test waits for the visible empty-history message before checking that request. | [project-ui.test.ts](../../src/test/project-ui.test.ts), `projectCreate_validPaddedFields_submitsTrimmedValuesAndNavigatesToDetails` | Mocked UI — Passed in the focused 28-test run. |

## Line and Branch Coverage

Line coverage measures executable lines run by tests. Branch coverage measures decision outcomes exercised. No production files changed or entered this assignment's coverage scope. The coordinator reported independent acceptance of this test-only exception to production coverage targets.

| Production file | Lines covered/total and % | Branches covered/total and % | Uncovered locations and behavior | Target outcome or accepted exception |
| --- | --- | --- | --- | --- |
| None because this submission changes only test synchronization. | Not measured. | Not measured. | N/A because no production behavior changed. | Reviewer-accepted test-only exception, as confirmed by the coordinator. |

No instrumented coverage command ran for this submission. No provider, include/exclude selection, new coverage report or percentage is claimed. Existing permission, validation and recovery cases were preserved.

## Files Added

None. The approved test submission added no test files.

## Files Changed

- [src/test/project-ui.test.ts](../../src/test/project-ui.test.ts) now waits for the visible empty-history state before asserting the history request. The project heading can appear before the nested history effect runs.

## Test Cases Added

None. The existing test already covers the relevant creation behavior.

## Test Cases Changed

- `projectCreate_validPaddedFields_submitsTrimmedValuesAndNavigatesToDetails` now awaits `screen.findByText('No project history is available.')`. All existing assertions remain. The wait observes completed history loading without an arbitrary sleep or changed retry configuration.

## Execution Evidence and Limits

| Exact command/check and revision | Passed | Failed | Skipped | Not run | Evidence and what it establishes |
| --- | --- | --- | --- | --- | --- |
| `npm run test -- --run src/test/project-ui.test.ts` on the CI-PROJECT-WAIT-1 working diff | 28 tests | 0 | 0 | Browser and database checks | Executed by this tester with exit code 0. This establishes mocked project UI behavior. |
| `git diff --check` on the submitted working diff | Passed | 0 | N/A | N/A | Executed by this tester with exit code 0. |
| Coordinator-reported `npm run test -- --run` on the root working state | 1176 tests | 7 tests | 251 tests | N/A | The seven failures involved localhost EACCES restrictions. This was not a clean full-suite pass. |
| Coordinator-reported separate escalated local-API test run on the root working state | 7 tests | 0 | 0 | N/A | The affected local-API tests passed separately. The exact command was not supplied to this tester. |
| Coordinator-reported `npm run lint` and `npm run build` | Both passed | 0 | N/A | N/A | Existing warnings remained. These checks were not executed by this tester. |
| Earlier CI run 43359233640 at 6b12f50 | N/A | Project creation timing assertion | N/A | N/A | Historical failure prompted this synchronization repair. |
| Final candidate CI | N/A | N/A | N/A | Pending | No final CI success is claimed. |

The root working state included 61 unpublished workflow tests, so its counts differ from the candidate. This summary does not claim a current clean full-suite result. Actual browser checks, database checks and seeded-defect testing were not run for this assignment. No production code, dependencies or shared test configuration changed.
