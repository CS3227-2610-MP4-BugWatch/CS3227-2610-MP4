# Agent Interaction Log

## User Prompt

Continue collecting decisions for every unconfirmed BugWatch specification item.

Follow-up answers:

- Use Supabase Auth for sessions, revoked after one hour of inactivity.
- Asked whether unsaved text could be affected by an inactivity-based timeout.
- Accept all proposed history events, showing actor, timestamp, and changes, readable by all logged-in users. Events tied to unapproved features remain conditional.
- Defer decisions on additional mailbox events and recipients.
- Include every proposed mailbox action: read/unread status, mark as read, open related bug/message, dismiss/delete, and unread filter.
- Group profile reports/assignments in tabs by status. Users may edit display names but not usernames.
- Sort by creation date; combine filters such as project, state, assignment, and severity; use case-insensitive title search.

## Steps Taken

- Explained that leaving an unfinished report open while away can lead to returning after session expiry; unsaved-input handling remains undecided.
- Consulted official Supabase session documentation to distinguish refresh-based inactivity from user interaction and record implementation dependencies without choosing an implementation.
- Updated confirmed requirements and affected shared-feature, account-model, and open-decision sections.
- Prepared clarification questions on inactivity and unsaved input alongside the next batch on report requirements.

## Reasoning Summary

The latest response selects Supabase Auth, replacing the previous tentative preference. The one-hour requirement does not by itself define what counts as activity. Supabase refresh-based inactivity and browser typing/clicking are distinct, so the specification retains that choice rather than assuming equivalence. Explicitly deferred mailbox rules remain deferred. Refinements to search/filter/sort scope supersede the broad earlier candidate list without treating omitted options as approved.

## Changes Made

- `BugWatch.md`: Recorded confirmed refinements, deferred mailbox decisions, and remaining questions.
- `logs/2026-10-30-specification-decisions-batch-2-followup.md`: Recorded this decision batch.

## Verification

- Cross-checked answers against edited requirement rows and feature descriptions.
- Used the primary source at https://supabase.com/docs/guides/auth/sessions for session semantics and limitations.
- Whitespace and documentation build results are reported in chat; no application code or tests changed.

## Final Output and Conclusion

Updated the specification without deciding inactivity semantics, unsaved-input restoration, historical assignment scope, detailed filter/sort defaults, or deferred mailbox triggers. Report and later feature batches remain pending.
