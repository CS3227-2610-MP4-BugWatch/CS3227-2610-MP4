# BugWatch Application Specification

Status: Product decisions recorded. Confirmed scope, exclusions, and explicit deferrals are documented; release prioritization and scheduling are deferred.

## 1. Purpose and Scope

BugWatch is a web application that helps testers report bugs and developers track the work needed to fix them. It connects a report, its reporter, the developer handling it, clarification discussions, and the eventual resolution.

This document describes intended behaviour, not currently available functionality. The current application is a React and TypeScript frontend built with Vite; the inspected application screen only displays the BugWatch heading.

### Requirement status

- **Confirmed:** Explicitly requested by the product owner.
- **Proposed:** A concrete feature or behaviour offered for discussion; approval is needed before treating it as a requirement.
- **Open:** A decision that has not yet been made.
- **Deferred:** Explicitly postponed by the product owner; do not implement or select defaults without a later decision.
- **Excluded:** Explicitly outside the agreed feature set.

The shared/tester/developer sections separate functionality by who uses it. A shared capability is listed once even when its permissions or presentation differ by role.

### Confirmed product requirements

| ID | Requirement |
| --- | --- |
| C-01 | Provide a web application for tracking bugs and fixes. |
| C-02 | Support login for two account types: tester and developer. |
| C-03 | Allow testers to submit reports about bugs found while testing applications. |
| C-04 | Allow developers to accept bug listings and track their work on the fixes. |
| C-05 | Allow developers to resolve bugs or contact the reporting tester for additional information. |
| C-06 | Provide a tester report assistant and a developer investigation assistant, with the confirmed behaviour and context rules in sections 4, 5, and 8. |
| C-07 | Accounts are pre-created by the application administrator, outside the normal tester/developer user workflow. No public registration is required. |
| C-08 | Each account has exactly one permanent role, preset by the administrator. Role switching and role changes are not allowed. |
| C-09 | Support multiple applications and projects. Developers can create projects. |
| C-10 | Testers can browse available projects and submit bug reports to the relevant project. |
| C-11 | All logged-in users can see all bug reports. Reports are not publicly visible to visitors who are not logged in. |
| C-12 | Both roles support login/logout managed by Supabase Auth. Use its one-hour inactivity timeout, measured by session refreshes. Unsaved text is lost on session expiry; text is preserved only if first saved as a draft. |
| C-13 | Each bug has a detail page showing approved report fields, reporter, assigned developer, current state, discussion, and resolution to all logged-in users. Evidence submission is deferred. The developer assistant section has its separate assigned-developer-only access rule. |
| C-14 | Communication takes place in a discussion thread attached to each bug. Any logged-in tester or developer may participate. Separate direct messaging is not selected. |
| C-15 | Search report titles case-insensitively. Combine project, state, assignment, and severity filters with AND; allow multiple values within a filter. Creation-date sorting is user-selectable, newest first by default. Assignment choices are Unassigned, Assigned to me, and Specific developer. |
| C-16 | Give each user an in-app mailbox for attention items, including replies to their thread messages and a tester's report becoming ready for retesting. Include unread/read status, mark-as-read, opening the relevant bug or message, dismissing/deleting items, and an unread filter. External notifications are not required. Decisions on additional events and recipients are explicitly deferred. |
| C-17 | Provide viewable profiles listing username, display name, role, and reports grouped into status tabs. Tester profiles list their opened reports; developer profiles list only current assignments, including Resolved/Closed reports, not past assignments released/transferred away. Users may edit display name but not username. |
| C-18 | Keep activity history for report creation/edits, developer acceptance/reassignment/release, status changes, clarification requests, resolution, retest results, and reopening. Show who acted, when, and what changed; all logged-in users can read it. Events for unapproved features apply only if those features are adopted. |
| C-19 | Submitted bug reports require title, description, project, version, reproduction steps, expected results, actual results, and severity. A single optional Test environment field groups browser, operating system, and device information. Omit reproduction frequency. |
| C-20 | Testers may manually save incomplete report drafts with missing required fields. Drafts are private to their author, persist across logout/login, and may be deleted by the author. Evidence submission is explicitly deferred. |
| C-21 | The submitting tester may edit all report input fields in Open, Accepted, In progress, and Awaiting tester information. Other users cannot edit these inputs except the assigned developer may change severity, with a required reason, in In progress or Awaiting tester information only. Resolved/Closed reports and archived-project reports cannot be edited. Assigned-report edits notify the assigned developer; unassigned-report edits do not. |
| C-22 | Severity levels are Very Low, Low, Medium, and High. Definitions and defaults are explicitly deferred. |
| C-23 | A report has at most one assigned developer. Any developer may accept an available bug from any project. On simultaneous acceptance, the first successful acceptance wins; the other developer receives an already-assigned message. |
| C-24 | Only the currently assigned developer may release or transfer a bug, with a reason required and no receiving-developer consent needed. These actions are allowed unless Resolved or Closed. Release returns the report to Open and removes its assignment; transfer assigns the recipient and returns it to Accepted. |
| C-25 | Use Open, Accepted, In progress, Awaiting tester information, Resolved, and Closed. For fixed bugs, Resolved means ready for retesting; non-fix resolutions do not require retesting. There is no separate Ready for retesting state. |
| C-26 | Only the assigned developer may move an accepted report into In progress or mark it Resolved. Acceptance and starting work are separate actions with an explicit state change. |
| C-27 | Thread comments never change report state automatically. Only the assigned developer may manually change In progress to Awaiting tester information and return it to In progress. If no reply arrives, the report stays waiting; no automatic reminder, resumption, or closure is selected. |
| C-28 | BugWatch only records progress and resolution; it does not edit, run, or deploy code. A fixed-bug resolution requires a fix summary, affected version, commit link, and pull-request link. Omit fixed version. Non-fix outcomes are exempt from fix fields and require an explanation; Duplicate additionally requires its canonical-report link. |
| C-29 | Only the original reporting tester may close a Resolved report. Fixed bugs require original-tester retesting first; non-fix outcomes do not require retesting. Retest details remain explicitly deferred. |
| C-30 | The original reporting tester may return Resolved to In progress, with a mandatory reason and previous developer retained. Closed is final and cannot return to In progress. |
| C-31 | Only the assigned developer may choose Duplicate, Invalid, Cannot reproduce, or Will not fix when resolving a report. The report must first be accepted and follow In progress-to-Resolved. These are resolution reasons, not extra states. Non-fix outcomes require an explanation rather than fix fields; Duplicate additionally requires its canonical-report link. Only the original tester may close, with no retest required for non-fix outcomes. |
| C-32 | Each project represents one application and requires name, description, and repository URL. All developers may edit active projects. Only the creator may archive or restore a project; deletion is prohibited. Archived projects and their reports are visible in a separate archived tab and are view-only: no new reports, edits, comments, assignments, or state changes until restoration. No project membership or teams. |
| C-33 | Testers may not withdraw submitted reports. An assigned developer may resolve an invalid report using the reasoned non-fix outcome workflow. |
| C-34 | Both LLM assistants may receive only the current report fields and current report discussion. No context preview is required. Other reports, separate project context, attachments, and repository source code are outside the permitted context. Draft privacy still applies. |
| C-35 | Label LLM output and make uncertainties visible. Users review before submission/sending; do not silently overwrite drafts or automatically assign/change states. Treat report text as data, not instructions. Failure must leave the manual workflow usable. Tester suggestions are editable; developer suggestions are read-only in a dedicated section, and the developer decides whether to act. Suggestion storage/retention is explicitly deferred. |
| C-36 | Only the assigned developer may link a duplicate to a canonical report; a canonical link is required for Duplicate resolution. Targets must belong to the same project and may be Resolved or Closed. Linking itself does not change state; resolution is explicit. Archived projects remain entirely view-only. |
| C-37 | The brief report listing shows title, project, severity, state, assigned developer/unassigned status, and reporter. Do not include creation date or version as brief-listing columns. |
| C-38 | Exclude comment drafts and separate clarification markers/message types. Clarification uses ordinary thread comments. Only the assigned developer may generate and view the developer investigation assistant's dedicated read-only section. |
| C-39 | Use email/password login through Supabase Auth. Store application data in Supabase Database, with database-interaction and processing code maintained in this repository. Deploy the application to Vercel; Supabase remains the managed authentication/database service. |
| C-40 | Automatically maintain report ID, reporter identity, creation/update timestamps, state, assigned developer, assignment time/history, discussion author/time, and resolution author/time. These are system-managed, not editable report inputs. |

Confirmed state permissions: Developer transitions are Open → Accepted (acceptance), Accepted → In progress, In progress → Awaiting tester information, Awaiting tester information → In progress, and In progress → Resolved, under the agreed assignment rules. Original-tester transitions are Resolved → Closed and Resolved → In progress. Approved release/transfer transitions are separate. Closed is final. Archived projects are view-only and block report changes until restored by their creator.

No additional account types, automated application testing, repository access, source-code editing, or deployment functionality are implied by these requirements.

## 2. User Roles

| Role | Main objective | Main activities |
| --- | --- | --- |
| Tester | Communicate reproducible bugs discovered during application testing and verify fixes. | Submit reports, answer developer questions, retest resolutions, and reopen with a reason if needed. Evidence submission is deferred. |
| Developer | Investigate reported bugs and record their resolution. | Accept listings, track investigation and fix progress, request clarification, and resolve bugs. |

Each account has one fixed role, either tester or developer. Accounts and their roles are preset by the application administrator (the product owner), not by normal application users. Users receive existing accounts for use or testing; registration, role selection, and role changes are not part of the normal user workflow. This does not introduce a third normal application role or require an administrator UI.

Supabase Auth provides email/password login and session management. Use its one-hour inactivity timeout measured by session refreshes. Unsaved report/comment text is lost on expiry. Only report drafts can be manually saved and restored; comment drafts are excluded. Usernames are fixed profile identifiers, not the login credential.

Implementation clarification: Supabase's built-in inactivity timeout measures time since session refresh, rather than typing or clicking. Its session-limit controls require Pro or above, and timeout checks occur on refresh; existing access tokens may remain valid until expiry. The user has selected these refresh-based semantics rather than a browser-interaction timer. See [Supabase session documentation](https://supabase.com/docs/guides/auth/sessions). No plan purchase or timeout implementation has been authorized.

## 3. Shared Functionality

| ID | Capability | Intended behaviour | Status |
| --- | --- | --- | --- |
| S-01 | Role-aware login | Authenticate a pre-created account with one permanent tester or developer role using Supabase Auth email/password login. | Confirmed |
| S-02 | Logout and session handling | Both roles can log out. Supabase manages the one-hour refresh-based inactivity timeout. Unsaved text is lost on expiry; only manually saved report drafts preserve text. | Confirmed |
| S-03 | Bug details | Show approved report fields, reporter, assignee, state, discussion, and resolution to all logged-in users. Evidence submission and limits are deferred; this is not approval for uploads or external evidence links. | Confirmed; evidence submission deferred |
| S-04 | Report discussion | Attach a discussion thread to each bug. Any logged-in tester or developer can post. Developer clarification requests and tester responses use this thread. | Confirmed |
| S-05 | Search, filters, and sorting | Case-insensitive title search; AND-composed multi-value project/state/assignment/severity filters; selectable creation-date direction, newest first by default. Assignment choices: Unassigned, Assigned to me, Specific developer. | Confirmed |
| S-06 | Attention mailbox | Include reply/retest attention items and notifications to the assigned developer when report input fields are edited; unassigned-report edits create no notification. Include read/unread state, mark-as-read, links to the bug/message, dismiss/delete, and unread filtering. No external notifications are required. Remaining additional event/recipient decisions are deferred. | Stated content and actions confirmed; other extra triggers deferred |
| S-07 | Activity history | Record report creation/edits, acceptance/reassignment/release, state changes, clarification requests, resolution, retest results, and reopening, with actor/time/changes visible to all logged-in users. Events remain conditional on the underlying feature existing. | Confirmed |
| S-08 | Profiles | Display username, editable display name, permanent role, and status tabs: opened reports for testers, current assignments for developers including Resolved/Closed. Exclude historical assignments transferred/released away. Usernames cannot be edited. | Confirmed |
| S-09 | Shared LLM interaction rules | Use only current-report fields/discussion without a required context preview. Label output, preserve user control and visible uncertainty, and keep manual workflows usable on failure. Tester suggestions are editable; developer suggestions are read-only in their own section. | Confirmed; suggestion storage/retention deferred |

Shared availability does not imply identical permissions. For example, a tester replying to a report does not imply permission to accept or resolve it.

## 4. Tester Functionality

### T-01: Submit a bug report — Confirmed

A tester can browse available projects and submit a bug found during application testing to the relevant project. The report should give a developer enough context to investigate it.

Report field decisions:

| Field | Decision |
| --- | --- |
| Project | Required |
| Version | Required |
| Reproduction steps | Required |
| Expected results | Required |
| Actual results | Required |
| Severity | Required; levels: Very Low, Low, Medium, High |
| Test environment | Optional single field for browser, operating system, and device information |
| Title | Required for every report |
| Description | Required |
| Reproduction frequency | Omitted |
| Evidence submission | Explicitly deferred, including attachment/link choices and limits |

Severity meanings/defaults and validation limits are explicitly deferred. Automatically maintain report ID, reporter, creation/update timestamps, state, assignee, assignment time/history, discussion author/time, and resolution author/time. These are not directly editable report inputs. Saved drafts may be incomplete; required fields apply when submitting a report.

### T-02: Track submitted reports — Profile list confirmed; separate dashboard deferred

The tester profile's list of reports they opened is confirmed. A separate personal dashboard beyond profile status tabs is explicitly deferred.

### T-03: Respond to clarification requests — Confirmed supporting interaction

Allow the reporting tester to provide reproduction details requested by the developer through ordinary comments in the bug's discussion thread. Any logged-in tester or developer may participate. Replies create mailbox items for the user being replied to. Additional mailbox events/recipients and evidence submission remain explicitly deferred; there is no separate clarification message type.

### T-04: Edit reports and save drafts — Confirmed

Testers can manually save unfinished reports as drafts even when required submission fields are missing. Drafts are visible only to their author, persist in Supabase Database across logout/login, and can be deleted by the author. Unsaved text is not restored after session expiry; it must first be saved as a draft to be preserved.

The submitting tester may edit all report input fields while Open, Accepted, In progress, or Awaiting tester information. Only the assigned developer may additionally change severity, with a required reason, in In progress or Awaiting tester information. Resolved/Closed reports and all archived-project reports cannot be edited. Record changes in activity history. Assigned-report edits notify the assigned developer through the in-app mailbox; unassigned-report edits do not. Assignment and lifecycle actions follow separate role rules. Testers cannot withdraw submitted reports.

### T-05: Retest and reopen — Confirmed; retest details deferred

For fixed bugs, Resolved means ready for retesting and the original reporter must retest before closure. Non-fix outcomes do not require retesting. Necessary retest details are explicitly deferred.

Only the original reporter may change Resolved to Closed or return Resolved to In progress. Returning to In progress requires a reason and retains the previous developer. Closed is final and cannot be reopened. Necessary retest details remain deferred. Archived-project reports remain view-only until restoration.

### T-06: LLM report assistant — Confirmed

**Goal:** Help a tester turn rough observations into a clear, reproducible bug report.

1. The tester enters observations and any available reproduction details.
2. The assistant suggests a title, structured description, and reproduction steps based on that input.
3. It flags missing details and asks targeted follow-up questions rather than inventing values.
4. The tester reviews and edits the suggestion before submitting the report.

Output must distinguish supplied facts from missing information. The tester can edit suggestions and must review them before submitting. Generation must not silently submit a report or overwrite a draft. Use only current-report fields and discussion; context preview is not required. On generation failure, keep the manual workflow usable without silently changing the input. This does not change the separate rule that unsaved text is lost on session expiry. Suggestion storage/retention is deferred.

**Deferred illustrative acceptance example (not an approved acceptance criterion):** Given observations without an application version or expected result, the assistant identifies those omissions and leaves them for the tester to supply. The assistant's general missing-information behaviour is confirmed; approval of this specific example is deferred.

## 5. Developer Functionality

### Project creation — Confirmed

Each project represents one application. Developers create projects with required name, description, and repository URL. All developers may edit active projects; only the creator may archive or restore a project. Projects cannot be deleted. There is no project membership or team feature.

Archived projects and their reports remain visible in a separate archived tab but are view-only. No new reports, acceptance, release/transfer, edits, comments, or state changes are allowed until the creator restores the project. All logged-in users can view submitted reports; testers can submit relevant reports to active projects, and developers can accept available reports from any active project.

### D-01: Browse and accept bug listings — Confirmed

Developers can find bug listings and accept a report to work on its fix. Each brief listing shows title, project, severity, state, assigned developer/unassigned status, and reporter. Creation date and version are not brief-overview columns; the existing detail-page requirements remain separate.

A report may have at most one assigned developer. Developers may accept available bugs from any project. If developers attempt acceptance simultaneously, the first successful acceptance wins and the other receives an already-assigned message.

Only the currently assigned developer may release the bug back to available listings or transfer it to another developer. A reason is required for every release and transfer. The new assignee does not need to agree before a transfer takes effect. Release clears the assignment and returns the report to Open; transfer assigns the recipient and changes the state to Accepted. These actions are allowed as long as the report is neither Resolved nor Closed.

### D-02: Track investigation and fix progress — Confirmed

Developers make changes in the affected application's development environment, outside BugWatch. BugWatch records progress and resolution only. Only the assigned developer may explicitly change an Accepted report to In progress; accepting a report does not automatically start work.

Editing source code, running the tested application, and deploying code within BugWatch are excluded from the agreed scope.

### D-03: Request more information — Confirmed

Allow a developer to contact the reporting tester using ordinary comments in the report's thread, without a separate clarification marker or message type. All logged-in users can read and participate. Comments do not affect state. Only the assigned developer may manually move In progress to Awaiting tester information, and its only normal return destination is In progress. If no reply arrives, it stays waiting until a permitted manual action. Approved release/transfer rules still apply. Comment drafts are excluded.

### D-04: Resolve a bug — Confirmed

Only the assigned developer may move In progress to Resolved. For a fixed bug, require a fix summary, affected version, commit link, and pull-request link; both links are mandatory. Fixed version is omitted. Original-tester retesting is required before closure, with retest details deferred. Non-fix outcomes require an explanation rather than fix fields; Duplicate additionally requires a canonical-report link. Non-fix outcomes do not require retesting. Only the original reporter may close either kind of resolution.

### D-05: Personal work queue — Profile list confirmed; separate queue deferred

The developer profile's status-tabbed assigned-report list is confirmed. A separate work queue beyond those profile tabs is explicitly deferred, as is a workload/ageing dashboard.

### D-06: Triage reports — Confirmed; severity definitions/defaults and priority deferred

Only the assigned developer may change severity, and only in In progress or Awaiting tester information, with a reason required. Only that developer may choose Duplicate, Invalid, Cannot reproduce, or Will not fix when resolving the report. An unassigned report must first be accepted and follow the approved work-state transitions. Each non-fix outcome enters Resolved with an explanation; Duplicate additionally requires a canonical-report link. Fix fields and retesting are not required. Only the original reporter may close it. These reasons are not additional states. Testers cannot withdraw reports.

Priority as a separate field is explicitly deferred. Severity definitions/defaults also remain explicitly deferred.

### D-07: LLM investigation assistant — Confirmed

**Goal:** Help a developer understand a report and plan an investigation.

1. The developer requests assistance for the current report; only its fields and discussion are included, without a required context preview.
2. The assistant summarizes the symptoms and separates known facts from uncertainties.
3. It suggests hypotheses, investigation steps, and useful questions for the tester.
4. It proposes regression-test scenarios based on the reported failure.
5. The output appears as read-only content in its own section. Only the assigned developer may generate and view it. That developer decides whether to act; any message or report action remains a separate reviewed user action.

Suggestions must be based only on current-report fields/discussion and must not claim to have inspected repository source code or verified a fix. A project repository URL does not authorize fetching code. The assistant must not automatically accept, assign, resolve, or close bugs. Suggestion storage/retention remains explicitly deferred. Access must follow current assignment rather than general report visibility.

**Deferred illustrative acceptance example (not an approved acceptance criterion):** For a report lacking browser details, the assistant can suggest asking for those details and checking browser-specific behaviour, but cannot state that a browser incompatibility is the confirmed root cause. The general uncertainty rule is confirmed; approval of this specific example is deferred.

## 6. Bug Lifecycle

The following six states and transition permissions are confirmed. Necessary retest-detail fields remain explicitly deferred.

| State | Meaning | Agreed behaviour |
| --- | --- | --- |
| Open | Submitted and available for acceptance. | A developer accepts it; released reports return here unassigned. |
| Accepted | A developer owns the report but has not explicitly started work. | Only that developer may explicitly start work. A transferred report returns here with its new assignee. |
| In progress | Investigation or fix work is underway. | The assigned developer may resolve it. Failed retests and reopening return here with the previous developer assigned. |
| Awaiting tester information | Further information is needed. | Only the assigned developer manually enters from In progress and returns to In progress. No reply means it stays waiting. Thread replies never change its state. Approved release/transfer actions remain available. |
| Resolved | The assigned developer records a fix or reasoned non-fix outcome. | Fixed bugs require fix summary, affected version, commit/PR links and original-tester retesting. Non-fix outcomes require an explanation and no retest; Duplicate additionally requires its canonical link. Only the original reporter may close or return to In progress with a reason. |
| Closed | The original reporting tester has closed the Resolved report. | Fixed bugs must first be retested. Non-fix outcomes do not require retesting. Closed is final; archived projects block changes. |

Release and transfer are allowed only for the current assignee and only outside Resolved/Closed, with a mandatory reason. Comments never change state. The original reporter may return Resolved to In progress with a reason, retaining the previous developer. Closed is final. Retest details are explicitly deferred. Archived projects block report changes until restored.

Duplicate, Invalid, Cannot reproduce, and Will not fix are resolution reasons selected by the assigned developer. They enter Resolved with an explanation and are exempt from fix fields and retesting. Duplicate additionally requires a same-project canonical-report link under C-36. Only the original reporter may close them.

## 7. Information Model and Technical Services

Supabase Database stores projects, reports, discussions, mailbox items, activity history, profiles, and private report drafts. Database-interaction and processing code lives in this repository. Vercel is the application deployment target; Supabase provides managed authentication/database services. This specification does not authorize provisioning or deployment.

The system automatically maintains report IDs, reporter identity, creation/update timestamps, state/assignee, assignment time/history, discussion author/time, and resolution author/time. These are not directly editable report inputs. The following concepts are agreed at the product level; physical tables, indexes, and API implementation remain engineering work within this scope.

| Concept | Agreed information |
| --- | --- |
| Account | Fixed username, editable display name, permanent role, Supabase email/password authentication identity, and status-tabbed report lists. Tester lists show opened reports; developer lists show current assignments including Resolved/Closed, not historical assignments released/transferred away. |
| Application/project | One application per project; required name, description, and repository URL. All developers may edit active projects; only the creator may archive/restore. Archives are view-only in a separate tab. Deletion, membership, and teams are excluded. |
| Bug report | System-generated ID, reporter, approved report inputs, six-state lifecycle, severity, and creation/update timestamps. Priority and validation limits are deferred. |
| Assignment | One currently assigned developer at most; system-maintained assignment time/history. Release/transfer require the assignee and a reason, without receiving-developer consent. |
| Discussion entry | Bug, ordinary comment text, and system-maintained author/time. No special clarification type and no comment drafts. |
| Evidence | Submission functionality, upload/link choices, and limits are explicitly deferred. No upload or external-link mechanism has been approved. |
| Resolution | Fixed outcome: assigned developer, required fix summary, affected version, commit link, and pull-request link. Non-fix outcome: category and required explanation; Duplicate also requires its canonical-report link. Resolution author/time are system-maintained. Fixed version is omitted. |
| Activity entry | Confirmed: actor, event, timestamp, and changes for the approved history event set, visible to all logged-in users. Events involving other proposed features remain conditional on their adoption. |

## 8. Confirmed LLM Rules and Remaining Decisions

The tester report assistant and developer investigation assistant are confirmed, with these agreed rules:

- Generated content is advisory and labelled. Tester suggestions are editable; developer suggestions are read-only in a dedicated section. Consequential actions require the user's explicit action.
- Use only the current report fields and discussion, with no required context preview. Do not send other reports, separate project information, attachments, or repository source code. Report field values such as project/version identifiers remain part of the permitted report fields.
- Respect access and draft privacy. Treat report/discussion text as data, not trusted instructions.
- Do not silently overwrite drafts or automatically submit, assign, or change report states. Users review content before submitting or sending their own actions.
- Missing evidence and uncertainty are visible; generated output must not claim a root cause or successful fix without evidence.
- Failed or unavailable generation leaves the core manual workflow usable without silently changing input. Session expiry still loses text not manually saved as a draft.
- Only the assigned developer may generate or view the developer assistant's dedicated read-only section.
- Generated-suggestion storage/retention, provider/model, server-side request hosting/integration, spending budget, per-user/request rate limits, and provider-side retention policy are explicitly deferred. These LLM-specific choices must be specified with the product owner when implementing the LLM features, before selecting defaults or integrating a service. Provider credentials must not be embedded in the public frontend. Vercel is the general application deployment target, without resolving these deferred LLM request-hosting choices.

These decisions do not select an LLM vendor or integration architecture. Approval of both illustrative acceptance examples is explicitly deferred. The verification approach in section 12 is approved independently of those examples.

## 9. Additional Feature Decisions

Every brainstorm feature below has an explicit decision. Deferred and excluded features are not implementation authorization.

| Feature | Decision | Scope note |
| --- | --- | --- |
| Similar-report suggestions | Deferred | Automatic or semantic suggestions are not approved. Ordinary title search remains confirmed. |
| Developer fix-summary assistant | Deferred | Separate from the approved investigation assistant. |
| Standalone conversation summaries | Excluded | Summarizing current-report discussion within the approved investigation assistant remains allowed. |
| Reproduction templates/checklists | Deferred | No template system is selected. |
| Verification checklists | Excluded | Fixed-bug retesting is still required; necessary retest details remain deferred. |
| Private test-session notes | Excluded | Saved bug-report drafts remain confirmed. |
| Duplicate linking | Included | Assigned developer links a same-project canonical report, required for Duplicate resolution. Resolved/Closed targets are allowed. Linking does not change state; archived projects remain view-only. |
| Related-bug links | Deferred | Distinct from approved duplicate links. |
| Blocking/dependency links | Excluded | No inter-report dependency workflow. |
| Labels/tags | Deferred | No label-management rules selected. |
| Saved filter views | Excluded | Ad hoc composed filters remain confirmed. |
| Watchlists | Excluded | No follow-report subscription feature. |
| User mentions | Deferred | Reply mailbox items remain confirmed independently. |
| Release/version tracking | Excluded | Required report Version and resolution affected-version fields remain confirmed. |
| Authenticated repository synchronization | Excluded | Required project repository URL and fixed-resolution commit/PR links remain ordinary stored links. No repository source access for the LLM. |
| CSV export | Excluded | No export feature selected. |
| Separate tester my-reports dashboard | Deferred | Tester profile report tabs remain confirmed. |
| Separate developer work queue | Deferred | Developer profile assignment tabs remain confirmed. |
| Workload/ageing dashboard | Deferred | No metrics dashboard selected. |
| Stale-report reminders | Excluded | A report awaiting a reply stays waiting; no reminder feature or automatic state change. |

## 10. Release Planning — Deferred

Release prioritization and scheduling are explicitly deferred. No initial-release subset, deadline, or delivery schedule has been selected. The confirmed requirements describe agreed product behaviour, not an approved release sequence.

Future release planning must consider the complete confirmed scope: authentication; project creation/editing/archive/restore; reports, private drafts and editing; search/filter/sort; profile status tabs and display-name editing; discussions; mailbox; activity history; assignment/release/transfer; fixed/non-fix resolution and original-tester closure; duplicate linking; and both LLM assistants.

Deferred features and excluded features must not be silently added to a release. Before implementing an affected feature, obtain the required outstanding specifications rather than choosing defaults for explicitly deferred matters.

## 11. Consolidated Deferred Decisions

Every original proposed feature or product decision has been confirmed, excluded, or explicitly deferred. The following items remain pending by the product owner's choice; they are not accidental omissions or approved defaults.

| Deferred item | Boundary already agreed |
| --- | --- |
| Release prioritization | Confirmed product scope is recorded; no release subset/order selected. |
| Scheduling/deadline | Vercel is the deployment target; no delivery schedule selected. |
| Evidence submission | No upload/link submission mechanism, file formats, counts, or size limits approved. |
| Severity meanings and defaults | Names are Very Low, Low, Medium, High; severity is required. |
| Validation limits | Required/optional inputs and edit permissions are agreed; length/size limits are not. |
| Separate priority field | Severity is confirmed; priority is not selected. |
| Necessary retest details | Original tester retests fixed bugs before closing; non-fix outcomes do not require retesting. |
| Additional mailbox events/recipients | Reply items, ready-for-retesting items, and assigned-report edit notifications are approved, as are all specified mailbox actions. |
| LLM provider/model | Both assistant behaviours and permitted context are approved. |
| LLM server-side request hosting/integration | General application target is Vercel; request execution architecture remains deferred. |
| LLM spending budget and per-user/request rate limits | No numerical budgets or limits selected. |
| Provider-side retention policy | Only current-report fields/discussion may be sent. |
| Generated-suggestion storage/retention in BugWatch | No persistence, visibility history, or retention lifetime for generated output selected. |
| Tester illustrative LLM acceptance example | General missing-information behaviour is approved; the particular example in T-06 is deferred. |
| Developer illustrative LLM acceptance example | General uncertainty/hypothesis behaviour is approved; the particular example in D-07 is deferred. |
| Similar-report suggestions | Ordinary case-insensitive title search remains approved. |
| Developer fix-summary assistant | Investigation assistant remains approved. |
| Reproduction templates/checklists | Structured report fields remain approved. |
| Related-bug links | Duplicate linking remains approved. |
| Labels/tags | Existing project/state/assignment/severity filters remain approved. |
| User mentions | Reply mailbox items remain approved without a mention feature. |
| Separate tester dashboard | Tester profile status tabs remain approved. |
| Separate developer work queue | Developer current-assignment status tabs remain approved. |
| Workload/ageing dashboard | No metrics dashboard selected. |

LLM provider/model, request hosting/integration, budget/rate limits, provider retention, and generated-suggestion storage must be specified with the product owner when implementing the LLM features. Do not integrate a service or select defaults first.

## 12. Verification Approach — Approved

The existing project uses React, TypeScript, Vite, npm, and Vitest. Future automated tests belong in `src/test/*.test.ts` under the repository instructions.

When implementing the confirmed requirements, cover:

- Role and access permissions, including private drafts and assigned-developer-only LLM output.
- Required fields, valid/invalid inputs, and validation boundaries once deferred limits are specified.
- Manual draft saving, author-only access/deletion, and persistence across logout/login.
- Single-assignee acceptance conflicts, release/transfer permissions, and ownership history.
- The confirmed lifecycle, manual clarification states, and comments causing no automatic state change.
- Original-tester closure, fixed-bug retesting versus non-fix exemptions, reasoned Resolved → In progress with the previous developer retained, and Closed remaining final.
- Creator-only archive/restore and archived-project restrictions on report creation and all other writes.

Use equivalence partitions, boundary values, and separate negative cases where relevant. Deferred acceptance examples and detail fields must not be treated as approved test expectations.

For LLM features, use controlled-response tests for success/failure, service unavailability, missing context, user control, no silent overwrites or automatic consequential actions, editable tester output, and read-only developer output. Separately evaluate generated content against representative reports for usefulness, unsupported claims, and access boundaries. Do not treat exact generated wording as deterministic or a passing UI test as proof of LLM quality. This verification approach is approved; the two illustrative acceptance examples remain deferred.
