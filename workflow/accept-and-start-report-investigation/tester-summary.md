# Accept and start report investigation — Test Summary

This summary covers the tester's work accepted in TEST-1 and its TEST-2 correction, under feature plan revision 5. The coordinator confirmed independent approval of both submissions and the final combined work before requesting this summary.

The tester's full local Vitest run passed 451 tests and skipped 129 hosted tests. Local lint and build passed. After the timeout correction, focused hosted-suite collection skipped all 20 workflow cases because isolated credentials were unavailable to the agent; scoped ESLint, TypeScript build checks, and diff checks passed. The user subsequently reported that all tests from `npm run test:report-db` passed, as well as the requested migration, rollback SQL, and manual checks. Those hosted and manual results are user-reported; no hosted count is inferred.

## Files Added

- `src/test/report-workflow-repository.test.ts` was added to test workflow RPC contracts, strict decoding, safe errors, history, progressed draft receipts, and listing pagination.
- `src/test/report-workflow-ui.test.ts` was added to test explicit detail actions, authoritative readback, recovery, request guards, identity labels, and listing restrictions.
- `src/test/report-workflow-database.test.ts` was added to test authorization, concurrent transitions, immutable assignment, rejected-write preservation, and persisted shared readback in an explicitly isolated Supabase environment.

## Files Changed

- `src/test/report-repository.test.ts` was changed to provide the extended Open report and listing label metadata while preserving existing submission, draft, and pagination expectations.
- `src/test/report-ui.test.ts` was changed to supply assignment metadata, workflow repository mocks, and the trusted user required by report details. Existing form, draft, navigation, and readback assertions remain intact.
- `src/test/project-report-list.test.ts` was changed to supply the extended report fields, propagate assignee labels into mocked summaries, and include workflow repository methods.
- `src/test/report-auth-boundary.test.ts` was changed to test workflow expiry and stale completion through the real authenticated shell, alongside its existing submission and draft tests.
- `src/test/application-layout.test.ts` and `src/test/project-ui.test.ts` were changed only to add the new required repository method mocks.
- `src/test/report-workflow-database.test.ts` received the TEST-2 correction: the investigation race scenario now has a finite 30-second budget and a comment explaining its sequential remote snapshot requests. Every assertion and the actual concurrent `Promise.all` calls were preserved.

## Test Cases Added

The following parameterized families in `src/test/report-workflow-repository.test.ts` cover both `acceptReport` and `startInvestigation` where the title contains a method placeholder:

- `%s_validId_sendsOnlyReportIdAndReturnsPersistedFields` checks the RPC name, ID-only parameters, and persisted assignment result.
- `${method}_malformedId%s_rejectsWithoutRpc` checks empty, malformed, truncated, and whitespace-suffixed identifiers without network calls.
- `${method}_error%s_mapsTo%sWithoutSqlLeak` checks existing and new database error mappings without exposing private SQL messages.
- `${method}_http401_mapsToUnauthenticated` checks session-expiry classification.
- `${method}_networkRejection_doesNotRetry` checks safe unavailable errors and a single mutation attempt.
- `getReport_supportedState$state_decodesAssignment` checks Open, Accepted, and In progress readback.
- `getReport_inconsistentAssignment%j_rejectsUnavailable` checks unsupported states, malformed IDs/times, invalid label types, and incompatible assignment combinations.
- `getReport_openWithAssignmentMetadata%j_rejectsUnavailable` checks that Open reports cannot carry assignment time or labels.
- `getReport_label%s_preservesPlainText` checks blank and markup-containing labels without altering their text.
- `submitDraft_oldReceiptNow%s_decodesProgressedReport` checks that an old draft receipt can return an Accepted or In progress report.
- `listProjectReports_assignedRows_preservesScopedLabelsAndRawCursorPrecision` checks assigned summaries and exact timestamp/ID continuation across 101 rows.
- `listReportHistory_allEvents_preservesCreatedAndMapsWorkflowChanges` checks creation, acceptance, and investigation events, identity labels, and camel-case change fields.
- `listReportHistory_malformedEvent%j_rejectsUnavailable` checks unknown events, missing required changes, invalid assignment values, and incorrect transition directions.

The following cases and families were added in `src/test/report-workflow-ui.test.ts`:

- `reportDetails_$0.role/$1.state_archive$1.projectArchivedAt_showsOnlyEligibleAction` checks the role, state, ownership, and archive eligibility matrix without automatic mutations.
- `acceptReport_success_refreshesReportAndHistoryBeforeSeparateStart` checks authoritative reads after each action and requires a separate investigation click.
- `%s_pending_blocksDuplicateRequests` checks disabled controls, progress feedback, and one request while either mutation is pending.
- `workflow_%s_explainsAndRefreshesAuthoritativeState` checks already-assigned, state-conflict, and archive explanations and refreshed controls.
- `workflow_%sFailure_requiresReadOnlyReloadWithoutMutationRetry` checks uncertain mutation, report-read, and history-read failures, disabled mutations, and explicit read-only recovery.
- `workflow_completionAfterNavigation_doesNotPopulateReplacementReport` checks that a late result cannot refresh or replace another report page.
- `workflow_completionAfterUnmount_doesNotRefresh` checks that a late result does not request readback after unmount.
- `reportDetails_$role_readsAssignmentTimestampAndActivityAsLiteralLabels` checks shared readback for both roles, username fallbacks, literal markup, assignment times, and all activity types without displaying raw assignee IDs.
- `projectListing_assignedReport_showsStateAndAssigneeWithoutActions` checks persisted state and literal assignee labels while keeping workflow actions absent from listings.

The following cases and families were added in `src/test/report-workflow-database.test.ts`. The suite validates isolated HTTPS origins and distinct Developer identities before creating fixtures:

- `acceptReport_twoDistinctDevelopersRace_firstWinsWithOneAtomicEvent` checks one winner, one acceptance event, trusted assignment/time, and unchanged data after duplicate attempts.
- `startInvestigation_nonAssigneeDeniedAndConcurrentAssigneeStart_commitsOnceAndPreservesAssignmentTime` checks non-assignee denial, one concurrent success, one state conflict, preserved assignment/time, and unchanged data after repeated actions.
- `startInvestigation_openReport_rejectsStateConflictWithoutWrites` checks an invalid source state.
- `${action}_%s_deniesWithoutWrites` checks both actions for Testers, anonymous callers, and accounts without profiles.
- `${action}_archivedAfterRead_rejectsWithoutWrites` checks archive rejection after an earlier successful read.
- `${action}_missingReport_returnsNotFound` checks nonexistent report IDs.
- `${action}_forgedProtectedParameters_rejectedWithoutWrites` checks that callers cannot supply actor, assignment, time, or target state.
- `workflow_directWritesBy%s_cannotForgeReportOrHistory` checks rejected direct report updates and history insertion, modification, and deletion for ordinary users.
- `workflow_%sReload_readsPersistedStateAndScopedLabelsWithoutPrivateData` checks both roles' detail, history, and listing readback without email or private report detail leakage into summaries.

The following families were added in `src/test/report-auth-boundary.test.ts`:

- `workflow_%sExpiredSession_rechecksAuthAndClearsProtectedContent` checks both mutations through the existing expired-session authentication flow.
- `workflow_acceptanceCompletionAfter%s_doesNotRestoreOldProtectedState` checks late success after logout or identity replacement and stale unauthorized failures without clearing the replacement session.

## Test Cases Changed

- `createReport_validInput_sendsOnlyNormalizedUserFieldsAndMapsSavedRow`, `getReport_existingReport_readsScopedRow`, and `submitDraft_validCurrentValues_returnsReport` in `src/test/report-repository.test.ts` now expect null assignment time and labels on fresh Open reports, matching the extended persisted contract.
- `listProjectReports_fullPage_usesRawTimestampAndUuidCursorAndMapsAllRows` in `src/test/report-repository.test.ts` now expects null assignee labels in summaries. Assignment time remains detail-only; cursor assertions are unchanged.
- Existing cases in `src/test/report-ui.test.ts`, `src/test/project-report-list.test.ts`, `src/test/application-layout.test.ts`, and `src/test/project-ui.test.ts` retain their original behavior assertions. Their shared fixtures now satisfy the extended report, summary, repository, and trusted-user contracts.
- `startInvestigation_nonAssigneeDeniedAndConcurrentAssigneeStart_commitsOnceAndPreservesAssignmentTime` in `src/test/report-workflow-database.test.ts` was changed by TEST-2 because its many sequential hosted requests exceeded the default five-second budget in the user's run. Its explicit 30-second budget accommodates remote latency without weakening correctness assertions or serializing the race.
