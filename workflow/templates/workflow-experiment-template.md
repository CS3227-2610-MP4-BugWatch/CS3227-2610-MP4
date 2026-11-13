# {Experiment name} — Instruction-Routing Comparison

## Question and Frozen Conditions

- **Question and hypothesis:** {what instruction-routing change is expected to improve, and why}.
- **Task IDs and starting commit:** {representative tasks, immutable prompts/scope and clean source revision}.
- **Broad instructions:** {snapshot/hash and full shared instruction treatment}.
- **Routed instructions:** {snapshot/hash and role references; equivalent requirements}.
- **Controlled settings:** {model/reasoning per role, tools/versions, dependencies, environment, budgets and stopping rule}.
- **Frozen acceptance check set:** {ID/hash, independent check definitions, expected outcomes and evaluator; explain quality criteria for non-code tasks}.
- **Repetitions and order:** {predeclared count per task; alternating broad-first/routed-first; fresh workspaces/sessions}.
- **Timing/accounting boundary:** {start/end, baseline setup exclusions applied equally, cumulative-counter delta method, all included roles and repair sessions}.
- **Data handling:** {synthetic fixtures and evidence locations; no credentials or personal data}.

## Run Register

| Pair/task/repetition | Run ID and condition | Order | Source/instruction revisions | Acceptance and first-pass outcome | Repairs | Elapsed / active human review time | JSON record and raw evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| {IDs} | {ID; broad/routed} | 1 / 2 | {fixed start and instruction snapshot} | {each check result; first-pass and final remain distinct} | {count/cause} | {milliseconds, or Unknown} | {paths, all session IDs and counter evidence} |

Use `schemaVersion: 1` JSON records as demonstrated by the clearly synthetic `workflow/evaluation/example-experiment.json`. Null means unknown. Include failed/aborted runs and all repair sessions; use failed/not_run check outcomes and explain the stopping reason rather than deleting a run.

## Quality and Human Review

| Run | Fixed check and version | Actual status and evidence | Understanding rubric/result | Limits |
| --- | --- | --- | --- | --- |
| {ID} | {ID/hash} | passed / failed / skipped / not_run | {same questions/scoring across conditions; Not measured if absent} | {mock/real environment and missing evidence} |

## Reported Usage and Charges

| Run/session | Role | Input including cached | Cached input | Uncached input | Output | Actual charge and unit | Counter/charge evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| {IDs} | {role, including coordinator/reviewer/repairs} | {number or Unknown} | {number or Unknown} | {derived only when known} | {number or Unknown} | {observed amount/unit or Not measured} | {final counter or start/end delta source; no raw private prompts} |

## Results and Interpretation

- **Reporter command and output:** {exact command, report path and observation date; input is retained}.
- **Per-task pairs and variability:** {all individual results, sample size, ranges/medians if appropriate; distinguish repeats from different tasks}.
- **Quality and rework:** {fixed checks, first-pass versus repaired acceptance, actual defects and limits}.
- **Time and understanding:** {wall-clock, active review effort, rubric evidence or Not measured}.
- **Usage versus cost:** {input/cached/uncached/output and actual charges if measured; never assume a token reduction equals a credit saving}.
- **Confounds and missing data:** {cache/order effects, unequal settings, incomplete roles/counters, aborted runs and other limits}.
- **Independent review:** {reviewer, exact evidence/scope, decision and unresolved findings}.
- **Decision:** {retain, revise, reject or collect more evidence; why; no general claim from one pair}.
