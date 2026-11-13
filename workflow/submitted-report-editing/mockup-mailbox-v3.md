# Mailbox mockup v3

Submission: MAILBOX-MOCKUP-1. Status: awaiting independent review and user design feedback.

The image shows one proposed mailbox screen for Demo Developer after Demo Tester edits an assigned report. It uses synthetic data and the charcoal/indigo theme from the supplied references. It is a design image, not an implemented screen.

## Sources and decision status

- Confirmed scope: BugWatch.md C-16, S-06, submitted-report editing description (line 135), and mailbox decision record (line 307) establish read/unread status, mark-as-read, opening the relevant report/message, delete/dismiss, unread filtering, and assigned-developer notification after report input edits. Unassigned-report edits do not notify a developer.
- Proposed, not user-approved: this mailbox layout, notification wording, changed-field summary and arrangement of actions. The assigned wording is “Demo Tester updated ‘Registration button does nothing’.” with typographic double quotes around the report title in the image, followed by “Changed: Description, Severity.”
- Open: user feedback on the notification wording and layout. Opening may lead to the report and its history; this image does not settle whether opening marks an item read. No automatic mark-as-read behavior is asserted.
- Implementation status: mailbox remains proposed in the current application. Existing mockups do not establish that the sidebar item or mailbox screen is implemented.

## Generated artifact and checks

- Image: mockup-mailbox-v3.png.
- Built-in image generation was used for a new image. The references were visually inspected first: mockup-severity-notice-v2.png and mockup-v1.png.
- The generated output was visually inspected: the entire desktop app shell, developer identity and role, Projects item, selected Mailbox item, All/Unread filter, one notification, Unread text badge, exact sentence and changed-field text, and Open report / Mark as read / Delete actions are visible and legible.
- The notification is a list card. No popup, replies, retest items or invented notification types appear.
- Both “DESIGN MOCKUP — NOT IMPLEMENTED” and “Proposed notification layout” appear. A bottom caption explicitly says wording and layout await feedback.
- No application source, tests, database or OpenSpec files were changed. No browser, accessibility, functional or database checks were performed; a generated image cannot establish those results.
- No generation cost or duration claim is made.
- This is a new mailbox proposal, not approval of the old mockups or approval of mailbox design by the user.

## Exact generation prompt

```text
Use case: ui-mockup.
Generate ONE high-fidelity, full-screen desktop BugWatch mailbox proposal. Use the two viewed mockup references for the established charcoal/indigo theme and complete app shell, but show a single mailbox screen, not either reference's report form. Landscape 1536x1024-like composition, uncropped complete outer app frame, whole header and sidebar, generous legible typography.
Top outside app: prominent indigo banner with exact text "DESIGN MOCKUP — NOT IMPLEMENTED".
App header: "BugWatch" at left; right shows "Demo Developer", role pill "DEVELOPER", button "Log out".
Left sidebar: small "WORKSPACE" label; "Projects" unselected and visible; "Mailbox" selected with envelope icon and indigo rounded background. Do not show My drafts for this developer.
Main area: heading "Mailbox", below it exact subtitle "Proposed notification layout". Immediately below: segmented filter "All" selected, "Unread" unselected.
Show exactly ONE notification row/card in the list with a subtle indigo left accent and visible text badge "Unread". The main notification sentence must read EXACTLY: Demo Tester updated “Registration button does nothing”.
Next line must read EXACTLY: Changed: Description, Severity.
Small muted context line "Campus Events" is allowed.
Below the row's text show three clearly legible action buttons: primary indigo "Open report", secondary neutral "Mark as read", and neutral with muted red text "Delete".
Rest of main area is calm empty charcoal space, no unrelated notifications, no popups, no detail drawer, no replies, no retest messages, no invented event types. Keep notification content text readable without truncation. The card is a normal mailbox item, not a popup. Make all UI text crisp, white/light gray on charcoal, with restrained indigo highlights and thin gray borders. No browser chrome, no photograph, no device frame. Synthetic demo data only.
Outside app bottom: exact caption "Proposed mailbox view; notification wording and layout await feedback."
This is an exploratory image, not implemented app behavior. Do not add any explanatory labels that imply opening automatically marks a notification read.
```

