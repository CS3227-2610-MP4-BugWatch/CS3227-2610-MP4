# Better Exploration and Focused Handoffs — Evaluation

Status on 11 November 2026: **all 16 planned initial generations completed successfully**, forming eight paired comparisons. Independent masked assessment accepted every artifact under the frozen semantic-coverage checks. **This pilot did not demonstrate an acceptance, coverage or unsupported-assumption improvement over the existing strong guidance.** Added instructions increased generation tokens. No coding-speed, human-satisfaction or real-rework benefit is claimed.

## What Will Be Compared

The study retains the existing good workflow guidance as the baseline. The candidate adds the new exploration/recap references for exploration tasks or the focused assignment template for handoff tasks. It does not replace the baseline with intentionally poor instructions or remove requirements to obtain a smaller context.

Four frozen simulated tasks cover:

1. The initial draft-discovery conversation, where automatic versus explicit saving remains a blocking decision.
2. A pre-proposal recap, where an unsaved-navigation warning remains an unconfirmed recommendation.
3. An implementer assignment for a pure quota helper, preserving its contract, limits, ownership, checks and exclusions.
4. A repository-adapter assignment preserving expected-revision conflict handling, ownership and no-automatic-write-retry behavior.

Two repetitions per task and condition yielded 16 outputs and eight matched pairs. Requested model and reasoning settings were GPT-6.1 Sol/low, with fresh ephemeral sessions, clean working directories, no tools, read-only execution and counterbalanced condition order. Every retained manifest reports successful completion, zero tool events and zero malformed JSON lines. No content retries or repair calls were made. The study has 28 frozen checks: six per exploration task and eight per handoff task. Its study, baseline and candidate snapshots were hashed before generation. Assembled prompts were saved before invocation and their normalized-text hashes recorded with the manifests after completion.

## Metrics and Evidence Boundaries

| Metric | Planned measurement | What it cannot establish |
| --- | --- | --- |
| Required artifact coverage | Each fixed check covered, omitted or contradicted, with an exact supporting excerpt | Complete application correctness |
| First-pass artifact acceptance | Every required check covered, no contradictions or unsupported requirements in the first output | First-pass code acceptance or deployed behavior |
| Unsupported assumptions | New product decisions or human approvals presented as confirmed without evidence | Actual human satisfaction |
| Blocking-decision handling | The right next unresolved decision surfaced without reasking known facts or bundling dependent questions | Real late requirements or coding rework avoided |
| Generation usage | Reported input, cached input, output and input-plus-output for every retained trial | Total workflow usage when coordination/grading/review are unmetered; actual charges |
| Invocation duration | Elapsed time for each generation, with medians/ranges and all trials retained | Time to verified implementation or human review time |
| Repair rounds | Record any repair calls if separately authorized; none are planned for this initial-artifact pilot | Zero coding rework simply because no code was generated |

Exploration fixtures contain deterministic simulated stakeholder facts. These are not real user answers or approvals. The generators did not read additional files, so this pilot cannot measure unnecessary file retrieval. An independent assessor received shuffled W01–W16 labels, the same fixed facts/checks and answers, without condition identities, added instructions or usage data. The label-shuffle seed is 32271112. Its judgments use semantic coverage: a compact journey can meet the journey check, and instructions to run commands do not count as a false claim that the commands already passed. The assessor did not judge actual stakeholder satisfaction, reading burden or executed implementation.

## All Paired Assessment Results

Acceptance requires all frozen checks covered with no contradiction or unsupported requirement. This is **first-pass artifact acceptance**, not first-pass code acceptance. No repair generations were attempted; that cannot establish that no coding repair would be needed.

| Task | Repeat | Existing guidance | Added pattern | Existing words | Added words |
| --- | --- | --- | --- | ---: | ---: |
| Initial exploration | 1 | Accepted, 6/6 checks | Accepted, 6/6 checks | 96 | 167 |
| Initial exploration | 2 | Accepted, 6/6 checks | Accepted, 6/6 checks | 107 | 174 |
| Exploration recap | 1 | Accepted, 6/6 checks | Accepted, 6/6 checks | 148 | 180 |
| Exploration recap | 2 | Accepted, 6/6 checks | Accepted, 6/6 checks | 160 | 194 |
| Quota assignment | 1 | Accepted, 8/8 checks | Accepted, 8/8 checks | 304 | 300 |
| Quota assignment | 2 | Accepted, 8/8 checks | Accepted, 8/8 checks | 284 | 315 |
| Project adapter assignment | 1 | Accepted, 8/8 checks | Accepted, 8/8 checks | 336 | 346 |
| Project adapter assignment | 2 | Accepted, 8/8 checks | Accepted, 8/8 checks | 333 | 337 |

Exploration coverage was 24/24 in both conditions. Handoff coverage was 32/32 in both. The assessor identified zero contradictions and zero unsupported assumptions in either condition. All 16 outputs passed the artifact criteria, leaving a ceiling effect: this rubric and these tasks cannot show a coverage advantage for the candidate. These are one AI assessor's judgments, not an independently measured human outcome.

## Exact Structure Examples, Not Proven Improvements

In initial exploration repetition one, the baseline immediately identifies the key choice:

> The first choice is how saving should feel. I’d lean toward automatic saving to support your goal of avoiding lost work; explicit saving gives you more control but requires remembering to save.

The candidate makes the journey explicit before asking the same blocking question:

> For the ordinary flow, a Tester starts a report in an active project, works on it, and may need to move the unfinished report to another active project. The first unresolved choice is how their work gets saved.

Both keep automatic saving as a recommendation and ask about that choice before navigation details. The candidate's explicit structure may be useful as a reminder, but its 167 words versus 96 do not establish better understanding or review efficiency. [Baseline](study-materials.tar.gz) (archive entry `study/raw/explore-initial-r1-baseline/answer.md`), [candidate](study-materials.tar.gz) (archive entry `study/raw/explore-initial-r1-candidate/answer.md`).

The quota handoff similarly changes organization. The baseline states:

> You exclusively own `src/features/reports/quotaPolicy.ts`. Preserve other writers’ changes. The tester owns `src/test/quota-policy.test.ts`; root owns shared configuration and task checkboxes.

The candidate labels the same content:

> **Ownership:** Exclusively edit `src/features/reports/quotaPolicy.ts`. The tester owns `src/test/quota-policy.test.ts`; root owns shared configuration and task checkboxes. Preserve other writers’ changes and report conflicts.

Both preserve the implementation boundary and contract. The first candidate is four words shorter overall, but the repeated candidate is longer. Selecting only the shorter example would misrepresent the result. These are **format changes**, not proven gains. [Baseline](study-materials.tar.gz) (archive entry `study/raw/handoff-quota-r1-baseline/answer.md`), [candidate](study-materials.tar.gz) (archive entry `study/raw/handoff-quota-r1-candidate/answer.md`).

## Observed Generation Resources

These totals cover only the generation invocations, including their CLI harness/system context. Coordination, grading and review are unmetered, so total experiment usage remains unknown. Cached input is included within input, not added again. No actual charge records or human review/understanding measurements are available.

| Group and metric | Existing guidance, four runs | Added workflow pattern, four runs |
| --- | ---: | ---: |
| Exploration input including cache | 57,314 | 59,324 |
| Exploration cached input | 45,312 | 42,624 |
| Exploration uncached input | 12,002 | 16,700 |
| Exploration output | 613 | 855 |
| Exploration input + output | 57,927 | 60,179 |
| Exploration answer words | 511 | 715 |
| Exploration median invocation | 9.363 seconds | 10.458 seconds |
| Handoff input including cache | 59,696 | 62,002 |
| Handoff cached input | 19,968 | 39,936 |
| Handoff uncached input | 39,728 | 22,066 |
| Handoff output | 2,069 | 2,156 |
| Handoff input + output | 61,765 | 64,158 |
| Handoff answer words | 1,257 | 1,298 |
| Handoff median invocation | 17.482 seconds | 17.205 seconds |

Added instructions increased recorded input-plus-output tokens by about 3.9% in each group. Handoff uncached input fell while total input rose, illustrating why an uncontrolled cache difference cannot establish a workflow or credit saving. Longer exploration answers could contain more useful coverage or merely more text; independent assessment and later reader evidence must distinguish those possibilities. Invocation time is not time to verified implementation, and small timing differences under shared scheduling are not causal speed evidence.

## Earlier Rejection and Specific Authorization

Automatic approval review rejected the initial CLI generation command before it executed. Its stated reason was that the command would send internal repository workflow instructions and fixture content to external model sessions; the comparative-evidence request did not specifically authorize exporting that payload to that destination. The rejection explicitly prohibited workarounds or indirect execution.

The user subsequently answered **“Approve the 16 benchmark runs”** to the coordinator's specific transfer question. The approved scope was the selected sanitized workflow instructions and synthetic facts sent to the existing Codex/OpenAI endpoint, excluding credentials, personal data and live app records. The original runner then executed under that authorization. No alternate route was used. The earlier rejected command made no model call; the completed dataset contains exactly the 16 subsequently approved invocations. The relayed approval is recorded in [study/authorization.json](study-materials.tar.gz) (archive entry `study/authorization.json`).

## Local Checks Completed

- Read the assigned feature plan and applicable handoff, experiment, coding and testing instructions.
- Preserved actual baseline files before coordinator edits, with original-byte snapshots and hashes.
- Froze candidate files, four tasks, the 28 checks, condition text, repetitions and limitations in [study/study.json](study-materials.tar.gz) (archive entry `study/study.json`), with [its hash](study-materials.tar.gz) (archive entry `study/study.sha256`).
- Prepared [the runner](study-materials.tar.gz) (archive entry `study/run_study.py`) from the earlier isolated experiment recipe and parsed its Python syntax before execution; executed it only after the specific user authorization.
- Verified all baseline/candidate snapshots against their recorded hashes, unique task IDs and expected check counts.
- Verified all 16 prompt reconstructions, normalized prompt/answer hashes, word counts, completion usage and within-pair/repeated order controls; all initial outputs are retained. [Audit](study/audit.json), [run manifests](study/results.json), [objective metrics](study/objective-metrics.json).
- No app, hosted database or SoCLaaS product requests; no credentials, account records or private report contents are included in the fixtures. The evaluation itself made the explicitly approved CLI model requests.

The independent [grades](study-materials.tar.gz) (archive entry `study/grading.json`), [masked inputs](study-materials.tar.gz) (archive entry `study/blind-input.json`), separate [condition map](study-materials.tar.gz) (archive entry `study/blind-map.json`) and decoded [assessment summary](study/assessment-summary.json) preserve the assessment. Root's independent evidence review remains required before closing the task. Application tests are not claimed: this study contains no application or test-source changes. Raw events omit reasoning text, and stderr redacts user-home paths. Existing manifests are reused by the runner, so a new replication requires a fresh study directory/identifiers rather than rerunning this command and calling reused outputs new evidence.

## Interpretation and Next Evaluation

The current baseline already asks for focused questions, distinct decisions, contracts, ownership and verification. The new patterns make those expectations easier to locate and reproduce, but the measured pilot did not show that they outperform that baseline. Recorded generation tokens increased about 3.9%; no token-saving claim is supported. Cache and scheduling differences prevent causal cost or speed conclusions.

The fair conclusion is to treat these additions as workflow aids pending stronger evidence, not advertise them as demonstrated performance improvements. A future assigned trial could use a longer simulated decision sequence, more varied task difficulty, actual context retrieval and code execution, or real user review with agreed measures. Those would need a newly frozen protocol and checks. Human review time, later requirement discovery, coding rework and charges remain **not measured**, not zero. No extra trial or workflow revision was performed to obtain a more favorable result.

## Published evidence and extraction

The numeric result, objective-metric, assessment and audit JSON files remain directly readable. The [reproduction archive](study-materials.tar.gz) contains the exact frozen study and hash, runner, grading and masking data, prompts, answers, manifests and source snapshots. Links to an individual archived file identify its internal path. From this report's directory, run `tar -xzf study-materials.tar.gz` to restore those paths. Verify the frozen study against `study/study.sha256` before reproducing a new run. A fresh run needs new experiment identifiers and explicit authorization for provider calls; the retained runner reuses existing manifests.

Provider event streams and stderr remain private local records and are excluded from the published archive. Their numeric usage was cross-checked before publication, but the public pack alone cannot repeat that raw-event check. The retained manifests and audit expose reported counts and checks, not independently authenticated billing. Historical feature-plan review records and the earlier exploratory forward test are also retained locally.
