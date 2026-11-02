# Completion Reports and Handoffs

Read before coordinating or carrying out a delegated task. For feature work, read the assigned plan and revision before editing; follow assigned file ownership and report contract changes to the coordinator.

### Completion Reports and Handoffs

Subagents return completion reports directly to the coordinator in their final response; separate report files are not required. Reports must identify the assigned plan and revision, completion status, changed files or reviewed scope, behaviour implemented or covered, actual verification commands and outcomes, and unresolved blockers, risks, or documentation needs. Reviewers also include actionable findings with supporting evidence, or explicitly state that no actionable findings were found and describe review limits.

Send blockers requiring coordination as soon as they arise rather than waiting for the completion report. The coordinator records concise handoff summaries and decisions in the plan under `workflow/`, and includes significant outcomes in the overall log under `logs/`. Subagents must not edit the shared plan or create competing workflow logs. If a separate report artifact is necessary, the coordinator must explicitly assign a unique path and owner.

## Reviewer Approval of Completion

Every implementer or tester completion report, including reports after fixes or follow-up work, is a submission awaiting independent reviewer approval. Report the completed work and actual verification honestly; do not claim reviewer approval on your own behalf. The coordinator assigns each submission an identifier and sends every completion report, its plan revision when applicable, and the relevant work and verification state to the reviewer.

The reviewer must explicitly identify each reviewed submission and return `approved`, `changes_requested`, or `blocked`, with the reviewed scope and revision or state, supporting findings, verification limits, and unresolved requirements. A review may cover concurrent submissions together, but must state each submission's decision and whether the final combined implementation and tests are approved. Absence of findings alone is not approval.

Fixes and new implementer/tester completion reports require another review. Later edits affecting reviewed work invalidate the affected approval, including coordinator edits. The coordinator records decisions and resolutions in the plan, or in its task record and overall log if no plan exists, and must not complete the task until all latest submissions and the final combined implementation and tests have explicit approval against the final relevant state, findings are resolved, and applicable verification is satisfied. If review is unavailable or blocked, report the blocker and keep the task incomplete. Detailed tracking and re-review rules are in `workflow/instructions/coordinator.md`.
