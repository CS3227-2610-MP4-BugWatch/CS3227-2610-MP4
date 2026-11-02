# Developer features: MVP and future releases

Source: [BugWatch specification](../BugWatch.md), especially C-04, C-05, C-09, C-21, C-23–C-28, C-31, C-32, C-36, C-38, and section 5.

This is the recommended release split requested by the product owner, not implemented functionality or implementation authorization. It preserves confirmed rules and leaves explicitly deferred details undecided. See [Shared features](shared-features.md) for the MVP definition, shared dependencies, launch decisions, and exclusions; see [Tester features](tester-features.md) for tester-only actions. The original specification remains the source of product behaviour.

## MVP

The developer must be able to establish a project, take ownership of a report, investigate with the tester, and record a fix or a reasoned non-fix outcome.

| Feature | MVP scope and boundaries | Why it belongs in MVP | Specification |
| --- | --- | --- | --- |
| Create and edit active projects | Each project represents one application, with required name, description, and repository URL. Any developer can create projects or edit active projects. No project deletion, membership, or teams. Archive/restore is delivered later. | Testers need projects to report against; editing avoids permanently incorrect project metadata. | C-09, C-32; section 5, Project creation |
| Accept an available report | Any developer may accept an unassigned Open report from any active project. Set Accepted and maintain assignment identity/time/history. At most one developer may be assigned: first successful acceptance wins; competing attempts receive an already-assigned message. | Establishes accountable ownership without assignment races. | C-04, C-23, C-25, C-40; D-01 |
| Explicitly start investigation | Only the assigned developer may move Accepted to In progress. Acceptance does not automatically start work. | Makes ownership and active progress distinct and visible. | C-26; D-02 |
| Manage clarification state | Only the assigned developer may move In progress to Awaiting tester information and manually return it to In progress. Questions use ordinary shared discussion comments. Replies never change state; absent replies leave the report waiting. | Supports investigation when the initial report lacks necessary information. | C-05, C-27, C-38; D-03 |
| Record a fixed resolution | Only the assigned developer may move In progress to Resolved. Require fix summary, affected version, commit link, and pull-request link; both links are mandatory. Omit fixed version. Store resolution author/time. The developer cannot close the report; the original tester retests and decides closure. | Records the fix and hands it back for independent verification. | C-05, C-26, C-28, C-29, C-40; D-04 |
| Record a non-fix resolution | Only the assigned developer may select Duplicate, Invalid, Cannot reproduce, or Will not fix. An unassigned report must first be accepted and follow Accepted → In progress → Resolved. Require an explanation instead of fix fields; Duplicate also requires the canonical-report link. These are resolution reasons, not states; no retest is required, and only the original tester may close. | Gives invalid, unreproducible, and duplicate reports a defined outcome without falsifying a fix. | C-28, C-31, C-33; D-04, D-06 |
| Link a duplicate to its canonical report | Only the assigned developer may link a same-project canonical report, including one already Resolved or Closed. Linking alone does not change state. Require the link for Duplicate resolution. | Keeps the required Duplicate outcome complete and traceable in the MVP. | C-36; D-06 |

Browsing reports, reading details/history, and posting discussion comments are shared MVP features, defined once in [Shared features](shared-features.md). Developers do not need to be assigned to read reports or join discussion, but assignment is required for the lifecycle and duplicate-link actions above.

### MVP boundaries and dependencies

- Developers fix and test the affected application outside BugWatch. BugWatch records their work; it does not fetch repository source, edit code, execute tests against the application, or deploy fixes. Repository, commit, and PR URLs are ordinary stored links.
- Testers retain exclusive original-reporter closure/reopening rights. A return from Resolved to In progress keeps the previous developer assigned.
- Severity is supplied at report submission; developer severity overrides are delivered later. Release/transfer is also later, so the initial assignee remains responsible through resolution or reopening; communicate this limitation to initial users.
- Settle project/report/resolution validation limits before implementing the affected inputs. The original tester's fixed-bug retest details remain a shared launch dependency even though developers do not perform closure.
- Preserve activity history for every MVP action. When archive/restore arrives, block all developer changes to archived projects and their reports until restoration; do not deliver archive as a visibility-only toggle.

## Future releases

### Confirmed features recommended after MVP

| Feature | Future scope and dependencies | Why it can follow MVP | Specification |
| --- | --- | --- | --- |
| Release an assignment | Only the current assignee, outside Resolved/Closed, with a mandatory reason. Clear assignment and return to Open. Maintain assignment/activity history and update current-assignment profile lists when profiles exist. | A small initial user group can complete work with its original assignee; release becomes useful for handoff and capacity changes. | C-24; D-01 |
| Transfer an assignment | Only the current assignee, outside Resolved/Closed, with a mandatory reason. Assign the selected developer and return to Accepted, with no receiving-developer consent required. Maintain assignment/activity history. Deliver alongside release. | Enables later workload redistribution without being required for the basic report-to-resolution cycle. | C-24; D-01 |
| Override report severity | Only the assigned developer, in In progress or Awaiting tester information, with a required reason. Preserve the four severity levels and history. Do not introduce a separate priority field. | The tester-provided severity already supports initial reporting; developer adjustment is a later triage improvement. | C-21, C-22; D-06 |
| Archive and restore projects | Only the project creator may archive/restore. Ship with the shared archived tab and comprehensive write protection for archived projects/reports, including duplicate links. All developers may still edit active projects; deletion remains prohibited. | Supports project retirement once the active-project workflow is established. | C-32, C-36 |
| Developer investigation assistant | Only the currently assigned developer may request or view its dedicated read-only section. Summarize symptoms, separate facts from uncertainties, suggest hypotheses/investigation steps/questions, and propose regression-test scenarios. Use only current-report fields/discussion. Never claim repository inspection, a confirmed root cause, or a verified fix without evidence; never automatically assign or change state. Messages and actions remain explicit user decisions. | Manual investigation and discussion already work; the assistant also needs unresolved provider, hosting, cost, and retention choices. | C-06, C-34, C-35, C-38; D-07 |

The assistant depends on the [shared AI safeguards and outstanding integration decisions](shared-features.md). Its access must follow current assignment, including after release/transfer; general report visibility never grants assistant-output access. Its generated-suggestion retention and illustrative acceptance example remain explicitly deferred.

Developer profile status tabs list only current assignments, including Resolved/Closed, and omit historical assignments released/transferred away. Profiles, shared search/filter/sort, and mailbox items for replies and assigned-report edits are future shared features, not additional developer-only implementations (D-05; S-05, S-06, S-08).

### Deferred candidates: require a separate product decision

- A separate developer work queue beyond the confirmed profile tabs.
- A developer fix-summary assistant, distinct from the confirmed investigation assistant.
- A separate priority field; severity meanings/defaults also remain undecided and must not be invented.

These candidates are not promised future-release features. A workload/ageing dashboard and shared triage/discovery candidates are tracked in the shared plan. Automated repository synchronization, source editing/execution/deployment, and stale-report reminders remain excluded.
