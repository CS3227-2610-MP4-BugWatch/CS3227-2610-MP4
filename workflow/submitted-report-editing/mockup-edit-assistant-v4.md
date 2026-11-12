# Edit assistant proposal — mockup v4

Submission: EDIT-AI-MOCKUP-1. Awaiting independent review and user design feedback.

The image proposes keeping the existing Tester AI assistant available while editing a submitted report. This is a recommendation, not a user-approved requirement or implemented feature. No application, database, server, OpenSpec or shared instruction files were changed.

## Sources and decisions

The coordinator assigned one full-page dark edit form for original reporter Demo Tester and an In progress report. The image keeps the existing charcoal/indigo style, complete header/sidebar/breadcrumb, all report fields, and proposed Save changes/Cancel controls. It shows one illustrative description suggestion. It does not show a severity conflict notice.

Inspected full reference image `mockup-v1.png`, plus historical actual UI references `../mp4-presentation/screenshots/07-ai-suggestions-window.png` and `../mp4-presentation/screenshots/11-new-report-bottom-window.png`. These references do not establish that submitted-report editing exists.

Inspected `src/features/reports/ReportForm.tsx`, `useReportSuggestions.ts` and `reportSuggestionClient.ts`. Existing ReportForm renders separate editable suggestion textareas labeled "AI generated suggestion"; "Use suggestion" explicitly copies a trimmed suggestion into its manual field and removes that suggestion. "Generate suggestions" appears near the bottom before form actions. The existing assistant also supports suggestions for title and reproduction steps; this illustration shows only description, not a restriction to description.

The proposal is to preserve the same assistant context/privacy handling and manual controls when editing. It does not authorize wider context, changed access, automatic field writes, automatic saving or an AI service call. The existing client sends the current report request to the authenticated suggestion endpoint; nothing in this task invokes that endpoint. Exact implementation remains subject to the feature decision.

## Actual checks

Built-in image-generation tool used, one call, with the three inspected images as references. Copied the generated PNG to the assigned path and visually inspected the generated output. Full app framing, Project, Version, Title, Description, separate editable-looking suggestion and Use suggestion, Reproduction steps, Expected results, Actual results, Severity, optional Test environment, Generate suggestions, Save changes and Cancel are all visible. The original description remains visibly distinct and unchanged. Both proposal labels are present and readable. No Submit report, Save draft, severity conflict notice, invented response questions or success/network claim appears.

The image is a design artifact. It cannot establish browser behavior, accessibility, responsive layout, authorization, persistence or service correctness. No application verification commands were run because only the assigned image and notes were written. Tool cost and generation usage are unknown; no savings claim is made.

## Final prompt

```text
Use case: ui-mockup
Asset type: one full-page high fidelity BugWatch proposed desktop screen, portrait/tall canvas approximately 1600 x 2100, every field and action visible, no cropped edges.
Primary request: Show a proposal to retain the existing Tester AI suggestion assistant while editing an already submitted report. This feature is not implemented or user approved.
Reference images: Image 1 existing mockup-v1 is reference for whole app framing, navigation and compact edit layout. Image 2 actual 07-ai-suggestions-window and Image 3 actual 11-new-report-bottom-window are references for the charcoal theme, simple form styling and separate editable AI suggestion behavior. These are style/layout references, not edit targets.
Overall framing: one complete app screen. Outside the app at top show a clear indigo banner reading exactly "DESIGN MOCKUP — NOT IMPLEMENTED", with subtitle exactly "Proposal: keep AI suggestions available while editing". Do not make a before/after collage. Full top header "BugWatch" left; "Demo Tester", indigo "TESTER" pill and "Log out" right. Left full-height sidebar "WORKSPACE", active indigo "Projects", "My drafts", envelope icon "Mailbox". Charcoal background, slightly lighter charcoal card, subtle gray borders, white/gray sans serif text, indigo actions matching references.
Main card starts with breadcrumb "Projects / Campus Events / Reports / Registration button does nothing / Edit", then "← Back to report", then "Edit report". A small context row "Reporter: Demo Tester" and "State: In progress" is informational, not editable.
Form: text "All fields are required except Test environment." Then all the following visible, with generous readable spacing:
Project dropdown "Campus Events" and Version input "1.0.0" alongside.
Title single-line input "Registration button does nothing".
Description editable textarea containing only the existing user's text "Clicking Register leaves me on the event page."
Directly BELOW Description, visually distinct subtle indigo-bordered suggestion area, label exactly "AI generated suggestion", separate editable textarea with text "On the Welcome Fair event page, clicking Register leaves the page unchanged and no registration confirmation appears." It must have textarea resize corner to show editable. Separate outlined button below it exactly "Use suggestion". Keep original Description text unchanged so manual control is obvious. Small helper below suggestion "Review or edit this suggestion before using it." No automatic writing into original field.
Reproduction steps textarea "1. Open Welcome Fair.\n2. Click Register."
Expected results textarea "Registration confirmation appears." and Actual results textarea "Nothing happens." alongside.
Severity dropdown "Medium" and "Test environment (optional)" textarea or input "Chrome on Windows" alongside.
At bottom, outlined secondary button exactly "Generate suggestions" ABOVE final action row. Final row primary indigo "Save changes" and outlined "Cancel". End with small helper "Suggestions only replace a field when you choose Use suggestion."
Constraints: full app header, sidebar, breadcrumb and complete form including bottom buttons all visible. Use tall canvas if needed. Exactly one description suggestion shown, not suggestions for title/reproduction in this example. No severity conflict alert, no invented response questions, no Submit report, no Save draft, no fake network success, no AI chat bubble, no browser chrome. This is an ordinary editable In progress report. Save changes and Cancel are edit proposal controls. Preserve readable sharp exact labels.
```

