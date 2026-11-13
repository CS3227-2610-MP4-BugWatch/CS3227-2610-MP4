# MP4 token-usage replays

## Method

On 7 November, ran four fresh, read-only Codex CLI sessions in the same BugWatch workspace at `d8a97db`, with GPT-6.1 Sol and low reasoning effort. Each feature pair got the same six-case test-design brief. The broad handoff assigned BugWatch.md, both Tester and shared release plans, and the complete feature proposal, design, tasks and spec. The focused handoff assigned only the relevant requirements and scenarios in that feature's spec. Both arms were instructed to produce six numbered scenarios with setup, action and expected result, without reading implementation or existing tests, editing, executing tests, browsing, or delegating.

Submission ran broad first. Drafts ran focused first. This varies which condition goes first across tasks. The same task was not repeated in both orders. Usage came from the CLI JSON completion events. Cached input is included in input. Tool output sizes are character counts and represent retrieval volume separately from model usage. Raw traces stayed local.

## Recorded results

| Feature and handoff | Order in pair | Input | Cached input | Uncached input | Output | Total | Read calls | Returned characters | Elapsed | Coverage |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Submission broad | 1 | 121,550 | 80,896 | 40,654 | 1,148 | 122,698 | 4 | 183,268 | 41.0 s | 6/6 |
| Submission focused | 2 | 61,858 | 47,104 | 14,754 | 775 | 62,633 | 2 | 9,364 | 29.7 s | 6/6 |
| Drafts broad | 2 | 106,547 | 89,856 | 16,691 | 1,171 | 107,718 | 4 | 113,613 | 41.2 s | 6/6 |
| Drafts focused | 1 | 60,595 | 39,168 | 21,427 | 889 | 61,484 | 2 | 6,155 | 32.0 s | 6/6 |

Total fell by **49.0%** for submission and **42.9%** for drafts. Uncached input fell by **63.7%** for submission and **rose by 28.4%** for drafts. The broad drafts run had more cached input, so the drafts pair illustrates why total tokens and uncached input can move in opposite directions.

## Quality check

- **Submission:** valid Tester submission and trusted metadata, missing severity, Developer denial, archived-project rejection with retained input, rollback if creation history fails, and explicit retry after a failed network request. Both answers covered all six. Broad additionally checked direct persistence validation for empty severity and a second click during an in-flight request. Focused additionally tried to tamper with the saved reporter.
- **Drafts:** incomplete save and resume, denial to another Tester, archived target and reassignment, both unsaved-warning choices, rollback preserving the draft, and same-report retry after a lost response. Both covered all six. Broad also checked the archive race while the form was open and attempted direct submission as another Tester. Focused addressed an already archived target and direct read, update and delete attempts.

## What to say

“In three paired test-design comparisons, the focused handoff used fewer total tokens and covered all six requested scenarios. We also compared the quality details and recorded cached input. For drafts, the focused run actually used more uncached input. That makes total token reduction a clearer claim than savings in billed cost.”

The earlier [Tester assistant pilot](2026-11-06-mp4-token-usage-pilot.md) used a separate quota-design task and recorded a 66.9% total-token reduction. These are retrospective simulations of test design. They cannot reconstruct the cost of the original implementations. Each feature has one pair of runs, the broader answers sometimes contain useful extra assertions, and coverage was reviewed by inspection. A follow-up can use executable test implementation and count correction work through the same verification gate.
