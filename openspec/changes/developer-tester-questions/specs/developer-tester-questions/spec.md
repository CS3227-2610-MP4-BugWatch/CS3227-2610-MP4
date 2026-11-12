# Spec Delta

## Purpose

Help the assigned Developer identify useful questions for a bug report's tester using its saved fields and discussion, while keeping discussion posting deliberate and generated suggestions temporary.

## ADDED Requirements

### Requirement: Assigned Developer access
The system SHALL permit generation and viewing only for the currently assigned authenticated Developer on an active-project report in Accepted, In progress, or Awaiting tester information. Server-side checks SHALL enforce eligibility independently of page visibility.

#### Scenario: Eligible states
- **WHEN** the assigned Developer requests questions for a report in any of the three permitted states in an active project
- **THEN** the request is eligible for generation subject to context and quota limits

#### Scenario: Ineligible actor
- **WHEN** a visitor, Tester, account without a valid profile, or different Developer directly requests generation
- **THEN** access is denied without model dispatch or quota consumption

#### Scenario: Ineligible state or archived project
- **WHEN** generation targets an unassigned report, an Open/Resolved/Closed report, or an archived-project report
- **THEN** generation is denied without model dispatch or quota consumption

#### Scenario: Eligibility changes during generation
- **WHEN** assignment, state, or project archival makes the caller ineligible before generated output is returned
- **THEN** the server suppresses the output and the page clears suggestions when it discovers lost eligibility

### Requirement: Current saved context
The assistant SHALL use only the current saved report input fields and its current saved discussion as incident context, loaded server-side under the caller's authorization. Report and discussion text SHALL be treated as untrusted data rather than instructions.

#### Scenario: Permitted input
- **WHEN** an eligible Developer generates questions
- **THEN** the request uses current report fields and chronological discussion, excluding unsent text, other reports, private drafts, attachments, source code, activity history, and additional project information

#### Scenario: Forged context
- **WHEN** a caller supplies alternate text, identity, assignment, project details, or request options
- **THEN** those values do not replace server-derived context or authorization and are not forwarded to the model

#### Scenario: Embedded instructions
- **WHEN** report or discussion text requests a change of assistant behavior or asks for secrets
- **THEN** it is conveyed only as untrusted incident data, grants no tool or application action, and does not alter trusted question-generation instructions

### Requirement: Complete discussion or explicit refusal
The system SHALL include the full saved discussion when complete context fits its supported input bound. It SHALL decline generation with a clear explanation when context exceeds that bound, without silently omitting or summarizing comments.

#### Scenario: Context within the bound
- **WHEN** complete serialized context is at or below the supported bound
- **THEN** generation includes all saved discussion, including comments requiring additional read pages

#### Scenario: Context beyond the bound
- **WHEN** complete context exceeds the supported bound
- **THEN** generation is declined before quota reservation/model dispatch, the size limitation is explained, and manual discussion remains available

#### Scenario: Incomplete discussion read
- **WHEN** some or all saved discussion cannot be loaded
- **THEN** generation fails safely rather than treating missing data as an empty or complete conversation

### Requirement: Questions-only suggestions
The assistant SHALL return zero to five clear, specific tester questions targeting missing or ambiguous information. Questions SHALL avoid information already answered in the supplied context. Output SHALL contain no hypotheses, fixes, investigation plans, or explanations accompanying questions.

#### Scenario: Missing information
- **WHEN** a report and discussion leave useful details unresolved
- **THEN** the assistant suggests up to five relevant questions that a tester can answer, without inventing observations

#### Scenario: Answer already supplied
- **WHEN** discussion already answers a potential question
- **THEN** the assistant avoids asking that question again

#### Scenario: No useful follow-up
- **WHEN** no useful follow-up questions remain
- **THEN** an empty question list is valid and the page clearly states that no useful follow-up questions were identified

#### Scenario: Invalid response
- **WHEN** the provider returns malformed output, more than five questions, overlong/blank/non-text questions, or unexpected output fields
- **THEN** the system rejects the response with safe failure feedback rather than showing it as valid questions or as a successful empty result

### Requirement: Deliberate copy and posting
Generated questions SHALL appear as labeled read-only suggestions with a Copy action. The Developer SHALL separately edit and post through the existing discussion composer. Generation and copying SHALL NOT post comments, overwrite composer text, or change report fields, assignment, state, or history.

#### Scenario: Copy a question
- **WHEN** the Developer selects Copy for a question
- **THEN** that question is copied with visible feedback and existing composer text/reply target remain unchanged

#### Scenario: Clipboard unavailable
- **WHEN** copying fails or clipboard access is unavailable
- **THEN** the page explains the failure and question text remains available for manual selection

#### Scenario: Manual posting
- **WHEN** the Developer pastes, optionally edits, and posts a question using the composer
- **THEN** it follows existing ordinary-comment behavior without an assistant-driven lifecycle transition

### Requirement: Transient suggestion lifecycle
Generated suggestions SHALL remain only in memory on the current report page. They SHALL persist across local tab changes and discussion reloads but clear on report departure, page refresh, account change, or discovered loss of eligibility. They SHALL NOT be saved to the database or browser persistent storage.

#### Scenario: Continue on the same page
- **WHEN** the Developer changes report tabs or reloads discussion
- **THEN** existing suggestions remain available while eligibility remains valid

#### Scenario: Leave or change identity
- **WHEN** the Developer leaves or refreshes the report page, signs out, or changes accounts
- **THEN** suggestions are discarded and late generation results cannot populate the replacement screen

### Requirement: Outdated suggestion indication
The page SHALL retain and label existing suggestions outdated when subsequently loaded discussion or report fields differ from the context used for generation. It SHALL offer explicit regeneration rather than regenerating automatically.

#### Scenario: New answer loaded
- **WHEN** the page loads a comment added after the suggestions' context snapshot
- **THEN** previous suggestions remain readable, are marked outdated, and offer regeneration

#### Scenario: Context changes during generation
- **WHEN** a response arrives after the page loaded a different context snapshot
- **THEN** its suggestions are marked outdated rather than presented as current

#### Scenario: Failed regeneration
- **WHEN** regeneration fails
- **THEN** prior suggestions and their outdated indication remain available, and the Developer may retry subject to quota

### Requirement: Independent Developer quota
The system SHALL allow five admitted generation attempts per Developer across reports in a rolling five-minute window, independently of Tester quotas. Reservation SHALL be atomic using trusted server time. Admitted provider failures and empty results SHALL consume attempts; ineligible, invalid, oversized-context, or disabled requests SHALL NOT.

#### Scenario: Fifth and sixth attempts
- **WHEN** a Developer has four recent attempts and requests two more sequentially
- **THEN** the fifth is admitted and the sixth is rate-limited with a positive retry interval without provider dispatch

#### Scenario: Concurrent reservations
- **WHEN** requests compete for remaining allowance
- **THEN** at most five recent attempts are admitted for that Developer across instances

#### Scenario: Window boundary
- **WHEN** an attempt is exactly five minutes old
- **THEN** it no longer consumes the current allowance

#### Scenario: Separate roles
- **WHEN** Developer generation consumes allowance
- **THEN** Tester allowances and their existing behavior remain unchanged

### Requirement: Nonblocking generation outcomes
Generation SHALL show progress, prevent overlapping local generation requests, and provide safe failure/rate-limit feedback without disabling the existing manual report discussion workflow. Failure SHALL NOT cause automatic retries or disclose internal errors.

#### Scenario: Timeout or provider failure
- **WHEN** the provider times out, fails, or returns unusable output
- **THEN** the page offers appropriate retry/manual-use feedback without posting, altering composer text, or automatically sending another request

#### Scenario: Repeated clicks
- **WHEN** the Developer repeatedly activates generation while a request is pending
- **THEN** only one local generation request runs

#### Scenario: Disabled integration
- **WHEN** the feature is disabled or server configuration is unavailable
- **THEN** the assistant fails closed without quota/provider calls and ordinary report/discussion behavior remains available

### Requirement: Manual review of tentative operational bounds
The initial output cap of 1,500 tokens and provider timeout of 15 seconds SHALL remain explicitly tentative until manual review establishes their adequacy. Feature completion SHALL require a recorded manual retain-or-revise decision for each value. Automated functional tests SHALL NOT substitute for this review; no automated quality benchmark or provider-retention check is required.

#### Scenario: Review pending
- **WHEN** functional tests pass but manual review of either tentative bound has not occurred
- **THEN** the feature remains incomplete and the corresponding review task stays pending

#### Scenario: Review finds inadequate limits
- **WHEN** manual review finds truncated/unusable responses or inadequate timeout behavior
- **THEN** the affected settings are revised and manually reviewed again before feature completion

### Requirement: Hardened untrusted-context instructions
Trusted Developer instructions SHALL explicitly identify all report fields and discussion as untrusted incident data. They SHALL direct the model to ignore embedded task overrides, fake role or authority claims, and instructions to decode or follow hidden content while using relevant incident facts. These mitigations SHALL NOT grant the model tools, credentials, or authority to perform application actions.

#### Scenario: Instructions planted by another participant
- **WHEN** a saved report or a comment from a participant other than the assigned Developer contains a task override or claimed system instruction
- **THEN** it remains unchanged in the untrusted incident context, the trusted instructions explicitly direct the model to disregard that instruction, and no application permission or action is granted by its text

#### Scenario: Legitimate report quotes an injection
- **WHEN** a bug report quotes malicious instructions or includes encoded text as incident evidence
- **THEN** the complete allowed report and discussion remain available without input filtering, omission, decoding, or rewriting, and trusted instructions direct the model to continue using relevant facts rather than automatically returning no questions

#### Scenario: Preserved task and role separation
- **WHEN** Developer generation is dispatched after hardening
- **THEN** the trusted instructions retain the questions-only format and limits, and the existing Tester prompt and request defaults remain unchanged

### Requirement: Bounded credential-request output checks
After structural validation, the server SHALL screen generated questions using bounded deterministic rules for explicit English requests to disclose credential values. A match in any question SHALL reject the entire generated result with safe unavailable feedback before display or Copy. Coverage SHALL distinguish disclosure requests from benign credential-related diagnostics and SHALL NOT be represented as complete semantic or prompt-injection detection.

#### Scenario: Explicit secret-value request
- **WHEN** an otherwise valid generated question asks for a password, one-time authentication code, access token, private key, or API key using the supported explicit disclosure forms
- **THEN** the entire result is rejected without returning the question text or policy details and without presenting a successful empty response or allowed subset

#### Scenario: Normalized supported disclosure forms
- **WHEN** a supported credential disclosure request differs only in casing, ordinary spacing, or fullwidth compatibility characters
- **THEN** the screening still rejects it without modifying saved input or accepted output text

#### Scenario: Benign credential terminology
- **WHEN** an otherwise valid question asks whether the error follows a password change, which authentication method was used, whether an API key is configured, or what error code appeared
- **THEN** credential-related words alone do not cause policy rejection

#### Scenario: Valid empty result
- **WHEN** the structurally valid result has no questions
- **THEN** credential screening preserves the existing successful empty-result behavior

#### Scenario: Rejection after admission or during regeneration
- **WHEN** generation has consumed a quota reservation and its output matches the credential policy
- **THEN** the attempt remains consumed, no automatic retry occurs, the rejected questions never become visible or copyable, and existing prior suggestions, outdated indication, composer text, and reply target remain available unless eligibility is lost

### Requirement: Prompt-only URL and command restrictions
Trusted instructions SHALL tell the model not to generate URLs, external submission destinations, executable commands, scripts, or instructions to run code, and to ask for plain-language reproduction descriptions instead. URL and command detection or filtering SHALL NOT be introduced in this scope. Their absence and the limitations of prompt-only compliance SHALL be explicit in documentation and security review.

#### Scenario: URL or command in incident evidence
- **WHEN** saved report fields or discussion include a URL or command as bug evidence
- **THEN** that evidence remains unchanged in the complete allowlisted context while the trusted instructions retain the output restrictions

#### Scenario: Model disregards the prompt-only restriction
- **WHEN** generated output contains a URL or command but passes the existing structural and bounded credential checks
- **THEN** URL or command presence alone does not trigger programmatic rejection, and any displayed content remains inert text with no automatic navigation, fetch, execution, posting, or state change

#### Scenario: Safe manual workflow
- **WHEN** the Developer reviews or copies generated text
- **THEN** the content remains labeled as AI-generated advice and any posting or application action requires the separate existing manual workflow

### Requirement: Recorded synthetic adversarial review
The change SHALL include a versioned synthetic adversarial review set with benign controls. Deterministic boundary tests and live-model observations SHALL be recorded as different evidence. Completion of the security extension SHALL require recorded live review findings and an explicit retain-or-revise assessment without claiming universal prevention. Preparing the set or passing mocked tests SHALL NOT substitute for that review.

#### Scenario: Representative malicious and benign cases
- **WHEN** the synthetic review set is prepared
- **THEN** it covers report fields and other participants' discussion, instruction overrides, fake authority or conversation roles, encoded or multilingual attempts, hidden text, long-discussion repetition, credential requests, and benign quoted attacks, URLs, commands, and credential-related diagnostics without using real secrets or private report text

#### Scenario: Live evidence remains pending
- **WHEN** the review set and deterministic tests exist but no live security review has been recorded
- **THEN** that security review task and the feature completion remain pending rather than asserting model resistance

#### Scenario: Recorded live assessment
- **WHEN** the synthetic cases are reviewed against the configured model and current hardened prompt
- **THEN** the record identifies case, prompt and policy versions, actual model and settings, observed credential or URL/command output, false refusals and limitations, and a retain-or-revise decision with follow-up for unresolved findings
