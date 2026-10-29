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

Each definition supplies `name`, `description`, and `developer_instructions`. Model and reasoning overrides are intentionally omitted so agents inherit the parent's selections. The configuration leaves concurrency at the client's configured default; five available roles do not require five simultaneous agents.

Use a Codex client that supports project-scoped standalone custom agents. Open or start a new chat in this trusted repository after adding or changing configurations so the client can load them. Availability also depends on client support and managed settings; a repository configuration cannot override those settings.

Agents inherit the parent's permissions. The explorer and reviewer are instructed to avoid mutations, but this is a behavioural restriction rather than a separate filesystem sandbox.

## How work is coordinated

The coordinator establishes scope and acceptance criteria, then selects only the roles needed for the task. An explorer can identify affected code before an implementer starts. Implementation and tests can proceed in parallel once their shared interfaces and expected behaviour are agreed. Documentation is finalized against the implemented behaviour. A reviewer examines substantial changes before the coordinator resolves findings and completes verification.

Each assignment identifies its objective, context, acceptance criteria, owned files, and expected report. Agents share the working tree, so each file has one active writer. Shared configuration, dependency lockfiles, guide landing pages, and the MarkBind layout require serialized edits. Subagents return further delegation needs to the coordinator rather than spawning their own agents.

The coordinator collects findings, changes, executed checks, and unresolved issues. It records one workflow interaction log under `logs/`, including the delegated work, and reports the final outcome to the user.

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

The configuration follows the [official OpenAI subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents). Repository-wide coordination requirements are maintained in `AGENTS.md` at the repository root.
