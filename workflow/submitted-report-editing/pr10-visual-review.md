# Final rendered compatibility check — merged PR10

This check used the actual local app on development39f4f08 plus the editing/mailbox changes, with clean disposable migrations001–014. No application files changed during the check. The pre-run131-file source manifest is [pr10-source-manifest.json](pr10-source-manifest.json), content SHA-256 `9278a2da997ba3ccb8ffdbbe50b6f465535da2e58fa7dc016f8a6b6ebd33529e`.

Browser: headless installed Chrome, dark theme,1440×1000desktop and390×844narrow. Images are complete viewports at their current scroll position, not cropped fields. The helper used separate synthetic Tester/Developer accounts; credentials stayed private. It ran `node workflow/submitted-report-editing/runtime.local/pr10-visual-check.mjs`, exited0, and saved [outcome log](pr10-browser-run.txt). Earlier captures were preserved in their separate directories.

| Actual action | Observed outcome | Evidence |
| --- | --- | --- |
| Change Project and title on an outgoing duplicate-linked report, then save | Clear Project error; exact title retained; follow-up database read confirms no project/title write | [Desktop](screenshots/pr10/01-project-rejection-desktop.png), [narrow](screenshots/pr10/02-project-rejection-narrow.png), [title](screenshots/pr10/03-retained-title-narrow.png) |
| Restore original project and save the retained title | Same report opens; title saved; canonical link retained | [Detail](screenshots/pr10/04-same-project-edit-narrow.png) |
| Resolve the fixture via authorized local RPC, reload as Tester | Resolution readable and Edit report absent | [Narrow](screenshots/pr10/05-resolution-narrow.png), [desktop](screenshots/pr10/06-resolution-desktop.png) |
| Expand Activity entries | Edit, duplicate-link and resolution events all render with their recorded values | [Desktop](screenshots/pr10/07-combined-history-desktop.png), [narrow](screenshots/pr10/08-combined-history-narrow.png), [link/edit](screenshots/pr10/12-duplicate-history-narrow.png), [expanded](screenshots/pr10/13-duplicate-history-desktop.png) |
| Developer marks the edit item read, then opens its report | Correct changed-field card, persisted Read label and correct report navigation | [Unread](screenshots/pr10/09-mailbox-unread-narrow.png), [read](screenshots/pr10/10-mailbox-read-narrow.png), [opened](screenshots/pr10/11-mailbox-open-narrow.png) |
| Tab from Open report to Mark as read | Expected active control and visible focus; helper detects no horizontal document overflow | [Focus](screenshots/pr10/14-mailbox-keyboard-focus.png) |

All assigned browser assertions passed and14captures were saved. The coordinator directly inspected four representative images: desktop/narrow rejection, desktop combined history and narrow unread mailbox. Remaining captures are available for independent review; no claim that the coordinator opened every image is made.

Limits: outgoing current-link fixture only; other references and permissions have separate database evidence. Resolution setup through RPC is not a browser test of every resolution form. Mailbox Open follows Mark as read, so opening an unread item was not independently retested here. No live AI generation, hosted preview, full accessibility audit or new loading/error sweep. PR10's question assistant is preserved and covered by its existing automated tests; generation was not invoked in this browser run. Independent final acceptance is recorded in feature-plan.md when returned.
