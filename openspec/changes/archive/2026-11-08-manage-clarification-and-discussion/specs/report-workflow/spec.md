# Spec Delta

## ADDED Requirements

### Requirement: Explicit clarification state
Only the assigned Developer SHALL be able to move an active-project report from In progress to Awaiting tester information and manually return it to In progress. Neither transition SHALL require a comment or reply. Both SHALL preserve assignment identity and assignment time and update the server-managed report update time. Comments SHALL NOT perform either transition.

#### Scenario: Wait before asking a question
- **WHEN** the assigned Developer selects Await tester information on an In progress report with no comments
- **THEN** it becomes Awaiting tester information without creating a comment or changing its assignment

#### Scenario: Resume without a reply
- **WHEN** the assigned Developer selects Resume investigation on an Awaiting tester information report with no reply
- **THEN** it returns to In progress and keeps its assignee and original assignment time

#### Scenario: Question or reply does not change state
- **WHEN** any participant posts a question or reply on an In progress or Awaiting tester information report
- **THEN** the report keeps its previous state until an authorized explicit transition

#### Scenario: Waiting indefinitely
- **WHEN** no reply or permitted state action occurs on an Awaiting tester information report
- **THEN** it stays waiting without automatic reminder, resumption, or closure

### Requirement: Trusted clarification transitions
Clarification transitions SHALL enforce authentication, Developer role, current assignment, source state, and active-project checks at persistence. Callers SHALL NOT choose actor, timestamps, or arbitrary states. Concurrent requests SHALL commit at most one transition from a given source state. Each successful transition and one immutable actor/time/before/after history entry SHALL commit atomically.

#### Scenario: Forbidden actor
- **WHEN** a Tester, another Developer, a visitor, or an account without a valid profile directly requests either clarification transition
- **THEN** it is denied without changing the report or history

#### Scenario: Wrong source state
- **WHEN** the assignee requests waiting from a state other than In progress or resumption from a state other than Awaiting tester information
- **THEN** the request is rejected as a state conflict without mutation

#### Scenario: Archive after page load
- **WHEN** a clarification transition targets a project archived after the report page was loaded
- **THEN** it is rejected with an archive explanation without changing the report or history

#### Scenario: Concurrent duplicate transition
- **WHEN** two requests attempt the same clarification transition concurrently
- **THEN** exactly one transition and history event succeed and the other receives a state conflict

#### Scenario: Clarification history
- **WHEN** either clarification transition succeeds
- **THEN** one immutable event identifies its actor, server time, and old/new states without recording a new assignment

#### Scenario: History write failure
- **WHEN** recording a clarification transition's history fails
- **THEN** the report state and update time roll back together with the failed history insertion

#### Scenario: Malformed identifier or forged fields
- **WHEN** a request names a malformed or missing report identifier or attempts to bypass protected workflow fields
- **THEN** it is rejected without changing any report or history data

### Requirement: Deliberate clarification outcomes
Clarification controls SHALL show pending progress and block overlapping local mutations. Success or state conflict SHALL refresh authoritative state and history. Uncertain outcomes SHALL offer read-only reload without automatic mutation retries. Expired authentication SHALL use the existing session flow, and stale completions SHALL NOT update a replacement report or identity.

#### Scenario: Success and conflict readback
- **WHEN** a clarification action succeeds or reports a stale source state
- **THEN** the page explains the outcome and reloads persisted state, history, and eligible actions

#### Scenario: Uncertain transition
- **WHEN** a network or readback failure prevents confirming a clarification action
- **THEN** the page explains that saving may have occurred and requires readback before another action without automatically retrying the mutation

#### Scenario: Repeated local action
- **WHEN** the user attempts another report mutation while a clarification action is pending
- **THEN** no overlapping local mutation begins

#### Scenario: Session expiry or stale completion
- **WHEN** a clarification operation reports an expired session or finishes after report navigation, logout, or identity replacement
- **THEN** existing authentication handling applies and its completion cannot populate the replacement screen

## MODIFIED Requirements

### Requirement: Detail-only workflow controls
The detail page SHALL offer Accept report only to Developers viewing active-project Open unassigned reports, Start investigation only to the assignee viewing Accepted, Await tester information only to the assignee viewing In progress, and Resume investigation only to the assignee viewing Awaiting tester information. The project report listing SHALL expose none of these actions. Pending actions SHALL block overlapping local requests and show progress.

#### Scenario: Eligible acceptance screen
- **WHEN** a Developer opens an available report's detail page
- **THEN** Accept report is available and Start investigation is absent

#### Scenario: Eligible investigation screen
- **WHEN** the assigned Developer opens an Accepted report's detail page
- **THEN** Start investigation is available and Accept report is absent

#### Scenario: Ineligible viewers and states
- **WHEN** a Tester views any report, a different Developer views an assigned report, or any user views an archived-project report
- **THEN** no workflow action is offered

#### Scenario: Listing remains read-only
- **WHEN** a user views the project's Reports tab
- **THEN** Accept report, Start investigation, Await tester information, and Resume investigation are absent from its entries

#### Scenario: Repeated local clicks
- **WHEN** a workflow request is pending and the user repeats the action
- **THEN** no overlapping local workflow request starts

#### Scenario: Eligible clarification controls
- **WHEN** the assigned Developer views an active-project In progress or Awaiting tester information report
- **THEN** respectively Await tester information or Resume investigation is available above both report tabs, while acceptance and initial investigation start are absent

### Requirement: Shared workflow readback
Both authenticated roles SHALL be able to read persisted workflow state and assignee labels on details and project listings, including after reload. Details SHALL show assignment time and creation/workflow activity with actor labels and changes through the Activity tab. Identity labels SHALL be report-scoped plain text without exposing unrelated profiles or private drafts.

#### Scenario: Persisted ownership and progress
- **WHEN** either role reloads an Accepted, In progress, or Awaiting tester information report or revisits its project listing
- **THEN** the current persisted state and assignee are shown, and details include assignment time and activity history accessible through Activity

#### Scenario: Unassigned report remains readable
- **WHEN** either role opens an existing or newly submitted Open report
- **THEN** it remains readable as Unassigned with no assignment time and its creation history intact

#### Scenario: Identity label safety
- **WHEN** an assignee or actor has a blank display name or a label containing markup
- **THEN** blank display names use a username or meaningful unavailable-user fallback, markup remains literal text, and unrelated account data is not exposed

#### Scenario: Existing draft submission receipt
- **WHEN** a Tester retries a previously consumed draft whose submitted report is now Awaiting tester information
- **THEN** the receipt returns the existing report in its current state without duplicating the report or rejecting the supported state
