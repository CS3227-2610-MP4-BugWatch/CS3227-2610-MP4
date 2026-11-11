# Developer report resolutions — Test Summary

This summary covers the tester's work for developer report resolutions, accepted in submission `tester-1` and the final combined review under feature-plan revision 3. The coordinator confirmed independent approval before requesting this summary. The final targeted five-suite run passed 163 tests and skipped 25 guarded hosted cases. The tester also ran lint and the production build successfully. The coordinator reported final combined verification of 759 passing tests, 191 skipped tests, passing lint/build, and a successful 92-page documentation build. Hosted database execution and the two-role browser walkthrough remain manual checks at the user's direction; skipped cases do not establish database correctness.

## Files Added

- `src/test/report-resolution-validation.test.ts` was added to test discriminated resolution input, trimming, required fields, runtime types, Unicode boundaries, URL restrictions, and canonical UUID selection.
- `src/test/report-resolution-repository.test.ts` was added to test mutation payloads, error mapping, strict resolution and history decoding, compatible existing readers, and separate current and captured canonical targets.
- `src/test/report-resolution-ui.test.ts` was added to test detail-only controls, all outcome forms, independent linking, safe shared readback, activity disclosures, recovery, and local request guards.
- `src/test/report-resolution-database.test.ts` was added to provide isolated, explicitly opted-in Supabase coverage of permissions, trusted writes, targets, atomic events, no-op behavior, stale links, and concurrent operations. It was not executed against a hosted database.

## Files Changed

- `src/test/application-layout.test.ts` was changed to include the two new repository methods in its typed mock.
- `src/test/project-report-list.test.ts` was changed to supply the new nullable report fields and repository methods.
- `src/test/project-ui.test.ts` was changed to supply the new methods and a valid asynchronous empty report listing.
- `src/test/report-auth-boundary.test.ts` was changed to support canonical selection and resolution fixtures, and to exercise authentication expiry, logout, and replacement identities for both new mutations.
- `src/test/report-discussion-ui.test.ts` was changed to supply the new report fields, repository methods, and asynchronous report-list response while retaining existing discussion assertions.
- `src/test/report-repository.test.ts` was changed to expect the new nullable fields on a full report while leaving summary expectations unchanged.
- `src/test/report-suggestions-ui.test.ts` was changed to include the new methods in its report repository mock.
- `src/test/report-ui.test.ts` was changed to supply the new nullable fields, methods, and asynchronous empty report listing.
- `src/test/report-workflow-ui.test.ts` was changed to supply the new nullable fields and methods while preserving existing workflow assertions.

## Test Cases Added

- The `validateResolutionInput` cases check Fixed and all four non-fix outcomes, editable affected-version data, preserved URL spelling, surrounding and internal whitespace, minimum/maximum/over-limit Unicode text, missing and wrongly typed fields, exact and over-limit URLs, unsafe or malformed destinations, invalid canonical IDs, and rejection of irrelevant or forged fields.
- The `resolveReport` repository cases check normalized Fixed payloads, applicable-only non-fix payloads, saved Duplicate targets, protected metadata, local malformed-source rejection, forged input rejection, mapped service errors, and absence of automatic mutation retries.
- The `linkDuplicate` repository cases check exact expected-link payloads, malformed targets, accepted UUID casing, preserved lifecycle state, and separate canonical metadata.
- The repository compatibility cases check pre-migration unfinished records, valid Resolved/Closed records, persisted consumed-draft receipts, project summaries, malformed resolution metadata, invalid authors and targets, unexpected fields, and required current canonical metadata.
- The history repository cases check creation history alongside new resolution/link events and reject invalid transitions, malformed snapshots, actor/time mismatches, invalid UUIDs, null new links, and unchanged-link events.
- The resolution UI cases check default Fixed selection, editable version prefill, cancellation, every non-fix form, discarded hidden fields, missing saved Duplicate links, actor/state/archive partitions, and absent close/reopen/retest controls. These cases caught a real deferred-event typing crash; the presentation owner fixed it before the final passing run.
- The linking UI cases check source exclusion, Resolved/Closed options with stable IDs, separate saves, expected-link replacement, retained outcome and entered text, independent loading errors/retries, and empty target lists.
- The shared readback UI cases check both roles, literal markup-like values, safe saved anchors, retest guidance, active discussion controls, distinct current and captured Duplicate targets, and compact activity disclosures.
- The recovery UI cases check associated field feedback, overlapping resolution/link/comment/workflow prevention, recoverable validation, authoritative conflict refresh, uncertainty requiring read-only reload, failed history readback, retained unsaved text, ignored late mutation completions, and ignored stale target loads after navigation.
- The authentication cases `%s_expiredSession_rechecksAuthAndClearsProtectedContent`, `%s_staleUnauthorizedAfterIdentityReplacement_preservesReplacementSession`, and `%s_pendingCompletionAfterLogout_doesNotRestoreProtectedContent` each cover `resolveReport` and `linkDuplicate`.
- The 25 guarded database cases cover each outcome and both-role readback; separate linking and immutable snapshots; eligible source/target states; wrong actors and direct-write denial; invalid states and targets; missing saved Duplicate links; forged metadata and invalid input boundaries; exact Unicode/URL limits; archive rejection and archive races; competing resolution/clarification requests; and serialized link/resolution races. Ordinary clients perform behavioral assertions; elevated access is limited to isolated fixture setup and cleanup. These cases remain pending manual execution.

## Test Cases Changed

- Existing full-report expected values in `report-repository.test.ts` now include `resolution: null` and `canonicalReport: null` because the public report contract requires these fields. Project summary expectations continue to omit them because summaries do not expose resolution records.
- Existing layout, project, report, suggestion, workflow, discussion, and authentication fixtures now implement the extended repository contract and valid asynchronous listing responses. Their prior behavior assertions were preserved; these adaptations do not relax authorization, persistence, or recovery expectations.
