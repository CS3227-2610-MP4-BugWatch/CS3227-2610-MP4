# Spec Delta

## Purpose

Let Developers take accountable ownership of submitted bug reports and explicitly begin investigation, with reliable shared state and attributable history.

## ADDED Requirements

### Requirement: Developer acceptance
The system SHALL allow any authenticated Developer to accept an unassigned Open report in any active project. Acceptance SHALL set Accepted, assign that Developer, and record server-managed assignment and update times. Acceptance SHALL NOT automatically start investigation.

#### Scenario: Accept available report
- **WHEN** a Developer accepts an unassigned Open report in an active project, including a project created by another Developer
- **THEN** the report becomes Accepted, assigned to that Developer with an assignment timestamp, and remains Accepted until an explicit permitted action

#### Scenario: Concurrent acceptance
- **WHEN** two Developers attempt to accept the same available report concurrently
- **THEN** exactly one succeeds and the other receives an already-assigned message without replacing the winner or adding a second acceptance event

#### Scenario: Repeat acceptance
- **WHEN** a Developer attempts to accept a report already assigned to themselves or another Developer
- **THEN** the request reports already assigned and does not change assignment, timestamps, state, or history

### Requirement: Explicit investigation start
The system SHALL allow only the assigned Developer to explicitly move an Accepted report in an active project to In progress. Starting investigation SHALL preserve assignment identity and assignment time and update the report's server-managed update time.

#### Scenario: Assignee starts investigation
- **WHEN** the assigned Developer starts investigation on their Accepted report
- **THEN** its state becomes In progress and the existing assignee and assignment time remain unchanged

#### Scenario: Another Developer starts investigation
- **WHEN** another Developer directly requests investigation start on an Accepted report
- **THEN** the request is forbidden without changing the report or history

#### Scenario: Invalid source state
- **WHEN** a Developer requests investigation start for an Open or already In progress report
- **THEN** the transition is rejected without changing the report or adding history

#### Scenario: Concurrent investigation requests
- **WHEN** two investigation-start requests target the same Accepted report
- **THEN** at most one transition and one investigation-start history event are committed and the stale request receives a state-conflict result

### Requirement: Trusted workflow authorization
Workflow permissions and source-state checks SHALL be enforced at persistence. Callers SHALL NOT choose the actor, assignee, timestamps, or arbitrary target state. Testers, visitors, and accounts without valid profiles SHALL NOT perform these actions. Archived projects SHALL reject both actions, including when archival occurs after a page was loaded.

#### Scenario: Tester requests a workflow action
- **WHEN** a Tester directly requests acceptance or investigation start
- **THEN** access is forbidden without report or history changes

#### Scenario: Visitor requests a workflow action
- **WHEN** a visitor requests either workflow action
- **THEN** authentication is required and no data changes

#### Scenario: Missing profile
- **WHEN** an authenticated account without a valid profile requests either action
- **THEN** the request is denied without report or history changes

#### Scenario: Project archived before mutation
- **WHEN** either action is requested for a report whose project became archived after the page loaded
- **THEN** the action is rejected with an archived-project explanation and no report or history changes

#### Scenario: Missing or malformed report identifier
- **WHEN** either action names a missing report or malformed identifier
- **THEN** the action returns a not-found result without mutation

#### Scenario: Forged workflow fields
- **WHEN** an ordinary caller attempts direct writes or supplies protected actor, assignment, timestamp, or state values to bypass an action
- **THEN** the manipulation is rejected and stored report and history data remain unchanged

### Requirement: Atomic workflow history
Each successful workflow action SHALL commit its report changes and one immutable history entry together. History SHALL identify the report, authenticated actor, server time, and previous/new state; acceptance SHALL additionally record assignment identity and time changes. Existing creation history SHALL remain readable.

#### Scenario: Acceptance history
- **WHEN** acceptance succeeds
- **THEN** one event records Open to Accepted, unassigned to the accepting Developer, and the assignment timestamp with actor and occurrence time

#### Scenario: Investigation history
- **WHEN** investigation start succeeds
- **THEN** one event records Accepted to In progress with actor and occurrence time without recording a new assignment

#### Scenario: History failure
- **WHEN** recording either action's history fails
- **THEN** the entire action rolls back, including report state, assignment, and timestamps

### Requirement: Detail-only workflow controls
The detail page SHALL offer Accept report only to Developers viewing active-project Open unassigned reports, and Start investigation only to the assigned Developer viewing an active-project Accepted report. The project report listing SHALL expose neither action. Pending actions SHALL block overlapping local requests and show progress.

#### Scenario: Eligible acceptance screen
- **WHEN** a Developer opens an available report's detail page
- **THEN** Accept report is available and Start investigation is absent

#### Scenario: Eligible investigation screen
- **WHEN** the assigned Developer opens an Accepted report's detail page
- **THEN** Start investigation is available and Accept report is absent

#### Scenario: Ineligible viewers and states
- **WHEN** a Tester views any report, a different Developer views an assigned report, or any user views an archived-project or In progress report
- **THEN** neither workflow action is offered

#### Scenario: Listing remains read-only
- **WHEN** a user views the project's Reports tab
- **THEN** neither Accept report nor Start investigation appears in its entries

#### Scenario: Repeated local clicks
- **WHEN** a workflow request is pending and the user repeats the action
- **THEN** no overlapping local workflow request starts

### Requirement: Shared workflow readback
Both authenticated roles SHALL be able to read persisted workflow state and assignee labels on details and project listings, including after reload. Details SHALL show assignment time and creation/workflow activity with actor labels and changes. Identity labels SHALL be report-scoped plain text without exposing unrelated profiles or private drafts.

#### Scenario: Persisted ownership and progress
- **WHEN** either role reloads an Accepted or In progress report or revisits its project listing
- **THEN** the current persisted state and assignee are shown, and details include assignment time and activity history

#### Scenario: Unassigned report remains readable
- **WHEN** either role opens an existing or newly submitted Open report
- **THEN** it remains readable as Unassigned with no assignment time and its creation history intact

#### Scenario: Identity label safety
- **WHEN** an assignee or actor has a blank display name or a label containing markup
- **THEN** blank display names use a username or meaningful unavailable-user fallback, markup remains literal text, and unrelated account data is not exposed

### Requirement: Deliberate workflow outcomes
The detail page SHALL refresh authoritative report and history after success or state conflicts. It SHALL explain already-assigned, state-conflict, archived, and service failures. Uncertain network outcomes SHALL NOT trigger automatic mutation retries; users SHALL be able to reload before another action. Session expiry SHALL use the existing authentication flow, and stale completions SHALL NOT populate a replacement screen.

#### Scenario: Successful action
- **WHEN** acceptance or investigation start succeeds
- **THEN** the detail page displays persisted state, assignment, and history and updates available controls without navigating away

#### Scenario: Stale acceptance screen
- **WHEN** another Developer wins acceptance before the current user's click completes
- **THEN** the page explains that the report is already assigned and refreshes current data without offering stale acceptance

#### Scenario: State conflict
- **WHEN** a workflow request is rejected because its source state changed
- **THEN** the page explains the conflict and refreshes authoritative data before offering further actions

#### Scenario: Uncertain save or readback failure
- **WHEN** a connection failure prevents confirmation of a mutation or its refreshed data
- **THEN** the page explains the uncertainty, offers reload/retry of reads, and does not automatically repeat the mutation or claim it failed without saving

#### Scenario: Session expires
- **WHEN** either workflow action reports an expired session
- **THEN** control returns to the existing authentication flow and protected state is cleared as required by that flow

#### Scenario: Stale completion
- **WHEN** an action finishes after navigation to another report, logout, or identity replacement
- **THEN** its response does not populate or navigate the replacement screen
