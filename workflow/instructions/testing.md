# Testing Instructions

Read before planning, writing, or reviewing tests and test coverage. These requirements apply to the tester, implementer or coordinator writing tests, and reviewers assessing coverage.

## Testing

Write all automated tests using Vitest in `src/test/*.test.ts`.

New behaviour should be accompanied by appropriate tests unless it cannot reasonably be tested automatically. Bug fixes should include a regression test when practical.

### Test Case Design

Functions requiring testing should have tests covering relevant equivalence partitions. Consider more than explicit parameters:

- Component or target-object state.
- Relevant collaborating objects.
- Persistent state.
- Application state.
- Global state accessed by the function.

Use Boundary Value Analysis (BVA) where boundaries exist.

Compatible positive conditions may be combined when this does not obscure the behaviour under test. Test negative conditions separately when this makes failures easier to diagnose. Do not combine unrelated failure conditions into one test.

### Test Naming

Use descriptive Vitest test titles identifying the operation, relevant input or state, and expected outcome. Preserve the source convention where applicable:

```text
<functionName>_<inputOrState>_<expectedOutcome>
```

### Test Quality

Tests must:

- Be deterministic and independent where practical.
- Test observable behaviour rather than implementation details.
- Contain meaningful assertions.
- Avoid depending on execution order.
- Avoid external services unless explicitly testing an integration.

Do not modify a valid test simply because the implementation fails it. Determine whether the implementation or test is incorrect before making changes.

Do not assume a browser-like test environment or component-testing library is installed or configured. Inspect the current setup before using environment-specific APIs.

### Explain Test Selection and Evidence

Include a compact requirement-to-test map in the test handoff and final tester summary using `workflow/templates/tester-summary-template.md`. Explain the actual equivalence partitions, boundaries, separate negative cases and relevant actor/state/timing dimensions in simple English. Name the observable expected outcome and exact test names or parameterized families. Use N/A with a reason where a technique does not apply rather than manufacturing numeric boundaries.

Keep pure logic, mocked UI, actual database and browser evidence distinct. Label each result Passed, Failed, Skipped or Not run and link actual output and the tested revision. Split mixed outcomes into separate rows. A skipped integration suite and a passing build do not establish database or browser correctness. Preserve meaningful failures and repair results; do not use raw test counts as a substitute for behavior coverage.

### Line and Branch Coverage

For feature implementation or bug-fix assignments, the coordinator and tester agree on the production-file coverage scope before writing tests. Use an initial project target of at least 80% line coverage and 80% branch coverage for each in-scope file. This is a local starting target, not a universal quality standard. Do not impose it retroactively on unrelated legacy files. A different target or an exception needs a documented risk-based reason and explicit independent reviewer acceptance; it must not silently become a pass.

Explain line coverage as the proportion of executable lines run by tests, and branch coverage as the proportion of decision outcomes exercised. Neither proves that assertions are correct or requirements are complete. Explicitly test important permission, validation, data-loss and recovery decisions even when numeric targets already pass. Cover their relevant allowed and refused outcomes; numeric coverage of JavaScript does not establish SQL policy coverage or live browser correctness.

Run instrumented coverage when compatible tooling is available. Include every agreed production file, including unimported files with no tests, rather than reporting only files touched by the test run. Preserve the exact command, revision or working-diff identifier, test selection, provider/version, include/exclude rules, per-file covered/total lines and branches, percentages, report path and uncovered locations. Explain uncovered behavior and any accepted exception. Do not exclude difficult paths, weaken assertions, or add assertion-free tests to reach a number.

Coverage setup changes and dependencies remain coordinator-owned. If coverage tooling is absent or a run fails, report coverage as Not measured with the reason and required follow-up; do not infer a percentage from passing tests or describe the target as met. Use `npm run test:coverage` for the configured V8 baseline report of application and API source, including unimported files. Generated reports are in ignored `coverage/`; preserve relevant run evidence in the assigned workflow directory. Baseline reporting has no retroactive global threshold and is not a CI gate. For feature acceptance, pass the agreed file patterns and per-file thresholds explicitly as described in the Developer Guide. A feature cannot claim coverage acceptance until measured targets or explicit reviewer-accepted exceptions are recorded.
