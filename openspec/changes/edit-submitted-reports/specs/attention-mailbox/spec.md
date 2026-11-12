# Attention mailbox specification delta

## Purpose

Give each signed-in user a private place to find report updates that require attention, initially notifying assigned Developers when Testers edit submitted reports.

## ADDED Requirements

### Requirement: Private mailbox access
The system SHALL expose a Mailbox screen only to authenticated users with valid profiles. Listing, reading, marking and deleting items SHALL be restricted to their recipient at persistence. Callers SHALL NOT create items or choose recipients directly. Another user's items SHALL NOT be exposed through direct requests or stale client state.

#### Scenario: Recipient reads their mailbox
- **WHEN** an authenticated user opens Mailbox
- **THEN** only their own items are shown

#### Scenario: Another user requests an item
- **WHEN** a user directly reads or mutates an item belonging to another recipient
- **THEN** access is denied without exposing its contents or changing it

#### Scenario: Signed out or invalid profile
- **WHEN** a visitor or account without a valid profile requests mailbox operations
- **THEN** the operation is denied

#### Scenario: Account changes with request pending
- **WHEN** account A's mailbox request completes after account B signs in
- **THEN** A's response is ignored and A's items are not rendered for B

### Requirement: Report edit notification content
An edit item SHALL start unread and identify the editing Tester, report title and changed-field names, with a link to the same report. It SHALL NOT duplicate full report text or disclose private drafts. This slice SHALL create items only for the current assigned Developer after real Tester edits, as defined by report-editing; other approved notification types remain future work.

#### Scenario: Description and severity edited
- **WHEN** the recipient receives an edit item for changes to Description and Severity
- **THEN** the item identifies the Tester and report and lists those changed fields without inventing other changes

#### Scenario: Unassigned or unchanged report
- **WHEN** a report is unassigned or the save contains no normalized changes
- **THEN** no edit notification is created

#### Scenario: Notification after project move
- **WHEN** a report edit moved it to another active project
- **THEN** the item's link still opens the same report and the current project context is accurate

### Requirement: Read state and unread filtering
Mailbox SHALL provide All and Unread views, display read status in words and allow a recipient to mark an item read without opening the report. The persisted state SHALL survive navigation and sign-in. Marking an already-read item read SHALL be harmless and SHALL NOT create a new item.

#### Scenario: Filter unread items
- **WHEN** the user selects Unread
- **THEN** only that user's unread items appear, with an appropriate empty state if there are none

#### Scenario: Mark read without opening
- **WHEN** the user chooses Mark as read
- **THEN** that item becomes read without navigating, and it disappears from the Unread view

#### Scenario: Reload persisted read state
- **WHEN** the user reloads or signs in again
- **THEN** the item's saved read state remains correct

### Requirement: Opening linked reports marks read
Choosing Open report SHALL mark the owned item read and navigate to the report identified by it. The destination SHALL show current report details and history. Mark-read failure SHALL NOT be reported as success or silently bypassed as if the item was read; the user SHALL receive feedback and be able to retry.

#### Scenario: Open a notification
- **WHEN** the recipient successfully opens an unread edit item
- **THEN** the item is persisted as read and the linked report opens

#### Scenario: Marking read fails
- **WHEN** persisting read status fails before navigation
- **THEN** the mailbox retains the item and shows retry feedback without claiming success

### Requirement: Recipient can delete a mailbox item
The recipient SHALL be able to delete their mailbox item. Deletion SHALL remove only that item; it SHALL NOT delete or alter the report, its discussion, history or another recipient's items. A repeated deletion of an already-missing item SHALL be harmless without exposing whether another recipient owned an identifier.

#### Scenario: Delete edit notification
- **WHEN** the recipient deletes an item
- **THEN** it disappears from their mailbox while the report and its history remain intact

#### Scenario: Direct cross-user deletion
- **WHEN** a user attempts to delete another recipient's item by identifier
- **THEN** no other user's item or report data changes and private contents are not returned

### Requirement: Mailbox failure and empty states
Mailbox SHALL distinguish loading, empty, failed and ready states. Failures SHALL retain enough context for retry, prevent overlapping local mutations and avoid misleading success feedback. A failed read SHALL NOT appear as a successfully empty mailbox.

#### Scenario: No items
- **WHEN** a successful All or Unread query has no matching items
- **THEN** the screen explains the empty result

#### Scenario: Fetch fails
- **WHEN** mailbox loading fails
- **THEN** a retryable error is shown rather than an empty-success message

#### Scenario: Delete response is uncertain
- **WHEN** deletion may have succeeded but its response is lost
- **THEN** feedback preserves uncertainty and retry or reload safely establishes the current state
