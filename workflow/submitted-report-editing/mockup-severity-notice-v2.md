# Submitted-report editing — severity notice mockup v2

Submission: **NOTICE-MOCKUP-1**, awaiting independent review and user design feedback. Standard-subagent fallback following the mockup specialist instructions; custom-role loading was not demonstrated.

Image: `mockup-severity-notice-v2.png`. Generated using the built-in image-generation tool from the existing v1 mockup reference. This is proposed imagery, not a screenshot or implemented behavior.

## Confirmed behavior shown

- Save-time check stops saving if the developer changed severity while the Tester edited.
- The notice appears above the form rather than in a popup. It states that changes have not been saved and the Tester's edits remain.
- The severity field is highlighted. The filled description remains visible.
- The report remains in **In progress**, an eligible state for the developer's severity change.

## Proposed presentation and unresolved choice

Amber styling, exact spacing and the comparison beneath Severity are proposed. The image keeps the Tester's unsaved Medium choice and separately shows the developer's latest saved High value; it does not silently replace the Tester selection. How the Tester acknowledges the change and completes a subsequent save is still undecided. This image does not authorize overwriting the developer value on a second click.

## Actual checks and limits

Visually inspected the generated result: whole header/sidebar and form are visible; notice text matches the requested wording; Project, Version, Title, Description, Reproduction steps, Expected results, Actual results, Severity and optional Test environment are present; Save changes and Cancel are visible. No popup or AI controls were added. All content uses synthetic data.

No application, database, OpenSpec or shared workflow files changed. No server, browser, accessibility, behavioral or database checks run. The image cannot demonstrate focus movement or screen-reader announcements. Usage counters and total task time are unknown; no performance improvement claimed. Image generation itself returned after approximately 48 seconds in tool output.

## Generation prompt

Create a single complete full-screen desktop UI mockup of BugWatch's proposed Edit report page after a blocked save caused by a developer's severity change. Use attached existing mockup as style reference only: preserve dark charcoal background, indigo buttons/links, thin gray borders, BugWatch header, Demo Tester with TESTER badge and Log out, whole workspace sidebar Projects / My drafts / Mailbox. No crop: show the whole app frame and all required fields and bottom actions. Tall portrait or near-square composition is fine to keep readable text. Prominent board label 'DESIGN MOCKUP — NOT IMPLEMENTED'. Breadcrumb Projects / Campus Events / Reports / Registration button does nothing / Edit. Back to report link. Heading Edit report, small State: In progress. Immediately ABOVE all form fields show a clear amber inline notice (not a popup, no overlay), exact heading 'Your changes haven’t been saved.' and exact body 'The developer changed severity from Medium to High while you were editing. Your edits are still here. Review the updated severity before saving again.' Form synthetic filled values: Project Campus Events, Version 1.0.0, Title Registration button does nothing, Description 'I tested again in Chrome. Clicking Register still leaves me on the event page.' This description represents retained unsaved Tester text: keep it clearly readable. Reproduction steps '1. Open Welcome Fair. 2. Click Register.' Expected results 'Registration confirmation appears.' Actual results 'Nothing happens.' Severity field shows 'Medium' as the Tester's currently unsaved choice, with an amber highlighted border and visible comparison helper text 'When you opened this form: Medium' and 'Latest saved by developer: High'. Do NOT silently change the severity dropdown to High. Do not invent an Apply latest or merge button; the final reconciliation choice remains undecided. Optional Test environment 'Chrome on Windows'. Place all form controls neatly, use full-width larger text fields and compact two-column short fields as needed. Bottom visible Save changes primary and Cancel secondary. Small footer 'Proposed conflict notice; final severity review interaction still under discussion.' No Save draft, no popup, no functioning-test claims, no AI controls, no fabricated screenshots. Faithful realistic dark app style, readable text, entire screen intact.

