## Merge order: merge PR #5 first

**Reviewers: please merge [PR #5 — Revamp BugWatch workspace and application UI](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/pull/5) before merging this PR.** This branch starts from PR #5's `ui-polish` head (`9a298e6`) and builds on its Mantine presentation, workspace routing, and existing report screens. Until #5 is merged, the comparison against `development` includes its seven prerequisite commits as well as this feature's commits. After #5 is merged, recheck the comparison and CI before merging this PR; if it was squash-merged, the branch may need rebasing to remove the prerequisite commits from the comparison.

## Problem and resulting behavior

Developers can read submitted bug reports but cannot claim responsibility or explicitly indicate that investigation has begun. This change adds a persisted ownership workflow with two separate actions:

`Open / Unassigned` → **Accept report** → `Accepted / Assigned to the accepting Developer` → **Start investigation** → `In progress / Same assignee and assignment time`.

Acceptance does not automatically begin investigation. For example, Developer A can accept an available report in any active project, including one created by another Developer, then start investigation later. Developer B sees A's ownership and cannot start investigation on A's behalf. Testers retain shared read access.

## User-facing changes

- Offer **Accept report** only on the details of an Open, unassigned report in an active project, and only to Developers.
- Offer **Start investigation** only to the assigned Developer viewing an Accepted report in an active project. Neither action is available for In progress reports or archived projects.
- Keep the project's Reports listing free of workflow actions while displaying persisted status and assignee labels.
- Display assignment time on report details and replace creation-only history with **Activity history**, retaining creation entries and adding attributable acceptance/investigation events and recorded changes.
- Render identity labels as literal text, with username or unavailable-user fallbacks for blank names.
- Prevent overlapping local mutations and expose pending feedback. After success or conflicts, reload authoritative report and history data without navigating away.
- Explain already-assigned, state-conflict, archived, and service failures. After an uncertain mutation outcome or failed readback, require read-only Reload before another action; never automatically retry the mutation.
- Preserve existing expired-session handling and ignore late completions after report navigation, logout, unmount, or identity replacement.

## Persistence and authorization

Migration `008_report_workflow.sql`, applied after migrations 001–007, adds `assigned_at` and replaces the Open-only restrictions with consistent state/assignment combinations: Open requires null assignee/time; Accepted and In progress require both. Existing Open rows remain valid without an assignment backfill.

The ID-only `accept_report` and `start_report_investigation` RPCs derive identity and role from authentication. They reject Testers, unauthenticated/unprofiled accounts, archived projects, invalid transitions and non-assignee investigation attempts. Both lock the project before the report and obtain the action timestamp after locking. Concurrent acceptance has one winner; repeated acceptance returns `P2006`, and invalid/stale source states return `P2007`.

Each transition writes the report and exactly one history event in the same transaction. A history failure rolls back state, assignment and timestamps. Investigation preserves the original assignment identity/time. Ordinary direct report/history writes remain revoked, and security-definer RPCs use an empty search path with authenticated-only execute grants.

Scoped report/history/list reads now include relevant assignee and actor labels without adding a profile directory. Strict repository decoding accepts the three supported states and rejects malformed or inconsistent metadata. Creation and old draft submission receipts return the extended report shape, including receipts whose report has since progressed. Listing keyset pagination and timestamp precision are preserved.

## Tests and verification

- New repository coverage checks ID-only RPCs, safe error mapping, malformed identifiers/data, state/assignment invariants, activity decoding, literal/blank labels, progressed draft receipts and pagination precision.
- New UI coverage checks role/state/archive eligibility, independent accept/start clicks, duplicate prevention, conflict refresh, uncertain mutation/readback recovery, shared readback and read-only listings. Authentication-boundary regressions cover expiry and late completion after logout/identity replacement.
- The isolated workflow database suite covers distinct Developers racing acceptance, concurrent investigation starts, preserved assignment time, repeated requests, role/ownership/archive restrictions, forged/direct writes, unchanged data after rejection, and persisted scoped readback.
- `verify_report_workflow.sql` forces history failures for both actions and checks complete rollback using temporary fixtures rolled back at the end.
- The existing `npm run test:report-db` runner now selects both report database suites and preserves its isolated-target guards and environment restoration. The long investigation race scenario has a finite 30-second budget for its 24 hosted requests; concurrency and all assertions are unchanged.

Executed local verification:

- `npm run test -- --run`: **451 passed, 129 skipped** across 18 passing files and four skipped hosted files. Hosted skips are not counted as passes.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run docs:build`: passed, 159 pages; existing unrelated MarkBind missing-variable/intra-link warnings remain.
- TEST-2 correction: scoped ESLint, TypeScript build checks and whitespace checks passed.
- OpenSpec main specifications and strict report-workflow validation passed; all **18/18** implementation tasks are complete.

The user separately reported successful isolated migration application, rollback SQL, two-Developer/Tester browser checks, narrow/wide layout and keyboard checks, and a final passing `npm run test:report-db` run after the timeout correction. These hosted/manual results are user-reported; no exact hosted counts are inferred. Agent browser automation was unavailable. Independent review explicitly approved implementation, tests, timeout correction, presentation, guides and final combined work; the feature directory contains the post-approval summaries and verification record.

## Documentation and scope

Update the existing User and Developer Reports topics for the separate actions, restrictions, assignment/activity display, error recovery, migration/security contracts and verification commands. Sync the seven report-workflow requirements into the main specification and retain the completed change under `openspec/changes/archive/2026-11-07-accept-and-start-report-investigation/`.

Release/transfer, resolution/closure, clarification/discussion, notifications, general report editing and archive/restore controls are outside this change. No package dependency was added.

## Rollout and rollback

Apply migration 008 to the target environment after 001–007 before deploying the updated frontend. It has been reported verified against the isolated project; this PR does not apply a production migration or deploy production.

Once assigned reports exist, an older Open-only frontend cannot decode them. If corrective action is needed, disable workflow actions while retaining the extended readers and workflow data; use a forward corrective migration rather than removing ownership/history metadata. Coordinate deployment after PR #5 and this PR have been merged in that order.

## Commit organization

1. Add transactional workflow RPCs, hosted database coverage, rollback checks and runner selection.
2. Add repository contracts, detail actions, shared readback, auth integration and local regressions.
3. Document user workflows and developer migration/verification guidance.
4. Record the synced specification, archived planning artifacts, independent approvals and agent summaries.
5. Record the publication handoff after the draft PR is created.
