---
layout: default.md
title: "Multi-Agent Workflow"
pageNav: 3
---

# Multi-Agent Workflow

BugWatch defines five project-scoped Codex agents. The main chat coordinates their work and remains responsible for the combined result. Applicable repository instructions ask it to delegate suitable independent work automatically and handle small or tightly coupled tasks directly.

## Configuration

`.codex/config.toml` enables multi-agent tools under `[agents]`. Individual definitions live in `.codex/agents/`:

| Agent | Definition | Purpose |
| --- | --- | --- |
| `codebase_explorer` | `codebase_explorer.toml` | Map relevant code, conventions, dependencies, and tests without editing files. |
| `implementer` | `implementer.toml` | Implement scoped React and TypeScript changes. |
| `tester` | `tester.toml` | Write deterministic Vitest tests under `src/test/*.test.ts`. |
| `documentation_writer` | `documentation_writer.toml` | Maintain guide topics and shared navigation using the documentation writing skill. |
| `reviewer` | `reviewer.toml` | Independently inspect changes and report actionable findings without editing files. |

Each definition supplies `name`, `description`, and `developer_instructions`. The implementer, tester, reviewer, and documentation writer definitions specify model and reasoning overrides; the explorer inherits the parent's selections when no other applicable setting overrides them. Permissions are inherited from the parent. The project configuration sets `max_threads` to 6 and `max_depth` to 1; five available roles do not require five simultaneous agents.

Use a Codex client that supports project-scoped standalone custom agents. Open or start a new chat in this trusted repository after adding or changing configurations so the client can load them. Availability also depends on client support and managed settings; a repository configuration cannot override those settings.

Agents inherit the parent's permissions. The explorer and reviewer are instructed to avoid mutations, but this is a behavioural restriction rather than a separate filesystem sandbox.

## Instruction locations

The repository-root `AGENTS.md` contains shared project details, constraints, essential verification requirements, agent role boundaries, and pointers to more detailed instructions. It applies to the coordinator and subagents as appropriate to their responsibilities.

Detailed instructions are grouped by use under `workflow/instructions/`:

| Reference | Contents |
| --- | --- |
| `coordinator.md` | Coordinator duties, feature execution sequence, logging, definition of done, and final reporting. |
| `code-standards.md` | Architecture and design, TypeScript and React standards, and dependency policy. |
| `testing.md` | Test design, naming, and quality requirements. |
| `documentation.md` | User and developer guide documentation requirements. |
| `handoffs.md` | Completion reports and handoff responsibilities shared between agents. |

Each role definition directs its agent to read the references relevant to its assignment. The coordinator reads the relevant standards when it performs work directly. The documentation-writing skill remains required for guide edits. These instruction references are distinct from the coordinator-owned feature plans under `workflow/YYYY-MM-DD-<feature-name>.md`.

## How work is coordinated

The coordinator establishes scope and acceptance criteria, then selects only the roles needed for the task. An explorer can identify affected code before an implementer starts. Implementation and tests can proceed in parallel once their shared interfaces and expected behaviour are agreed. Documentation is finalized against the implemented behaviour. A reviewer examines substantial changes and must explicitly approve every implementer and tester completion before the coordinator completes the task.

Each assignment identifies its objective, context, acceptance criteria, owned files, and expected report. Agents share the working tree, so each file has one active writer. Shared configuration, dependency lockfiles, guide landing pages, and the MarkBind layout require serialized edits. Subagents return further delegation needs to the coordinator rather than spawning their own agents.

The coordinator collects findings, changes, executed checks, and unresolved issues. It records one workflow interaction log under `logs/`, including the delegated work, and reports the final outcome to the user.

## Feature development sequence

For feature tasks suited to parallel implementation and testing, the coordinator first inspects existing code and tests and confirms the requirements. It creates a unique `workflow/YYYY-MM-DD-<feature-name>.md` plan, creating the directory when needed and adding a numeric suffix for filename collisions. The coordinator alone updates the plan.

Before delegation, the plan records its status and revision, acceptance criteria, scope exclusions, existing implementation, application and test file ownership, required interfaces and observable behaviour, tasks, test outcomes, and verification commands. It also reserves sections for handoffs, review findings, resolutions, and final verification. The interface contract gives the implementer and tester a common basis for independent work without prescribing unnecessary private implementation details.

The coordinator spawns `implementer` and `tester` before waiting for either. Each receives the exact plan path and revision and reads it before editing its assigned files. Blockers and proposed contract changes go to the coordinator, who resolves them, updates the plan, and explicitly messages affected agents before affected work continues. A plan edit alone does not notify another agent.

After both completion reports arrive, the coordinator inspects the combined changes, resolves integration failures, and runs applicable verification. Tests written before implementation exists may initially fail; those results are provisional and must be rerun against the completed implementation. Required documentation is finalized against implemented behaviour before `reviewer` inspects the plan, combined changes, and actual check results. The reviewer explicitly approves or reports findings for each submission and the combined work. The coordinator routes actionable fixes and reruns affected checks; every fix completion requires review again. It records the final status and limitations in the plan and writes the overall interaction log under `logs/`.

## Review and approval

An implementer or tester completion report, including a fix, means the submission is awaiting review. The coordinator assigns the read-only reviewer to evaluate each completion. Concurrent initial completions may be reviewed together, but the review must identify each submission and give it an explicit status: `approved`, `changes_requested`, or `blocked`. A lack of findings is not an approval unless the reviewer explicitly says the submission is approved.

The coordinator records the review status, scope, findings, and resolutions. New implementer or tester completions and coordinator edits affecting reviewed work invalidate the affected approval and require another review. Before completing the task, the coordinator must obtain explicit approval of all latest submissions and of the final combined implementation and tests after the latest relevant edits, resolve blocking findings, and run applicable checks successfully. If review is unavailable or inconclusive, the task remains incomplete and the coordinator reports the blocker; the coordinator cannot approve its own work in place of the reviewer.

## Completion reports

Subagents return their completion report directly to the coordinator in their final response. Separate report files are not required. Each report identifies:

- The assigned plan and revision, and completion status.
- Changed files or reviewed scope and behaviour implemented or covered.
- Verification commands actually run and their outcomes.
- Remaining blockers, risks, and documentation needs.
- For reviews, actionable findings with supporting evidence, or an explicit statement that no actionable findings were found together with review limits.
- For each implementer or tester completion and the final combined work, the reviewer identifies the reviewed submission and gives an explicit `approved`, `changes_requested`, or `blocked` status.

Agents report blockers as soon as they arise. The coordinator preserves concise handoff summaries and decisions in the feature plan; subagents do not edit that shared file or create separate workflow logs. A separate report artifact is used only when the coordinator assigns it a unique path and owner. Full execution requirements are in `workflow/instructions/coordinator.md`, with shared handoff requirements in `workflow/instructions/handoffs.md`.

## OpenSpec integration

The project uses the `spec-driven` schema in `openspec/config.yaml`. Its context and artifact rules guide proposals toward confirmed requirements, specifications toward observable acceptance scenarios, designs toward interface contracts, and tasks toward explicit ownership, verification, documentation, and reviewer approval. Proposed product ideas do not by themselves authorize implementation.

When applying an OpenSpec change, the coordinator follows the CLI's resolved context files, task source paths and lines, and status. It links the current OpenSpec artifacts and revisions from the coordinator-owned feature plan in `workflow/` instead of keeping conflicting copies of requirements, design, or tasks. The coordinator maintains shared planning and task records, starts parallel implementation and testing only when their shared contracts are ready, and follows the review and approval process above for each completion and the final combined work. Task checkboxes are completed only after the specified work, required verification, and reviewer approval; a blocked CLI state remains blocked.

Archive guidance checks and reports incomplete development, required verification, and reviewer approvals, and records the resulting archive path in the feature plan. Follow the OpenSpec archive and sync workflow, including its checks, prompts, resolved paths, and explicit user choices, including a confirmed choice to archive unfinished work. Such an archive does not satisfy the project's completion gate or establish successful implementation; report the remaining work and approvals. Context, artifact rules, and operation guidance inform the agent; they are prompt-level guidance rather than an automated CI gate, and operation guidance does not replace controlling CLI state or built-in workflow steps.

## Documentation and testing

The documentation writer must use `.agents/skills/write-documentation/SKILL.md`. Guide landing pages remain introductions and navigation; detailed content goes in suitable existing topic pages or distinct new topics within the same guide folder. Every new guide page requires a navigation entry in `_markbind/layouts/default.md`.

The tester follows repository test-design requirements, including equivalence partitions, boundary values, negative cases, and regression coverage when practical. Tests use Vitest and the `src/test/*.test.ts` convention. The coordinator verifies applicable tests, lint, production build, and documentation build results without claiming unexecuted checks.

## Example request

Once a feature's requirements have been defined, a request can say:

```text
Implement the agreed feature. Have codebase_explorer identify affected code,
implementer make the application change, tester cover the agreed behaviour,
documentation_writer update the relevant guide topics, and reviewer inspect
the completed changes. Coordinate file ownership and return verified results.
```

This example describes agent coordination; it does not define BugWatch product features.

## Configuration reference

The configuration follows the [official OpenAI subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents). Repository-wide instructions and pointers are maintained in `AGENTS.md` at the repository root; the detailed coordinator requirements are in `workflow/instructions/coordinator.md`.
