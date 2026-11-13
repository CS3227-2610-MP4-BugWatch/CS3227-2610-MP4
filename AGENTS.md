# AGENTS.md

This file defines the repository-wide instructions that AI coding agents must follow when working on BugWatch.

These instructions apply to all files in this repository unless a more specific instruction file exists for a particular directory.

## Project Overview

BugWatch is a bug tracker application built with React, TypeScript, and Vite.

Product requirements and feature proposals are recorded in `BugWatch.md`. Distinguish confirmed requirements from proposed features and open decisions; proposals are not implementation authorization. Do not assume a feature exists merely because it appears in the specification. Inspect the current implementation before modifying or documenting functionality.

## Project Specifications

- UI library: React.
- Language: TypeScript.
- Development server and build tooling: Vite.
- Package manager: npm.
- Testing framework: Vitest.
- Linting: ESLint, including TypeScript and React Hooks rules.
- Documentation tooling: MarkBind.

Use the versions declared in `package.json` and resolved in `package-lock.json`. Do not assume globally installed tools match the project. Use the existing npm scripts and local dependencies.

Do not downgrade dependencies or relax TypeScript settings to solve compatibility problems.

## Repository Structure

Respect the existing repository structure:

```text
src/                                  Application source code
src/features/                         Feature-specific code
src/shared/components/                Components used across features
src/assets/                           Assets imported by the application
src/test/*.test.ts                    Automated Vitest tests
public/                               Static assets served directly
docs/userGuide/                        User Guide landing page and topic pages
docs/developerGuide/                   Developer Guide landing page and topic pages
.agents/skills/                       Repository-specific agent skills
workflow/instructions/                Shared and coordinator instruction references
.codex/agents/                        Project-scoped agent definitions
workflow/<feature-name>/              Coordinator-owned feature plan and agent summaries for each feature
workflow/templates/                   Feature plan and agent summary templates
logs/                                 Agent interaction logs
```

Keep feature-specific components inside their feature folder. Place components used across features in `src/shared/components/`.

All automated tests belong in `src/test/` and use the `*.test.ts` filename pattern. Do not place tests beside application source files. If a testing approach requires a different extension or layout, clarify the requirement before changing this convention.

Respect the existing MarkBind documentation files and configuration at the repository root.

Do not create new top-level directories unless required by the task or explicitly requested by the user. Do not reorganize existing directories merely because another structure appears preferable.

## Before Making Changes

1. Read the user's request completely.
2. Read existing documentation relevant to the request.
3. Inspect the files relevant to the requested change.
4. Inspect related tests.
5. Inspect relevant components, hooks, types, utilities, and other dependencies before modifying their behaviour.
6. Check conventions in nearby code before introducing a new pattern.
7. Determine the smallest reasonable set of files that must change.

Do not begin by creating new components or modules when existing code may already provide the required functionality. Prefer modifying or extending the existing design over introducing parallel implementations.

## Scope of Changes

Make only changes necessary to satisfy the user's requested task.

Do not:

- Perform unrelated refactoring.
- Rename unrelated components, functions, types, or variables.
- Reformat unrelated files.
- Change public interfaces unnecessarily.
- Introduce speculative functionality.
- Create abstractions solely for possible future requirements.
- Delete existing functionality without explicit justification.
- Modify unrelated tests merely to make a build pass.

If an unrelated problem is discovered, report it separately rather than fixing it as part of the current task unless it prevents completion of the requested work.

## Further Instructions

Read the applicable references before starting the corresponding work. Paths are relative to the repository root. These files contain mandatory instructions moved from this file; they are not automatically loaded merely because they exist. Do not read unrelated references solely because they are listed here.

| Work or role | Required instructions |
| --- | --- |
| Root agent coordinating any task | `workflow/instructions/coordinator.md`; relevant specialist references when planning, performing, or reviewing that work directly |
| Exploring feature behavior and preparing a decision recap | `workflow/instructions/exploration.md`; use the existing OpenSpec explore skill when applicable |
| Writing or reviewing application code, tests, architecture, or dependencies | `workflow/instructions/code-standards.md` |
| Planning, writing, or reviewing tests and coverage | `workflow/instructions/testing.md` |
| Planning, writing, or reviewing guide documentation and its requirements | `workflow/instructions/documentation.md`; use `.agents/skills/write-documentation/SKILL.md` before guide edits |
| Coordinating or carrying out delegated work | `workflow/instructions/handoffs.md`; the assigned feature plan and revision when provided |
| Planning, performing, or reviewing rendered UI checks | `workflow/instructions/ui-evidence.md` |
| Planning, running, or interpreting an instruction-routing experiment | `workflow/instructions/workflow-evaluation.md` |
| Writing summaries, artifacts or the individual reflection | Use `.agents/skills/explain-software-changes/SKILL.md` for those written outputs only; do not load or apply it for ordinary chat, exploration questions, quick explanations or progress updates |
| Explorer investigating specialist conventions | The relevant standards above for the assigned investigation |

Role-specific responsibilities also live in `.codex/agents/*.toml`. Applicable shared constraints continue to apply to every role. When the root agent handles specialist work directly, it must load and follow the same relevant standards.

## Testing and Documentation Requirements

New behaviour should be accompanied by appropriate tests unless it cannot reasonably be tested automatically. Bug fixes should include a regression test when practical. Use Vitest in `src/test/*.test.ts`; follow `workflow/instructions/testing.md` for detailed test design, naming, environment, and quality requirements.

Document added or changed user-facing behaviour in the appropriate User Guide topic as part of the same task. Reflect material architecture, dependency, setup, or workflow changes in the Developer Guide. Documentation must describe actual implemented behaviour. Follow `workflow/instructions/documentation.md` and the documentation writing skill for detailed content, placement, navigation, and acknowledgement requirements.

## Build and Verification

After modifying application source code, run relevant tests and verification commands from the repository root:

```sh
npm run test -- --run
npm run lint
npm run build
```

`npm run test -- --run` executes Vitest once. `npm run build` runs TypeScript build checks and creates the Vite production build.

When modifying documentation or MarkBind configuration, also run:

```sh
npm run docs:build
```

Do not claim a command passed unless it was executed successfully. If verification cannot run because of an environment limitation, state this explicitly in the final response.

If verification fails, inspect the failure, determine its cause, fix failures caused by the current task, and rerun relevant verification.

Do not disable tests, linting, type checking, or other verification mechanisms merely to make the build succeed.

## Handling Ambiguity

When requirements are ambiguous, inspect existing behaviour and documentation for evidence, prefer behaviour consistent with the existing system, and avoid inventing product requirements.

If multiple interpretations would result in materially different user-facing behaviour, data models, security properties, or architecture, ask the user for clarification before implementing the decision.

For minor implementation details that do not affect externally observable behaviour, use reasonable engineering judgement and follow existing conventions.

## Multi-Agent Workflow

The main chat acts as coordinator. Delegate suitable independent work automatically when this improves the task; handle small or tightly coupled tasks directly. Do not spawn every role for every task.

Project agents are defined in `.codex/agents/`:

| Agent | Responsibility |
| --- | --- |
| `codebase_explorer` | Inspect code paths, dependencies, conventions, and tests; report evidence without editing files. |
| `implementer` | Make scoped React and TypeScript application changes. |
| `tester` | Design and implement Vitest tests in `src/test/*.test.ts`. |
| `ui_mockup_designer` | Create labeled UI mockup images during exploration without editing application code. |
| `ui_polisher` | Improve visual consistency and responsive presentation after feature implementation. |
| `documentation_writer` | Update guide topic pages and navigation using the documentation writing skill. |
| `reviewer` | Independently inspect correctness, regressions, security, tests, and documentation without editing files. |

Agents inherit the parent's model, reasoning settings, and permissions unless the user explicitly requests supported overrides. Instructions to avoid edits define role behaviour; they do not create a separate read-only sandbox.

The root agent must read `workflow/instructions/coordinator.md` for delegation, feature planning, execution order, integration, review, definition of done, overall logging, and final reporting. New feature plans live at `workflow/<feature-name>/feature-plan.md` and are owned by the coordinator. Each feature directory also holds the implementer's and tester's post-approval summaries when those agents participate.

Subagents must return their findings, changed files, actual checks and results, and unresolved issues to the coordinator. The coordinator owns further delegation; subagents must not spawn additional agents.

Each file has one active writer. Preserve unrelated user changes and follow assigned ownership. Subagents follow `workflow/instructions/handoffs.md`, report blockers promptly, and return completion reports to the coordinator. They must not edit the shared feature plan or create competing workflow logs. After independent approval, the implementer and tester write their own template-based summary files in the feature directory when assigned by the coordinator.

Every implementer or tester completion report, including completion of fixes, requires independent reviewer review and explicit approval before the coordinator may complete the overall task. A completion report alone is not approval. Follow `workflow/instructions/coordinator.md` and `workflow/instructions/handoffs.md` for approval tracking and mandatory re-review after changes.

The same review gate applies to each `ui_polisher` completion report. The coordinator assigns it presentation files only after functional implementation stabilizes and transfers exclusive file ownership before those edits begin.

See `docs/developerGuide/AgentWorkflow.md` for configuration and usage details.

## Workflow Records

The coordinator writes one new overall interaction log under `logs/` for every workflow task, including delegated steps. It preserves handoff summaries and decisions in the feature plan when one exists. Follow `workflow/instructions/coordinator.md` for the complete log format, filename rules, definition of done, and final response requirements. Never include credentials, personal data, or other secrets in logs, or claim checks that did not occur.

## Git Conventions

Follow the [SE-EDU Git Conventions](https://se-education.org/guides/conventions/git.html) when creating commits. A commit message must always have a subject, even when a body is unnecessary.
