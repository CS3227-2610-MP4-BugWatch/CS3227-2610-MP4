# Spec Delta

## Purpose

Help a Tester turn their observations into a useful bug report while preserving control over the report and limiting what reaches the model.

## ADDED Requirements

### Requirement: Explicit generation from a report form
The system SHALL provide Generate suggestions at the bottom of new and resumed draft forms. A Tester SHALL select an active project and provide a non-blank title and description within existing field limits. Reproduction steps and other fields MAY be blank. The form SHALL permit editing and ordinary save or submit actions while generation is pending, with one generation request in flight per form.

#### Scenario: Incomplete but eligible report
- **WHEN** a Tester selects an active project and enters a valid title and description without reproduction steps
- **THEN** they can explicitly request suggestions without saving or submitting the report

#### Scenario: A prerequisite is missing
- **WHEN** the project, title, or description is missing
- **THEN** generation is unavailable and the form indicates which inputs are needed

### Requirement: Limited model context
The server SHALL verify a current Tester identity and the selected active project. The model SHALL receive only title, description, non-blank version, reproduction steps, expected results, actual results, and test environment, plus the selected project's server-looked-up name and description. Severity and project ID SHALL stay in BugWatch.

#### Scenario: Client attempts to add context
- **WHEN** a request supplies a project description or repository URL outside the supported fields
- **THEN** the server does not forward those values and obtains permitted project context from its own lookup

### Requirement: Grounded responses
Report and project text SHALL be treated as untrusted data. The model SHALL use project metadata for background and base incident claims on the Tester’s observations.

#### Scenario: Missing details
- **WHEN** a report lacks details needed to describe reproduction
- **THEN** the assistant may omit unsupported suggestions and show short numbered questions under Details to add, with field labels where applicable

### Requirement: Review and application
The form SHALL show each available title, description, or reproduction-steps suggestion in a separate editable textbox directly below the original field, labeled AI generated suggestion. Use suggestion SHALL replace only the corresponding field. Unapplied suggestions and questions SHALL remain transient and SHALL be excluded from draft saves and report submissions.

#### Scenario: Apply one edited suggestion
- **WHEN** the Tester edits the generated description and selects its Use suggestion button
- **THEN** only the report description changes to the edited suggestion

#### Scenario: Partially usable response
- **WHEN** a readable response contains at least one valid suggestion or question and other entries are missing or invalid
- **THEN** the form displays only valid entries and offers generation again for more suggestions

#### Scenario: Unusable response
- **WHEN** generation fails, the response envelope is unreadable, or no entries pass validation
- **THEN** the form keeps report text and previous suggestions and questions visible and offers retry

#### Scenario: Report changes while generating
- **WHEN** the Tester edits the report or changes project after requesting suggestions
- **THEN** generation may finish from its original snapshot and the result indicates it was generated before the latest edits

#### Scenario: Regeneration with edited suggestions
- **WHEN** the Tester requests regeneration with an edited, unapplied suggestion
- **THEN** the form asks for confirmation before requesting replacements
- **AND** cancellation or a failed generation leaves report fields and existing suggestions intact

### Requirement: Server-enforced generation limit and safe failure
The system SHALL limit each Tester to five generation attempts in a rolling five-minute window across tabs. An admitted attempt dispatched to SoCLaaS SHALL count even if the provider call fails. An invalid or denied request SHALL NOT call SoCLaaS. Timeouts, malformed responses, and rate limits SHALL preserve the manual reporting flow and previous suggestions.

#### Scenario: Sixth request within five minutes
- **WHEN** the same Tester makes a sixth eligible request within the rolling window
- **THEN** the server rejects it without calling SoCLaaS and the form shows when the Tester can try again

#### Scenario: Unauthorized access
- **WHEN** an unauthenticated user or Developer calls the endpoint
- **THEN** the server denies the request without consuming a generation attempt or sending report context
