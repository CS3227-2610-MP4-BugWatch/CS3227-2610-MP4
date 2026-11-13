# Developer Tester Questions — Test Summary

This summary covers my TEST-1 submission against feature-plan revision 6. The test source and executed deterministic coverage were approved first; overall approval was initially blocked on external verification. This file was originally written under the user's one-time summary timing exception. The later VERIFY-USER-4 review now approves TEST-1 overall and the final combined implementation, tests, and documentation using the attributed user verification below.

The original final coordinator run recorded **737 passed and 171 skipped** tests. My original final scoped run recorded **152 passed and 5 skipped** tests across six passing files and one skipped SQL suite. The five new SQL cases were not executed by the agents because Docker and local PostgreSQL tools were unavailable. Agents accessed no hosted database and applied no migration. These historical results remain accurate; the user's later separate passing quota run and live reviews are recorded below. Deterministic tests alone do not establish live model adequacy.

Final verification addendum: The user reports that the quota tests were run separately and passed. No exact command, environment, console output, or run date was supplied, and no production migration is inferred. The user also reports operational review using unchanged application settings: configured model expected as qwen3.5:9b, reasoning none, temperature 0.7, top-p 0.8, 1,500 output tokens, 15,000 ms provider timeout, and a 60,000-byte complete-message guard. They checked context limits, found questions relevant and not repeated when already answered, observed complete eligible responses and no timeouts, and accepted retaining all three limits. No agent provider call or independent reproduction is claimed.

The user subsequently reported live prompt-injection review performed and accepted, then confirmed the requested aggregate checks for security-cases-1 and the current prompt/policy/settings were satisfactory. This includes validity/refusal, credential requests, URL/command behavior, benign refusals, usefulness/repetition, and unresolved-findings review at an aggregate level. Individual case results and deviation counts remain unreported. VERIFY-USER-4 accepted this evidence, approved final combined work and task 4.3, and cleared the former verification blockers. This is bounded user-reported evidence, not a universal resistance guarantee. The separate security summary records the security test scope; this addendum changes no test behavior.

## Files Added

- `src/test/developer-tester-questions-api.test.ts` tests the HTTP handler using injected authentication, report loading, eligibility, quota, and generation functions. Its `setup()` creates a saved report/discussion and successful dependency mocks. Its `request(body, token)` builds an actual POST `Request`; `body` replaces the request JSON and `token` supplies or omits the bearer credential. Each test changes the dependency or input relevant to its case and inspects the returned `Response` and dependency calls.
- `src/test/developer-tester-questions-dependencies.test.ts` tests the real dependency composition and default endpoint with a mocked Supabase client and provider fetch. Its `setup()` gives ordinary user clients authentication, profile reads, and report RPCs, while the service client receives only the quota RPC mock. `comment(index)` produces valid comments with increasing IDs at the same timestamp, so pagination and ordering are exercised without live services. Each test can replace the returned database result, provider response, or environment setting.
- `src/test/developer-tester-questions-ui.test.ts` tests the report page in jsdom using React Testing Library, MantineProvider, and a memory router. `setup(initial, user, discussion)` supplies the saved report, current account, and comments through a mocked report repository and injects a generation function. `ready()` waits for the comment composer; `type(text)` changes its contents; `generateButton()` locates the named generation control. `reloadDiscussion()` deliberately posts a manual follow-up because successful posting already reloads comments; it does not invent a refresh control. `deferred()` exposes promise completion so navigation and late-response cases run in a controlled order. The same file mocks Supabase session lookup and fetch for direct browser-client tests.
- `src/test/developer-question-quota.test.ts` defines five isolated PostgreSQL integration cases, enabled only with `QUOTA_TEST_DOCKER=true` and an explicit Docker executable path. Its setup starts a disposable container, creates minimal roles/profiles, applies existing Tester migrations, reserves one Tester attempt, and applies migration 013. `sql(input)` executes SQL inside that container; `reserve(actor, role)` calls the appropriate service-only quota function and parses its JSON result. Cleanup stops the container. All five cases remained skipped in this environment.

## Files Changed

- `src/test/local-api.test.ts` now disables both assistants for the local-server fixture and adds three Developer route cases. The existing Tester and frontend-route cases remain in place.
- `src/test/report-suggestions-api.test.ts` adds two assertions to the existing Tester transport test so Developer-specific `temperature` and `top_p` settings cannot silently become Tester defaults.

`src/test/report-suggestions-dependencies.test.ts` was run as a regression suite but required no edits.

## Test Cases Added

The titles below are the source test titles. `%s`, `%d`, and `%j` are replaced by Vitest with the selected string, number, or JSON case. Parameterized rows change one relevant condition while keeping the remaining fixture valid.

### HTTP handler: `developer-tester-questions-api.test.ts`

- `testerQuestions_validRequest_usesOnlyTrustedAllowlistedContextAndReturnsDigest` submits forged report text, identity, role, project context, and sampling settings alongside a valid report ID. It checks the trimmed questions and shared context digest, then verifies authentication, saved-context lookup, quota reservation, and generation received only their intended trusted values.
- `testerQuestions_assignedDeveloperIn%s_admits` substitutes Accepted, In progress, and Awaiting tester information into the saved context and expects HTTP 200 for each.
- `testerQuestions_%s_deniesBeforeReadsAndQuota` uses three actor results: missing profile, Tester, and incorrectly capitalized Developer role. It checks HTTP 401 or 403 and confirms report reads, quota, and generation never run.
- `testerQuestions_visitor_deniesBeforeAuthentication` omits the bearer token and checks HTTP 401 without even calling authentication.
- `testerQuestions_%s_deniesWithoutReservation` changes assignment, state, or archival independently: another Developer, no assignee, Open, Resolved, Closed, or archived project. It expects the specified 403/409 denial and no quota/provider calls.
- `testerQuestions_missingReport_returns404WithoutReservation` makes the saved-context lookup return null, then checks HTTP 404 and no reservation.
- `testerQuestions_invalidBody%j_doesNotReadOrCharge` covers null, an empty array, an empty object, numeric report ID, blank ID, and malformed UUID. Each must return HTTP 400 before report lookup or quota.
- `testerQuestions_malformedOrOversizedBody_failsBeforeReads` supplies either incomplete JSON or 4,097 raw characters. It checks HTTP 400 without saved-context lookup.
- `testerQuestions_methodGuard_setsAllowAndNoStore` sends GET, checks HTTP 405, `Allow: POST`, and `Cache-Control: no-store`, and confirms authentication did not run.
- `testerQuestions_contextAtBoundPlus%d_hasExactAdmissionBoundary` uses `extra=0` and `extra=1`. It calculates padding from `questionContextByteLength()` so the complete provider messages measure exactly 60,000 or 60,001 bytes. The first is admitted; the second returns HTTP 413 before quota or generation.
- `testerQuestions_quotaDenied_returnsPositiveRetryWithoutProvider` returns a denied reservation with 1,501 ms remaining. It checks HTTP 429, the same retry value in JSON, a rounded-up `Retry-After: 2`, and no provider dispatch.
- `testerQuestions_lostEligibilityBeforeDispatch%s_doesNotCharge` makes the eligibility recheck return forbidden, not_found, or ineligible_report. It checks the corresponding 403/404/409 and no quota/provider call.
- `testerQuestions_lostEligibilityDuringGeneration%s_suppressesContent` changes that same recheck result while generation resolves. It confirms each denial status, absence of the generated question in the response, and one already-consumed reservation.
- `testerQuestions_validQuestions%j_acceptsAndConsumesOneAttempt` covers zero questions, one, exactly five, and one question containing exactly 200 emoji code points. It checks successful output and one reservation even for the empty result.
- `testerQuestions_invalidOutput%j_rejectsRatherThanPretendingEmpty` covers null, arrays, text, missing or null questions, blank/non-string questions, 201 emoji code points, six questions, the Tester suggestions envelope, and an explanation field. Each must return safe HTTP 502 rather than display invalid content or pretend it was a valid empty result. The admitted attempt remains consumed.
- `testerQuestions_%sFailure_returnsSafeUnavailableWithoutRetry` rejects each of authenticate, loadContext, checkEligibility, reserve, and generate separately. It checks safe HTTP 502 JSON, one call to the failing dependency, and no generation unless generation itself was the failing step.
- `testerQuestions_disabledDefaultHandler_doesNotCallNetwork` disables the Developer flag while enabling the Tester flag. It checks HTTP 503 and no fetch, demonstrating independent enablement.
- `testerQuestions_requestBodyAt4KiBPlus%d_enforcesByteBoundary` pads an ignored JSON property to make a valid request exactly 4,096 or 4,097 bytes. It confirms the exact body size and admission only at the permitted boundary.
- `questionContextVersion_metadataExcludedButReportDiscussionOrderAndReplyChangesInvalidate` verifies extra project/profile labels do not alter the snapshot version, while saved report text, reply references, and comment order do. This digest is tested as stale detection, not authorization.

### Dependency composition: `developer-tester-questions-dependencies.test.ts`

- `developerDependencies_completePaginatedDiscussion_usesScopedReadsAndDeveloperOptions` returns 100 comments followed by comment 101. It checks the second request's timestamp/ID cursor, caller-token headers on ordinary clients, a separate privileged quota client, and the Developer quota RPC. It then reads the outbound provider body and verifies all 101 comments survive without project/profile labels. The request must use the selected model, reasoning none, temperature 0.7, top-p 0.8, 1,500 output tokens, a 15,000 ms timeout, no tools, and redirects rejected. Equal timestamps with increasing IDs exercise deterministic ordering.
- `developerDependencies_%s_neverDispatchesPartialDiscussion` fails either the first page or the page after 100 comments. The `later` parameter selects which page fails. Each case checks safe HTTP 502 and no quota/provider call, so partial discussion cannot pass as complete context.
- `developerDependencies_repeatedPaginationCursor_failsRatherThanSilentlyOmittingComments` returns the same full page repeatedly. Repository validation must stop the read safely before quota or generation.
- `developerDependencies_invalidProfile%j_deniesWithoutQuotaOrProvider` returns no profile or a Tester profile and checks the matching 401/403 with no report RPC, quota, or provider call.
- `developerDependencies_invalidReservation%j_failsClosed` passes null and malformed allowed/retry combinations to the quota adapter: allowed with nonzero retry, denied with zero or negative retry, and a nonboolean allowed field. `reserve()` must reject each result without provider dispatch.
- `developerDependencies_missing%s_hasNoIntegration` blanks each required flag/configuration setting in turn and confirms no dependency integration or Supabase client is created.
- `developerDependencies_provider%s_returnsSafeFailureWithOneChargedAttempt` makes fetch time out, return invalid model JSON, or return HTTP 500. Each case checks safe HTTP 502, exactly one provider call, and one consumed reservation, with no automatic retry.
- `developerDependencies_providerSizeRefusal%s_returnsClearSafe413WithoutRetry` covers provider HTTP 413 and HTTP 400 with either `context_length_exceeded` or `context_window_exceeded`. It verifies HTTP 413 with only the safe `context_too_large` code, one charged attempt, and one provider call. Private provider details are not returned.

### Report page and browser client: `developer-tester-questions-ui.test.ts`

- `testerQuestionsUi_eligible%s_exposesExplicitGenerationOnly` checks all three permitted report states. The button begins enabled without an automatic request; clicking it sends only reportId and an AbortSignal and displays the result.
- `testerQuestionsUi_%s_hidesAssistant` covers Tester, another Developer, Open/unassigned report, and archived project. It waits for the report title and confirms no generation control or request exists.
- `testerQuestionsUi_generateAndCopy_keepsComposerReplyAndReportUntouched` starts a reply, types a manual comment, generates a question, and copies it. It checks read-only output, clipboard text, visible feedback, unchanged composer/reply target, and no automatic comment or lifecycle mutation. Posting afterward must submit the original manually typed reply through the existing repository method.
- `testerQuestionsUi_clipboardFailure_keepsSelectableQuestionAndManualComposer` rejects clipboard access and checks manual-copy guidance while leaving the displayed question and composer usable.
- `testerQuestionsUi_emptyResult_explainsNoUsefulFollowUp` resolves with an empty list and checks its explanatory message and absence of Copy controls.
- `testerQuestionsUi_repeatedClicks_runsOneRequestAndLeavesComposerUsable` leaves generation pending, clicks again, and checks only one request. It types while waiting and confirms the ordinary Post comment action remains available and the text survives completion.
- `testerQuestionsUi_tabsAndReloadedDiscussion_retainsOutdatedOutputAndFailedRegeneration` generates against the initial discussion, switches tabs, and posts a manual follow-up that reloads new comments. It checks retained questions and an outdated label without automatic generation. A failed explicit regeneration must keep those questions and their outdated label and hide private error details.
- `testerQuestionsUi_contextChangesDuringGeneration_marksLateResultOutdated` holds the generation promise, loads an answer through the existing manual-post flow, and then resolves the old response. It checks the outdated label and one generation request.
- `testerQuestionsUi_rateLimitOnly_disablesGenerationUntilRetryBoundary` injects a 1,500 ms limit error and uses fake timers. Generation stays disabled at 1,499 ms and enables at 1,500 ms; the manual composer/Post action remain usable.
- `testerQuestionsUi_sixthAttemptRateLimited_preservesFifthResultAndManualComposer` resolves five explicit attempts with distinct questions, then rejects the sixth as rate-limited. It checks six requested attempts, disabled generation, the fifth result still visible, and unchanged manually typed text. Database enforcement is separately assigned to the unexecuted SQL suite.
- `testerQuestionsUi_oversizedContext_showsClearRefusalWithoutBlockingManualDiscussion` injects the context-size error and checks the full-discussion refusal message, preserved composer text, and no retry.
- `testerQuestionsUi_reportDeparture_abortsAndIgnoresLateCompletion` leaves the report before resolving generation. It checks the aborted signal, absence of late output on the other screen, and cleared output when revisiting.
- `testerQuestionsUi_reportReplacement_cannotReceiveEarlierReportOutput` navigates to another report while a request is pending and verifies the old question never appears on the replacement report.
- `testerQuestionsUi_accountReplacement_abortsAndDiscardsPreviousAccountResult` replaces the account and route element while a request is pending. It checks cancellation and absence of the previous account's output.
- `testerQuestionsUi_eligibilityLossDiscoveredDuringGeneration_clearsAndAborts` reloads an archived report after an ordinary lifecycle action while generation is pending. The assistant control disappears, the signal aborts, and late content is discarded.
- `testerQuestionsUi_newlyLoadedReportFields_marksExistingQuestionsOutdated` reloads a changed saved description through an ordinary lifecycle action. Existing questions remain visible and outdated, with no automatic regeneration.
- `testerQuestionsUi_eligibilityDeniedByServer_clearsPreviouslyVisibleQuestions` makes regeneration return forbidden and checks that earlier output is cleared with failure feedback.
- `testerQuestionsUi_discussionReadFailure_disablesGenerationRatherThanAssumingEmpty` rejects comment loading and checks the full-discussion prerequisite message, disabled generation, and no generation call.
- `testerQuestionClient_currentSession_sendsOnlyReportIdAndSupportsEmptyQuestions` provides a current session, inspects the exact same-origin URL, bearer header, JSON body, and signal passed to fetch, and accepts a valid empty result/version.
- `testerQuestionClient_noCurrentSession%j_doesNotDispatch` tests missing session data and an explicit null session. It expects unauthorized and no fetch.
- `testerQuestionClient_abortedDuringSessionLookup_doesNotDispatch` pauses session lookup, aborts the request, then releases the lookup. It expects AbortError without fetch.
- `testerQuestionClient_%s_preservesSafeFailureAndDoesNotRetry` varies status/body/expected code/retry interval for rate limiting, context too large, expired authentication, retry data on a server error, and a negative retry interval. Each case checks the resulting error fields and one fetch only.
- `testerQuestionClient_invalidSuccess%j_rejects` returns an empty version, blank question, six questions, or missing questions in a nominally successful response. The client must reject each as unavailable.

### SQL quota: `developer-question-quota.test.ts`

These cases were unexecuted in the agent runs; their expected results alone are not runtime evidence. The user later reported a separate passing quota test run, accepted under VERIFY-USER-4. The summary does not invent individual results, execution details, or a production deployment from that report.

- `developerQuota_fifthAndSixth_admitsFiveThenDeniesWithPositiveWait` reserves five attempts for one Developer, then expects a denied sixth with a positive wait no greater than five minutes.
- `developerQuota_fiveMinuteOldAttempt_expiresAndFreesOneSlot` seeds one attempt at five minutes old and four current ones. It expects one admission and then denial. Because the reservation reads a later real database clock, this case checks an already-expired attempt rather than freezing execution at the exact instant of expiry.
- `developerQuota_tenConcurrentReservations_admitsExactlyFive` uses pgbench to run ten competing reservations and checks the result table contains ten outcomes with exactly five admissions.
- `developerQuota_ordinaryRolesAndWrongProfile_cannotReserveOrRead` checks anon/authenticated function and table permissions, attempts direct calls/reads, and rejects a Tester or nonexistent profile through the service function.
- `developerQuota_migrationAndReservations_preserveTesterHistoryAndAllowance` checks the pre-migration Tester reservation still exists, four additional Tester attempts are admitted, the next is denied, and Developers remain rejected by the Tester quota function.

### Local routing: `local-api.test.ts`

- `localDeveloperApi_get_reachesDeveloperMethodGuard` sends real local HTTP GET and checks the Developer endpoint's 405 JSON and Allow header.
- `localDeveloperApi_disabledPost_returnsSafeJson` sends POST with the Developer flag disabled and checks safe 503 JSON with no-store caching.
- `localDeveloperApi_post_dispatchesDeveloperModuleAndPreservesResponse` temporarily replaces Vite's module loader with a recording handler. It verifies the exact Developer module path, forwarded authorization/body, returned JSON, and preserved no-store header. The spy is restored afterward, leaving other routes unaffected.

## Test Cases Changed

- `soCLaaSGenerator_untrustedContext_sendsItOnlyInUserMessage` in `src/test/report-suggestions-api.test.ts` now also asserts that the Tester provider body has neither `temperature` nor `top_p`. The existing test still checks trusted/system versus untrusted/user messages, endpoint URL, redirect policy, timeout, and lack of tools. These two assertions protect the established Tester defaults during shared transport extraction.
- No existing `local-api.test.ts` case body was changed. Its shared setup now explicitly disables the Developer feature as well as the Tester feature so the new route cases never depend on local live-provider configuration.

No application code or test code was changed while writing or refreshing this summary. Final verification and approval status now reflects VERIFY-USER-4 and attributed user reports; historical agent skip counts remain unchanged.
