# Shared features: MVP and future releases

Source: [BugWatch specification](../BugWatch.md), especially sections 1, 3, 6–12.

This is the recommended release split requested by the product owner. It plans intended functionality; the application currently only displays a heading. It does not authorize implementation, provisioning, purchases, or deployment, or replace the product rules in BugWatch.md. Section 10 of that specification still records the earlier deferral of release planning; these three files contain the new recommendation without changing the source specification.

Related plans: [Tester features](tester-features.md) and [Developer features](developer-features.md). A shared feature is defined here once even when permissions differ by role. Role-specific actions belong in those companion files.

## MVP

The MVP must support one complete manual cycle: create a project → submit a report → accept → investigate and discuss → resolve → original tester closes or returns it to investigation. Include reasoned non-fix resolutions so unusable or duplicate reports do not remain stuck. AI assistance is not required to complete this cycle.

| Feature | MVP scope and boundaries | Specification |
| --- | --- | --- |
| Authentication and permanent roles | Supabase Auth email/password login and logout for pre-created tester/developer accounts. Preserve administrator-set roles and fixed usernames. No public registration, role selection, role changes, or administrator UI. | C-02, C-07, C-08, C-12, C-39; S-01, S-02 |
| Session expiry | Use the specified one-hour inactivity timeout measured by session refreshes. Expiry loses unsaved report/comment text; only manually saved report drafts survive. The built-in Supabase control needs Pro or above and is checked on refresh; existing access tokens may last until expiry. Resolve service-plan availability before launch. | C-12; section 2 |
| Shared project browser | Both roles can browse active projects and their reports. Support multiple projects, each representing one application. Project creation/editing remains developer-only. Archive actions and the archived tab arrive together after MVP. | C-09–C-11, C-32 |
| Report listing and detail pages | All authenticated users can read all submitted reports, regardless of project or assignment; unauthenticated visitors cannot. Brief listings show title, project, severity, state, assignee/unassigned, and reporter, without creation-date or version columns. Details show approved report fields, reporter, assignee, current state, discussion, and resolution. No evidence-submission mechanism. | C-11, C-13, C-19, C-37; S-03 |
| Ordinary discussion threads | Any authenticated tester or developer can participate in a report's thread, including clarification requests and responses. Store author/time. Comments never change lifecycle state. No direct messaging, special clarification message type, or comment drafts. Mailbox alerts for replies are deferred with the mailbox; threads remain readable directly. | C-14, C-27, C-38, C-40; S-04 |
| Lifecycle and authorization | Preserve all six states: Open, Accepted, In progress, Awaiting tester information, Resolved, Closed. Enforce the actor and transition rules in the role plans beyond UI visibility. Closed is final; non-fix outcomes are resolution reasons, not additional states. No automatic resumption, reminders, or closure. Release/transfer actions are added later. | C-23, C-25–C-31, C-33; section 6 |
| System-maintained records and activity history | Maintain IDs, identities, creation/update timestamps, state, assignee, assignment time/history, discussion author/time, and resolution author/time. All authenticated users can read actor/time/change history for MVP actions: creation, acceptance, work-state changes, clarification requests, resolutions, retest results, and reopening/closure. Edits and release/transfer add their history events when those features launch. Users cannot directly edit system fields. | C-18, C-40; S-07; section 7 |
| Hosting, persistence, and access boundaries | Deploy the application to Vercel; use managed Supabase Auth and Database. Keep database-interaction and processing code in this repository. Persist MVP projects, reports, threads, activity, identities, and private drafts. Enforce role/ownership rules, author-only draft access, and atomic acceptance so two developers cannot claim the same bug. | C-01, C-20, C-23, C-39, C-40; sections 7, 12 |

These features provide a usable, persistent tracker without requiring users to wait for automation, personal dashboards, or AI integrations. Identity records needed for authorship and permissions are MVP infrastructure; viewable profile pages and editable display names are a later shared feature.

### Decisions and verification needed before MVP launch

- Settle the explicitly deferred validation limits, severity meanings/defaults, and necessary fixed-bug retest details before implementing the affected inputs and closure workflow. Keep the confirmed required fields and four severity names; this plan does not choose missing limits, defaults, or retest fields.
- Confirm access to Supabase's specified session-limit controls. This recommendation does not authorize a subscription purchase or substitute a different timeout mechanism.
- Verify required/invalid inputs, permissions, private drafts, concurrent acceptance, lifecycle transitions, fixed versus non-fix closure, reasoned reopening, and Closed remaining final. Use the approved verification approach in section 12 and repository-required tests, lint, build, and relevant guide documentation. Hosting must also serve direct links to application routes.
- Verify the whole cycle across both accounts, including saved-draft recovery across logout/login and loss of unsaved text on session expiry. The MVP is not launchable if its required retest decisions or access controls remain unresolved.

## Future releases

### Confirmed features recommended after MVP

These remain confirmed product requirements. Their later placement changes delivery order, not their eventual requirement status. No dates or numbered releases are assigned.

| Feature | Future scope and dependencies | Why it can follow MVP | Specification |
| --- | --- | --- | --- |
| Search, combined filters, and sorting | Case-insensitive title search; AND across project/state/assignment/severity filters; multiple values within each filter. Assignment choices: Unassigned, Assigned to me, Specific developer. Selectable creation-date direction, newest first by default; this does not add a creation-date listing column. Deliver the complete discovery feature together. | Users can initially browse project/report lists; richer discovery becomes more useful as volume grows. | C-15; S-05 |
| In-app mailbox | Private per-user reply items, fixed-report ready-for-retesting items, and assigned-report input-edit notifications. Include read/unread status, mark-as-read, navigation to report/message, dismiss/delete, and unread filtering. Unassigned-report edits create no item. Deliver the edit event together with tester editing. | Directly checking reports and discussion supports the manual cycle, though users must check for updates themselves until this launches. | C-16, C-21; S-06 |
| Viewable profiles and display-name editing | Username, display name, permanent role, and status tabs. Tester profiles show reports opened by that tester. Developer profiles show current assignments, including Resolved/Closed, excluding released/transferred-away reports. Users may edit their own display name, never username or role. | Shared listings already expose reports and ownership; profile navigation is a convenience layer. | C-17; S-08; T-02, D-05 |
| Archived project browsing and write protection | Launch the separate archived tab alongside developer archive/restore. Archived projects and their reports remain readable but block every project/report write: new reports, edits, comments, assignments, linking, resolutions, retesting, and state changes until restoration. Project deletion remains prohibited. | Active projects suffice initially; archive management can be delivered as a complete later capability. | C-32, C-36 |
| Shared AI integration and safeguards | Support the two assistants described in the role plans. Apply the role-specific context limits in C-34. The Tester exception adds only the selected project name and description. Exclude other reports, attachments, repository source, and additional project context. Respect private drafts and current assignment. Label advisory output and uncertainties; treat report text as data. Require explicit user actions, prevent silent overwrites/submission/state changes, and preserve the manual workflow on generation failure. No required context preview. | The manual tracker works independently, and provider, cost, execution, and retention decisions remain deferred. | C-06, C-34, C-35, C-38; S-09; section 8 |

Before AI integration, specify provider/model, server-side request hosting, spending budget, per-user/request rate limits, provider retention, and generated-suggestion storage/retention. Keep provider credentials outside the public frontend. Use controlled-response tests plus content-quality evaluation under section 12; the illustrative T-06/D-07 examples remain unapproved. Shared safeguards must ship with each assistant, never as later hardening.

### Deferred candidates: require a separate product decision

These are not committed future scope. Consider them only if the product owner later adopts and specifies them:

- Similar-report suggestions, distinct from ordinary title search.
- Related-bug links, distinct from confirmed duplicate linking.
- Labels/tags and user mentions; mentions are not required for reply mailbox items.
- A workload/ageing dashboard; role-specific personal dashboard/queue candidates are listed in the companion plans.
- Additional mailbox events and recipients beyond the three confirmed event types.
- Evidence display/storage integration only if the deferred tester evidence-submission capability is approved; do not select formats, upload/link mechanisms, counts, or limits here.

### Excluded scope

Do not treat excluded features as a future backlog: standalone conversation summaries, verification checklists, private test-session notes, blocking/dependency links, saved filter views, watchlists, release/version tracking, authenticated repository synchronization, CSV export, and stale-report reminders. Required version fields, ordinary repository/commit/PR links, investigation-assistant discussion summaries, report drafts, and fixed-bug retesting remain distinct approved behaviours. BugWatch does not edit, execute, or deploy the tested application's code. No project deletion, memberships, teams, public registration, role switching, direct messaging, comment drafts, or special clarification markers are introduced.
