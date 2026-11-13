# Spec Delta

## MODIFIED Requirements

### Requirement: Detail-only workflow controls
The detail page SHALL offer Accept report only to Developers viewing active-project Open unassigned reports, Start investigation only to the assignee viewing Accepted, Await tester information only to the assignee viewing In progress, and Resume investigation only to the assignee viewing Awaiting tester information. The detail page SHALL also offer Resolve report only to the assigned Developer viewing In progress in an active project. Canonical-link controls SHALL appear only inside that open resolution form when Duplicate is selected, without a standalone section. The project report listing SHALL expose none of these actions. Pending actions SHALL block overlapping local requests and show progress.

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
- **THEN** Accept report, Start investigation, Await tester information, Resume investigation, Resolve report, and canonical-link mutation controls are absent from its entries

#### Scenario: Repeated local clicks
- **WHEN** a workflow request is pending and the user repeats the action
- **THEN** no overlapping local workflow request starts

#### Scenario: Eligible clarification controls
- **WHEN** the assigned Developer views an active-project In progress or Awaiting tester information report
- **THEN** respectively Await tester information or Resume investigation is available above both report tabs, while acceptance and initial investigation start are absent

#### Scenario: Eligible resolution controls
- **WHEN** the assigned Developer views an active-project In progress report
- **THEN** Resolve report is available above both tabs alongside the existing clarification action, and resolution requires a separate explicit form submission

#### Scenario: Duplicate link controls within resolution
- **WHEN** the assigned Developer opens resolution on an active-project In progress report and selects Duplicate
- **THEN** canonical selection and non-submitting link-save controls appear inside the resolution form, while saving the link does not perform a resolution transition

#### Scenario: Hide inapplicable canonical controls
- **WHEN** resolution is closed or cancelled, a different outcome is selected, or the report is outside eligible In progress resolution
- **THEN** canonical-link mutation controls are absent while existing saved links remain readable

#### Scenario: Resolution controls in other states
- **WHEN** the report is Open, Accepted, Awaiting tester information, Resolved, or Closed
- **THEN** Resolve report is absent and no Developer close, reopen, or retest action is added

### Requirement: Shared workflow readback
Both authenticated roles SHALL be able to read persisted workflow state and assignee labels on details and project listings, including after reload. Details SHALL show assignment time and creation/workflow activity with actor labels and changes through the Activity tab. Identity labels SHALL be report-scoped plain text without exposing unrelated profiles or private drafts.

#### Scenario: Persisted ownership and progress
- **WHEN** either role reloads an Accepted, In progress, Awaiting tester information, or Resolved report or revisits its project listing
- **THEN** the current persisted state and assignee are shown, and details include assignment time and activity history accessible through Activity

#### Scenario: Unassigned report remains readable
- **WHEN** either role opens an existing or newly submitted Open report
- **THEN** it remains readable as Unassigned with no assignment time and its creation history intact

#### Scenario: Identity label safety
- **WHEN** an assignee or actor has a blank display name or a label containing markup
- **THEN** blank display names use a username or meaningful unavailable-user fallback, markup remains literal text, and unrelated account data is not exposed

#### Scenario: Existing draft submission receipt
- **WHEN** a Tester retries a previously consumed draft whose submitted report is now Awaiting tester information or Resolved
- **THEN** the receipt returns the existing report in its current state without duplicating the report or rejecting the supported state

#### Scenario: Persisted resolution readback
- **WHEN** either authenticated role opens a Resolved report or views its project listing
- **THEN** state and existing assignment labels remain readable, and the detail page exposes resolution and canonical-link data with attributable activity
