# Create and edit active projects

## Status and revision

Revision 1. Planning artifacts authored; implementation not started. Authentication remains an external prerequisite. This coordinator record links the OpenSpec source of truth rather than duplicating its requirements.

Continuation: the user subsequently authorized simulated development before authentication/database availability. Revision-2 execution, concrete interfaces, submissions, approvals, and checks are recorded in [Simulated project development setup](2026-11-03-simulated-projects.md). This revision-1 record is retained as planning history; its original prerequisite gate is superseded for local simulation only.

## Authoritative artifacts

- [Proposal](../openspec/changes/create-edit-active-projects/proposal.md)
- [Project requirements and acceptance scenarios](../openspec/changes/create-edit-active-projects/specs/project-management/spec.md)
- [Design and proposed interfaces](../openspec/changes/create-edit-active-projects/design.md)
- [Tracked implementation tasks](../openspec/changes/create-edit-active-projects/tasks.md)

All four are revision 1 for this handoff. Requirements include the product owner's approved input limits, normalized globally unique names including archived projects, stale-save rejection, and atomic project history. Authentication is explicitly excluded from implementation scope here.

## Current implementation and prerequisite gate

`src/App.tsx` only renders a heading. No authentication, project modules, schema, or tests exist. React Router and Vitest are declared; a Supabase client/browser test environment is not yet declared. Bind the separate prerequisite's actual client/identity exports, trusted role source, schema order, and test identity setup into design before dependent implementation or delegation.

## File ownership and execution order

No agents have been delegated work for proposal generation. Proposed future exclusive ownership and concrete module contracts are in design decisions 2 and 6; ordered implementation/tests/docs and verification outcomes are in `tasks.md`. Coordinator owns shared entry points/configuration, these planning artifacts, and this record; implementation/test/documentation owners must not overwrite each other's work. Documentation topic/navigation work is serialized.

## Completion handoffs and review

Planning only; no implementer/tester submissions exist and no implementation approval is claimed. During apply, assign each submission an identifier and record the reporting owner, revision, changed scope, verification, reviewer disposition, and any replacement/fix submission here. Every implementation/test completion and affected later edit needs current independent approval.

## Verification

OpenSpec successfully resolved this repository and reported no existing changes or capabilities before scaffolding. Proposal/spec/design were recognized as done during incremental status checks. Final validation/status results are recorded in the proposal-generation log after execution. Application tests/build/lint and documentation build are not required for these planning-only artifacts and have not been run in this workflow.

## Outstanding work

All implementation checkboxes remain open. Separate authentication delivery, exact interface binding, implementation, database/browser verification, guide updates, and independent implementation review remain outstanding. Planning completion does not imply feature completion or deployment authorization.
