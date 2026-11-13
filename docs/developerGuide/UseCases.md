---
  layout: default.md
  title: "Appendix: Use cases"
  pageNav: 3
---

# Appendix: Use cases

**System:** BugWatch (BW)

These use cases describe the currently implemented application. **User** means either a Tester or a Developer with an administrator-provisioned account. Unless stated otherwise, the actor is logged in. Administrator account provisioning is an operational procedure, described in [Authentication and account setup](Authentication.md), rather than an application use case.

**MSS** means Main Success Scenario. An extension such as `3a` branches from step 3; `*a` applies whenever its condition occurs during that use case. Each scenario ends at “Use case ends” unless it explicitly resumes another step. Saving and submitting take effect directly unless a confirmation is explicitly described.

These scenarios describe actor intentions and system responsibilities independently of the user interface. For detailed usage instructions and input limits, see the User Guide topics on [Authentication](../userGuide/Authentication.md), [Projects](../userGuide/Projects.md), and [Bug reports](../userGuide/Reports.md).

## UC01 - Log in

**Actor:** User  
**Precondition:** User is logged out and has a provisioned account.

**MSS:**

1. User opens BW.
2. BW requests an email address and password.
3. User submits the credentials.
4. BW authenticates the User and loads the account profile and role.
5. BW grants access to the projects available to User.

Use case ends.

**Extensions:**

```text
4a. BW rejects the credentials or cannot reach the authentication service.
    4a1. BW displays an error.
    4a2. User corrects the credentials or retries when the service is available.
    Use case resumes from step 4.

4b. The account profile is incomplete or invalid.
    4b1. BW displays an account setup message directing User to the administrator.
    Use case ends.

4c. BW cannot load the identity temporarily.
    4c1. BW informs User that identity verification is temporarily unavailable.
    4c2. User requests another attempt.
    Use case resumes from step 4.
```

## UC02 - Log out

**Actor:** User

**MSS:**

1. User requests to log out.
2. BW revokes access to protected information, discards unsaved input, and attempts to end the session.
3. BW requires authentication before granting further access.

Use case ends.

**Extensions:**

```text
2a. Logout fails.
    2a1. BW displays an error and offers a retry.
    2a2. User retries when the service is available.
    Use case resumes from step 2.
```

## UC03 - Browse projects and view project history

**Actor:** User

**MSS:**

1. User requests to browse projects.
2. BW displays active projects.
3. User identifies a project to inspect.
4. BW provides the project's metadata, repository URL, and history.
5. User inspects the project and its recorded changes.

Use case ends.

**Extensions:**

```text
2a. No active projects exist.
    2a1. BW informs User that no active projects exist.
    Use case ends.

2b. BW cannot load the projects.
    2b1. BW reports the failure and allows another attempt.
    2b2. User requests another attempt.
    Use case resumes from step 2.

4a. The project does not exist.
    4a1. BW informs User that the project does not exist.
    Use case ends.

4b. BW cannot load the project or its history.
    4b1. BW reports which information could not be retrieved.
    4b2. User requests that information again.
    Use case resumes from step 4.
```

## UC04 - Create a project

**Actor:** Developer

**MSS:**

1. Developer requests to create a project.
2. BW requests a name, description, and repository URL.
3. Developer submits the project details.
4. BW validates and saves the project and its initial history.
5. BW displays the saved project's details.

Use case ends.

**Extensions:**

```text
4a. The details are invalid or the name duplicates an existing name.
    4a1. BW displays validation feedback and retains the input.
    4a2. Developer submits corrected details.
    Use case resumes from step 4.

4b. BW cannot save the project.
    4b1. BW displays an error and retains the input for retry.
    Use case resumes from step 3.

*a. Developer cancels the operation before saving.
    *a1. BW ends the operation without creating a project.
    Use case ends.
```

## UC05 - Edit a project

**Actor:** Developer  
**Precondition:** The project is active. Developer need not be its creator.

**MSS:**

1. Developer requests to edit a project.
2. BW displays the current project details for editing.
3. Developer submits the changed details.
4. BW validates and saves the changes and records changed values in history.
5. BW displays the updated project's details.

Use case ends.

**Extensions:**

```text
4a. The details are invalid or the name duplicates another project's name.
    4a1. BW retains the input and displays validation feedback.
    Use case resumes from step 3.

4b. Another save has changed the project since it was loaded.
    4b1. BW rejects the conflicting save and requires the latest project details before another attempt.
    4b2. Developer requests the latest project details.
    4b3. BW replaces unsaved input with the latest saved values.
    Use case resumes from step 3.

4c. No values have changed.
    4c1. BW completes the save without adding a history event.
    Use case resumes from step 5.

4d. BW cannot save the project.
    4d1. BW displays an error and retains the input for retry.
    Use case resumes from step 3.

*a. Developer cancels the operation before saving.
    *a1. BW ends the operation without saving changes.
    Use case ends.
```

## UC06 - Browse a project's reports

**Actor:** User

**MSS:**

1. User requests a project's submitted reports.
2. BW provides the submitted reports and their titles, projects, severities, states, assignees, and reporters.
3. User identifies a report to inspect.
4. BW provides the report details (UC07).

Use case ends.

**Extensions:**

```text
2a. The project has no submitted reports.
    2a1. BW informs User that the project has no submitted reports.
    Use case ends.

2b. BW cannot load the reports.
    2b1. BW reports the failure; project metadata remains available.
    2b2. User requests another attempt.
    Use case resumes from step 2.
```

## UC07 - Read a report and its activity

**Actor:** User

**MSS:**

1. User requests to read a submitted report.
2. BW provides the report's facts, submitted details, discussion, and any saved resolution and canonical report reference.
3. User requests the report's activity history.
4. BW displays recorded events with their actors and times.
5. User inspects the saved changes associated with an event.

Use case ends.

**Extensions:**

```text
2a. The report does not exist.
    2a1. BW informs User that the report does not exist.
    Use case ends.

2b. BW cannot load the report, discussion, or activity.
    2b1. BW reports which information could not be retrieved.
    2b2. User requests that information again.
    Use case resumes from the failed read.
```

## UC08 - Submit a bug report

**Actor:** Tester  
**Precondition:** At least one active project exists.

**MSS:**

1. Tester requests to report a bug for an active project, or resumes a private draft (UC10).
2. BW prompts Tester for report details.
3. Tester identifies the project and supplies a title, description, version, reproduction steps, expected results, actual results, and severity, with an optional test environment.
4. Tester requests submission of the report.
5. BW validates and saves the report as **Open** and **Unassigned**, recording its creation in activity.
6. BW provides the saved report. If submitted from a draft, BW removes the private draft.

Use case ends.

**Extensions:**

```text
5a. Required data are missing or invalid.
    5a1. BW explains which report details are invalid and retains the input.
    Use case resumes from step 3.

5b. The selected project has become archived.
    5b1. BW prevents submission and retains the input.
    5b2. Tester identifies an active project or discards the report.
    If an active project is identified, use case resumes from step 3.
    Otherwise, use case ends.

5c. Submission fails or its outcome cannot be confirmed.
    5c1. BW displays an error and retains the input.
    5c2. For a direct submission, Tester checks the project's reports before retrying an uncertain save.
    5c3. Tester retries if appropriate. Retrying from the same saved draft returns the existing report if already submitted.
    Use case resumes from step 5.

*a. Tester saves incomplete work as a private draft.
    *a1. Tester performs UC09.
    Use case resumes from step 3.

*b. Tester requests to stop preparing the report with unsaved changes.
    *b1. BW requests confirmation to discard the unsaved changes.
    *b2. Tester confirms or declines.
    If Tester declines, use case resumes from step 3.
    Otherwise, BW discards the unsaved changes and use case ends.
```

## UC09 - Save a private report draft

**Actor:** Tester  
**Precondition:** Tester is preparing a report for an active project.

**MSS:**

1. Tester enters or updates available report details, which may be incomplete.
2. Tester requests to save the report as a draft.
3. BW validates the project and input limits and saves a private draft belonging to Tester.
4. BW confirms the draft was saved and allows Tester to continue editing.

Use case ends.

**Extensions:**

```text
3a. An input exceeds its limit or the project is unavailable or archived.
    3a1. BW retains the input and displays feedback.
    3a2. Tester corrects the input or identifies an active project.
    Use case resumes from step 2.

3b. The save fails.
    3b1. BW retains the input and displays an error.
    Use case resumes from step 2 when Tester retries.
```

## UC10 - Resume a private report draft

**Actor:** Tester  
**Precondition:** Tester has previously saved a draft.

**MSS:**

1. Tester requests their private report drafts.
2. BW provides only Tester's private drafts and their associated projects.
3. Tester identifies a draft to resume.
4. BW provides the saved report details for editing.
5. Tester edits and saves the draft (UC09) or submits the completed report (UC08).

Use case ends.

**Extensions:**

```text
2a. BW cannot load the drafts.
    2a1. BW reports the failure and allows another attempt.
    2a2. Tester requests another attempt.
    Use case resumes from step 2.

4a. The draft's project has been archived.
    4a1. BW permits reading the draft but requires an active project to save or submit.
    4a2. Tester identifies an active project.
    Use case resumes from step 5.
```

## UC11 - Delete a private report draft

**Actor:** Tester

**MSS:**

1. Tester requests deletion of a private draft.
2. BW requests confirmation.
3. Tester confirms deletion.
4. BW deletes the draft.

Use case ends.

**Extensions:**

```text
3a. Tester cancels the confirmation.
    3a1. BW keeps the draft.
    Use case ends.

4a. Deletion fails.
    4a1. BW reports the failure and retains the draft for another attempt.
    Use case ends.
```

## UC12 - Get AI report suggestions

**Actor:** Tester  
**Precondition:** The assistant is enabled; Tester is preparing a report with an active project, title, and description.

**MSS:**

1. Tester requests AI suggestions for the report.
2. BW requests suggestions using the project context and permitted report details.
3. BW provides AI suggestions and any questions about missing details.
4. Tester reviews and optionally edits a suggestion.
5. Tester requests to apply the reviewed suggestion to the relevant report detail.
6. BW replaces that report detail with the reviewed suggestion.

Use case ends. Saving or submitting remains a separate action; severity is chosen by Tester.

**Extensions:**

```text
1a. Tester requests another generation after editing existing suggestions.
    1a1. BW requests confirmation to replace edited suggestions.
    1a2. Tester confirms or declines replacement.
    If Tester confirms, use case resumes from step 2.
    Otherwise, use case ends.

2a. Generation fails or the allowance is exhausted.
    2a1. BW displays feedback; Tester can continue writing, saving, or submitting manually.
    Use case ends.

3a. BW receives only partial suggestions.
    3a1. BW displays the available suggestions and a partial-result message.
    Use case resumes from step 4.
```

## UC13 - Discuss a report

**Actor:** User  
**Precondition:** The submitted report belongs to an active project. User need not be the reporter or assignee.

**MSS:**

1. User requests to participate in the report's discussion.
2. User submits a comment.
3. BW validates and saves the comment with its author and time.
4. BW displays the comment in chronological order without changing the report state.

Use case ends.

**Extensions:**

```text
2a. User wishes to reference an earlier comment.
    2a1. User identifies the earlier comment as the reply target.
    2a2. BW sets a reply reference without creating a separate conversation.
    Use case resumes from step 2.

3a. The comment is empty or exceeds the length limit.
    3a1. BW retains the text and displays validation feedback.
    Use case resumes from step 2.

3b. The post cannot be confirmed.
    3b1. BW retains the text and warns that the comment may have been saved.
    3b2. User requests the latest discussion and checks whether the comment was saved before deciding whether to post again.
    Use case ends.

*a. The project is archived.
    *a1. BW permits reading the discussion but prevents posting and replying.
    Use case ends.
```

## UC14 - Accept a report

**Actor:** Developer  
**Precondition:** The report belongs to an active project and is Open and unassigned.

**MSS:**

1. Developer requests to accept the report.
2. BW assigns it to Developer, records the assignment time, and changes its state to **Accepted**.
3. BW provides the updated report and records acceptance in its activity history.

Use case ends. Investigation has not started.

**Extensions:**

```text
2a. Another Developer has accepted the report or the state or project eligibility has changed.
    2a1. BW displays feedback and refreshes the report.
    Use case ends.

2b. The action or its readback cannot be confirmed.
    2b1. BW warns that the action may have been saved.
    2b2. Developer requests and checks the latest report and activity history before another action.
    Use case ends.
```

## UC15 - Start investigation

**Actor:** Assigned Developer  
**Precondition:** The report is Accepted and its project is active.

**MSS:**

1. Developer requests to start investigation of the report.
2. BW changes its state to **In progress**, preserving assignee and assignment time.
3. BW provides the updated state and records the transition in the report's activity history.

Use case ends.

**Extensions:**

```text
2a. The state, assignment, or project eligibility has changed.
    2a1. BW rejects the action, displays feedback, and refreshes the report.
    Use case ends.

2b. The action or its readback cannot be confirmed.
    2b1. BW asks Developer to request and inspect the latest report and activity history before another action.
    Use case ends.
```

## UC16 - Request tester information

**Actor:** Assigned Developer  
**Precondition:** The report is In progress and its project is active.

**MSS:**

1. Developer requests to mark the report as awaiting tester information.
2. BW changes the state to **Awaiting tester information**, preserving assignee and assignment time, and records the transition in the report's activity history.
3. Developer posts a question through the ordinary discussion (UC13).
4. A Tester responds through the ordinary discussion (UC13).

Use case ends. The report remains Awaiting tester information until Developer resumes investigation (UC17).

**Extensions:**

```text
2a. The state, assignment, or project eligibility has changed.
    2a1. BW rejects the action, displays feedback, and refreshes the report.
    Use case ends.

2b. The action or its readback cannot be confirmed.
    2b1. BW asks Developer to request and inspect the latest report and activity history before another action.
    Use case ends.

3a. Developer does not post a question, or no Tester responds.
    3a1. BW keeps the report in Awaiting tester information.
    Use case ends.
```

## UC17 - Resume investigation

**Actor:** Assigned Developer  
**Precondition:** The report is Awaiting tester information and its project is active. A Tester reply is not required by BW.

**MSS:**

1. Developer requests to resume investigation.
2. BW changes the state to **In progress**, preserving assignee and assignment time.
3. BW provides the updated state and records the transition in the report's activity history.

Use case ends.

**Extensions:**

```text
2a. The state, assignment, or project eligibility has changed.
    2a1. BW rejects the action, displays feedback, and refreshes the report.
    Use case ends.

2b. The action or its readback cannot be confirmed.
    2b1. BW asks Developer to request and inspect the latest report and activity history before another action.
    Use case ends.
```

## UC18 - Generate suggested tester questions

**Actor:** Assigned Developer  
**Precondition:** The assistant is enabled; the active-project report is Accepted, In progress, or Awaiting tester information, and its full discussion has loaded.

**MSS:**

1. Developer requests suggested questions for a Tester.
2. BW uses the saved report and full saved discussion to request follow-up questions.
3. BW provides up to five suggested questions.
4. Developer reviews a suggested question for use in the discussion.
5. Developer submits the question, optionally revised, as a separate discussion comment (UC13).

Use case ends. Generating questions does not post comments or change report state.

**Extensions:**

```text
2a. Generation fails, the context is too large, the allowance is exhausted, or BW withholds the new set after its credential-request check.
    2a1. BW displays feedback and retains previous suggestions unless eligibility has been lost.
    2a2. Developer continues the discussion manually if desired.
    Use case ends.

3a. No useful follow-up questions are returned.
    3a1. BW informs Developer that no useful follow-up questions were found.
    Use case ends.

4a. Developer chooses not to use a suggested question.
    4a1. Developer composes a question independently.
    Use case resumes from step 5.

*a. BW loads changes to the saved report or discussion after generation.
    *a1. BW marks the existing suggestions as outdated.
    *a2. Developer may request new suggestions.
    If new suggestions are requested, use case resumes from step 2.
    Otherwise, use case resumes from step 4.
```

## UC19 - Link a duplicate to its canonical report

**Actor:** Assigned Developer  
**Precondition:** The report is In progress and its project is active.

**MSS:**

1. Developer identifies the report as a duplicate while preparing its resolution.
2. BW offers other submitted reports in the same project as canonical targets.
3. Developer identifies the original report and requests to save it as the canonical report.
4. BW saves the reference and records the previous and new targets in the report's activity history, preserving both reports' states and assignments.

Use case ends. Developer must save the resolution separately (UC20).

**Extensions:**

```text
2a. No other submitted reports exist in the project.
    2a1. BW informs Developer that no canonical targets are available.
    Use case ends.

2b. BW cannot load the choices.
    2b1. BW reports the failure and allows another attempt.
    2b2. Developer requests the eligible canonical reports again.
    Use case resumes from step 2.

4a. The selected target is already the saved canonical report.
    4a1. BW keeps the reference without adding an activity history event.
    Use case ends.

4b. The link or report state conflicts with the current saved data.
    4b1. BW displays feedback and refreshes authoritative data before another attempt.
    Use case ends.

4c. The save or readback cannot be confirmed.
    4c1. BW asks Developer to request and inspect the latest report and activity history before retrying.
    Use case ends.
```

## UC20 - Resolve an investigated report

**Actor:** Assigned Developer  
**Precondition:** The report is In progress and its project is active.

**MSS:**

1. Developer requests to resolve the report.
2. BW prompts Developer for resolution inputs.
3. Developer specifies a Fixed outcome, fix summary, affected version, and commit and pull request URLs.
4. Developer submits the resolution inputs.
5. BW validates and saves the resolution, changes the state to **Resolved**, and records the resolution snapshot in the report's activity history.
6. BW displays the saved resolution, preserving assignee, assignment time, and original submitted version.

Use case ends.

**Extensions:**

```text
3a. Developer chooses a non-fix outcome.
    3a1. Developer specifies Duplicate, Invalid, Cannot reproduce, or Will not fix.
    3a2. BW requests an explanation for the outcome.
    3a3. Developer enters an explanation and, for Duplicate, saves a canonical link (UC19).
    Use case resumes from step 4.

5a. Applicable resolution inputs are invalid, or Duplicate has no saved canonical reference.
    5a1. BW retains applicable input and displays feedback.
    5a2. Developer corrects the inputs or saves the required reference.
    Use case resumes from step 4.

5b. The state, assignment, project eligibility, or canonical link conflicts with saved data.
    5b1. BW displays feedback and refreshes authoritative data before another attempt.
    Use case ends.

5c. The save or readback cannot be confirmed.
    5c1. BW asks Developer to request and inspect the latest report and activity history before retrying.
    Use case ends.

*a. Developer cancels resolution before saving.
    *a1. BW ends the operation without saving a resolution. Any separately saved canonical reference remains saved.
    Use case ends.
```

## Scope and shared restrictions

- BW enforces role restrictions on access to information and operations. Testers cannot create or edit projects or perform Developer report transitions. Only a draft's owner can access it.
- Archived projects and their submitted reports remain readable, but project edits and report mutations are unavailable. Project archiving and restoration are not currently supported application operations.
- Logout or session loss removes protected content and unsaved input. Unapplied AI suggestions and unsent comments are temporary; they are not private report drafts.
- BW does not automatically repeat uncertain report mutations. Request and inspect the latest saved data before another attempt.
- Self-registration, submitted-report editing, attachments, assignment release or transfer, severity changes after submission, Tester retesting, closure, reopening, personal report queues, and project deletion are not currently implemented. Their appearance in product requirements does not add them to these use cases.
