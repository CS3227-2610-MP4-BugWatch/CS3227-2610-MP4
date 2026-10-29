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
.codex/agents/                        Project-scoped agent definitions
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

## Architecture and Design

Follow the architecture already established in the repository. Before introducing a new architectural pattern, inspect how similar functionality is implemented.

Maintain clear separation of responsibilities:

- Components should primarily handle presentation and user interaction.
- Business rules should not be embedded unnecessarily in presentation code.
- Persistence and data access concerns should remain separate from presentation concerns.
- Domain types and logic should represent application concepts and enforce appropriate invariants.
- Authentication and authorization checks, when implemented, must not depend solely on UI visibility or navigation restrictions.

Avoid unnecessary layers, hooks, services, repositories, factories, or utility modules unless they solve a concrete design problem. Prefer simple designs that satisfy current requirements.

## TypeScript and React Coding Standards

The configured ESLint rules and TypeScript compiler settings are the executable source of truth for automatically enforceable requirements. Follow consistent conventions in existing code where these tools do not specify a rule.

- Use descriptive component, function, type, and variable names.
- Keep components and functions focused on a single responsibility.
- Follow React's Rules of Hooks and the configured React Hooks lint rules.
- Keep state updates immutable and follow existing state-management patterns.
- Avoid excessive function length, deeply nested control flow, and duplicated logic.
- Prefer clear code over unnecessarily clever code.
- Avoid magic numbers and unexplained string literals where a named constant is appropriate.
- Use appropriate types; do not bypass type checking merely to make verification pass.
- Keep module exports limited to what consumers require.
- Avoid mutable global state.
- Do not leave commented-out code or temporary debugging output.
- Remove unused imports and variables.
- Handle errors deliberately rather than silently ignoring them.

Do not suppress TypeScript or ESLint diagnostics simply to make verification pass.

## Dependencies

Before adding a dependency:

1. Check whether the functionality can reasonably be implemented using browser APIs, JavaScript/TypeScript facilities, React, or an existing project dependency.
2. Verify compatibility with the project's installed tooling and declared runtime requirements.
3. Prefer actively maintained and established libraries.
4. Add only the packages actually required.

Do not introduce dependencies merely to avoid implementing trivial functionality. Do not remove or upgrade unrelated dependencies unless required by the task. Keep `package.json` and `package-lock.json` consistent.

Mention significant new dependencies in the final task summary.

## Documentation

Before writing or updating user or developer guide documentation, read and use the documentation writing skill at `.agents/skills/write-documentation/SKILL.md`.

`docs/userGuide/UserGuide.md` and `docs/developerGuide/DeveloperGuide.md` serve as landing pages. Detailed content belongs in topic Markdown files within the corresponding guide folder. Determine whether the information fits an existing topic page or needs a new page using the skill's placement criteria.

Whenever creating a new guide Markdown page, add its navigation entry in `_markbind/layouts/default.md` in the same change. Follow the skill's navigation and verification instructions.

### User Documentation

Document all added user-facing features in the appropriate topic pages within `docs/userGuide/`. Include, where applicable:

- An explanation of the feature.
- Instructions for using it.
- Example use cases and expected outcomes.
- Relevant restrictions.
- Warnings or important behaviour the user should know.

Documentation must describe the actual current implementation. Do not document unimplemented functionality, describe planned behaviour as existing behaviour, invent screens or workflows, or claim testing that did not occur.

When an existing user-facing feature changes, update its User Guide documentation as part of the same task.

### Developer Documentation

Reflect material changes to architecture, design, dependencies, setup, development workflows, or major implementation decisions in the appropriate topic pages within `docs/developerGuide/`.

Do not update the Developer Guide for trivial implementation details that do not affect developers' understanding of the system.

When external code, ideas, designs, or documentation are reused or adapted, record acknowledgements required by the project in the Developer Guide's acknowledgement section.

## Testing

Write all automated tests using Vitest in `src/test/*.test.ts`.

New behaviour should be accompanied by appropriate tests unless it cannot reasonably be tested automatically. Bug fixes should include a regression test when practical.

### Test Case Design

Functions requiring testing should have tests covering relevant equivalence partitions. Consider more than explicit parameters:

- Component or target-object state.
- Relevant collaborating objects.
- Persistent state.
- Application state.
- Global state accessed by the function.

Use Boundary Value Analysis (BVA) where boundaries exist.

Compatible positive conditions may be combined when this does not obscure the behaviour under test. Test negative conditions separately when this makes failures easier to diagnose. Do not combine unrelated failure conditions into one test.

### Test Naming

Use descriptive Vitest test titles identifying the operation, relevant input or state, and expected outcome. Preserve the source convention where applicable:

```text
<functionName>_<inputOrState>_<expectedOutcome>
```

### Test Quality

Tests must:

- Be deterministic and independent where practical.
- Test observable behaviour rather than implementation details.
- Contain meaningful assertions.
- Avoid depending on execution order.
- Avoid external services unless explicitly testing an integration.

Do not modify a valid test simply because the implementation fails it. Determine whether the implementation or test is incorrect before making changes.

Do not assume a browser-like test environment or component-testing library is installed or configured. Inspect the current setup before using environment-specific APIs.

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
| `documentation_writer` | Update guide topic pages and navigation using the documentation writing skill. |
| `reviewer` | Independently inspect correctness, regressions, security, tests, and documentation without editing files. |

Agents inherit the parent's model, reasoning settings, and permissions unless the user explicitly requests supported overrides. Instructions to avoid edits define role behaviour; they do not create a separate read-only sandbox.

The coordinator must:

1. Confirm scope and acceptance criteria from the user's request and existing evidence. Use the explorer when investigation would materially help.
2. Give each delegated task a clear objective, relevant context, acceptance criteria, owned files, and expected handoff. Preserve unrelated user changes.
3. Parallelize only independent work. Agree on interfaces before splitting implementation and tests. Give each file a single active writer; serialize shared configuration, lockfile, layout, and landing-page edits.
4. Finalize behaviour-dependent documentation after implementation stabilizes. Use the documentation writing skill for guide changes.
5. Collect delegated results and resolve integration issues. Request an independent reviewer pass for substantial changes after the relevant work is ready; route actionable fixes to the owning agent or apply them directly, then verify affected behaviour.
6. Inspect the combined diff and confirm relevant verification results before responding. Clearly report missing checks or unavailable agent capabilities.
7. Write one interaction log for the overall workflow, including delegated steps, significant decisions, changes, and actual verification. Subagents return their handoffs for this log rather than creating competing task logs.

Subagents must return their findings, changed files, actual checks and results, and unresolved issues to the coordinator. The coordinator owns further delegation; subagents must not spawn additional agents.

See `docs/developerGuide/AgentWorkflow.md` for configuration and usage details.

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
- [ ] The agent interaction has been recorded under `logs/`.
- [ ] Verification that could not be performed is clearly reported.

## Git Conventions

Follow the [SE-EDU Git Conventions](https://se-education.org/guides/conventions/git.html) when creating commits. A commit message must always have a subject, even when a body is unnecessary.

## Final Response

Provide a concise summary containing what changed, important implementation or design decisions, tests added or modified, verification and results, documentation updates, and any limitations or unresolved issues.

Never report a test, build, lint check, type check, application run, or other verification as successful unless it was executed successfully.
