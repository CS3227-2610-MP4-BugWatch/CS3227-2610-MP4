# MP4 token usage pilot

## Question

Does a focused OpenSpec handoff reduce the token usage of designing rate-limit tests while still covering the same required behaviors?

## Method

Ran two fresh, read-only Codex CLI 0.166.0-alpha.6 sessions on Nov 6, 2026, using GPT-6.1 Sol with low reasoning effort in the same BugWatch workspace. Focused ran first. Both arms used the same rule and deliverable, without code edits, test execution, web access, or delegation.

Common task: design exactly six numbered Vitest scenarios with setup, action, and expected outcome. Cover the first three admissions, fourth denial with retry interval and no provider call, exact five-minute cutoff, concurrency across tabs, per-Tester isolation, and upstream failure after dispatch. Use a fake clock and mocked upstream. Both arms received the same rate-limit rule.

- Focused context pointed to the server-enforced generation limit section of the assistant spec and the quota paragraph of its design.
- Broad context assigned BugWatch.md, the Tester and shared release plans, and the full assistant proposal, spec, design, and tasks.

Source for counts was each fresh run's `turn.completed.usage` event from `codex exec --json`. Cached input is already included in total input. Raw event streams stay local because they may contain prompts and tool output.

## Results

| Context | Input tokens | Cached input within input | Uncached input | Output tokens | Total input + output | Elapsed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Focused | 39,438 | 19,200 | 20,238 | 680 | 40,118 | 29.7 s |
| Broad | 120,032 | 81,664 | 38,368 | 989 | 121,021 | 37.0 s |

The focused run used 80,903 fewer total tokens, a 66.9% reduction relative to broad context. Both outputs met all six scenario categories in a manual checklist review. The broad output additionally checked that admitting a request at the cutoff reuses exactly one slot and does not reset the whole window. Neither output was run as a test.

## Interpretation

This is one paired pilot of a test-design task. Both conditions used the same specification. It measures the effect of assigned context scope in these runs and does not estimate project-wide savings, billable cost, or the effect of adopting SDD. Different cache hits and execution order affect interpretation. Repeat with broad first or counterbalance the order across pairs, and keep input, cached input, output, elapsed time, and test quality separate. For an implementation follow-up, use identical acceptance checks and include correction turns in each arm's totals.
