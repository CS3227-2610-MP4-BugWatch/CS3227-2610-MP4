# {Feature name} â€” Feature Plan

## Status and Revision

- **Status:** Planned | In progress | Blocked | Complete (choose one and explain any blocker).
- **Revision:** 1 (increment whenever the plan's requirements, ownership, interfaces, or execution contract changes).
- **Updated:** YYYY-MM-DD.
- **Coordinator:** {agent or main chat identifier}.
- **Requirement sources:** {links to confirmed user decisions, specifications, or OpenSpec artifacts and their revisions; distinguish proposals and open decisions}.

## Confirmed Requirements and Acceptance Criteria

| ID | Confirmed requirement | Observable acceptance criterion | Source |
| --- | --- | --- | --- |
| R1 | {required behavior} | {how completion is judged} | {link or user decision} |

## Scope Exclusions and Open Decisions

- **Excluded:** {behavior or files outside this task, with a brief reason}.
- **Open decisions:** {question, owner, and effect on work; write â€œNoneâ€ when resolved}.

## Existing Code, Reuse, and Test Environment

- **Relevant code:** {paths and current behavior}.
- **Reusable functionality and dependencies:** {paths, exported contracts, or existing patterns}.
- **Related tests:** {paths and coverage relevant to this change}.
- **Test environment:** {runner, mocks, fixtures, external services, configuration, and known limits; never include secrets}.
- **Visual evidence:** {affected screens/states, actual app theme and viewport targets, isolated fixtures, capture/report paths and reviewer; or N/A with a reason for non-UI work. Follow workflow/instructions/ui-evidence.md}.
- **Evaluation scope:** {if an instruction-routing experiment is assigned, link the experiment plan, frozen task/checks, conditions, repetitions/order and usage evidence sources; otherwise Not assigned. Follow workflow/instructions/workflow-evaluation.md; do not launch experiments implicitly}.

## File Ownership

| File or exact file pattern | Planned change | Single active owner |
| --- | --- | --- |
| `{path}` | Create | {coordinator or assigned agent} |

Include application files, `src/test/*.test.ts` files, agent summary files in this feature directory, and any shared configuration, documentation, or navigation files. Name the coordinator as owner for serialized shared edits. Assign each summary file to its own agent. Record presentation-file ownership transferred from implementer to `ui_polisher` after functional work; never give both agents active ownership at once. Update ownership before reassigning a file.

## Interfaces

For each interface needed by separate owners, copy the following bullets. Use plain language and concrete names; write `None` with a reason if no cross-owner interface is needed. Record observable behavior without prescribing private implementation details.

### Interface I1: {human-readable name}

- **Module path:** `{path}`.
- **Exports and types:** `{function/type names and signatures}`.
- **Inputs:** {parameters, accepted values, and validation}.
- **Outputs:** {return values, types, and observable result}.
- **Errors:** {error types/codes and expected caller handling}.
- **Side effects:** {data writes, navigation, state changes, or â€œNoneâ€}.
- **Boundary behavior:** {empty, missing, invalid, duplicate, unauthorized, or concurrent cases relevant to this contract}.
- **Consumers and owners:** {producer owner and affected consumer/test owners}.

## Implementation Tasks

| ID | Task and expected result | Owner | Status |
| --- | --- | --- | --- |
| I1 | {concrete change} | {owner} | Pending |

Link authoritative OpenSpec tasks where applicable. For a feature with user-facing pages, include a scoped `ui_polisher` task after functional implementation and before final review; otherwise record why it does not apply. Keep this table aligned with the agreed scope and file ownership; do not mark work complete from an agent report alone.

## Required Test Outcomes

| ID | Behavior or risk to verify | Expected outcome | Test file and owner |
| --- | --- | --- | --- |
| T1 | {normal, boundary, negative, or regression case} | {observable assertion} | `{src/test/name.test.ts}` â€” {owner} |

The tester may add justified cases within the confirmed requirements.

## Verification Commands and Gates

| Command or check | Purpose | Required when | Owner |
| --- | --- | --- | --- |
| `npm run test -- --run` | Vitest suite | Application code changes | {owner} |
| `npm run lint` | ESLint | Application code changes | {owner} |
| `npm run build` | TypeScript and production build | Application code changes | {owner} |
| `npm run docs:build` | MarkBind build | Guide or MarkBind changes | {owner} |

Add task-specific checks and external prerequisites. Record actual outcomes in Final Verification, including checks that could not run.

## Completion Handoffs and Submission Register

| Submission ID | Agent and plan revision | Changed files or reviewed scope | Reported behavior and actual checks | State |
| --- | --- | --- | --- | --- |
| {ID} | {agent; revision} | {paths} | {summary and results} | Awaiting review |

Record each implementer, tester, and `ui_polisher` completion or fix as a distinct submission. Preserve superseded submissions and their dispositions.

## Review Findings and Approval Decisions

| Submission ID or combined work | Reviewer and reviewed revision/state | Decision | Findings, limits, and outstanding requirements |
| --- | --- | --- | --- |
| {ID} | {reviewer; revision or state} | `approved` / `changes_requested` / `blocked` | {evidence and limits} |

Record an explicit decision for every submission and for the final combined implementation and tests. An approval is stale after a relevant edit; record the fresh review against the updated state.

## Resolutions and Plan Revisions

| Revision or finding | Resolution and affected files/contracts | Affected agents notified | Follow-up submission or review |
| --- | --- | --- | --- |
| {revision/ID} | {decision and change} | {agent names and when} | {ID or pending} |

## Agent Summaries

| Agent and role | Unique summary file in this feature directory | Approved submissions covered | Coordinator check |
| --- | --- | --- | --- |
| {implementer name} — implementer | `implementer-summary.md` | {latest approved IDs or reason not applicable} | Pending |
| {tester name} — tester | `tester-summary.md` | {latest approved IDs or reason not applicable} | Pending |

Add one row per participating agent. When a role has multiple agents, replace its usual filename with distinct agent-named files, such as `implementer-backend-summary.md` and `implementer-ui-summary.md`. Request these files only after independent reviewer approval of the latest submissions and combined work. Check that each required file exists, follows its template, and matches the reviewed work before completion.

## Final Verification

| Command or check | Actual result and evidence | Remaining limitation |
| --- | --- | --- |
| {check} | {passed/failed/not run, with relevant counts or reason} | {limitation or â€œNoneâ€} |

- **Final diff inspection:** {scope, result, and any unrelated changes preserved}.
- **Final approval state:** {latest submission IDs and explicit combined-work decision, or pending approvals}.
- **Remaining limitations:** {unresolved issues or `None`}.
- **Completion basis:** {why the status above is accurate against the acceptance criteria and applicable gates}.
