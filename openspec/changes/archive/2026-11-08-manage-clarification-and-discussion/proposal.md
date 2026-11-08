# Proposal

## Why

Developers can accept and start investigating reports, but cannot yet ask for clarification within BugWatch or indicate that investigation is waiting for tester information. The report page also repeats submitted fields in its creation history, leaving little room for conversation.

## What Changes

- Add explicit assignee-only transitions from In progress to Awaiting tester information and back to In progress, preserving assignment and recording each transition atomically in history.
- Keep state changes independent of comments: no comment is required to enter the waiting state, and questions or replies never change state automatically.
- Add one shared chronological conversation per submitted report. Authenticated Testers and Developers can post ordinary comments and reference an earlier comment using Reply; replies remain in the same timeline.
- Keep the report header and eligible workflow actions above Conversation and Activity tabs. Conversation contains initially expanded, collapsible report details, the discussion, and its composer. Activity contains compact entries with expandable recorded changes, retaining the creation snapshot.
- Expose comment counts and shortcuts to discussion/latest comment; preserve authenticated access, archive write protection, session handling, existing navigation, and readable report listings.
- Update report guides and add repository, UI, authorization, concurrency, and transaction verification.

Confirmed scope comes from the exploration decisions and BugWatch C-14, C-18, C-27, C-32, C-38, C-40, D-03, and shared Ordinary discussion threads. The product owner confirmed the 5,000-code-point comment limit when requesting implementation. No mailbox, automatic state changes, reminders, nested threads, comment drafts, special clarification message type, Markdown editor, attachments, comment editing/deletion, resolution, or release/transfer is included.

## Capabilities

### New Capabilities

- `report-discussion`: Authenticated, report-scoped chronological comments and reply references, safe persistence and recovery, and the Conversation/Activity page layout.

### Modified Capabilities

- `report-workflow`: Add explicit clarification wait/resume transitions, their authorization and history, and extend detail controls and shared readback to the waiting state.

## Impact

- Extend `src/features/reports/types.ts`, `reportRepository.ts`, validation, the existing authenticated repository wrapper in `src/features/auth/AuthenticatedApp.tsx`, report details and scoped styles; preserve existing report and draft contracts.
- Add additive migration `011_report_clarification_discussion.sql` after the upstream Tester assistant migrations `009` and `010` for comments, scoped RPCs, workflow constraints, and clarification history. No hosted migration, provisioning, purchase, or deployment is authorized by this proposal workflow.
- Extend Vitest coverage under `src/test/*.test.ts`, the isolated report database runner where needed, and transactional SQL verification.
- Update existing `docs/userGuide/Reports.md` and `docs/developerGuide/Reports.md` during implementation; no new runtime dependency is expected.
- Coordinate exclusive ownership of `ReportDetailsPage.tsx` and `src/App.css` with the still-active `revamp-application-ui` change. Its pending work must not overwrite this layout. Preserve the report submission/draft implementations despite their changes remaining administratively open.
