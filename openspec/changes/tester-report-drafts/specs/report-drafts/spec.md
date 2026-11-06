# Spec Delta

## Purpose

Allow Testers to save unfinished bug reports privately and resume them after signing back in.

## ADDED Requirements

### Requirement: Explicit project-linked saves
The system SHALL allow a Tester to save a draft explicitly from the report form with an active project selected. Other report fields MAY be incomplete, including title and severity. The system SHALL apply existing maximum field lengths to supplied text and enforce full report validation on submission. A successful save SHALL leave the form open and show confirmation.

#### Scenario: Incomplete first save
- **WHEN** a Tester selects an active project and saves with only reproduction steps filled in
- **THEN** the draft is stored and the same form shows Draft saved

#### Scenario: No project selected
- **WHEN** a Tester attempts to save without a project
- **THEN** the system indicates that a project is required, preserves the form input, and creates no draft

#### Scenario: Save fails
- **WHEN** a save fails
- **THEN** the system shows an error and retains the entered values for retry without showing a save confirmation

### Requirement: Private discovery and deletion
The system SHALL provide a Tester-only My drafts destination beside Projects, listing only the current Tester's drafts grouped by project. The author SHALL be able to resume a saved draft after signing back in and delete a draft from the list after confirmation. The system SHALL enforce these permissions on persistence requests and exclude drafts from shared submitted-report views.

#### Scenario: Resume after signing back in
- **WHEN** the author signs back in and opens a draft from My drafts
- **THEN** the form shows the last saved values

#### Scenario: Unauthorized direct access
- **WHEN** another Tester, a Developer, or an unauthenticated caller tries to read or mutate the draft directly
- **THEN** the caller receives no draft data and the draft is unchanged

#### Scenario: Delete confirmation
- **WHEN** the author cancels the deletion confirmation
- **THEN** the draft remains available
- **AND** when the author confirms and deletion succeeds, the draft disappears from the list

### Requirement: Project reassignment and archive handling
The system SHALL allow the author to select another active project without losing entered text. Saving after a project change SHALL update the same draft. Drafts linked to archived projects SHALL remain visible to their authors in an Archived group for that project and SHALL remain openable and deletable. The system SHALL reject draft saves and report submissions targeting an archived project.

#### Scenario: Correct the selected project
- **WHEN** the author selects another active project and saves the draft
- **THEN** the same draft appears in the new project group with the report fields preserved

#### Scenario: Project archived after save
- **WHEN** the author opens a draft whose project was archived
- **THEN** the draft and its project are identified as belonging to an archived project and its text remains available
- **AND** the author can delete the draft or deliberately select an active project for it

#### Scenario: Save targets an archived project
- **WHEN** the author attempts to save a draft to a project that is archived at the time of the save
- **THEN** the system rejects the save, preserves the last saved version, and retains the current form values

#### Scenario: Move an archived draft to an active project
- **WHEN** the author selects an active project for an archived draft and saves
- **THEN** the same draft appears under the active project with its current form values saved

### Requirement: Unsaved navigation warning
The system SHALL warn when the Tester attempts to leave with unsaved form changes and offer Keep editing or Leave without saving for in-app navigation. Leaving SHALL preserve only the last explicitly saved version. Session expiry SHALL clear unsaved text under existing session behavior.

#### Scenario: Leave after editing a saved draft
- **WHEN** a Tester changes a saved draft and chooses Leave without saving
- **THEN** navigation proceeds and reopening the draft shows its last saved values

#### Scenario: Continue editing
- **WHEN** a Tester chooses Keep editing
- **THEN** the form stays open with the current values

### Requirement: Submit a saved draft
The system SHALL submit the current form values under existing report validation and authorization rules. Creating the report and its creation history and removing the draft SHALL succeed together. On success the system SHALL open the submitted report. A rejected submission SHALL preserve the saved draft and current form input while the session remains valid.

#### Scenario: Submit with edits since the last save
- **WHEN** the author submits valid current values for an active project
- **THEN** one report is created with those values and its creation history, the draft is removed, and the report opens

#### Scenario: Submission is rejected
- **WHEN** an incomplete draft is submitted or the selected project has become archived
- **THEN** no report or history is created, the last saved draft remains, and the Tester sees the error with their current input intact

#### Scenario: Retry after losing a successful response
- **WHEN** the same author retries submission of a draft whose submission committed but whose response was lost
- **THEN** the existing submitted report opens without creating another report or history entry
