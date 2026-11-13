# MP4 coding token pilot

## Question and setup

Does a focused OpenSpec handoff use fewer Codex tokens when the agent actually writes code?

On 7 November, ran two fresh GPT-6.1 Sol sessions at low reasoning effort, broad first. Both worked in separate temporary folders with identical copies of the same seven BugWatch planning documents and no existing implementation. Both had the same instructions, writable workspace and TypeScript contract. The broad arm was asked to read the whole briefing. The focused arm was asked to retrieve the quota requirement and design paragraph.

Task: write only `quota.ts` exporting a pure `decideQuota(attempts, nowMs)` function. Admit if fewer than three previous dispatched attempts are strictly inside the last 300,000 ms. Otherwise return the time until enough attempts expire. Inputs can contain duplicates or be unsorted. Preserve the input array. No provider calls, persistence, or changes to BugWatch.

The same checker was added by the coordinator after each agent finished, so neither session could read the cases. It checked empty and two-attempt windows, fourth-attempt denial, one millisecond before the cutoff, the exact cutoff, one slot freed, unsorted input, duplicate timestamps, old attempts, and over-limit stored history. It also froze inputs and checked preservation. Both programs were reviewed by inspection and ran the same checker successfully. There were no correction turns.

## Results

| Handoff | Input | Cached input | Uncached input | Output | Total | Elapsed | Checks |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Broad | 179,172 | 146,432 | 32,740 | 573 | 179,745 | 47.4 s | 10/10 |
| Focused | 103,759 | 71,424 | 32,335 | 553 | 104,312 | 28.9 s | 10/10 |

Total fell by 75,433 tokens, or **42.0%**. Uncached input fell by 405 tokens, or **1.2%**. Input includes cached input. The counts are from each CLI JSON completion event. Broad read the full documents and reread some product and release material. Focused retrieved the quota sections. Both implementations filter out expired attempts and calculate the next slot from the third-newest remaining attempt.

## Interpretation

This extends the [test-design comparisons](2026-11-07-mp4-token-usage-replays.md) to actual code and executable checks. The defensible claim is a reduction in total tokens on one bounded TypeScript task. The uncached input result is almost flat. Actual billing and production integration are separate questions. The function does not test authentication, atomic reservations across instances, provider calls, or server deployment. One pair with broad first is insufficient to isolate the effect of cache and run order. The implementations stayed in temporary folders and were not added to the application.
