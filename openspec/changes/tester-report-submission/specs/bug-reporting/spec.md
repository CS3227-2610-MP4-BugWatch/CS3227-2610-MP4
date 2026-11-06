# Bug reporting spec delta

## Purpose

Let Testers submit reproducible bug reports to active projects and let authenticated users discover those reports from the project and read their attributable creation history.

## ADDED Requirements

### Requirement: Tester-only submission
The system SHALL allow authenticated accounts with a trusted Tester profile to submit reports. Developers, visitors, and accounts without a valid profile SHALL NOT submit, including through direct persistence requests.

#### Scenario: Valid Tester submission
- **WHEN** a Tester submits valid report information for an active project
- **THEN** the report is persisted and the saved report detail page is opened

#### Scenario: Developer submission attempt
- **WHEN** a Developer opens the submission route or calls the creation operation directly
- **THEN** submission is denied and no report or creation history is written

#### Scenario: Visitor submission attempt
- **WHEN** an unauthenticated visitor attempts submission
- **THEN** no protected form or data is exposed and no report is written

#### Scenario: Incomplete account
- **WHEN** an authenticated account without a valid application profile attempts submission
- **THEN** submission is denied without assigning a default role

### Requirement: Active project selection
The system SHALL require a real active project for submission. It SHALL distinguish project loading, no active projects, and failed project loading, and SHALL recheck project existence and active state when saving.

#### Scenario: Available projects
- **WHEN** a Tester opens the report form and active projects are available
- **THEN** the Tester can select an active project

#### Scenario: No active projects
- **WHEN** project loading succeeds with no active projects
- **THEN** the form explains that no project is available and cannot submit

#### Scenario: Project list unavailable
- **WHEN** loading projects fails
- **THEN** the form shows a retryable error rather than claiming the project list is empty

#### Scenario: Missing project
- **WHEN** submission names a missing or malformed project identifier
- **THEN** it is rejected without writing report or history data

#### Scenario: Project archived after selection
- **WHEN** the selected project is archived before the submission commits
- **THEN** submission is rejected without writing report or history data, and the form explains that the project is archived and keeps the unsaved text visible
- **AND** the notice suggests contacting the Developer who created the project and offers Discard report, without creating a draft, sending a message, refreshing choices automatically, or prompting a switch to an unrelated project

#### Scenario: Tester discards after an archive rejection
- **WHEN** the Tester chooses Discard report after an archive rejection
- **THEN** the form closes and clears its unsaved input without writing a report or draft

#### Scenario: Tester corrects a wrong project selection
- **WHEN** the Tester manually chooses a different active project in the dropdown
- **THEN** the project selection changes without losing any other input

### Requirement: Required report text
The system SHALL require title, description, version, reproduction steps, expected results, and actual results. It SHALL trim surrounding whitespace and count Unicode code points. Title SHALL contain 1-200, version 1-100, and each other required text field 1-5,000 code points. These rules SHALL apply in the form and at persistence.

#### Scenario: Required text boundaries
- **WHEN** each required field contains exactly its lower or upper permitted length after trimming
- **THEN** that field passes validation, including supplementary Unicode characters

#### Scenario: Blank required text
- **WHEN** any required text field is absent, empty, or whitespace-only
- **THEN** submission is rejected with feedback identifying the invalid field and no data is written

#### Scenario: Overlong required text
- **WHEN** any required text field exceeds its permitted length by one code point
- **THEN** submission is rejected without mutation and the form retains entered values

#### Scenario: Trimmed content
- **WHEN** otherwise valid text includes surrounding whitespace
- **THEN** the trimmed content is stored while internal whitespace and line breaks are preserved

### Requirement: Optional test environment
The system SHALL accept one optional test-environment field of at most 1,000 Unicode code points after surrounding whitespace is trimmed. It SHALL NOT require that field or expose reproduction-frequency or evidence-submission inputs in this change.

#### Scenario: Omitted environment
- **WHEN** an otherwise valid report omits test environment or supplies only whitespace
- **THEN** submission succeeds with no environment information

#### Scenario: Environment boundary
- **WHEN** test environment contains exactly 1,000 code points after trimming
- **THEN** it passes validation

#### Scenario: Overlong environment
- **WHEN** test environment contains 1,001 code points after trimming
- **THEN** submission is rejected without mutation and entered values remain available

### Requirement: Explicit severity selection
The system SHALL require the Tester to explicitly select Very Low, Low, Medium, or High. It SHALL NOT preselect severity, accept other severities, or supply unapproved definitions of these labels.

#### Scenario: No selection
- **WHEN** the Tester has not selected severity
- **THEN** submission is rejected with severity feedback

#### Scenario: Valid severity
- **WHEN** the Tester selects any one of the four permitted severity labels
- **THEN** that severity passes validation

#### Scenario: Forged severity
- **WHEN** a direct request supplies an unsupported or missing severity
- **THEN** persistence rejects it without creating a report or history

### Requirement: Trusted creation metadata
The system SHALL generate report ID, reporter identity, creation/update timestamps, Open state, and unassigned status. Ordinary clients SHALL NOT choose or alter these protected values or directly insert, update, or delete submitted reports and history.

#### Scenario: Initial metadata
- **WHEN** a report is successfully created
- **THEN** it has a server-generated ID, the authenticated Tester's identity, server timestamps, Open state, and no assigned Developer

#### Scenario: Spoofed metadata
- **WHEN** an ordinary caller attempts to supply another reporter or change protected metadata or stored history
- **THEN** the attempted manipulation is rejected and trusted stored data is unchanged

### Requirement: Atomic creation history
The system SHALL record a creation activity containing the report, actor, time, and initial report values. Report creation and its history SHALL commit or fail together. The history SHALL be readable by authenticated application users and immutable to ordinary clients.

#### Scenario: Attributable creation
- **WHEN** a report is created successfully
- **THEN** its history records who submitted it, when, and the initial values

#### Scenario: History write failure
- **WHEN** recording creation history fails
- **THEN** no partial report creation is committed

### Requirement: Authenticated saved-report readback
The system SHALL let both authenticated roles read any submitted report by its saved link, including after reload. The detail page SHALL show project, report inputs, reporter, state, unassigned status, timestamps, and creation history. Visitors and accounts without valid profiles SHALL receive no report data. A missing report SHALL be distinguishable from a failed read.

#### Scenario: Another user reads a report
- **WHEN** another authenticated Tester or Developer opens the saved report link
- **THEN** the report and creation history are readable without requiring ownership or assignment

#### Scenario: Reload saved report
- **WHEN** a user reloads the saved report detail link with a valid session
- **THEN** the persisted report is restored rather than relying on prior navigation state

#### Scenario: Anonymous read
- **WHEN** a visitor directly requests reports or history
- **THEN** no report or history data is exposed

#### Scenario: Missing report
- **WHEN** an authenticated user opens a report ID that does not exist
- **THEN** a report-not-found result is shown

#### Scenario: Storage failure
- **WHEN** a saved report or its history cannot be loaded because storage is unavailable
- **THEN** a retryable error is shown rather than claiming the report does not exist

### Requirement: Literal report content
The system SHALL display report and creation-history text as text rather than executable markup. Scoped identity labels SHALL NOT expose unrelated profiles, email addresses, or private drafts.

#### Scenario: Markup in a report
- **WHEN** a submitted field contains HTML-like text or script content
- **THEN** it appears literally without executing markup

#### Scenario: Reporter identity lookup
- **WHEN** a report's reporter or history actor label is resolved
- **THEN** only identity information needed for that report is returned, and existing own-profile read restrictions remain intact

### Requirement: Project-scoped report discovery
The project page SHALL provide Overview and Reports tabs. Overview SHALL retain project details and history and be the default on ordinary entry. Reports SHALL show submitted reports for that project to both signed-in roles, newest first, with title, project, severity, state, assignee or Unassigned, and reporter. Private drafts and reports from other projects SHALL NOT appear. The active project's Report bug action SHALL be available to Testers on either tab.

#### Scenario: Shared project list
- **WHEN** either signed-in role opens a project's Reports tab
- **THEN** they can discover and open any submitted report for that project regardless of reporter, without seeing another project's reports

#### Scenario: Empty or unavailable list
- **WHEN** the Reports tab has no reports or its read fails
- **THEN** the system distinguishes an empty list from a retryable error, and the Overview remains available

#### Scenario: Protected listing
- **WHEN** a visitor or an account without a valid profile directly requests a report list
- **THEN** no report data is returned

### Requirement: Report breadcrumb and return navigation
The saved report page SHALL display Projects / project name / Reports / report title with slash separators and no bug number. The Reports breadcrumb and back link SHALL open the report's project with the Reports tab selected, independent of browser history.

#### Scenario: Submission and return to the list
- **WHEN** a Tester submits a report successfully and follows Back to project reports from the saved page
- **THEN** that project's Reports tab opens and includes the newly saved report

#### Scenario: Return from a shared link
- **WHEN** an authenticated user opens a saved report link directly and follows Reports or Back to project reports
- **THEN** the correct project's Reports tab opens without needing a prior navigation entry

### Requirement: Deliberate submission outcomes
The system SHALL show pending submission, block overlapping local submissions, retain form input on recoverable validation/project/service failures, and perform no write on cancel. Confirmed success SHALL navigate to the saved report. Outcomes from requests belonging to an unmounted form or previous user SHALL NOT navigate a replacement screen.

#### Scenario: Repeated local submit
- **WHEN** the user clicks submit or presses Enter any number of times while submission is pending
- **THEN** no additional local creation requests are started

#### Scenario: Recoverable failure
- **WHEN** submission fails due to invalid fields, a missing project, or a service error
- **THEN** the form reports the failure, retains entered text, and permits appropriate correction or retry

#### Scenario: Connection failure leaves outcome uncertain
- **WHEN** a connection failure prevents confirmation of a save
- **THEN** the form says the save could not be confirmed, retains entered text, and allows the Tester to retry explicitly

#### Scenario: Cancel
- **WHEN** the Tester cancels an unsaved report
- **THEN** no report or history is written

#### Scenario: Stale completion
- **WHEN** a submission completes after logout, user replacement, or navigation away
- **THEN** its completion does not navigate or populate the replacement user's screen

### Requirement: Authentication-aware form lifetime
The system SHALL clear protected report state when the session ends or the authenticated user changes. Routine same-user authentication notifications SHALL NOT discard unsaved report input. Expired-session persistence rejection SHALL return control to authentication without saving a draft.

#### Scenario: Same-user session notification
- **WHEN** the current session is reconfirmed or refreshed for the same authenticated user while the form contains unsaved text
- **THEN** the unsaved report input remains available

#### Scenario: Logout or session loss
- **WHEN** the session ends while a report is unfinished
- **THEN** the protected form and its unsaved text are cleared, with no persistent draft created
