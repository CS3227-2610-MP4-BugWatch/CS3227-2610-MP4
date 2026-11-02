# Tester features: MVP and future releases

Source: [BugWatch specification](../BugWatch.md), especially C-03, C-10, C-19–C-22, C-29, C-30, C-33, and T-01–T-06.

This is the recommended release split requested by the product owner, not implemented functionality or implementation authorization. It preserves confirmed rules and leaves explicitly deferred details undecided. See [Shared features](shared-features.md) for the MVP definition, shared dependencies, launch decisions, and exclusions; see [Developer features](developer-features.md) for developer-only actions. The original specification remains the source of product behaviour.

## MVP

The tester must be able to submit a useful report, preserve unfinished work deliberately, answer questions, and decide whether a developer's resolution is acceptable.

| Feature | MVP scope and boundaries | Why it belongs in MVP | Specification |
| --- | --- | --- | --- |
| Submit a structured bug report | Select an active project and supply title, description, version, reproduction steps, expected results, actual results, and severity. Severity names are Very Low, Low, Medium, High. Offer one optional Test environment field grouping browser/OS/device information. No reproduction-frequency field or evidence upload/link mechanism. Create an Open, unassigned report with system-maintained reporter/ID/timestamps. | Supplies the core information developers need to investigate. | C-03, C-10, C-19, C-22, C-25, C-40; T-01 |
| Manually save, resume, and delete private report drafts | Save incomplete reports even when required submission fields are missing; restore them after logout/login and allow author-only deletion. Only the author may access a draft. Store drafts in Supabase Database. Required fields apply on submission. Saving is explicit; unsaved text is lost on session expiry. | Protects lengthy report preparation under the specified session-expiry behaviour without inventing autosave. | C-12, C-20; T-04 |
| Retest and close a resolved report | Only the original reporting tester may close a Resolved report. Fixed resolutions require retesting first; non-fix resolutions require no retest. Closed is final. Necessary retest details must be specified before implementation; do not invent a checklist or fields. | Completes the feedback loop and distinguishes a developer's resolution from the reporter's verification. | C-25, C-28, C-29, C-31; T-05 |
| Return an unsuccessful resolution to investigation | Only the original reporter may change Resolved to In progress, with a mandatory reason and the previous developer retained. This applies to resolved reports; never reopen Closed reports. | Prevents an unsuccessful fix or disputed resolution from ending the workflow. | C-30; T-05 |

Report/project browsing, detail pages, activity history, and participation in ordinary discussion threads are shared MVP features, defined once in [Shared features](shared-features.md). In particular, testers can respond to clarification requests in the thread, and any authenticated user may participate; a reply does not automatically resume work or change state (T-03, C-14, C-27).

### MVP boundaries and dependencies

- Testers cannot accept, release, transfer, or resolve reports; cannot create/edit projects; and cannot withdraw submitted reports. Fixed/non-fix resolution is performed by the assigned developer.
- Post-submission input editing is scheduled after MVP. A tester can provide further information in the discussion in the meantime. This is a delivery-stage omission of a confirmed feature, not a permanent change to C-21.
- Settle validation limits and severity meanings/defaults before the affected report-form implementation, and necessary retest details before the closure implementation. No new defaults are selected here.
- Use the shared role/ownership checks, session handling, persistence, and activity history. If a later release adds project archives, all tester writes, including submission, discussion, edits, retest results, closure, and reopening, must respect archived-project restrictions.
- Profiles and mailbox notifications are later shared features. Until then, use the shared project/report lists and details to check progress and find reports awaiting retesting; no separate tester dashboard is added.

## Future releases

### Confirmed features recommended after MVP

| Feature | Future scope and dependencies | Why it can follow MVP | Specification |
| --- | --- | --- | --- |
| Edit submitted report inputs | Only the submitting tester may edit all report input fields while Open, Accepted, In progress, or Awaiting tester information. Block editing in Resolved/Closed and in archived projects. Record changes in history. Notify the assigned developer through the mailbox; edits to unassigned reports create no notification. Deliver this with the required mailbox edit event. | Initial submission and discussion allow investigation before a complete editing/notification workflow is available. | C-21; T-04 |
| Tester report assistant | On request, suggest a title, structured description, and reproduction steps from the tester's observations. Identify missing details and ask targeted questions rather than inventing facts. Suggestions are editable and reviewed before explicit submission; never silently overwrite a draft or submit. Use only current-report fields/discussion and preserve manual input on generation failure. | The structured manual form already delivers the core reporting outcome; AI integration decisions remain unresolved. | C-06, C-34, C-35; T-06 |

The assistant depends on the [shared AI safeguards and outstanding integration decisions](shared-features.md). Its generated-suggestion retention and illustrative acceptance example remain explicitly deferred.

Tester profile status tabs showing reports opened by that tester, shared search/filter/sort, and mailbox replies/retest notifications are future shared capabilities. They are defined in the shared plan rather than duplicated as tester-only features (T-02; S-05, S-06, S-08).

### Deferred candidates: require a separate product decision

- Evidence submission: no upload-versus-link choice, formats, sizes, counts, or external-link mechanism is approved.
- Reproduction templates/checklists: the approved structured report fields do not imply a template system.
- A separate tester my-reports dashboard beyond the confirmed profile status tabs.

These candidates are not promised future-release features. Private test-session notes, verification checklists, comment drafts, and withdrawal of submitted reports remain outside the agreed scope; see the shared exclusions.
