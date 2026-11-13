# Proposal

## Why

Testers can submit reports and save private drafts, but cannot correct a submitted report. Add author-controlled editing and a private mailbox so the assigned Developer can see what changed without losing the report's history or silently overwriting a severity change.

## What Changes

- Offer Edit report on eligible reports, opening a prefilled page for the original Tester. Keep existing field limits and active-project restrictions. Allow Open, Accepted, In progress and Awaiting tester information; deny other states.
- Save real changes, changed-field history and one assigned-Developer mailbox item atomically. Unassigned reports produce no notification; normalized unchanged saves produce no report updates or events.
- Let the Tester change project while preserving report ID, history, discussion, state and assignment. Both projects must be active. Reports involved in any current or captured duplicate link must stay in their project; other eligible fields remain editable. The user confirmed this restriction during PR9 reconciliation.
- Check severity changes when saving. First stop with an inline notice, retain the Tester's input and show the latest severity. A subsequent explicit save may keep the Tester's chosen value; agreeing with the Developer is a manual field change. No extra acceptance button or automatic merge.
- Reuse the existing AI suggestions and safeguards in the editor. Generating/applying suggestions never saves the report.
- Add a private Mailbox screen with All/Unread filtering, changed-field summaries, opening reports, marking items read and deleting items. Opening a report marks its item read; deletion removes the mailbox item only.
- Record the feature's first-pass checks, human-discovered omissions/defects, correction rounds, specialist findings, scoped coverage and available usage. Keep unknowns and failures visible.

Confirmed decisions and source conversation are recorded as D1–D10 in `workflow/submitted-report-editing/workflow-evidence.md`; ordinary, conflict, mailbox and AI mockups are in that directory. Images are design references, not implemented or tested screens.

This change delivers the mailbox foundation and **report-edit notifications only**. Reply and ready-for-retest notifications remain tracked product work; this slice does not remove those requirements. Do not add Developer severity editing, new lifecycle transitions, archive management, external notifications or a new AI integration.

## Capabilities

### New Capabilities

- `report-editing`: Original-Tester edits, input validation, project movement, severity conflict handling, no-change saves, attributable history and edit notification creation.
- `attention-mailbox`: Private mailbox retrieval, read status, navigation and deletion, initially populated by report-edit events.

### Modified Capabilities

None. Preserve existing report-workflow, report-discussion, authentication and project-management requirements; editing does not change lifecycle or discussion rules.

## Impact

- Reconcile implementation on development `39f4f0844a8601dac5e19222b0826670c3cec08a` (merged PR9 and PR10). Preserve discussion, resolution/duplicate-link behavior, current navigation and all existing states. Earlier50d6c30 evidence remains historical.
- Extend report types/repository/history parsing and the shared form; add report editing and mailbox pages/repository/routes and mailbox navigation. Keep account/session boundaries in AuthenticatedApp.
- Append `014_report_editing_mailbox.sql` after PR10's `013_developer_question_quota.sql`, preserving both features' readers and events. No production migration is applied by this proposal.
- Extend deterministic Vitest and isolated database verification. Require at least 80% line and branch coverage per agreed production file, meaningful critical-case assertions, real UI checks and independent review. Existing aggregate coverage is only a pre-PR8 baseline.
- Update the existing report guides and add a navigable mailbox guide topic during implementation. No new runtime service, dependency, provider or paid benchmark is proposed.

Planning artifacts are for review. Application implementation, live migrations, deployment, commits and PR creation are not performed in this planning step. The eventual PR targets development before preview review and any later master PR.
