# Manage clarification and discussion - Test Summary

This summary covers the tester's work for Manage clarification and discussion, accepted in submission TEST-1 against feature-plan revision 4, and the administrative closeout recorded in revision 8. TEST-1 and the final UI-NAV-2 source/test changes retain independent approval. The tester's original full local Vitest run passed 578 tests and skipped 162 hosted tests across 21 passing files and five skipped files. ESLint, the production build, and the scoped test diff check passed for that submission.

The coordinator's final revision 7 local run passed 618 tests and skipped 166 tests across 25 passing files and six skipped files. Those results follow upstream integration and the final navigation changes; they are not a rerun performed by this tester during closeout. The 33 new clarification/discussion hosted scenarios remained skipped in the agent-run local suite. The user later reported that all feature manual and automated checks passed and explicitly accepted the final breadcrumb removal and return-button alignment. That external success is user-reported verification, not evidence of an agent-executed hosted database, SQL rollback, or browser check. No hosted counts or command output are inferred from the user's report.

## Files Added

- `src/test/report-discussion-validation.test.ts` was added to test the confirmed 5,000-code-point limit, blank and non-text input, whitespace normalization, multiline plain text, and reply identifiers.
- `src/test/report-discussion-repository.test.ts` was added to test normalized posting, trusted server fields, strict decoding, complete chronological pagination, raw timestamp cursors, safe errors, and failure without automatic retries.
- `src/test/report-discussion-ui.test.ts` was added to test Conversation and Activity navigation, report disclosures, ordinary comments and replies, independent clarification controls, composer lifetime, partial failures, pending actions, and stale completions.
- `src/test/report-discussion-database.test.ts` was added to define 33 isolated database scenarios for clarification authorization and atomic events, comment permissions and integrity, validation parity, pagination, archival, and concurrent requests. These scenarios are skipped without explicit isolated database configuration; their presence does not establish that the migration passes them.

## Files Changed

- `src/test/report-workflow-repository.test.ts` was changed to include wait/resume RPCs in the existing valid-input, malformed-ID, safe-error, and no-retry partitions. It also covers waiting-state report reads, progressed draft receipts, and both clarification history events.
- `src/test/report-workflow-ui.test.ts` was changed to supply the new repository methods and inspect history through the Activity tab while retaining its existing workflow and identity-label assertions.
- `src/test/report-ui.test.ts` was changed to supply the new repository methods and select Activity before testing history content and retry behavior. In the coordinator's approved UI-NAV-2 follow-up, its retained return-navigation regression was revised to check that the breadcrumb is absent and that Back to project reports and the project link reach their intended destinations. An extra breadcrumb-only case was intentionally removed because that control was removed at the user's request.
- `src/test/report-auth-boundary.test.ts` was changed to supply discussion methods, initialize successful empty discussion reads after resetting mocks, extend expiry checks to wait/resume, and check posting expiry and stale unauthorized failures after identity replacement.
- `src/test/application-layout.test.ts`, `src/test/project-report-list.test.ts`, and `src/test/project-ui.test.ts` were changed only to supply the added ReportRepository methods in their test doubles. Their existing behavior assertions were preserved.

## Test Cases Added

- `validateCommentInput_configuredLimit_isConfirmed5000CodePoints` checks the confirmed numeric limit.
- The `validateCommentInput_blank`, `nonText`, and `invalidReference` cases reject empty, Unicode-whitespace-only, unexpected runtime values, and malformed reply references without throwing.
- The `validateCommentInput_%sCodePoints_accepts` and `overLimit_rejects` cases check the accepted 1, 4,999, and 5,000 boundaries and rejected 5,001 boundary, including astral characters.
- `validateCommentInput_multilineAndMarkup_trimsOnlySurroundingWhitespace` checks that meaningful internal whitespace and literal markup survive normalization. The `noReply` cases check normalization to null.
- `postReportComment_validText_sendsOnlyNormalizedUserInputAndMapsServerIdentity` checks that forged author/time properties are not sent and persisted server fields are decoded. `postReportComment_noReply_sendsNullReference` checks the ordinary-comment path.
- The repository invalid-text, invalid-reference, malformed-report, and malformed-row cases reject invalid requests before networking or reject malformed persisted responses safely.
- `listReportComments_empty_returnsSuccessfulEmptyList` distinguishes an empty conversation from a failed read.
- `listReportComments_101EqualMicrosecondTimestamps_preservesRawCursorAndOrder` and `exact100_fetchesEmptyNextPage` check complete results at the page boundary without losing timestamp precision.
- `listReportComments_repeatedFullPage_rejectsWithoutInfiniteLoop` and `secondPageFails_rejectsInsteadOfReturningPartialConversation` prevent misleading partial success or an endless reader.
- The discussion repository error partitions check safe authentication, permission, validation, archive, missing-record, and unavailable failures for reads and posts. Network-rejection cases check that neither operation retries automatically.
- `reportDetails_initialVisit_expandsDetailsAboveEmptyConversationWithCount` checks the default tab, initial disclosure, count, empty state, and ordering above the composer.
- `activity_existingCreationAndClarificationEvents_keepsHeaderAndExpandsOriginalSnapshot` checks the persistent context/actions and initially collapsed complete history changes.
- `conversation_tabAndDetailsChanges_preserveUnsentTextAndReplyTarget` checks local composer retention and cancellation of only the reply reference.
- `conversation_commentsAndAuthorMarkup_renderLiterallyInChronologicalOrder` checks safe chronological rendering. `conversation_referenceAndDiscussionShortcuts_targetReadableConversation` checks reference navigation, focus, latest-comment navigation, and return from Activity.
- The `comment_$roleParticipant_postsWithoutChangingLifecycle` cases cover the reporter, another Tester, the assignee, and another Developer. The reply case checks the referenced comment ID without a nested thread.
- The clarification success cases check waiting before a question is posted and resuming without a reply, while retaining unsent composer text. Non-assignee cases check that state controls are absent.
- `comment_archivedProject_keepsConversationReadOnly` checks that discussion remains readable while posting and lifecycle actions are unavailable.
- `comment_pending_blocksRepeatedPostAndWorkflowOverlap` and `clarification_pending_blocksCommentPosting` check both directions of the shared local mutation guard.
- The clarification conflict cases check authoritative readback without posting a comment. The rejected-validation case checks retention of text and reply reference.
- The comment mutation/readback failure cases check uncertainty messaging, retained input, a disabled repost until readback, and no automatic retry.
- The discussion/activity section-error cases check readable report content and retrying only the affected section; a failed discussion read must not display a false zero count.
- `comment_pendingCompletionAfterNavigation_doesNotPopulateReplacementReport` checks that a stale post cannot populate a replacement report.
- `discussion_postExpiredSession_rechecksAuthAndClearsUnsentText` checks the existing authentication flow and clearing protected input.
- `discussion_staleUnauthorizedPostAfterIdentityReplacement_keepsReplacementSession` checks that a late unauthorized failure cannot clear the new user's input or recheck the replacement session.
- The isolated clarification cases define no-comment wait/resume, exact attributable history, preserved assignment, forbidden actors, source-state conflicts, missing reports, archive rejection, and concurrent duplicate transitions committing once.
- The isolated comment cases define trusted identity, literal text normalization, workflow independence in both investigation states, Unicode boundaries, rejection of non-string JSON, same-report reply integrity, anonymous/unprofiled denial, archived read-only access, and denial of direct insert/update/delete or forged parameters.
- The isolated pagination and concurrency cases define complete equal-timestamp keyset reads over 101 rows, scoped identity output, both concurrent comments surviving, and explicit missing-report rejection.

## Test Cases Changed

- The workflow repository operation partitions now include `awaitTesterInformation` and `resumeInvestigation`, preserving existing acceptance and investigation-start expectations.
- `getReport_supportedState$state_decodesAssignment` and `submitDraft_oldReceiptNow%s_decodesProgressedReport` now include Awaiting tester information so every shared report read path accepts the new persisted state.
- `listReportHistory_allEvents_preservesCreatedAndMapsWorkflowChanges` now checks both clarification events. Malformed-history partitions reject their incorrect source/target state combinations.
- `reportDetails_$role_readsAssignmentTimestampAndActivityAsLiteralLabels`, `reportDetails_directLink_loadsHistoryAndRendersMarkupLiterally`, and `reportDetails_failedHistoryLoad_retriesWithoutShowingMissingReport` now navigate through Activity because history moved to that tab; the identity, snapshot, safe-rendering, and retry assertions remain.
- `workflow_%sExpiredSession_rechecksAuthAndClearsProtectedContent` now covers both clarification actions in addition to the existing actions.
- Existing application-layout, project-report-list, and project UI test cases retain their assertions; only their repository fixtures gained the required methods.
- The retained report return-navigation regression in `src/test/report-ui.test.ts` now verifies absence of the removed breadcrumb together with the Back to project reports button/link and project-link destinations. The original extra breadcrumb case was intentionally removed in UI-NAV-2 rather than retained as an expectation for a control the user no longer wants. This change accounts for the reduction from the coordinator's earlier 619-test passing run to the final 618-test passing run; it did not weaken lifecycle, discussion, or authorization assertions.
