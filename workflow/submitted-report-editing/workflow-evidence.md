# Submitted-report editing — live workflow evidence

Status: exploration in progress. This is an observational feature record, not a controlled comparison. No report-editing implementation or manual application acceptance has occurred.

## What we are evaluating

| Addition | How it applies to this feature | Evidence and measure | Current status |
| --- | --- | --- | --- |
| Feature-by-feature exploration | Walk the editing and mailbox journey with the user before proposal/code | Decision ledger below; count missed existing requirements separately from new decisions | In use; behavior still being explored |
| Focused handoffs and explicit ownership | Give specialists exact tasks, sources, output files and return requirements | Handoff completeness, unnecessary reads, usage and repair rounds | Scoped assignments used, but existing trial sessions inherited full chat; instruction brevity alone did not remove that context |
| Role-specific instruction loading | Read the shared constraints and only the detailed role references relevant to the task | Relevant/irrelevant reads, usage and missed obligations | Routing configured; no current-feature controlled comparison. Full inherited context remains a confound |
| Shared interfaces and versioned plan | Agree save/conflict/history/notification contracts before parallel coding | Plan revision and linked acceptance scenarios | Not started; do not fabricate a final contract during exploration |
| Independent implementation and testing | Separate application and test ownership once contracts are agreed; parallelize independent files only | First-pass acceptance, valid defects, ownership conflicts and repair rounds | Not started |
| Test explanations | Tester maps requirements to equivalence partitions, boundaries and failures | Exact test names; expected results; source checked explanation | Not started for this feature |
| Scoped line/branch coverage | Include every agreed production file; initial80%/80% targets per file | Covered/total counts, gaps, command and report; critical decisions still explicitly tested | Tooling ready; feature coverage Not measured. Existing baseline is not feature acceptance |
| User-directed code quality | Preserve ESLint, TypeScript/production build, understandable function structure and independent review obligations | Actual command failures, valid review findings, repair rounds, assertion effectiveness and coverage gaps; no arbitrary quality score | Explicitly reaffirmed by user at apply kickoff; implementation checks pending |
| Plain-English written summaries/artifacts/reflection | Use the STE/CNA adaptation only for those outputs | Factual accuracy, clarification requests and reader understanding, where observed | Scope narrowed at user's request; no measured token saving attributed to that change |
| Function-level implementation summaries | Explain changed functions, effects, failures and linked tests after approval | Source-linked summary completeness and user's understanding/review effort | Not started |
| Mockup specialist | Show ordinary and newly confirmed UI states before coding | Generated images, requirement alignment, user corrections, revision count, specialist overhead | Actual v2 generated; default-agent fallback used, not successful custom-role loading |
| UI polisher and rendered evidence | Inspect the actual app after implementation, including error/narrow/keyboard states | Whole-screen before/after captures; task success, usability findings and regressions | Not started; mockups cannot substitute |
| Independent review/re-review | Review each submission and relevant later edit | Submission IDs, valid findings, false positives and correction rounds | Used for workflow/mockup submissions; product implementation review Not started |
| Evidence record and retrospective | Keep decisions, failures, actual commands and usage during work | This record, logs, source/counter snapshots; one observed failure and adjustment below | Active now; collection was inconsistent earlier |
| Prompt caching | Observe actual cached input and separate it from context reduction | Cached/uncached/write counters, latency and actual charges if available | Hits observed; controlled caching-benefit experiment Not run |
| Proposed acceptance/summary specialists | Only add when a separate role's incremental value can be tested | Matched task comparison against existing roles | Not implemented; existing implementer/tester summaries are not a dedicated summary agent |

## Confirmed decision ledger

| ID | Decision and source | Later acceptance scenario to write and verify |
| --- | --- | --- |
| D1 | User selected editing submitted reports, with mailbox and edit notifications | Saving a real change creates history and an assigned-developer mailbox item; unassigned report creates no item |
| D2 | User confirmed Edit report on the report detail page, opening a separate prefilled page | Eligible original reporter sees the action and existing fields; unauthorized users cannot write |
| D3 | User requested severity check when Save is clicked, stop saving and notify Tester if developer changed severity | Open editor, change saved severity externally in an allowed state, attempt save; report is not overwritten |
| D4 | User agreed moving projects keeps the same report ID, history, state and assigned developer | Change to an allowed target project and verify continuity and source/destination listings |
| D5 | User accepted inline notice above the form, retained text and severity highlight, rather than popup | Blocked save shows notice with prior/latest severity and preserves typed text; keyboard/announcement behavior needs actual browser verification |
| D6 | User allows the Tester to override severity after the warning; agreeing with the developer is a manual field change, without an extra acceptance button | After warning, an explicit subsequent save can use the Tester's selected severity; choosing the developer's value remains manual |
| D7 | User approved the mailbox notification layout and changed-fields summary shown in v3 | Developer can see the editing actor, report title and changed fields in their mailbox |
| D8 | User agreed unchanged saves create no history or notification and return to the report | Save normalized unchanged values; no update event or mailbox item is created |
| D9 | User agreed opening a mailbox item marks it read; Mark as read also works without opening | Open report updates that item's read status; separate Mark as read does not navigate |
| D10 | User approved reusing the existing AI suggestions flow during submitted-report editing, as illustrated in v4 | Generate on request; inspect/edit suggestions; Use suggestion changes only that field; Save changes remains separate |

These are decisions, not executed acceptance results. Report field limits and edit permissions remain governed by the existing requirements. The older severity mockup was generated before D6 and does not itself establish the subsequent-save contract. The coordinator recommended rechecking if another developer change occurs; preserve its decision status when proposing the final contract. V4 assistant retention is now approved by the user. Navigation/failure behavior should preserve the existing report-form protections and be made explicit in the proposal; newly discovered material ambiguities must return to the user rather than receive silent defaults.

Automatic-mockup checkpoint: edit_assistant_mockup generated actual v4 before the AI-editing question was presented, without another user reminder. This is one observed instance of following the intended sequence, not evidence of sustained reliability or improved usability. Source/visual review and user approval remain separate.

## Observed failure and adjustment

F1: After the visible severity-conflict notice was agreed, the coordinator did not proactively assign its new mockup before the user reminded us. The earlier specialist assignment reviewed the ordinary-flow image; it was not assigned generation of the new state. This is a coordinator workflow omission, not an application defect or proof the specialist failed.

Observed reminders about missing visual follow-up: **two explicit reminders** in the preserved conversation: first for the severity notice, later for the proposed mailbox notification. The user's concern about evidence collection is a separate feedback item, F2. These are workflow omissions, not application defects.

Adjustment: make the confirmed-visible-change trigger explicit and assign generation immediately. v2 was actually generated by severity_notice_mockup using the available default-role fallback. The reviewer inspected it and explicitly approved NOTICE-WORKFLOW-1 and NOTICE-MOCKUP-1. This demonstrates one recovery; it does not yet show that the omission will recur less often. Check later visible decisions for missed updates and retain any failures.

Later result: the coordinator again described the mailbox notification without showing its proposed visual, and the user reminded it. This is evidence that the existing change did not reliably prevent the omission. The second specialist generation was assigned as mailbox_mockup, using fresh context and exact owned image/notes paths. Its actual output is mockup-mailbox-v3.png with the prompt/limits in the matching .md. mailbox_visual_review explicitly approved MAILBOX-MOCKUP-1 and final combined image/evidence-only scope. User design feedback remains open. Do not present specialist availability or the written instruction as proof of reliable execution.

F2: Evidence collection was not consistently maintained while workflow additions were being introduced. This record consolidates earlier artifacts and starts explicit per-addition tracking. Do not invent past human timings or imply the record existed from feature kickoff.

## Evidence already available

Planning review checkpoint: editing_plan_review requested changes to revision1 because project movement invalidates the source-project assumption in five existing comment/workflow mutations. The accepted correction extends additive migration012 and deterministic race tests, preserving existing actions and archive rules. This is one integration-design gap caught by independent review before application coding, not a current archive-screen exploit or a measured number of repair hours saved. Revision2 passed strict validation/docs and was explicitly approved as EDIT-PLAN-2 with final combined planning scope. Record first-pass planning review as changes_requested and one correction round, rather than counting the repaired draft as first-pass acceptance.

Integration update: GitHub confirms PR8 merged into development at50d6c30984b3693afbb122a382d61cd6fba6d2fe. Remote reference fetched without changing the local working tree, still5b8d605. Current development has discussion/comments and Awaiting tester information; earlier statements about their absence describe the old local checkout. See development-baseline.json. Inspect current development navigation/history and migration011 before defining editing contracts. The existing coverage baseline does not measure this newer tree. No mailbox/severity-edit operation was found in the inspected PR8 migration; this is a scoped inspection, not proof that no other future change could add one.

- Ordinary-flow image and notes: `mockup-v1.png`, `mockup-notes.md` (coordinator generated).
- First specialist review: `mockup-specialist-review.md` (existing image assessed; no generation).
- New visual state: `mockup-severity-notice-v2.png` and matching `.md` with generation prompt and limits.
- Review records: `../../logs/2026-11-11-add-mockup-specialist.md` and `../../logs/2026-11-11-refresh-severity-notice-mockup.md`.
- Prior tooling baseline: `../coverage-reporting/baseline.md`, 553passing/133skipped, aggregate95.13%lines/86.53%branches. It is pre-feature evidence, not editing/mailbox coverage.
- Earlier explanation/handoff studies remain in their original directories and describe older versions. Their results must not be presented as evaluation of the new mockup role or this entire feature.

## Usage observations and accounting limits

`usage-observation-01.json.gz` contains only numeric usage records and technical identifiers/hashes, not prompts or account records. Records were recovered from local Codex session logs. The start is the exact feature-selection user-message timestamp; the cutoff is recorded in JSON. Included: root and direct specialist/reviewer session records with matching owning thread IDs, deduplicated by response ID. Cached input is part of input; reasoning output is part of output. Neither is added twice.

The window includes feature exploration, workflow engineering, recovery and measurement overhead. It is not coding-only cost. It excludes unknown image-model usage/charges and managed guardian sessions; any not-yet-flushed or later events remain outside the cutoff. It is a partial observed window, not a final total for all resources. Do not add repeated cumulative snapshots or count overlapping windows twice.

Most observed input was cached; long inherited chat history is repeatedly processed. These counts are not unique words sent and do not establish savings or actual credits charged. A short handoff does not reduce history inherited through full-context forks. For subsequent narrowly scoped assignments, choose fresh context plus relevant source/contract links where suitable, and record that execution choice. A causal benefit still needs a fair comparison; do not rerun unapproved external benchmarks automatically.

## Measures to complete during implementation

| Measure | Definition | Current observation |
| --- | --- | --- |
| Human-discovered app defects | Distinct valid bugs first identified during the user's manual application testing | Not measured; no editing implementation yet |
| Missed agreed product requirements | Confirmed requirement absent at first product handoff | Not measured |
| First-pass manual acceptance | Agreed scenarios passed/failed/skipped/not-run at first handoff | Not measured |
| Correction rounds | One correction batch followed by a revised handoff; distinguish product repairs from design iterations | Product repairs Not measured; mockup recovery described in F1 |
| Human active effort | Actual minutes spent testing, explaining issues and checking repairs | Not measured; no retrospective estimate |
| Verified completion time | Declared coding start through final checks and review; record interruptions | Not started; chat waiting time is not coding time |
| Explanation usefulness | Accurate user explanation/review outcome, with source checked against summaries | Not measured; no automatic quiz |
| Test effectiveness | Required scenario coverage and optional deliberately introduced defects caught | Feature tests Not started; mutation exercise Not run |
| Agent/resource usage | All relevant sessions/retries/reviews through acceptance, with unknown resources disclosed | Partial numeric snapshot available; final total/charges unknown |

At each implementation handoff, append first-pass results before repairs. At feature completion, retain a short retrospective: what helped, what failed and what evidence supports the next adjustment. A single feature is an observational case study, not proof of general superiority.

## Implementation observations — 12 November 2026

The earlier table is a planning checkpoint. The following observations replace its Not started entries for local implementation only. User manual testing of this feature and hosted Vercel checks remain Not run. No human testing minutes were measured. The absence of a reported manual defect before that testing is not a zero-defect result.

| Workflow addition | Observation and evidence | What the observation supports | Limit |
| --- | --- | --- | --- |
| Exploration and independent plan review | EDIT-PLAN-1 missed how project movement affects five existing mutations. The reviewer found it before coding; EDIT-PLAN-2 added locked project rechecks and race scenarios. | Review identified a concrete integration requirement before implementation. | First-pass plan was not accepted; avoided repair time was not measured. |
| Independent implementation review | BACKEND1 returned cached edit receipts before current authorization. Two actual database tests failed for archive/reporter changes; BACKEND2 corrected the check order and final feature DB checks passed35tests. See local-feature-db-tests.txt and local-feature-db-tests-final.txt. | Review plus regression tests found and repaired a real authorization flaw. | One observed defect, not a measured general improvement rate. |
| Tester explains observable requirements | Tester found the conflict notice inside the form instead of above it. FRONTEND2 moved it; TESTS2 verifies reading order, focus and retained text. | Test review checked an agreed usability requirement beyond numeric coverage. | The regression was run after the fix; no pre-fix executed failure is claimed. |
| Rendered UI specialist | Actual narrow view reserved hidden navigation space, squeezing content. UI polish corrected spacing and filter/action presentation. Follow-up checked real conflict/retry, project move/history, mark-read, loading and keyboard focus. See visual-review.md. | Actual rendering exposed an issue that passing unit tests/build did not establish. | Original before-image was overwritten; no paired-image quantitative improvement is claimed. Representative keyboard checks are not an exhaustive accessibility audit. |
| Deterministic concurrency tests | Nine separate multi-session cases passed. The first inverse-move observation failed because it missed queued blockers; RACE2 observed the transitive blocker chain and preserved final-state assertions. | Explicit barriers check archive/move and existing-action ordering rather than relying on sleep timing. | The initial test harness needed repair; these cases do not prove all schedules. |
| Effective assertions | Two declared temporary defects were each caught by the intended existing test assertion; baseline and restored baseline passed. See seeded-defect-evaluation.md. | Those two assertions detect those two defects. | Two hand-selected defects, each introduced once; not a general mutation score or controlled workflow comparison. |
| Line and branch coverage | All12 agreed production files meet80%lines and80%branches. Aggregate732/746lines98.12%,876/965branches90.77%. Exact command, per-file counts and uncovered locations are retained in final-coverage-* and coverage-source-locations.md. | Tests execute most scoped code and decision outcomes; uncovered behavior is visible. | Coverage does not prove correct assertions, SQL permissions, browser behavior or completeness of requirements. |
| Final handoff audit | The report database runner still selected only legacy suites. Root added editing/mailbox suites and aligned the guide; the same selected five suites passed121tests locally. | The handoff now provides a command that selects the new checks. | A coordinator-discovered integration omission, not a user manual defect or proof the original workflow was complete. Hosted runner login was not exercised. |
| Complete source evidence | The initial screenshot diff omitted untracked modules. Added full112-file manifest and a later113-input runner manifest, preserving the original artifact. | Readers can identify new source files and distinguish the later documentation/runner amendment. | Complete manifest was collected after capture, with unchanged-source reports and modification times supporting correlation. Capture-time hashing should happen earlier next time. |

### First-pass decisions and repair rounds

Keep submission decisions separate rather than combining incomparable roles into a misleading acceptance percentage. PLAN1 and BACKEND1 received changes_requested; FRONTEND1, DOCS1 and UI1 were blocked/superseded for their recorded gaps; RACE1 required a test-observation repair. Latest replacements were independently approved. TESTS1/2 and the declared defect evaluation were approved. Details and historical dispositions are in feature-plan.md. These observations demonstrate specific catches and repairs; they do not establish that the engineered workflow outperforms a control.

### Resource accounting

[usage-accounting.md](usage-accounting.md) and [usage-observation-02.json.gz](usage-observation-02.json.gz) retain a fixed partial apply window. Observed440 owning records across13 sessions total62,530,041input tokens, of which60,501,120are cached, plus163,765output tokens, for62,693,806total. Uncached input is2,028,921. Reasoning output38,368is already part of output. The collection agent's315,066total tokens are included and separately identifiable. Distinguishable PR9 work was excluded; root attribution still includes mixed inherited history and overhead. The collection cutoff excludes later records, including final reconciliation, so this is not the full feature total.

These large input counts reflect repeated processing of long histories across requests; they are not unique words. The observed cache proportion is not a caching experiment or a measured credit saving. Charges and separate image/tool usage are unknown. Snapshot01 covers an earlier exploration window that ends before this apply window; the intervening gap is not covered. Neither their sum nor snapshot02 alone establishes a complete feature total. Avoid summing overlapping future snapshots or cumulative counters. No further paid comparison was launched.

### Retrospective

What helped: independent review, explicit database interleavings and actual rendered inspection each caught a different problem. What failed: coordination records remained stale while implementation advanced; complete source hashing and the runner selection audit happened late. Next feature: update decisions/tasks at each handoff, capture the full manifest before screenshots and tests, and audit the documented verification command before final review. Measure first manual acceptance and actual human effort when the user tests; do not estimate them retrospectively.
