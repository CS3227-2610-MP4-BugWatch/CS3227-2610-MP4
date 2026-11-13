---
  layout: default.md
  title: "Appendix: User stories"
  pageNav: 3
---

# Appendix: User stories

These stories describe goals supported by the currently implemented application. A **User** is either a Tester or a Developer with an administrator-provisioned account. Stories describe user goals independently of specific UI elements. The [use-case appendix](UseCases.md) provides the corresponding interactions and extensions.

| As a... | I want to... | So that... |
| --- | --- | --- |
| User | log in with my provisioned account | I can access BugWatch with the permissions assigned to my role. |
| User | log out of my account | I can end my session and prevent further access through it. |
| User | browse active projects | I can find the project relevant to my work. |
| User | read a project's description and repository URL | I can understand its purpose and locate its source repository. |
| User | inspect a project's change history | I can understand what changed, who changed it, and when. |
| User | browse a project's submitted reports and their severity, state, assignee, and reporter | I can identify reports relevant to my work and understand their current progress. |
| User | read a report's reproduction steps, expected and actual results, version, and test environment | I can understand the reported problem and the circumstances in which it occurs. |
| User | inspect a report's activity history | I can trace its progress and review the recorded changes. |
| User | discuss a report with other participants | I can exchange evidence and clarify the problem. |
| User | reply with a reference to an earlier discussion comment | I can make clear which question or observation I am addressing. |
| User | read a saved resolution and its supporting explanation or fix details | I can understand the Developer's outcome and the evidence supporting it. |
| User | follow a report's canonical report reference | I can find the original issue when reports describe the same problem. |
| Developer | create a project with a name, description, and repository URL | I can establish a shared context for reporting and investigating its bugs. |
| Developer | update an active project's metadata, including projects created by other Developers | I can keep shared project information accurate. |
| Tester | submit a bug report for an active project with reproduction details and severity | I can give Developers enough information to assess and investigate the problem. |
| Tester | save an incomplete report as a private draft | I can preserve work in progress without publishing it to other users. |
| Tester | resume and edit my saved drafts after signing back in | I can complete reports over multiple working sessions. |
| Tester | delete a private draft after confirming my intention | I can remove work I no longer need while avoiding accidental deletion. |
| Tester | obtain AI suggestions and questions about missing report details | I can improve the clarity and completeness of my report. |
| Tester | review, revise, and choose which AI suggestions to apply | I can retain control over the report I save or submit. |
| Developer | accept an Open, unassigned report in an active project | I can take responsibility for investigating it. |
| Developer assigned to a report | start investigation separately from accepting a report | I can distinguish work I have taken responsibility for from work I have begun. |
| Developer assigned to a report | mark an investigation as awaiting tester information and ask questions in the discussion | I can communicate that additional information is needed before I continue. |
| Tester | respond to clarification questions in a report's discussion | I can provide the details needed to support the investigation. |
| Developer assigned to a report | manually resume an investigation awaiting tester information | I can decide when there is enough information to continue. |
| Developer assigned to a report | generate and review suggested tester questions using the saved report and discussion | I can identify useful follow-up questions before asking them. |
| Developer assigned to a report | link an In progress report to another report in the same project as its canonical report | I can record which original issue it duplicates before saving a Duplicate resolution. |
| Developer assigned to a report | resolve an In progress report as Fixed with a fix summary, affected version, and commit and pull request URLs | I can document the fix and provide references to the associated development work. |
| Developer assigned to a report | resolve an In progress report as Duplicate, Invalid, Cannot reproduce, or Will not fix with an explanation | I can record why the report concludes without a new fix. |

Report mutations require an active project. Only the assigned Developer can start or resume investigation, mark a report as awaiting tester information, save its canonical reference, or resolve it. AI assistance depends on service availability and usage allowances. Retesting, closure, reopening, and other unimplemented requirements are outside this appendix's scope.
