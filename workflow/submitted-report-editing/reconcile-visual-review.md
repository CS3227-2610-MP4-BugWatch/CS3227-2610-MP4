# Reconciliation — Rendered UI Review

## Scope and Environment

- **Plan revision and submission:** [feature plan](feature-plan.md), revision 7; RECON-UI-1, awaiting independent review.
- **Source revision:** [pre-run source manifest](reconcile-browser-source.json), captured 2026-11-12T15:37:23.066Z. It identifies HEAD and SHA256 for all 133 tracked/untracked src, api and selected package/build/TypeScript/lint configuration files. Manifest SHA256: `23226ff20ed514eab5d661017ac95bdf0730461de1902cd3859eb503ff99399b`. Post-run comparison found zero changed source files.
- **Observed at:** 2026-11-12, approximately 23:38–23:39 Asia/Singapore (final capture run).
- **Application and fixtures:** Root-owned Vite http://127.0.0.1:5186, disposable local Supabase https://127.0.0.1:55421 with migrations 001–013. Two runs used fresh UI-only synthetic Tester/Developer accounts and projects/reports. No global test accounts or shared-token logout. Fixture creation, assignment, linking and resolution used actual local RPCs; editor and mailbox actions used the rendered UI. No live AI calls.
- **Browser, theme and viewports:** Playwright with installed Chrome 157 headless; dark theme, whole viewport screenshots at 1440×1000 and 390×844. Captures are uncropped viewport images at the stated scroll positions.
- **Screens and acceptance criteria:** R9 project lock and permitted same-project edits; combined PR9/edit history, resolved read-only detail, mailbox read/open. No application source or styles changed.

## Checks and Captures

| Screen/state or operation | Viewport/theme | Action and expected result | Actual observation | Status | Capture and source revision |
| --- | --- | --- | --- | --- | --- |
| Linked project rejection | Both/dark | Change title and Project, Save changes; show Project error and retain title | Actual database rejection displayed the general explanation and red Project field message. Title input retained its exact value. Follow-up get_report confirmed neither title nor project was written. Narrow native input text scrolls within its control; no page overflow. | Passed | [desktop](screenshots/reconciliation/01-project-rejection-desktop.png), [narrow](screenshots/reconciliation/02-project-rejection-narrow.png), [retained title](screenshots/reconciliation/03-retained-title-narrow.png); manifest above |
| Same-project recovery | Narrow/dark | Restore original Project and save retained title | Navigated to detail, saved title matched, get_report retained canonical_report.id. Title wraps clearly on detail. | Passed | [saved detail](screenshots/reconciliation/04-same-project-edit-narrow.png) |
| Resolved read-only detail | Both/dark | Resolve duplicate through local RPC, reload Tester detail; resolution visible and Edit absent | Resolution outcome, explanation and canonical snapshot rendered; Edit report link count was zero. Desktop header shows Resolved state; narrow resolution text and links wrap. | Passed | [narrow resolution](screenshots/reconciliation/05-resolution-narrow.png), [desktop header](screenshots/reconciliation/06-resolution-desktop.png) |
| Combined history | Both/dark | Open Activity; inspect report_edited, duplicate_linked and resolved with recorded changes expanded | All three event labels were present. Title before/after, previous/new canonical reference, and resolution snapshot displayed. Long IDs wrap at narrow width. Scrolling is required; captures show separate portions of the history. | Passed | [desktop edit/resolution](screenshots/reconciliation/07-combined-history-desktop.png), [narrow resolution](screenshots/reconciliation/08-combined-history-narrow.png), [narrow link/edit](screenshots/reconciliation/12-duplicate-history-narrow.png), [desktop expanded changes](screenshots/reconciliation/13-duplicate-history-desktop.png) |
| Mailbox read/open | Narrow/dark | Mark assigned Developer item read, then Open report | Card showed Title as changed field. Mark as read disappeared and Read label appeared; Open report navigated to the correct resolved report. Controls fit the viewport. | Passed | [unread](screenshots/reconciliation/09-mailbox-unread-narrow.png), [read](screenshots/reconciliation/10-mailbox-read-narrow.png), [opened](screenshots/reconciliation/11-mailbox-open-narrow.png) |
| Representative keyboard focus | Narrow/dark | Focus Open report, press Tab; expect Mark as read | Active element assertion matched Mark as read and visible blue focus ring surrounded the control. | Passed | [keyboard focus](screenshots/reconciliation/14-mailbox-keyboard-focus.png) |
| Loading, transport error, empty mailbox, AI, severity conflict | N/A | Outside this bounded reconciliation recheck | These states were not rerun; earlier evidence is historical and is not represented as a new pass here. | N/A | None |

All captures were opened and visually inspected. Text remained readable, links remained visibly underlined in report content, and no horizontal document overflow was detected in any captured state. This is representative keyboard evidence, not a full accessibility audit.

## Findings and Resolutions

| Finding | User impact | Owner and fix submission | Retest evidence |
| --- | --- | --- | --- |
| No application defect found in assigned checks | None observed | No application changes made | Final browser run exited 0 |
| Initial sandbox denied local API socket | First attempt stopped before creating an account | Retried with approved local execution; stderr suppressed to prevent request-header logging | Both subsequent browser runs exited 0 |

## Review and Limits

- **Actual checks:** Pre-run manifest generation; two completed `node workflow/submitted-report-editing/runtime.local/reconcile-visual-check.mjs` runs; screenshot inspection; post-run SHA256 comparison (zero changed source files). Final run added focused keyboard and separate history captures. Application tests, lint and build were not rerun by this visual-only agent; coordinator owns those checks.
- **Outstanding checks and prerequisites:** Independent reviewer decision pending. Incoming/captured canonical-reference variations, lock schedules, full authorization and rollback are database/test responsibilities; browser fixture covered an outgoing current link only. Mailbox Open was exercised after Mark as read; opening an unread item was not independently retested here.
- **Evidence boundaries:** The exact browser actions and local follow-up reads support the observations above. Fixture link/resolve setup through RPC does not establish that their developer form flows were operated. Screenshots do not prove general database correctness or hosted behavior. No hosted preview, live AI, exhaustive keyboard audit or all-resolution-outcome claim.
- **Reviewer and decision:** Pending independent review of RECON-UI-1.
- **Later affected changes:** Any relevant source change requires renewed affected checks and review.
