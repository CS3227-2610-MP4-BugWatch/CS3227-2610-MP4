# Instruction-Routing Evaluation

Read when an instruction-routing experiment is in the assigned scope. This protocol and the reporting utility do not launch agents, providers or benchmark tasks automatically. Ordinary feature development uses existing checks without requiring an experiment.

## Define a Fair Comparison

Use `workflow/templates/workflow-experiment-template.md` under the assigned feature/experiment directory. Compare **broad** shared instructions with **routed** role-specific instruction references. Freeze a starting commit, task prompt and scope, dependencies/tools, model and reasoning settings per role, budget/stopping rule, and independently defined acceptance checks before either run. Preserve instruction snapshots/hashes for both conditions. Keep product and safety requirements semantically equivalent; removing a requirement is not a context-efficiency improvement.

Use clean, separate workspaces and fresh agent sessions for each run. Do not give the second condition the first run's solution, review findings or expected implementation. Keep evaluator checks fixed and separate from generated code. If a test/check must change, version it and rerun affected conditions or report that comparison as uncontrolled. Model, tool, scope or starting-code differences must be reported rather than hidden.

Start with a bounded pilot on representative tasks, for example one code repair, one test-design task and one change-explanation task. Predeclare repetitions and order: alternate broad-first and routed-first across repeats, with distinct order 1 and 2 within each pair. A small pilot checks feasibility; it does not establish general performance or statistical certainty. Include all failures, aborted attempts and repairs, with the same stopping rule. Repeats and task diversity are different: report both and show per-task results and variability, not only a pooled saving.

## Record Quality, Time and Understanding

- **Quality:** record each frozen acceptance check as passed, failed, skipped or not_run. Identify check names, versions and output evidence. Skipped/not-run checks do not establish acceptance. Record first-pass results separately from final results and explain repairs.
- **Time:** record elapsed wall-clock milliseconds from the declared start through final verification and review. Do not sum overlapping agent durations as if they were wall-clock time. Record active human review time separately or null if unavailable.
- **Rework:** record repair rounds and their cause. Keep the definition of a round fixed across conditions; preserve failed results instead of reporting only the repaired output.
- **Human understanding:** use the same brief rubric and questions for both conditions, such as explaining behavior, one implementation decision, a failure case and its test. Record answers/scores without personal data and label subjective assessments. Fewer questions or shorter answers alone do not demonstrate understanding.
- **Cost:** preserve actual reported charges and units with evidence if available. Otherwise record Not measured. Token counts alone cannot establish credit/currency savings.

## Account for Every Session

The machine-readable record has `schemaVersion: 1`, `experimentId` and `runs`. Start from `workflow/evaluation/example-experiment.json`, which is synthetic and must never be presented as experimental performance. Replace its run data with observations and link the experiment plan. Field names and null handling are documented by the TypeScript interface and validated by the local reporter.

Each run records its IDs, broad/routed condition, order, starting commit, instruction revision, model/tool setup, frozen check set, elapsed/human-review milliseconds, repair rounds, actual check outcomes, evidence and all sessions. Include coordinator, implementer, tester, documentation, reviewer, retries and extra repair sessions. Session IDs must be unique across the experiment. Preserve evidence for each final usage counter or measured counter delta. Do not add intermediate cumulative counters together. For continuing sessions, use the final-minus-start counter for the declared interval; inherited history and shared setup need an explicit accounting boundary. List excluded setup once in the plan and apply the same boundary to both conditions.

For each session record nonnegative safe integer token counts, or null when unavailable:

```text
inputTokens includes cachedInputTokens
uncachedInputTokens = inputTokens - cachedInputTokens
totalTokens = inputTokens + outputTokens
```

A recorded zero is an observation. A null is unknown and must not be replaced with zero. Known usage needs a source reference; never copy raw prompts, credentials or account data into public experiment records. Do not infer cache hits from repeated prompts, speed or model familiarity. This routing experiment does not isolate prompt caching: record cache behavior as a confound and investigate it separately if assigned.

## Produce and Interpret a Report

From the repository root with Node 24:

```sh
node workflow/evaluation/report-experiment.js path/to/experiment.json
```

The command reads the supplied JSON and writes a JSON report to stdout. It does not modify the input, run checks, authenticate evidence or contact services. Invalid records exit nonzero. The pure `summarizeExperiment` function validates counters/IDs and reports every run, including failures. Unknown aggregate fields stay null; cached input is not counted twice.

Pairs are comparable only when exactly one broad and one routed run use distinct orders 1/2, matching task/start/model/tool/check-set identifiers and matching check IDs. These declared identifiers must be supported by the retained raw artifacts; equal strings alone cannot prove equal environments. Percentage reductions are withheld unless both runs pass all recorded acceptance checks, controls match and the relevant baseline is known and greater than zero. Negative reductions are valid observations. `qualityMaintained` only describes acceptance in the recorded checks; it is not proof of overall software quality.

Review the run records, logs and artifacts independently. Report individual pairs, repetition count, failures, ranges/medians when supported, uncontrolled cache/order effects, omitted evidence and remaining limits. A shorter prompt, lower input total or successful synthetic fixture is not proof that this workflow improved. Attribute teammates' experiments separately; do not substitute their usage for measurements of this workflow version.
