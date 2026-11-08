# Design

## Context

See proposal.md for motivation and the two delta specs for observable requirements. Revision 1 records the explored layout and explicit clarification decisions. A design is necessary because this change crosses the UI, repository contracts, authentication wrapper, and database authorization/transactions.

Current `ReportState` supports Open, Accepted, and In progress. Migration `008_report_workflow.sql` constrains assigned states and implements acceptance/start RPCs that lock project then report, derive actors from `auth.uid()`, and atomically append history. `reportRepository.ts` strictly decodes report state and history; all readers, listing decoders, and consumed-draft receipts must understand a waiting report. `AuthenticatedApp.tsx` wraps each repository method with session handling. `ReportDetailsPage.tsx` currently loads report then history as one screen-level operation and renders every report field followed by history; creation history repeats all submitted values. No comment model or RPC currently exists.

The installed stack already supplies Mantine, React Router, Supabase, Vitest, jsdom, and Testing Library. Use these dependencies. The active UI revamp still has incomplete tasks touching the same page/styles; transfer ownership explicitly at apply time. No other change artifacts are modified here.

## Goals / Non-Goals

**Goals:** Extend existing report contracts, preserve current lifecycle safeguards, keep discussion failure independent of readable report content, and define stable interfaces before implementation/testing split.

**Non-Goals:** A new messaging service, realtime subscriptions, a general rich-text system, new profile discovery, or changes to project membership/authentication architecture. Full scope exclusions are in proposal.md. The header is shared above the tabs; viewport-sticky positioning is not required.

## Decisions

### 1. Explicit wait and resume operations

Add `awaitTesterInformation(id)` and `resumeInvestigation(id)` to the existing `ReportRepository`, rather than exposing an arbitrary state setter or coupling a comment to a transition. Each RPC accepts only a report ID, derives actor/time, locks project then report using the existing workflow order, checks current assignment and exact source state, and writes the state and a single history event atomically. Neither consults comments. Resume does not reuse the initial investigation-start RPC: its allowed source state and history event differ.

Extend the report constraint to permit `Awaiting tester information` only with nonnull assignee and assignment time. Keep existing assignment metadata unchanged. Add history events `tester_information_requested` and `investigation_resumed`. The first records the explicit waiting action, not a special comment type. Existing created/accepted/investigation-started events remain unchanged.

### 2. One comment table with optional reply reference

Add `public.report_comments`: server-generated UUID `id`, `report_id`, server-derived `author_id`, normalized `body`, nullable `reply_to_comment_id`, and server creation timestamp. Use foreign keys to existing report/profile identities and a same-report composite reference for replies, backed by a uniqueness key on `(report_id, id)`. Index `(report_id, created_at, id)` for chronological reads. Derive identity labels in a report-scoped reader, without broadening profile access. Saved comments are append-only to ordinary users; no edit/delete RPC is supplied.

Use authenticated-only security-definer RPCs with an empty search path, explicit valid-profile checks, and revoked public/anonymous execution. Revoke ordinary direct writes and enable RLS consistently with existing report tables. A comment write locks the project before report so archive/write races use the existing ordering; validate its reply target against the same report inside the transaction. Comments never update lifecycle state, assignment, or workflow history. For this revision, comments also leave `reports.updated_at` unchanged: their server creation time tracks discussion activity separately from report changes. Do not append duplicate comment events to Activity.

Alternative: store comments as report history entries. Rejected because editable report facts, workflow audit events, and ordinary participant messages have distinct contracts and are displayed separately.

### 3. Text validation and bounded reading

Confirmed by the product owner when requesting apply: comment bodies contain 1-5,000 Unicode code points after the same surrounding-whitespace trimming semantics as report inputs. The discussion spec now includes both accepted boundaries and rejection at 5,001; COMMENT_TEXT_LIMIT is 5000.

Render body text through React text nodes with preserved line breaks and wrapping; do not interpret Markdown, HTML, or automatically insert quoted HTML. A reply reference shows the original author's label and a link to that comment, not a nested conversation. References remain navigable through further replies. Cancellation clears only the reference.

Read comments in bounded pages of 100 using ascending `(created_at, id)` keyset ordering. The RPC returns a JSON array to avoid silent API row-limit truncation, following existing project-report listing practice. The repository collects all pages and returns a complete ordered array. Preserve raw timestamp precision in cursors, detect a nonadvancing cursor, and surface any page failure rather than returning a truncated success. The displayed count is the number of successfully loaded comments; show loading/error rather than a false zero when unknown. A later read includes newly posted comments; live updates are outside scope.

### 4. Extend the existing repository and authentication wrapper

All additions use `types.ts` and `reportRepository.ts`, not a second data-access architecture. Existing exports/methods stay compatible apart from extending the state/history unions and adding required methods. The implementer owns those interface changes; the tester adapts all typed repository doubles in `src/test/*.test.ts` without changing unrelated assertions.

#### Interface I1: Clarification operations

- **Module path:** `src/features/reports/types.ts`; implementation in `reportRepository.ts`.
- **Exports and types:** `ReportState` gains `'Awaiting tester information'`; `ReportRepository.awaitTesterInformation(id: string): Promise<Report>` and `.resumeInvestigation(id: string): Promise<Report>`; `ReportHistoryEntry` gains the two event literals above with `changes.state` containing the exact old/new state literals.
- **Inputs:** UUID report ID only; actor/target state/time are never inputs.
- **Outputs:** Authoritative `Report` with scoped identity labels. Existing get/list/draft-receipt reads decode the new assigned state.
- **Errors:** Reuse `ReportError`: unauthenticated, forbidden, archived, not_found, state_conflict, unavailable; malformed IDs fail locally as not_found. Use existing `P2001`/`P2002`/`P2004`/`P2005`/`P2007` SQL mapping, and do not expose raw SQL errors.
- **Side effects:** Persist one state change plus history; keep assignee and assignedAt unchanged.
- **Boundary behavior:** No comment prerequisite; stale or duplicate requests do not add history; no automatic retries; archive and missing-profile checks enforced in SQL.
- **Consumers and owners:** Implementer produces contracts/repository/UI; tester consumes contracts in repository, UI, and database tests. Wrap both methods with existing `withSession` in `AuthenticatedApp.tsx`.

#### Interface I2: Discussion data access

- **Module path:** `src/features/reports/types.ts`; implementation in `reportRepository.ts`.
- **Exports and types:** `ReportComment { id: string; reportId: string; authorId: string; authorUsername: string | null; authorDisplayName: string | null; body: string; replyToCommentId: string | null; createdAt: string }`; `CommentInput { body: string; replyToCommentId?: string | null }`; `ReportRepository.listReportComments(id: string): Promise<ReportComment[]>`; `.postReportComment(id: string, input: CommentInput): Promise<ReportComment>`.
- **Inputs:** UUID report ID; text body; optional UUID same-report reply ID. Undefined reference normalizes to null. Only these values are sent by the client.
- **Outputs:** Complete chronological array, or one saved comment. Empty array means a successful empty read, not a missing report or failed page.
- **Errors:** Reuse `ReportError`; validation errors give comment-specific safe messages rather than `ReportInput` field errors. Missing report returns not_found; invalid/missing/cross-report reply returns validation without exposing content. Reads require valid profiles, writes additionally require active projects. Malformed rows map to unavailable. `P2003` covers invalid comment input; preserve existing report error messages for report operations.
- **Side effects:** Posting inserts one comment only. Reads have no side effects. Both methods use existing authentication wrapping.
- **Boundary behavior:** Blank/non-text/over-limit text and malformed references reject without writes. Prevent overlapping local posts. No automatic repost after uncertain save. Explicit subsequent posting after readback is a new user action; server-side idempotent posting is not introduced.
- **Consumers and owners:** Implementer owns production contracts; tester owns every affected repository double and assertions.

#### Interface I3: Comment validation

- **Module path:** `src/features/reports/validation.ts`.
- **Exports and types:** `COMMENT_TEXT_LIMIT = 5000`; `validateCommentInput(input: CommentInput): { valid: true; value: { body: string; replyToCommentId: string | null } } | { valid: false; message: string }`.
- **Inputs:** Comment input; validate unexpected runtime values as well as typed callers.
- **Outputs:** Trimmed plain text and normalized reference, or a safe comment validation message.
- **Errors:** No thrown errors for invalid input; repository converts invalid results to `ReportError('validation', message)`.
- **Side effects:** None.
- **Boundary behavior:** Empty/whitespace-only, 1, limit, limit+1 code points; astral characters, multiline text, invalid reference and non-text values. SQL uses matching normalization and length semantics.
- **Consumers and owners:** Implementer produces; tester writes validation partitions and boundary cases.

#### Persistence contract

| RPC | Parameters | Result |
| --- | --- | --- |
| `await_tester_information` | `p_report_id uuid` | Same JSON report shape as `get_report` |
| `resume_report_investigation` | `p_report_id uuid` | Same JSON report shape as `get_report` |
| `list_report_comments` | `p_report_id uuid`, nullable `p_after_created_at timestamptz`, nullable `p_after_id uuid` | One JSON array of up to 100 scoped comment rows; both cursor fields supplied together |
| `post_report_comment` | `p_report_id uuid`, `p_body jsonb` requiring JSON string, nullable `p_reply_to_comment_id uuid` | One scoped saved comment JSON object |

Comment wire fields are snake_case versions of I2. Author/time/IDs are generated at persistence; the posting result includes scoped labels. Missing reports reject rather than silently returning empty arrays. Revision 3 uses a jsonb p_body parameter to reject original non-string JSON before PostgreSQL/PostgREST text coercion; the repository still sends its ordinary JavaScript string and the stored body is text. This preserves the specified non-text rejection at persistence without changing the application interface. Do not change existing RPC signatures unnecessarily.

### 5. Conversation-first page with independent read states

Keep the existing report route and project Reports return URL. Per the user's revision 7 UI follow-up, omit the breadcrumb navigation and retain a Back to project reports button with the library's default height and centered label/icon. The Project link in the report facts still opens its overview. In `ReportDetailsPage.tsx`, retain a shared header outside the panels and use accessible Mantine tabs. Default to Conversation; details are initially expanded in a keyboard-operable disclosure, with discussion beneath and composer last. Show version/environment in the details, with assignment/creation/update times still accessible. Use a visible discussion count link near the header, a Discussion shortcut, and Jump to latest in the discussion section. Set stable comment IDs for reply links; selecting a link activates Conversation and focuses or scrolls to its target. Do not force-scroll users away from an earlier comment on unrelated refreshes.

Activity contains concise actor/action/time rows and initially collapsed recorded changes. Reuse existing history values/rendering so the creation snapshot is retained. Preserve optional values and safe identity fallbacks. A separate route or modal would add navigation and constrain the report context; a combined event/comment feed would recreate the clutter.

Separate report, history, and discussion read states so history/comment errors cannot erase a readable report. Render section-specific retry controls. After a workflow action, refresh authoritative report/history and explain failures before enabling another workflow action. Posting refreshes discussion and count, leaving state controls independent. Share a local mutation lock across workflow and posting to prevent overlaps, but do not disable navigation or destroy composer text. Tabs/disclosures do not persist drafts; keep the composer text and reply reference in page memory across those local interactions and workflow readbacks. Clear only after confirmed posting or report/identity replacement. Preserve text after rejected/uncertain posts; require a read-only reload after uncertainty, then let the user inspect saved comments before explicitly posting again. Unsaved comment text is lost on route departure/reload/logout/expiry; no local/session storage or draft endpoint is added.

### 6. Execution ownership and verification

The coordinator owns OpenSpec artifacts, `workflow/manage-clarification-and-discussion/feature-plan.md`, runner/config edits, and the overall log. Implementer initially owns production report/auth files, new migration `011_report_clarification_discussion.sql`, and transaction verifier `verify_report_clarification_discussion.sql`. Tester owns `src/test/*.test.ts` changes, including typed doubles. After contracts and the text-limit decision are settled, spawn implementer and tester together; the tester derives expected outcomes from specs/contracts. Only after functional stabilization, transfer `ReportDetailsPage.tsx` and scoped `App.css` ownership to the UI polisher. Documentation writer owns existing Reports guide topics after behavior stabilizes and reads the documentation skill first. Independent reviewer checks each implementer/tester/UI-polisher submission and subsequent fix, plus final combined work.

Use deterministic Vitest partitions for validation/decoding; UI tests for permissions, tabs, collapsed history, reference navigation, failure recovery, composer retention, session handling, and stale completions. Database tests prove direct authorization, same-report references, archive races, concurrent state changes, and comment/state independence. SQL fault injection proves rollback for both new transitions. Extend the existing report database runner to include any new database suite and preserve isolation safeguards. Hosted/SQL verification requires a separately configured environment; report unavailable checks honestly. Full test/lint/build/docs checks and responsive light/dark browser review are implementation gates, not claims made by this planning run.

## Risks / Trade-offs

- [Unicode length/trim differences] -> Verify the confirmed 5,000-code-point boundary and matching application/SQL whitespace semantics.
- [Older clients reject the waiting state or new history events] -> Deploy compatible readers before enabling clarification actions; retain extended readers during rollback.
- [Uncertain comment posting can lead to manual duplicates] -> Prevent local overlap, never retry automatically, retain text, and require readback before another explicit post. Do not claim exactly-once delivery across independent requests.
- [Collecting a very large conversation costs reads and memory] -> Bound each database response and preserve complete results; virtualization/realtime are separate future work.
- [Comments and workflow saves unmount the composer] -> Keep composer state at report/identity scope and test both readback paths.
- [Overlapping UI revamp edits] -> Acquire exclusive ownership before application changes; preserve shell and route behavior and obtain fresh review after relevant changes.

## Migration Plan

1. Upstream now supplies Tester assistant quota migrations `009` and `010`. The unapplied clarification migration is `011_report_clarification_discussion.sql`; apply it after `010` in the isolated test project. Its former local name was `009_report_clarification_discussion.sql`; the integration only changes its filename and prerequisite comment, not its SQL behavior.
2. Add comments, constraints, grants, scoped readers, and clarification RPCs in one transactional migration. Existing reports/history require no destructive backfill; comments start empty. Verify unchanged acceptance/start and draft receipts.
3. Deploy a compatible frontend with waiting-state/history decoders before enabling clarification writes. Use a coordinated maintenance window to apply the migration and deploy the matching frontend; do not leave older active clients able to encounter unsupported states. No deployment is performed during proposal creation.
4. Run isolated database/transaction checks and browser walkthroughs before rollout. Record actual results and any missing prerequisites.
5. On rollback, disable new mutation entry points while preserving comments, waiting states, history, and compatible readers. Prefer forward corrective migration; do not drop data or restore an Open-only/three-state decoder after waiting reports exist.
