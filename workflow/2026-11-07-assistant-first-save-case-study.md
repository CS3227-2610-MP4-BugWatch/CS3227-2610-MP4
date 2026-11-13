# Tester assistant first-save cancellation case study

## What the Tester would see

The Tester clicks Generate suggestions and then saves a draft before generation finishes. Saving moves the URL from /reports/new to /drafts/:id, while the user continues editing the same report. The pending request should survive this transition. With the faulty cleanup, React's development StrictMode checks could cancel that request.

## Why the UI changes underneath

The report form is attached to a suggestion session through useSyncExternalStore. The session owns the request controller, suggestion results and cooldown state. On first save, ReportCreatePage marks the session as transferring and associates it with the saved draft object. DraftEditPage retrieves that session for the new route. No generated text goes into browser history or the saved draft.

## Faulty sequence

1. Generation starts on the new report form.
2. Saving succeeds. The old route marks the session as transferring before it unmounts.
3. The new draft form subscribes to that session and clears the transfer flag.
4. In development, StrictMode checks the new subscription by setting it up, cleaning it up and setting it up again.
5. During this temporary cleanup, the listener count is zero and the transfer flag is false.
6. The synchronous cleanup treats that as a permanent departure and aborts the pending request.
7. Resubscribing cannot revive an aborted controller.

The faulty assumption was that zero subscribers at the instant cleanup runs means the Tester has finished editing. React can remove and restore a subscription as part of its lifecycle checks. This was a cleanup and lifetime bug exposed by StrictMode.

## Implemented fix

Cleanup removes the subscription, then queues a microtask that checks whether the session still has no listeners and no transfer in progress. A microtask runs after the current synchronous work finishes. It is not an arbitrary time delay.

- StrictMode reattaches the listener before the check runs, so generation survives.
- During the intentional first-save handoff, the transfer flag preserves the request until the new form takes over.
- When the Tester leaves normally, no form subscribes again and cleanup aborts the request and clears the cooldown timer.

The request completion path also checks the abort signal before publishing results. Cancellation in the browser does not prove an upstream server stopped work. Under the chosen quota rule, a request already dispatched to SoCLaaS still counts.

## Why the earlier tests missed it

The original handoff test covered generation pending during first save, but rendered without StrictMode. It exercised the old-form-to-new-form transfer without the additional subscription replay. The app itself is wrapped in StrictMode in src/main.tsx.

The test suite also checked ordinary unmount cancellation. An immediate-abort assertion encouraged synchronous cleanup, but the product needs cancellation after actual departure and allows a lifecycle-safe cleanup step. The repaired test waits for that observable cancellation instead of demanding one internal scheduling choice.

## Reproduction on 7 November

The coordinator copied the current code into a temporary workspace and replaced only the microtask cleanup block with its earlier synchronous equivalent. The same two targeted tests were run before and after restoring the fix.

| Version | Pending generation survives first save under StrictMode | Ordinary departure cancels |
| --- | --- | --- |
| Synchronous cleanup | Failed: signal.aborted was true, expected false | Passed |
| Current microtask guard | Passed | Passed |

The faulty run had one failure and one pass. The fixed run had two passes. Six unrelated cases were filtered out deliberately. This reproduced the result with deterministic UI tests and a controlled pending promise. It did not call SoCLaaS or reproduce a deployed production failure. React's extra StrictMode checks run in development.

## Evidence links

- [Subscription and cleanup](../src/features/reports/useReportSuggestions.ts)
- [First-save handoff](../src/features/reports/ReportCreatePage.tsx)
- [Draft editor receives the session](../src/features/reports/DraftEditPage.tsx)
- [Regression and ordinary-departure tests](../src/test/report-suggestions-ui.test.ts)
- [App StrictMode wrapper](../src/main.tsx)
- [React StrictMode documentation](https://react.dev/reference/react/StrictMode)
- [React external store subscription contract](https://react.dev/reference/react/useSyncExternalStore)

## How to explain it in the talk

“A Tester could start generating suggestions and save the first draft while it was running. Internally, that swaps the form component. The reviewer asked whether React's development checks would temporarily remove the subscription and accidentally cancel generation. The existing test missed that sequence. We added StrictMode to the test, reproduced the cancellation, and changed cleanup to check again after React had a chance to reattach. The same test passed, and a second test confirmed that actually leaving still cancels the request.”

This connects to L4 through the deterministic reproduction, L8 through independent review and specialist roles, and L10 through framework checks and regression feedback. The before-and-after result supports a claim about this particular failure sequence.
