# Report editing specification delta

## Purpose

Let the original reporting Tester correct a submitted report while preserving its identity, discussion and accountable history, and inform its assigned Developer of real changes.

## ADDED Requirements

### Requirement: Original-reporter editing permissions
The system SHALL permit only the original reporting Tester to edit report inputs in an active project while Open, Accepted, In progress or Awaiting tester information. Persistence SHALL enforce these rules, not only the screen. Editing SHALL NOT change protected identity, assignment, lifecycle or creation metadata.

#### Scenario: Eligible reporter opens editor
- **WHEN** the original Tester opens an editable active-project report
- **THEN** Edit report opens a separate page prefilled with its current inputs

#### Scenario: Unauthorized caller
- **WHEN** another Tester, a Developer, a visitor or an account without a valid profile requests this editing operation directly
- **THEN** the operation is denied without report, history or notification changes

#### Scenario: Report becomes read only
- **WHEN** the source project is archived or the report is in a state outside the editable allowlist when saving
- **THEN** saving is denied even if the editor was opened earlier, and no write is committed

#### Scenario: Forged protected fields
- **WHEN** a caller attempts to change reporter, state, assignment or server timestamps through editing or direct writes
- **THEN** the protected change is refused rather than trusted from the caller

### Requirement: Existing report validation
Editing SHALL support the existing report input fields and submission validation. Text SHALL be trimmed and counted as Unicode code points. Title SHALL contain 1–200 characters; description, reproduction steps, expected and actual results 1–5000; version 1–100. Test environment SHALL be optional up to1000. Severity SHALL use the four existing choices; the selected project SHALL be valid and active.

#### Scenario: Valid edited values
- **WHEN** a Tester saves complete values within those limits and a valid severity
- **THEN** normalized values are eligible for persistence

#### Scenario: Required or oversized text
- **WHEN** required text is blank after trimming or a field exceeds its limit
- **THEN** field feedback identifies the problem, the input remains visible and nothing is saved

#### Scenario: Invalid project or severity
- **WHEN** a direct request supplies a missing, malformed, archived or unavailable project or an unsupported severity
- **THEN** the request is rejected without partially changing the report

### Requirement: Project movement preserves the report
A project change SHALL move the existing unlinked report, not copy it. Its ID, reporter, creation time, state, assignment, discussion and history SHALL remain intact. Both projects SHALL be active. Reports with any incoming or outgoing current or captured duplicate reference SHALL reject project changes with clear project-field feedback; other eligible edits SHALL remain allowed.

#### Scenario: Move an assigned report
- **WHEN** the original Tester moves an editable assigned report between active projects
- **THEN** it leaves the source listing, appears in the destination, retains its identity and related records, and the current assigned Developer is notified of the edit

#### Scenario: Archive races with movement
- **WHEN** either project becomes archived before the move can commit
- **THEN** the operation either committed while both were active or is rejected without partial movement, history or notification

#### Scenario: Linked report cannot move projects
- **WHEN** a report has an incoming or outgoing current canonical link or captured resolution canonical reference and its Tester requests another project
- **THEN** the save is rejected with a clear project-field error, preserving input, links, snapshots, report, history and mailbox data

#### Scenario: Linked report can receive ordinary edits
- **WHEN** the original Tester edits an otherwise eligible linked report without changing its project
- **THEN** ordinary field edits remain permitted and duplicate relationships are preserved

#### Scenario: Link creation races with a move
- **WHEN** linking and moving either endpoint execute concurrently
- **THEN** project/report locking and current-project rechecks permit a valid serialization or a safe rejection without cross-project references or partial writes

#### Scenario: Existing action races with project movement
- **WHEN** a comment or lifecycle action read the source project before a concurrent report move completed
- **THEN** it uses safely rechecked current project authorization or returns a retryable conflict, without writing to an archived destination or deciding access from a stale source project

### Requirement: Severity conflict notice before overwrite
Saving SHALL detect a severity change since the editor's last observed version and stop before writing. It SHALL retain manual input, show an inline notice above the form, show the latest severity and highlight that field. The notice SHALL receive accessible focus/announcement. Known Developer changes SHALL be attributed accurately; unknown or other actors SHALL NOT be falsely described as the Developer.

#### Scenario: Developer changes severity while editing
- **WHEN** the assigned Developer changes severity while a Tester has the editor open and the Tester clicks Save changes
- **THEN** saving stops, the notice explains the previous/latest severity, and the Tester's text remains available

#### Scenario: Severity changes and changes back
- **WHEN** severity changes after the editor was loaded and later returns to its original value before saving
- **THEN** the intervening change is still detected before an overwrite

#### Scenario: Tester deliberately keeps their severity
- **WHEN** the notice has shown the latest saved severity and the Tester explicitly saves again without another intervening severity change
- **THEN** the selected Tester severity can be saved without an extra acceptance button

#### Scenario: Tester agrees with Developer
- **WHEN** the Tester manually selects the latest Developer severity and saves again
- **THEN** that value and the other valid edits can be saved

#### Scenario: Another change before retry
- **WHEN** severity changes again after the notice and before the next explicit save
- **THEN** saving stops again with refreshed comparison information rather than silently overwriting it

### Requirement: Real edits have atomic history and notification
A real edit SHALL commit normalized changed inputs, server update time and one immutable edit-history event together. History SHALL identify actor, time and changed fields with before/after values. An assigned report SHALL create one private mailbox item for the Developer assigned at commit time. Unassigned reports SHALL create no mailbox item. Failure of any required write SHALL roll back all of them.

#### Scenario: Assigned report changes
- **WHEN** valid changes are committed to an assigned report
- **THEN** one history event describes only changed fields and one mailbox item identifies the editing Tester, report and changed-field names

#### Scenario: Unassigned report changes
- **WHEN** valid changes are committed to an unassigned report
- **THEN** report and history update together without creating a mailbox item

#### Scenario: Notification or history failure
- **WHEN** required history or notification persistence fails during an edit
- **THEN** the report fields, project and update time also remain unchanged

#### Scenario: Assignment changes before save
- **WHEN** the report's assignment changes before a valid edit commits
- **THEN** any notification targets the assignment trusted at commit time, not a stale client-supplied recipient

### Requirement: Unchanged saves have no mutation
If normalized requested values equal the current stored inputs after permission and conflict checks, saving SHALL return to the report without changing timestamps, history or notifications.

#### Scenario: Save without changes
- **WHEN** the Tester saves identical values or changes only surrounding whitespace removed by normalization
- **THEN** the report remains unchanged and no edit event or mailbox item is created

### Requirement: Safe saving and navigation
The editor SHALL prevent overlapping local saves, preserve input on validation, archive, permission, conflict or connection failure while the session remains valid, and warn before leaving unsaved edits. Success SHALL return to the same report. An uncertain response SHALL NOT claim the report was definitely unsaved; retrying the same save SHALL NOT duplicate history or mailbox items. Existing session-expiry behavior SHALL remain unchanged.

#### Scenario: Pending save repeated
- **WHEN** the Tester clicks Save changes again while the request is pending
- **THEN** no overlapping local save begins

#### Scenario: Network or uncertain response
- **WHEN** a save response is lost or the connection fails
- **THEN** input remains, feedback distinguishes uncertainty where necessary, and a safe retry is available

#### Scenario: Successful retry after lost response
- **WHEN** the same save already committed but its response was lost and the Tester retries it
- **THEN** the original result is recovered without another edit event or notification

#### Scenario: Cancel with unsaved edits
- **WHEN** the Tester attempts to leave an edited form before saving
- **THEN** the existing unsaved-changes protection allows staying or deliberately leaving without a new draft

### Requirement: Existing AI assistance remains under Tester control
The editor SHALL reuse the existing authenticated report assistant and its context allowlist, quotas, advisory labels, editable suggestions, explicit per-field application, stale-result handling and failure behavior. Generating or applying a suggestion SHALL NOT save the report or create history or notifications. Saving SHALL remain explicit.

#### Scenario: Apply one suggestion
- **WHEN** the Tester generates suggestions and chooses Use suggestion for a field
- **THEN** only that manual field changes and the stored report remains unchanged until a valid save

#### Scenario: Assistant fails
- **WHEN** generation fails, times out or is rate limited
- **THEN** manual input remains and ordinary editing/saving remains usable

#### Scenario: Navigate or change account
- **WHEN** the editing session ends or another account signs in
- **THEN** temporary suggestions and unsaved editor state are not exposed to the other account
