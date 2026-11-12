# Submitted-report editing — Rendered UI Review

## Scope and Environment

- **Plan revision and submission:** [Feature plan](feature-plan.md), revision 4; EDIT-UI-POLISH-1, awaiting independent review.
- **Source revision:** HEAD `50d6c30984b3693afbb122a382d61cd6fba6d2fe`; rendered source diff Git hash `e49340ab0021c2a43a7fb9d9289426a4f5b168ef`, preserved in [rendered-source.diff](screenshots/rendered-source.diff). CSS-only diff hash `8752972901e8934ac180f3c1d2f26fcf67c3c2cd`.
- **Observed at:** 12 November 2026, approximately 12:35–12:38 Singapore time. Browser process timezone formatted timestamps differently from the host; screenshot timestamps are fixture UI values.
- **Application and fixtures:** Existing Vite app at local port 5186; dedicated HTTPS loopback Supabase at port 55421 with migrations 001–012. Synthetic Tester and Developer accounts, unique synthetic projects and assigned In progress reports. No hosted data or model calls. Browser severity conflict and AI output were controlled response simulations, explicitly identified below.
- **Browser, theme and viewports:** Installed Google Chrome through Playwright, headless; dark theme; 1440 × 1000 desktop and 390 × 844 narrow. Captures show whole viewports at their current scroll positions, without field crops.
- **Screens and acceptance criteria:** Editor, report activity and mailbox; R1/R3/R5/R6 and T10. CSS changes improve mobile content space, mailbox filter selection and action grouping. No product behavior changed.

## Checks and Captures

All listed images were opened and visually inspected. Capture `01` has a historical “before” filename, but was refreshed after CSS changes and represents the final state.

| Screen/state or operation | Viewport/theme | Action and expected result | Actual observation | Status | Capture and source revision |
| --- | --- | --- | --- | --- | --- |
| Ordinary prefilled editor | Desktop/dark | Open assigned report as original Tester. | Required fields prefilled, labels readable and form sections clear. | Passed | [01](screenshots/01-editor-desktop-before.png), final diff, viewport |
| Save and activity | Desktop/dark | Change title, save, inspect report activity. | Returned to same report ID; title updated; state and assignment retained; report edit appeared in activity. | Passed | [02](screenshots/02-saved-report-history.png), final diff, viewport |
| No-op | Desktop/dark | Reopen editor and save unchanged input. | Returned to same report. Browser does not establish history-row suppression. | Passed | Same fixture as 02; no separate capture |
| Severity notice, simulated response | Desktop/dark | Fulfill edit RPC with structured severity conflict. | Focus moved to notice, current High and selected Medium visible; manually changed title retained. | Passed | [03](screenshots/03-conflict-simulated-desktop.png), final diff, viewport |
| Narrow notice and wrapping | Narrow/dark | Resize and let responsive styles settle. | Full content width available; notice readable; no horizontal document overflow. | Passed | [04](screenshots/04-conflict-narrow.png), final diff, viewport |
| Keyboard focus | Narrow/dark | Press Tab from conflict notice. | Project select received a visible focus ring. This is a representative focus check, not a complete keyboard audit. | Passed | [10](screenshots/10-keyboard-focus.png), final diff, viewport |
| Empty mailbox | Narrow/dark | Open Tester mailbox with no items. | Empty message and all filter/reload controls readable. | Passed | [05](screenshots/05-empty-mailbox-narrow.png), final diff, viewport |
| Assigned-recipient mailbox | Desktop/dark | Sign in as Developer; open mailbox. | Actor, report title, project, timestamp, unread state, changed fields and actions visible. All filter has visible selected styling. | Passed | [06](screenshots/06-mailbox-desktop.png), final diff, viewport |
| Unread/open/read/delete | Desktop then narrow/dark | Select Unread, open report, return, delete item, reopen report URL. | Open navigated to same report; returning card showed Read. Delete removed item and report remained accessible. Narrow card/actions wrap legibly. | Passed | [07](screenshots/07-mailbox-narrow.png), final diff, viewport |
| AI suggestions, simulated output | Desktop/dark | Fulfill AI endpoint with synthetic description and question; Generate then Use suggestion. | Separate suggestion textarea and Use suggestion rendered; applying did not leave editor or save. No live provider evaluated. | Passed | [08](screenshots/08-ai-simulated.png), final diff, viewport |
| Validation | Desktop/dark | Clear title and save. | Title feedback appeared and editor remained open; viewport screenshot shows the form's lower region at submission scroll position. | Passed | [09](screenshots/09-validation-error.png), final diff, viewport |
| Request failure and recovery, simulated transport failure | Narrow/dark | Abort mailbox RPC, reload, then restore route and Retry. | Error and Retry readable; Retry restored actual local mailbox card. | Passed | [11](screenshots/11-mailbox-request-error.png), final diff, viewport |
| Explicit Mark as read | Desktop/dark | Separate button operation. | Button rendered; open-report path exercised read persistence, but separate button was not activated. | Unverified | 06 |
| Project move; real database severity conflict/retry; live AI | — | Additional integration operations. | Not exercised in this browser assignment; simulated conflict does not prove persistence concurrency. | Unverified | Separate database/test evidence required |
| Loading | — | Pending mailbox/editor state. | Requests completed too quickly for a reliable loading capture; not artificially delayed. | Unverified | None |

## Findings and Resolutions

| Finding | User impact | Owner and fix submission | Retest evidence |
| --- | --- | --- | --- |
| Hidden navbar reserved content space at narrow viewport. | Form and mailbox were squeezed into a narrow column. | UI polisher, CSS narrow padding override; EDIT-UI-POLISH-1. | 04, 05, 07, 10 and 11 inspected after responsive settling. Initial screenshots were overwritten during helper reruns; before-image evidence is unavailable. |
| Mailbox selected filter had no visual distinction; actions spread across desktop card. | Current filter was unclear and related controls were separated. | UI polisher, selected-state and flex alignment CSS; EDIT-UI-POLISH-1. | 06 and 07. |

## Review and Limits

- **Actual checks:** `npm run lint` passed. `npm run build` passed with existing ineffective dynamic import warning. `npm run test -- --run src/test/report-edit-ui.test.ts src/test/mailbox-ui.test.ts --maxWorkers=2` passed, 36 tests across two files. Local browser helper completed successfully after installed Chrome executable was selected; initial default Playwright browser launch failed because its expected bundled executable was absent.
- **Outstanding checks:** Explicit Mark as read, loading capture, project move, actual concurrent severity retry and full keyboard traversal remain unverified here. No functional TSX edits were made. Coordinator owns broader integration/database/coverage gates.
- **Evidence boundaries:** Browser actions establish rendered usability and selected local integration paths. They do not prove authorization, atomicity, complete history suppression or database concurrency. Synthetic account logout revoked shared runtime sessions; coordinator was notified after browser operations finished so runtime tokens could be refreshed. No credentials are recorded.
- **Reviewer and decision:** Pending independent reviewer decision for EDIT-UI-POLISH-1.
- **Later affected changes:** Refresh affected browser evidence if source behavior or styles change. Usage and active human time were not measured.

## Follow-up evidence — EDIT-UI-POLISH-2

This follow-up closes the required browser gaps listed in the first checkpoint above. The earlier captures remain preserved. No application source or CSS changed during this follow-up. Plan revision 4 and rendered-source hash `e49340ab0021c2a43a7fb9d9289426a4f5b168ef` still apply, confirmed at 12:43 Singapore time on 12 November 2026. The final browser run took place approximately 12:42–12:43. Browser/theme/viewports remain the same.

The helper created separate synthetic UI-only Tester and Developer accounts through the isolated loopback admin API, with profiles and unique synthetic source/destination projects. It did not sign out or modify the shared database-test accounts. Credentials stayed in process memory. The severity fixture used `docker exec -i supabase_db_bugwatch-report-editing psql` through Node child-process arguments and standard input. Inside a transaction, it set the UI-only Developer request claims and changed this fixture report's severity to High. The real database trigger recorded the revision and Developer role. The browser's edit RPC was not intercepted for this check.

| Operation | Action and expected result | Actual observation | Status | Final whole-viewport evidence |
| --- | --- | --- | --- | --- |
| Real severity conflict | Open original Tester's editor, change title, update severity in dedicated database, Save changes. | Real save showed Developer warning, current High and selected Medium. Entered title remained intact; active element was the notice. | Passed | [Desktop](screenshots/v2-01-real-severity-conflict.png), [narrow](screenshots/v2-02-real-conflict-narrow.png) |
| Explicit retry | Choose Save changes again after reviewing warning. | Returned to same report URL; actual local get_report confirmed retained title and Medium severity committed. | Passed | Save control context in [focus capture](screenshots/v2-03-save-keyboard-focus.png); final Medium in moved report capture below |
| Project movement | Select synthetic destination project and Save changes. | Returned to identical report ID. Local read confirmed destination, In progress state and existing edit history. Rendered page retained Developer assignment and previous activity. | Passed | [Report](screenshots/v2-05-moved-report-history.png), [complete activity at scroll position](screenshots/v2-09-moved-report-history-edit.png) |
| Save/Cancel keyboard order | Tab through editor controls at 390 × 844, then Tab from Save changes to Cancel. | Both controls received visible focus outlines; Save changes preceded Cancel. | Passed | [Save](screenshots/v2-03-save-keyboard-focus.png), [Cancel](screenshots/v2-04-cancel-keyboard-focus.png) |
| Loading, controlled delay | Hold mailbox RPC until capture, then continue actual local request. | Mailbox heading, filters and Loading mailbox message readable; actual items loaded after release. Delay was simulated; returned data was real local data. | Passed | [Loading](screenshots/v2-06-mailbox-loading-controlled-delay.png) |
| Separate Mark as read button | Open Unread, activate first Mark as read, then return to All. | Unread card count decreased by one; All showed the corresponding Read card. | Passed | [Read card](screenshots/v2-07-mailbox-open-keyboard-focus.png) |
| Mailbox keyboard/narrow | Tab to Open report and then next action at 390 × 844. | Open report and Delete had visible focus outlines; card text wrapped; no horizontal document overflow. | Passed | [Open](screenshots/v2-07-mailbox-open-keyboard-focus.png), [Delete](screenshots/v2-08-mailbox-action-keyboard-focus.png) |

All nine follow-up images were opened and inspected across the two runs; the final loading capture specifically waits for Loading mailbox rather than the earlier application bootstrap status. The helper finished successfully and printed the actual conflict retry, project movement, mark-read and narrow focus outcomes. The prior lint/build/36-test results remain applicable because this follow-up changed evidence and the ignored helper only. No additional application verification command was claimed.

The required follow-up operations now pass. Live AI remains outside scope; the earlier AI capture uses labelled synthetic output. These checks cover representative keyboard paths, not an exhaustive accessibility audit. No broad authorization/concurrency claim follows from a single browser fixture. Independent reviewer decision for EDIT-UI-POLISH-2 remains Pending.

### Final source correlation

The earlier rendered-source.diff identifies tracked changes only; its hash does not include new untracked modules. [final-source-manifest.json](final-source-manifest.json) now records SHA-256 for all 112 source/test/config/dependency/guide inputs, including the new editor and mailbox files. Its combined content hash is `258f55435e99e03f7ebaab23d002ac11e4ba604bc97f76a5bb3f6aa73e2c2d95`. This manifest was collected after the browser run, not at capture time. The UI specialist reported no source changes during follow-up; the coordinator made no application edits after those runs. File modification times provide supporting correlation. The independent mutation exercise also preserved the same new-page hashes: ReportEditPage.tsx `8415c3652d5c0c108fa079332473d774d435e27f2d7c3060ecd4e571205eb01d`, MailboxPage.tsx `b0de6d0e1d1972f96fe7b46cb8a6180d0ffbf089bc562a9811fa04be41ae1225`. No retrospective capture-time hash is claimed. Future captures should create the complete manifest before the run.

### Final independent review decision

The earlier Pending entries are historical checkpoints. editing_implementation_review explicitly approved EDIT-UI-POLISH-2 and combined revision5 after inspecting the captures and full source correlation. UI1 remains Blocked/superseded, rather than retrospectively approved. The reviewer later renewed combined approval at [manifest02](final-source-manifest-02.json), hash `00bdc146d34d5f2219a798381ac43a47a1422a2a3f378700052cac5b33badbe9`. Only database runner selection and its matching Developer Guide paragraph changed; rendered application source, styles, tests and SQL did not. The browser limitations above continue to apply.
