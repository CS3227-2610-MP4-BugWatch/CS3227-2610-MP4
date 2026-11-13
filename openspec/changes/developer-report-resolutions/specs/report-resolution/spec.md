# Spec Delta

## Purpose

Let assigned Developers record attributable fixed or reasoned non-fix outcomes and link duplicate reports to a same-project canonical report without conflating linking, resolution, and tester closure.

## ADDED Requirements

### Requirement: Fixed resolution record
The system SHALL require a fix summary, affected version, commit URL, and pull-request URL for Fixed resolution. It SHALL omit fixed version and prefill the editable affected version from the report's version. Resolution SHALL record the authenticated author and server time and SHALL NOT change the submitted report version.

#### Scenario: Record a fix
- **WHEN** the assigned Developer submits valid Fixed information for an active-project In progress report
- **THEN** the report becomes Resolved with all four fields, author and time, and retains its assignee, assignment time, and report version

#### Scenario: Edit affected-version prefill
- **WHEN** the Developer opens the Fixed form and changes its prefilled affected version before submitting
- **THEN** the resolution stores the edited affected version independently of the original report version

#### Scenario: Missing mandatory fix field
- **WHEN** any of fix summary, affected version, commit URL, or PR URL is empty after trimming
- **THEN** submission is rejected with actionable validation feedback and no persisted report, resolution, timestamp, or activity changes

### Requirement: Reasoned non-fix record
The system SHALL offer Duplicate, Invalid, Cannot reproduce, and Will not fix as non-fix resolution reasons. Each SHALL require an explanation instead of fix fields; Duplicate SHALL additionally require a valid saved canonical-report link. Reasons SHALL remain resolution data, not extra lifecycle states. Every non-fix resolution SHALL record its author and server time.

#### Scenario: Non-fix outcome
- **WHEN** the assigned Developer resolves an active-project In progress report as Invalid, Cannot reproduce, or Will not fix with a valid explanation and no fix fields
- **THEN** it becomes Resolved with that reason, explanation, author, and time while retaining its assignment

#### Scenario: Duplicate outcome
- **WHEN** the assignee resolves an In progress report as Duplicate with an explanation and a valid saved canonical link
- **THEN** it becomes Resolved and records the selected reason, explanation, and canonical target in its resolution activity

#### Scenario: Missing explanation or canonical link
- **WHEN** a non-fix explanation is blank, or Duplicate has no valid saved canonical link
- **THEN** resolution is rejected without persisted changes and the missing input is identified

#### Scenario: Invalid resolution category
- **WHEN** a caller submits an unsupported resolution reason
- **THEN** the request is rejected without creating a new lifecycle state or changing saved data

### Requirement: Resolution field validation
Validation SHALL trim surrounding whitespace and count Unicode code points. Summary and explanation SHALL contain 1-5,000 code points; affected version SHALL contain 1-100. Commit and PR links SHALL each be absolute HTTP(S) URLs with a host and at most 2,048 code points. Both URLs SHALL be required for Fixed without provider restrictions. Validation SHALL apply at the trusted persistence boundary as well as in the UI.

#### Scenario: Exact text boundaries
- **WHEN** a relevant text field contains respectively 1 or its maximum allowed code points after trimming, including supplementary Unicode characters
- **THEN** it passes length validation; a zero-length value or one code point beyond the maximum is rejected

#### Scenario: Ordinary repository-provider links
- **WHEN** valid HTTP(S) commit and PR URLs point to different providers or to a provider other than the project's repository host
- **THEN** they pass URL validation and are stored as ordinary links without fetching or verifying external resources

#### Scenario: Invalid or overlong URLs
- **WHEN** either required URL is relative, malformed, lacks a host, uses a non-HTTP(S) scheme, or exceeds 2,048 code points after trimming
- **THEN** Fixed resolution is rejected with link validation feedback and no persisted changes

#### Scenario: Exactly bounded URLs
- **WHEN** otherwise valid HTTP(S) URLs contain exactly 2,048 code points after trimming
- **THEN** URL length validation accepts them

#### Scenario: Inapplicable fields
- **WHEN** a resolution request includes fix fields for a non-fix outcome or an explanation for Fixed
- **THEN** it is rejected as invalid rather than retaining hidden fields from a different outcome

### Requirement: Independent canonical-report linking
Only the assigned Developer SHALL save a canonical link on an active-project report. The target SHALL be another existing submitted report in the same project; Resolved and Closed targets SHALL be eligible. Saving a link SHALL preserve state, assignment, and any existing resolution record and SHALL NOT resolve, close, reopen, or modify the target report. Both roles SHALL be able to follow the saved internal report link.

#### Scenario: Link before resolution
- **WHEN** the assigned Developer saves a valid canonical link on an Accepted, In progress, or Awaiting tester information report
- **THEN** only the source report's canonical link, update time, and link activity change, and a later resolution remains an explicit separate action

#### Scenario: Resolved or Closed target
- **WHEN** the assignee selects a same-project canonical report whose state is Resolved or Closed
- **THEN** linking succeeds without reopening or otherwise modifying either report's state

#### Scenario: Replace a canonical link
- **WHEN** the assignee changes the source's existing canonical link to another valid target
- **THEN** the current link changes with recorded old/new target identities while state and any prior resolution snapshot remain unchanged

#### Scenario: Link on a resolved report
- **WHEN** the assigned Developer saves a valid link on an active-project Resolved report
- **THEN** the link action leaves its saved resolution fields, author, time, and Resolved state unchanged

#### Scenario: Repeat unchanged link
- **WHEN** the assignee saves the already persisted canonical target again
- **THEN** the operation returns current data without changing timestamps or adding duplicate activity

#### Scenario: Invalid target
- **WHEN** the selected target is the source itself, missing, malformed, a private draft, or in another project
- **THEN** linking is rejected without changing either report or exposing private draft content

### Requirement: Trusted resolution and link authorization
Resolution SHALL require an authenticated Developer profile, current assignment, an active project, and source state In progress. Linking SHALL require the same identity, assignment, and active-project checks without performing a lifecycle transition. Callers SHALL NOT choose actor, timestamps, assignment, or an arbitrary destination state. Ordinary direct writes SHALL NOT bypass these rules.

#### Scenario: Wrong actor
- **WHEN** a Tester, another Developer, a visitor, or an authenticated account without a valid profile directly requests resolution or linking
- **THEN** the action is denied without persisted changes; visitors receive an authentication-required outcome

#### Scenario: Wrong resolution source state
- **WHEN** resolution is requested from Open, Accepted, Awaiting tester information, Resolved, or Closed
- **THEN** it is rejected without changing state, assignment, resolution, or history

#### Scenario: Archive after load
- **WHEN** a link or resolution is saved after its project has been archived
- **THEN** persistence rejects the action with an archive explanation and no saved changes

#### Scenario: Missing source or forged protected fields
- **WHEN** a request identifies a missing or malformed source report or attempts to forge protected metadata through mutation inputs or direct writes
- **THEN** it is rejected without changing saved report, resolution, link, or activity data

### Requirement: Atomic resolution and link activity
Each successful resolution SHALL atomically save Resolved state, resolution data, server update time, and one immutable activity event containing actor, time, old/new state, and resolution snapshot. Each changed link SHALL atomically save its target, update time, and one immutable old/new-target event. Assignment identity/time SHALL remain unchanged. Failed history writes SHALL roll back all associated changes.

#### Scenario: Resolution activity
- **WHEN** either fixed or non-fix resolution succeeds
- **THEN** Activity exposes one attributable transition and the complete relevant resolution values, including the canonical target captured for Duplicate

#### Scenario: Link activity
- **WHEN** a new or changed canonical target is saved
- **THEN** Activity exposes one event with the prior and new targets, actor, and time without a state-change event

#### Scenario: History insertion failure
- **WHEN** history insertion fails during either operation
- **THEN** state, resolution, canonical link, assignment, and timestamps remain as before the attempted operation

#### Scenario: Competing resolution submissions
- **WHEN** two valid requests attempt to resolve the same In progress report
- **THEN** exactly one outcome and one resolution event commit and the other receives a state conflict without overwriting the winner

#### Scenario: Competing clarification and resolution
- **WHEN** waiting for tester information and resolution race from In progress
- **THEN** at most one source-state transition succeeds and the other returns a state conflict

#### Scenario: Link and Duplicate resolution race
- **WHEN** canonical-link saving and Duplicate resolution occur concurrently
- **THEN** the actions serialize and the resolution activity captures the canonical target saved at the instant of its successful transition

### Requirement: Shared resolution presentation
Both authenticated roles SHALL read the outcome, applicable fields, author/time, and current canonical link after reload, including archived-project reports. Fixed outcomes SHALL explain that original-tester retesting is required before closure; non-fix outcomes SHALL explain that no retest is required. Neither outcome SHALL grant Developers a close action. Free text SHALL render as text and links SHALL use validated destinations.

#### Scenario: Shared fixed readback
- **WHEN** either role reloads a Fixed resolution
- **THEN** the page displays the four fix fields, author/time, Resolved state, and original-tester retest guidance without a Developer close control

#### Scenario: Shared non-fix readback
- **WHEN** either role reloads a non-fix resolution
- **THEN** the reason, explanation, author/time, and applicable canonical link are readable with no-retest guidance and without irrelevant fix fields

#### Scenario: Safe archived readback
- **WHEN** either role reads an archived report with markup-like text or a long resolution URL
- **THEN** all saved resolution data remain readable as safe text or HTTP(S) links, long content wraps, and mutation controls are absent

#### Scenario: Discussion after resolution
- **WHEN** an authenticated participant comments on an active-project Resolved report
- **THEN** ordinary discussion remains available and does not alter its resolution, state, or assignment

### Requirement: Deliberate resolution form outcomes
The resolution form SHALL expose canonical controls only for Duplicate, with no standalone section or nested form. Controls SHALL be labeled and keyboard operable. Mutations SHALL share a pending guard. Validation SHALL retain input. Success/conflict SHALL refresh authoritative data. Uncertain outcomes SHALL require readback without mutation retries. Session expiry and stale completions SHALL respect existing authentication/navigation boundaries.

#### Scenario: Select an outcome
- **WHEN** the eligible assignee opens resolution and selects Fixed or a non-fix reason
- **THEN** only applicable inputs are required, Duplicate exposes the saved-link requirement, and no fixed-version input appears

#### Scenario: Pending save
- **WHEN** resolution, linking, commenting, or another workflow mutation is pending
- **THEN** no overlapping local mutation starts and the page indicates progress

#### Scenario: Validation or conflict
- **WHEN** a save reports validation errors or a state conflict
- **THEN** validation retains applicable entered text, while a conflict explains the rejection and refreshes authoritative data before another attempt

#### Scenario: Uncertain save or failed readback
- **WHEN** a network or readback failure prevents confirming resolution or linking
- **THEN** the page explains that saving may have occurred, retains unsaved text while on the page, and offers read-only reload without retrying the mutation automatically

#### Scenario: Session expiry and stale completion
- **WHEN** a new action reports authentication expiry or completes after navigation, logout, or identity replacement
- **THEN** existing session handling applies and stale results cannot populate the replacement screen

#### Scenario: Keyboard and narrow layout
- **WHEN** a user operates the forms, target selector, links, and saved-resolution disclosure by keyboard or on a narrow screen
- **THEN** labels and focus remain visible, validation is associated with inputs, and long content does not hide actions
