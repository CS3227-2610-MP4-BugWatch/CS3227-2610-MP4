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
