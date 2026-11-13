# {Feature name} — Test Summary

This summary covers the tester's work for {feature name}, as accepted in {approved submission IDs and plan revision}. Explain why the tests were chosen as well as what they check. Use complete, plain-language sentences, source links and exact test names or parameterized families. If a section has no entries, write "None" and briefly explain why.

## Test Design and Requirement Coverage

Use `.agents/skills/explain-software-changes/SKILL.md` for wording and explanations. Preserve exact test names, expected outcomes and verification limits.

Explain equivalence partitioning as grouping inputs or states expected to behave alike, and boundary testing as checking the edges of an allowed range. Describe only techniques actually used. Include actor roles, persistent state, collaborators and request timing when those dimensions matter, not just text inputs. Split rows where cases have different execution outcomes.

| Requirement or risk | Input/state groups and why | Boundaries and negative cases | Expected behavior | Test source and exact names/family | Level and actual status |
| --- | --- | --- | --- | --- | --- |
| {requirement link} | {e.g. active versus archived project} | {e.g. archive after page load; use N/A with reason if no numeric boundary} | {observable result from requirements} | {link and test names} | {pure logic / mocked UI / actual database / browser; Passed / Failed / Skipped / Not run with evidence} |

Use compatible positive cases together where clear; keep distinct negative failures separately diagnosable. Link gaps explicitly instead of treating test count as coverage or inventing a coverage percentage.

## Line and Branch Coverage

Explain that line coverage measures executable lines run by tests and branch coverage measures decision outcomes exercised. State the agreed production-file scope and targets before giving results. The initial workflow target is at least 80% of lines and 80% of branches for each in-scope file; link any different target or reviewer-accepted exception and its risk justification. Include scoped files with no tests. Coverage does not replace meaningful assertions or the requirement-to-test map above.

| Production file | Lines covered/total and % | Branches covered/total and % | Uncovered locations and behavior | Target outcome or accepted exception |
| --- | --- | --- | --- | --- |
| {file link} | {measured values, or Not measured with reason} | {measured values, or provider-reported N/A with reason} | {source locations, risk and follow-up} | {Met / Not met / Not measured; reviewer decision link if applicable} |

Record the exact coverage command, source revision/working diff, test selection, provider/version, include/exclude rules and saved report path. When tooling is unavailable, say Not measured and identify the setup needed. Do not invent percentages. Identify critical permission, validation, data-loss and recovery scenarios and link their allowed/refused or failure/recovery tests even if coverage targets pass. Describe database policy and actual browser verification separately.

## Files Added

- `{path}` was added to test {broad behavior or risk}.

## Files Changed

- `{path}` was changed to {broad change and why it was needed}.

## Test Cases Added

- `{test case title}` in `{path}` was added to check that {behavior or expected result}.

## Test Cases Changed

- `{test case title}` in `{path}` was changed because {reason}; it now checks {behavior or expected result}.

## Execution Evidence and Limits

| Exact command/check and revision | Passed | Failed | Skipped | Not run | Evidence and what it establishes |
| --- | --- | --- | --- | --- | --- |
| {command, commit/working-diff identifier and environment} | {count or N/A} | {count or N/A} | {count or N/A} | {named suites/cases or None} | {output link; mocks, real database and browser results remain distinct} |

{State untested scenarios and prerequisites. Preserve failures and repair/retest results. Identify user-reported checks separately; do not infer their counts. If seeded-defect testing was actually used, record each defect and detection result; otherwise say Not run, not 0% or 100%.}
