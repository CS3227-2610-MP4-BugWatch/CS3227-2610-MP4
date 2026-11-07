# Coordinator Instructions

The root agent must read this file before coordinating work, including tasks handled without delegation. Read the relevant shared standards listed in AGENTS.md whenever performing specialist work directly.

## Coordination Responsibilities

The coordinator must:

1. Confirm scope and acceptance criteria from the user's request and existing evidence. Use the explorer when investigation would materially help.
2. Give each delegated task a clear objective, relevant context, acceptance criteria, owned files, and expected handoff. Preserve unrelated user changes.
3. Parallelize only independent work. Agree on interfaces before splitting implementation and tests. Give each file a single active writer; serialize shared configuration, lockfile, layout, and landing-page edits. Transfer presentation-file ownership to `ui_polisher` only after the implementer has finished those files.
4. Finalize behaviour-dependent documentation after implementation stabilizes. Use the documentation writing skill for guide changes.
5. Collect delegated results and resolve integration issues. Every implementer or tester completion report, including fixes, requires independent reviewer review and explicit approval under the Mandatory Reviewer Approval rules below. Also request an independent reviewer pass for substantial changes handled directly. Route actionable fixes to the owning agent or apply them directly, then verify affected behaviour and obtain fresh approval of affected work.
6. Inspect the combined diff and confirm relevant verification results before responding. Clearly report missing checks or unavailable agent capabilities.
7. Write one interaction log for the overall workflow, including delegated steps, significant decisions, changes, and actual verification. Subagents return their handoffs for this log rather than creating competing task logs.

### Feature Development Execution Sequence

For feature-development tasks using parallel implementation and testing, follow this sequence. Continue handling small or tightly coupled tasks directly when parallel work would not help.

1. Inspect the relevant implementation, documentation, and tests. Confirm the selected feature's scope and acceptance criteria, resolving material ambiguities before implementation.
2. Create a unique feature directory at `workflow/<feature-name>/`, using a short descriptive name. If that directory belongs to another workflow, add a numeric suffix to the new directory; do not overwrite its documents. Store all coordinator and agent documents for this feature workflow in that directory, with the plan at `workflow/<feature-name>/feature-plan.md`. Keep the required overall interaction log under `logs/`. The coordinator owns the plan throughout the workflow. Start every new coordinator-owned feature plan from `workflow/templates/feature-plan-template.md`. Preserve its section headings, order, and required fields throughout the task; do not substitute custom headings, omit sections, or leave placeholder text in a plan shared with agents. Write `None` or `Not applicable` with a brief reason for a field that does not apply. Add task-specific subsections under the fixed headings when needed. This requirement also applies when a feature plan is created outside the parallel implementation/testing sequence. Existing standalone plans remain at their historical paths unless a separate task explicitly migrates them.
3. Fill the template's planning sections before spawning the implementer and tester, and reserve its tracking sections for updates as work proceeds. In particular, record:
   - Plan status and revision.
   - Confirmed requirements, acceptance criteria, and scope exclusions.
   - Relevant existing code, reusable functionality, and test environment.
   - Application and test files to create or modify, with one owner per file.
   - Interfaces needed for parallel work using the template's structured bullets: module paths, exported functions and types, inputs, outputs, errors, side effects, and observable boundary behaviour. Avoid prescribing private implementation details unnecessarily.
   - Implementation tasks, required test outcomes, and verification commands. The tester may add cases justified by the requirements.
   - Sections for completion handoffs, review findings, resolutions, explicit approval decisions for each submission, agent summaries, and final verification.
4. Spawn `implementer` and `tester` before waiting for either. Give each the exact plan path and revision, its objective, owned files, acceptance criteria, and expected completion report. Require both to read the plan before editing. The implementer owns assigned application files; the tester owns assigned `src/test/*.test.ts` files. Serialize any shared configuration or dependency changes through the coordinator.
5. Route blockers and proposed interface changes through the coordinator. Before affected work continues, the coordinator resolves the issue, updates the plan and revision, and explicitly messages affected agents to reread the changed contract. Editing the plan alone is not a notification. Agents must not silently diverge from the agreed contract or overwrite another agent's changes.
6. Wait for both completion reports and record each as awaiting review. Tests may initially fail because implementation is incomplete; record those results as provisional and rerun against the completed implementation. Inspect the combined changes, resolve integration failures, and run applicable verification. Do not weaken valid tests to make implementation pass.
7. For a feature with user-facing pages, assign `ui_polisher` a scoped visual pass after functional implementation stabilizes and before final review. Give it the plan path and revision, selected design direction or UI library, visual acceptance criteria, and exclusive ownership of the relevant presentation and style files. Serialize any handoff from the implementer; do not let both edit the same file concurrently. The visual pass may adjust markup and styles but must preserve behavior, semantics, accessibility, and agreed interfaces. Treat its completion report as a submission awaiting independent review. If visual changes expose a functional or test issue, route it to the appropriate owner and rerun affected checks. For features without a user-facing page, record why the visual pass is not applicable.
8. Finalize required documentation against the implemented behaviour, using the documentation writing skill. Then spawn `reviewer` with the plan path and current revision, every pending implementer, tester, and `ui_polisher` completion report and its submission identifier, the scoped combined change set, and actual verification results. Review must assess the user's requirements as well as the plan, including implementation defects, missing tests, visual and accessibility regressions, and documentation accuracy. Require an explicit approval decision for each pending submission and the final combined implementation and tests.
9. Collect review decisions and route actionable fixes to the responsible agent, or apply scoped fixes directly. Rerun affected verification. Every subsequent implementer, tester, or `ui_polisher` completion report, including a fix report, must return to the reviewer for fresh review and explicit approval. Coordinator edits affecting reviewed work also require fresh approval; follow the Mandatory Reviewer Approval rules below. Repeat the correction and review cycle until all latest submissions and the final combined implementation and tests are approved. Do not treat agent completion as evidence that checks passed or requirements were met.
10. After the reviewer has approved the latest implementer, tester, and `ui_polisher` submissions and final combined implementation and tests, assign each participating implementer and tester a unique summary path in the feature directory. Use `implementer-summary.md` and `tester-summary.md` when there is one agent per role. When multiple agents have the same role, use `implementer-<agent-name>-summary.md` or `tester-<agent-name>-summary.md`, with a distinct short name for each agent. Implementers use `workflow/templates/implementer-summary-template.md`; testers use `workflow/templates/tester-summary-template.md`. Give each agent its exact owned path, approved submission IDs, and current plan revision. The agents write only their own summary files, in plain language, covering their final reviewed work. If an agent made no contribution to the feature, record why its summary is not applicable in the plan. A summary-only acknowledgement does not constitute a new implementation or test submission; any subsequent application or test edit does, and requires fresh review before the summaries are finalized.
11. Check that each required summary file exists in the feature directory, follows its template, and accurately describes the approved changes. Record the summary paths and checks, handoff summaries, review resolutions, explicit approval decisions and reviewed revisions, final verification, and remaining limitations in the plan. Update its status accurately; mark it complete only when applicable requirements are satisfied, the approval gate below is met, and the required summaries exist. Inspect the final diff, write the single overall interaction log under `logs/`, and report the outcome to the user.

## Mandatory Reviewer Approval

- Treat every implementer or tester completion report as a new submission awaiting review, including initial work, follow-up tasks, and fixes. Give each submission a unique identifier and record the reporting agent, plan revision when applicable, changed files, and the submitted state of the work. Without a feature plan, record the same information in the coordinator's task record and overall interaction log; the gate still applies.
- Apply the same submission, explicit decision, and re-review rules to every `ui_polisher` completion report and its later fixes. Include visual and accessibility regressions in the final combined review.
- The coordinator must obtain reviewer review of every submission. Concurrent completion reports may be reviewed together, but the reviewer must explicitly identify each submission covered and provide its decision. Do not silently skip or mark a superseded report as approved; have the reviewer record its disposition and assess its replacement.
- Require the reviewer to return `approved`, `changes_requested`, or `blocked` for each submission, with its identifier, reviewed scope and revision or state, supporting findings, verification limits, and outstanding requirements. No findings, passing tests, or an agent's claim that work is finished do not substitute for explicit `approved` decisions.
- Any new implementer, tester, or `ui_polisher` completion report, or subsequent edit affecting reviewed implementation, tests, presentation, acceptance criteria, interfaces, or dependent behaviour, invalidates approval for the affected work. This applies to coordinator fixes as well as subagent changes. Rerun affected verification and obtain fresh reviewer approval against the updated state. Administrative updates that only record handoffs, decisions, or logs do not invalidate approval.
- Before completing the overall task, ensure all latest implementer, tester, and `ui_polisher` submissions and the final combined implementation and tests have explicit reviewer approval against the final relevant state, all actionable findings are resolved, and applicable verification requirements are satisfied. Reconcile earlier reports with their review decisions and replacement submissions. The coordinator must not waive review, self-approve, or rely on stale approval to close the task.
- If review is unavailable, blocked, or inconclusive, keep the task incomplete and report the blocker and pending approvals. Do not mark the plan complete or claim successful task completion. A progress or blocker report to the user is permitted while approval is pending.

## Logging Agent Interactions

At the end of every workflow task performed by an LLM, create a new Markdown file under `logs/`. Do not overwrite previous task logs.

Use a descriptive filename, preferably `YYYY-MM-DD-<short-task-description>.md`. If multiple tasks with the same description occur on the same date, add a numeric suffix.

Each log must contain:

```markdown
# Agent Interaction Log

## User Prompt
Record the user's original task prompt and relevant clarifications.

## Steps Taken
Summarize significant steps performed by the LLM.

## Reasoning Summary
Record concise, user-facing engineering justifications for significant decisions.
Do not include hidden chain-of-thought or private internal reasoning.

## Changes Made
List important files created, modified, or deleted and explain why.

## Verification
Record commands or checks actually performed and their outcomes.

## Final Output and Conclusion
Summarize the result, including unresolved issues.
```

Logs must accurately reflect what occurred. Do not claim commands, tests, or manual checks that were not performed. Do not include passwords, tokens, credentials, personal data, or other secrets in logs.

## Definition of Done

A task is complete only when all applicable conditions are satisfied:

- [ ] The requested functionality is implemented.
- [ ] Changes remain within the requested scope.
- [ ] Existing architecture and conventions have been respected.
- [ ] Relevant Vitest tests have been added or updated in `src/test/*.test.ts`.
- [ ] Existing relevant tests still pass.
- [ ] Boundary and negative cases have been considered.
- [ ] ESLint passes for modified application code.
- [ ] Type checking and the production build succeed.
- [ ] Documentation updates follow `.agents/skills/write-documentation/SKILL.md`.
- [ ] User-facing changes are reflected in appropriate topic pages within `docs/userGuide/`.
- [ ] Material design or development changes are reflected in appropriate topic pages within `docs/developerGuide/`.
- [ ] Every new guide Markdown page has a navigation entry in `_markbind/layouts/default.md`.
- [ ] Documentation changes pass the MarkBind build when applicable.
- [ ] No credentials or sensitive information were introduced.
- [ ] No temporary or debugging code remains.
- [ ] The final diff has been inspected for unrelated changes.
- [ ] Every implementer/tester completion report has been reviewed, and all latest submissions and the final combined implementation and tests have explicit reviewer approval against the final relevant state; no approval is stale or pending.
- [ ] Every `ui_polisher` completion report, when applicable, has explicit reviewer approval against the final relevant state.
- [ ] After approval, each participating implementer and tester wrote its template-based summary file in the feature directory, and the coordinator checked its existence and accuracy.
- [ ] The agent interaction has been recorded under `logs/`.
- [ ] Verification that could not be performed is clearly reported.

## Final Response

Provide a concise summary containing what changed, important implementation or design decisions, tests added or modified, verification and results, documentation updates, and any limitations or unresolved issues.

Never report a test, build, lint check, type check, application run, or other verification as successful unless it was executed successfully.
