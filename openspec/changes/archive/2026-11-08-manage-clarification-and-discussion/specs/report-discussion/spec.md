# Spec Delta

## Purpose

Let authenticated Testers and Developers discuss a submitted report in one readable conversation while keeping report facts and attributable activity readily accessible.

## ADDED Requirements

### Requirement: Shared report conversation
Each submitted report SHALL have one chronological conversation readable by authenticated Testers and Developers. Either role SHALL be able to post ordinary comments in active projects regardless of report ownership or assignment. Comments SHALL retain server-derived author identity and creation time and SHALL NOT change lifecycle state or assignment.

#### Scenario: Either role participates
- **WHEN** the reporter, another Tester, the assigned Developer, or another Developer posts a valid comment on an active-project report
- **THEN** the comment persists in that report's conversation with the authenticated author's label and server time, without changing state or assignment

#### Scenario: Empty conversation
- **WHEN** an authenticated user opens a report with no comments
- **THEN** the page shows a zero count, an empty-conversation message, and an available composer for an active project

#### Scenario: Persisted chronological readback
- **WHEN** another authenticated user reloads the report after comments have been posted
- **THEN** all saved comments remain available oldest first with deterministic ordering for equal timestamps

### Requirement: Replies reference the same conversation
Reply SHALL select an existing comment on the same report as a reference for a new ordinary comment. The new comment SHALL appear at its chronological position, with a navigable reference to the original, without a nested thread. Users SHALL be able to cancel a reply reference before posting.

#### Scenario: Reply to an earlier comment
- **WHEN** a user selects Reply on an earlier comment and posts a response
- **THEN** the response appears at the end of the current chronological conversation with a link to the referenced comment

#### Scenario: Cancel reply
- **WHEN** a user cancels the selected reply reference before posting
- **THEN** their entered text remains and posting creates an ordinary comment without a reference

#### Scenario: Invalid reply target
- **WHEN** a comment submission references a missing comment or a comment belonging to another report
- **THEN** it is rejected without creating a comment or exposing the other report's comment content

### Requirement: Discussion access boundaries
Comment access SHALL require authentication and a valid Tester or Developer profile. Author, report association, time, and identifiers SHALL be protected from caller forgery. Archived-project conversations SHALL remain readable but reject new comments and replies, including requests from stale pages. Ordinary callers SHALL NOT edit or delete saved comments.

#### Scenario: Visitor or invalid profile
- **WHEN** a visitor or authenticated account without a valid profile directly requests conversation reads or writes
- **THEN** access is denied without exposing comments or changing data

#### Scenario: Archive occurs after load
- **WHEN** a user submits a comment after its project has been archived
- **THEN** persistence rejects it with an archive explanation and leaves the saved conversation unchanged

#### Scenario: Archived conversation display
- **WHEN** an authenticated user opens an archived-project report
- **THEN** its saved comments and reply references remain readable and the page explains why posting is unavailable

#### Scenario: Forged or direct mutation
- **WHEN** a caller attempts to choose another author, change system timestamps, bypass scoped posting, or update/delete an existing comment
- **THEN** persistence rejects the manipulation and preserves stored comments

### Requirement: Safe comment text
Comments SHALL contain 1-5,000 Unicode code points after surrounding whitespace is trimmed. Input validation SHALL be consistent between the application and persistence. Line breaks SHALL remain readable. User-supplied text and identity labels SHALL render as literal text without executing markup, and unavailable display names SHALL have a meaningful fallback.

#### Scenario: Blank submission
- **WHEN** a user submits empty or whitespace-only text
- **THEN** the page explains the validation error and no comment is stored

#### Scenario: Multiline and markup content
- **WHEN** a user posts multiline text containing HTML-like characters or script markup
- **THEN** the saved text preserves meaningful line breaks and displays the markup literally without execution

#### Scenario: Invalid text input
- **WHEN** a direct request supplies a non-text body or exceeds the configured comment text limit
- **THEN** it is rejected without persisting a comment

#### Scenario: Unicode length boundaries
- **WHEN** trimmed comment text contains 1 or 5,000 Unicode code points, including astral characters
- **THEN** it is accepted, while 5,001 code points is rejected without storing a comment

### Requirement: Conversation and Activity navigation
The report page SHALL default to Conversation, containing initially expanded collapsible report details followed by discussion and a composer. A separate Activity tab SHALL contain history. Title, state, severity, reporter, assignee, and eligible workflow actions SHALL remain above both tabs. A comment count and discussion/latest shortcuts SHALL make the conversation discoverable.

#### Scenario: Initial report visit
- **WHEN** a user opens a report without selecting a subsection
- **THEN** Conversation is selected, report details are expanded, and discussion follows the report details without interleaved activity events

#### Scenario: Read history without losing context
- **WHEN** a user selects Activity
- **THEN** activity history replaces the conversation panel while the header and eligible report actions remain available

#### Scenario: Jump to discussion or latest comment
- **WHEN** a user activates a discussion shortcut or follows a comment reference
- **THEN** Conversation is selected and the intended discussion section or comment is brought into view with keyboard-accessible navigation

#### Scenario: Preserve unsent text across local views
- **WHEN** a user switches report tabs or collapses details while composing a comment
- **THEN** the entered text and reply target remain in memory on that report page without creating a saved draft

#### Scenario: Responsive and keyboard use
- **WHEN** a user operates tabs, details disclosure, comment references, and the composer with a keyboard or on a narrow screen
- **THEN** controls have accessible names and visible focus and long content wraps without hiding report actions

### Requirement: Compact complete activity
Activity SHALL show each event's actor, occurrence time, and concise action summary. Recorded changes SHALL be expandable and initially collapsed. Existing creation snapshots and before/after values SHALL remain readable without duplicating all report input fields in the initial history view.

#### Scenario: Creation snapshot disclosure
- **WHEN** a user expands a creation event in Activity
- **THEN** the original recorded submitted fields are readable even though they were collapsed in the compact view

#### Scenario: Clarification history disclosure
- **WHEN** a user inspects a clarification transition in Activity
- **THEN** its actor and time are visible with the action summary and its old/new states are accessible in recorded changes

### Requirement: Deliberate comment outcomes
Posting SHALL show progress and prevent overlapping local submissions. Confirmed success SHALL display the saved comment and update the count. Validation failures SHALL preserve input. Uncertain outcomes SHALL explain that saving may have occurred and offer readback without automatic reposting. Session expiry SHALL use existing authentication handling; stale completions SHALL NOT populate a different report or identity.

#### Scenario: Successful post
- **WHEN** a post succeeds
- **THEN** the saved comment appears once, the count updates, and the composer is cleared without changing report state

#### Scenario: Repeated clicks
- **WHEN** a user repeats Post comment while a submission is pending
- **THEN** no overlapping local post starts

#### Scenario: Uncertain post or readback
- **WHEN** connection failure prevents confirmation of posting or refreshing comments
- **THEN** the page retains entered text, explains uncertainty, offers a read-only reload, and does not automatically repost or assert that nothing was saved

#### Scenario: Partial read failure
- **WHEN** discussion or activity cannot be loaded but the report is readable
- **THEN** the affected section shows a retryable error without discarding the readable report or falsely displaying an empty conversation

#### Scenario: Session ends or user navigates
- **WHEN** authentication expires or a pending comment operation finishes after report navigation or identity replacement
- **THEN** existing authentication handling applies, unsaved text is not persisted, and stale results cannot populate the replacement screen
