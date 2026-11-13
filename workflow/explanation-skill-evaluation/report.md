# Evaluating the Plain-English Explanation Skill

11 November 2026. This section reports a completed writing pilot, not a human-comprehension study.

## Finding

The skill produced a small wording benefit against an already strong baseline. One independent AI grader gave the skill a higher clarity score in **1 of 8 paired comparisons**, with **7 ties** and no lower-scoring pair. Both versions had zero identified factual contradictions or unsupported claims under the frozen checks. The skill preserved one extra statement about verification limits, but that omission in the baseline was not a false claim that tests had run.

This pilot does **not** establish better human understanding, general writing superiority, faster development or lower charges. Its useful result is more specific: we have a repeatable comparison, an exact wording example, measured overhead and a remaining weakness to address.

## What Changed in the Workflow

The new `explain-software-changes` skill adapts selected ASD-STE100 clarity principles and our observations of published CNA explainers. It asks for clear actors and actions, consistent terms, a direct opening, useful examples and preserved evidence limits. Existing instructions and implementation/test summary templates route to it. It is not a full STE dictionary/compliance implementation or an official CNA style manual.

The earlier three-case forward test (earlier exploratory record retained locally) checked basic behavior but had no baseline comparison. This pilot adds matched conditions, held-out prompts, repeated generations, masked assessment and retained outputs. The skill was frozen throughout; it was not edited after viewing these results.

## Method

- Four new tasks: explain the quota function/concurrency, archived-draft behavior, reporter test design, and report acceptance in exactly two sentences.
- Two independent repetitions per task and condition: **16 initial outputs, forming 8 pairs**. No response was repaired, selected for regeneration or discarded.
- Generator: **GPT-6.1 Sol, low reasoning**, requested through Codex CLI `0.167.0-alpha.3.2`. Each generation used a fresh ephemeral session in a clean temporary directory, read-only execution, user configuration ignored, automatic project-document loading set to zero and web search disabled. The retained manifests report no tool events and successful completion.
- Both versions received the same source facts, request, word/format constraints and strong generic clear-writing guidance. The candidate alone received the frozen skill text. The baseline was not instructed to write badly. This compares adding the skill to a standalone writing task, not replaying the entire prior chat or development workflow.
- Within each pair the launch order alternated; each task reversed its first condition in repetition two. Two independent pairs could run concurrently. Caching, provider scheduling and local scheduling were not controlled.
- The study containing the common instructions, task prompts, facts and skill text was hashed before generation, as were the source files and skill text. Each assembled run prompt was saved before its invocation; its hash was recorded with the manifest after completion. The source facts were checked against repository files by inspection; no application database/UI tests were executed by this writing experiment.
- An independent agent received all outputs in a shuffled order under opaque labels, the source facts and a frozen rubric. It did not receive the condition map, skill, usage, prior conclusions or generation history. Labels can still be guessed from writing style, so masking is not perfect.

The rubric checked every fact as covered, omitted or contradicted and recorded unsupported claims separately. Clarity had five 0–2 dimensions: directness, accessible terms, logical explanation, concreteness, and format/focus. These scores are judgments by one AI evaluator, not measurements of reader comprehension. Word counts use whitespace-separated tokens; they are not model tokens or a readability score.

The coordinator selected the tasks after authoring the skill. They are new prompts outside the earlier sanity checks, not an independently curated unseen domain; the underlying topics overlap practices already named in the skill. Task selection can therefore favor the skill, and this sample cannot establish broad generalization.

## All Paired Results

Each clarity score is out of 10. Facts count coverage of the fixed facts, not a claim of complete software correctness.

| Task | Repeat | Baseline clarity | Skill clarity | Baseline facts | Skill facts | Baseline words | Skill words |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Quota/concurrent requests | 1 | 9 | 10 | 8/8 | 8/8 | 192 | 192 |
| Quota/concurrent requests | 2 | 10 | 10 | 8/8 | 8/8 | 192 | 191 |
| Archived drafts | 1 | 10 | 10 | 8/8 | 8/8 | 171 | 160 |
| Archived drafts | 2 | 10 | 10 | 7/8 | 8/8 | 149 | 151 |
| Reporter test design | 1 | 9 | 9 | 8/8 | 8/8 | 224 | 207 |
| Reporter test design | 2 | 9 | 9 | 8/8 | 8/8 | 212 | 212 |
| Acceptance, two sentences | 1 | 10 | 10 | 5/5 | 5/5 | 63 | 65 |
| Acceptance, two sentences | 2 | 10 | 10 | 5/5 | 5/5 | 64 | 65 |
| **Total** | **8 pairs** | **77/80 points** | **78/80 points** | **57/58** | **58/58** | **1,267** | **1,243** |

All 16 met the requested format/length according to the grader, including the two-sentence constraints. Both versions had zero identified contradictions and zero unsupported claims. The only omitted fact was the explicit statement that the writing trial had not opened the UI or executed the database; the baseline did not falsely assert that it had.

## Exact Examples and Their Limits

### A small wording improvement

Quota explanation, repetition one:

**Baseline:**

> It requires a Tester profile, and its execute grant is limited to `service_role`; an ordinary browser user cannot execute it directly.

**With the skill:**

> Only `service_role` has permission to execute it; an ordinary browser user does not.

The skill version uses the familiar word “permission” in place of “execute grant.” The masked grader rated this pair 10 versus 9, with the difference in accessible terminology. Both versions already explained the quota and locking correctly. This is evidence of a particular wording benefit, not a security fix or proof that a reader understood more.

Full answers: [baseline](study-materials.tar.gz) (archive entry `raw/quota-r1-baseline/answer.md`), [skill](study-materials.tar.gz) (archive entry `raw/quota-r1-skill/answer.md`).

### One verification limit was retained

In the second archived-draft pair, both versions correctly explain that selecting another project does not move the draft until saving succeeds. The skill version also says:

> These are the documented rules; this writing trial has not opened the UI or executed the database.

That statement covers fact D8, omitted in the baseline. It improves explicit evidence coverage in this one example. It does not turn an otherwise correct baseline into a factual error, and the grader gave both versions the same clarity score.

Full answers: [baseline](study-materials.tar.gz) (archive entry `raw/draft-r2-baseline/answer.md`), [skill](study-materials.tar.gz) (archive entry `raw/draft-r2-skill/answer.md`).

### A remaining weakness

Both skill-based test-design explanations still use “Node CLI” and “synthetic records” without explaining them. Both received 9/10, matching their baselines. The skill therefore did not consistently achieve its own goal of explaining necessary terms for an unfamiliar reader.

A possible next revision would make the final jargon check more concrete, while preserving exact identifiers: explain “Node CLI” as a command-line program run with Node, and “synthetic records” as made-up test data. This is a **proposed revision**, not a tested improvement. A follow-up should supply any needed glossary facts to both conditions, freeze the new version, and test it on new prompts as well as retained regression cases.

Full examples: [repeat one](study-materials.tar.gz) (archive entry `raw/tests-r1-skill/answer.md`), [repeat two](study-materials.tar.gz) (archive entry `raw/tests-r2-skill/answer.md`). The strong baseline and near-maximum rubric scores also leave little room for this coarse rubric to detect change.

## Resource and Timing Observations

These are the **16 generation invocations only**. Setup, coordination, grading and report review were not metered, so total experiment usage is unknown. Counts include the Codex harness/system context; they are not just the visible prompt. Charges were not recorded.

| Recorded metric | Baseline, 8 runs | Skill, 8 runs | Interpretation |
| --- | ---: | ---: | --- |
| Input, including cached | 108,188 | 116,512 | Skill condition used 8,324 more input tokens, about 7.7% more. |
| Cached portion of input | 59,904 | 72,576 | Cache conditions differed; these tokens are already included in input. |
| Uncached input | 48,284 | 43,936 | About 9.0% lower with the skill, but uncontrolled caching prevents attributing this to the skill or inferring a credit saving. |
| Output tokens | 1,680 | 1,734 | Output tokens increased despite slightly fewer whitespace words. |
| Input + output | 109,868 | 118,246 | About 7.6% higher total recorded generation tokens. |
| Answer words | 1,267 | 1,243 | About 1.9% fewer; this alone does not establish clarity. |
| Median invocation duration | 10.708 seconds | 10.772 seconds | Essentially similar in this small sample; not a reading-time measurement. |
| Sum of invocation durations | 93.831 seconds | 84.031 seconds | Not overall wall-clock completion time; calls overlapped. One baseline test-design call took 23.503 seconds, so a speed claim from these sums would be misleading. |

The added instructions have a measurable input overhead. We cannot claim token savings, credit savings or faster development from this pilot. Any practical benefit must justify that overhead through better explanations or less human review effort, which still needs measurement.

## What Can Go in the Report

> I engineered a reusable explanation skill and tested its incremental effect against existing clear-writing guidance. I froze four source-backed tasks, ran two fresh generations per condition for each task, and retained all 16 outputs. A condition-masked AI evaluator found a clarity improvement in one of eight pairs and ties in the others, with no identified contradictions in either condition. The skill replaced one technical phrase with a familiar equivalent and preserved one extra verification limit. It also left some jargon unexplained and increased recorded generation tokens. I therefore treat the result as limited evidence of a wording benefit and a guide for revision, rather than proof of better human understanding or lower cost.

## Lecture Connections and Next Evaluation

- **L4, evaluation:** explicit factual checks and a fixed rubric make the output assessable; independent scoring still has limits.
- **L9, context/resource use:** useful instructions have overhead, and cache hits, total tokens and actual charges are different measurements.
- **L10, harness feedback:** retained failures and weaknesses can guide a narrow instruction revision. The identified jargon gap is a concrete next target, not a retrospectively claimed success.

These are applications of the course ideas; the course lecture references are listed in the repository reflection.

The next human evaluation should randomly assign one version per topic, ask the same short comprehension questions, measure active reading/review time, and counterbalance assignment across comparable topics. Reading both explanations of the same topic can teach the reader and bias the second score. Larger task diversity, more repeats and an independent second grader would also strengthen the evidence. None of those results is claimed here.

## Evidence and Reproduction

- [Frozen study, prompts, facts and rubric](study-materials.tar.gz) (archive entry `study.json`), [study SHA-256](study-materials.tar.gz) (archive entry `study.sha256`); skill and source hashes are inside the study.
- Repository source snapshots preserve original bytes under `source-snapshots/`, with `.txt` appended to their original filenames. The skill snapshot preserves the frozen UTF-8 text used for prompting, with normalized line endings. These are evidence copies, not additional executable source/tests.
- [Runner](study-materials.tar.gz) (archive entry `run_study.py`): initial smoke invocation `python run_study.py --limit 1`, then `python run_study.py`; the successful initial run was retained, not regenerated. Existing manifests are reused, so a genuine replication needs a new experiment directory/IDs and should preserve this record.
- [All run manifests and usage](results.json), [objective metrics](objective-metrics.json), [masked inputs](study-materials.tar.gz) (archive entry `blind-input.json`), [condition map](study-materials.tar.gz) (archive entry `blind-map.json`), [independent grades](study-materials.tar.gz) (archive entry `grading.json`), [decoded assessment](assessment-summary.json), [record audit](audit.json).
- The archive contains each run's exact supplied prompt, final answer and manifest. Completion/usage events and stderr are retained locally rather than published. The manifests are not byte-for-byte provider session transcripts.
- Independent report-audit result is recorded in the feature plan (historical review record retained locally). All checks, source hashes, coverage arithmetic, score arithmetic and quoted excerpts must agree before acceptance.
- The documentation build passed with existing warnings and additional unresolved relative-source-link warnings inside archived model answers. Those answers remain unchanged as evidence; use the frozen source references and source snapshots to locate the cited code.

## Published evidence and extraction

The numeric result, objective-metric, assessment and audit JSON files remain directly readable. The [reproduction archive](study-materials.tar.gz) contains the exact frozen study and hash, runner, grading and masking data, prompts, answers, manifests and source snapshots. Links to an individual archived file identify its internal path. From this report's directory, run `tar -xzf study-materials.tar.gz` to restore those paths. Verify the frozen study against `study.sha256` before reproducing a new run. A fresh run needs new experiment identifiers and explicit authorization for provider calls; the retained runner reuses existing manifests.

Provider event streams and stderr remain private local records and are excluded from the published archive. Their numeric usage was cross-checked before publication, but the public pack alone cannot repeat that raw-event check. The retained manifests and audit expose reported counts and checks, not independently authenticated billing. Historical feature-plan review records and the earlier exploratory forward test are also retained locally.
