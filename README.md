# BugWatch

BugWatch is a web application that helps Testers and Developers report, investigate, and resolve software bugs. It brings project information, bug reports, discussions, and progress history together so everyone can understand a problem and follow the work to address it.

## Get started

1. Ask your administrator for an account and the address of your team's BugWatch application.
2. Log in with the email address and password supplied for your account.
3. Browse projects. Developers can create a project if one is needed.
4. As a Tester, submit a report or save a draft. As a Developer, accept an available report and start investigating when ready.
5. Use the report's discussion and activity history to exchange information and follow progress.

Save drafts before signing out if you want to keep unfinished report text. Unsent comments and other unsaved changes are discarded when you log out or lose your session.

### Accounts for MP4 Testing

| Role | Email | Password |
| --- | --- | --- |
| Developer | developerdavid@mail.com | d3vDavid |
| Developer | developerdanielle@mail.com | d3vDanielle |
| Tester | testerterence@mail.com | t3stTerence |
| Tester | testertrisha@mail.com | t3stTrisha |

Access the site [here](https://cs-3227-2610-mp-4-ruby.vercel.app)

## Who is BugWatch for?

| Role | What you can do |
| --- | --- |
| **Tester** | Submit bug reports, save private drafts, describe a bug's severity, and answer clarification questions. |
| **Developer** | Create and edit projects, accept reports, investigate bugs, request more information, and record resolutions. |
| **Both roles** | Browse projects and submitted reports, read activity history and resolutions, and participate in report discussions. |

Accounts are created by an administrator. Each account has an assigned Tester or Developer role.

## What can you do?

### Keep bugs organized by project

Browse active projects and read their descriptions, repository links, and change history. Each project has its own collection of submitted reports, showing severity, status, assignee, and reporter.

Developers can create projects and update any active project's name, description, or repository URL. Project history records who changed the information and what changed.

### Write useful bug reports

Testers can submit a report containing:

- A title and description of the problem.
- The version tested and steps to reproduce the bug.
- Expected and actual results.
- A severity of **Very Low**, **Low**, **Medium**, or **High**.
- An optional test environment, such as a browser and operating system.

Not ready to submit? Save an incomplete report as a **private draft**, return to it after signing back in, and submit it when ready. Only the draft's author can access it. Drafts can also be deleted when no longer needed.

### Investigate and discuss bugs

Developers can accept an **Open**, unassigned report to take responsibility for it. Acceptance changes the report to **Accepted**; starting investigation changes it to **In progress**.

If more information is needed, the assigned Developer can mark the report as **Awaiting tester information**, ask questions in its discussion, and manually resume investigation later. Posting a comment or reply does not automatically change the report's status.

Both roles can contribute comments, reply with references to earlier messages, and inspect the activity history to see progress and recorded changes.

### Record resolutions and duplicate reports

The assigned Developer can resolve an **In progress** report with one of five outcomes:

- **Fixed**, with a fix summary, affected version, and links to the commit and pull request.
- **Duplicate**, with an explanation and a saved reference to the original report in the same project.
- **Invalid**, **Cannot reproduce**, or **Will not fix**, with an explanation.

The report becomes **Resolved**, and both roles can read the outcome and its supporting details. Duplicate references help participants find the original issue.

### Get optional AI assistance

When enabled, BugWatch offers two assistants:

- **For Testers:** suggestions to improve report text and questions about missing details.
- **For assigned Developers:** suggested follow-up questions based on the saved report and discussion.

You review and choose what to use. AI suggestions do not automatically submit reports, post comments, or change report status. Availability and usage limits apply; you can continue working manually when assistance is unavailable.

## Current scope

Report submission and changes to projects, reports, and discussions require an active project. Information in archived projects remains readable.

BugWatch currently supports investigation through resolution. Tester retesting, closing and reopening reports, editing submitted reports, attachments, and transferring assignments are not yet available. Public self-registration is not supported; contact your administrator for account access.

## Learn more

- [User Guide](docs/userGuide/UserGuide.md): Instructions for using BugWatch.
- [Developer Guide](docs/developerGuide/DeveloperGuide.md): Technical documentation for contributors and administrators.
