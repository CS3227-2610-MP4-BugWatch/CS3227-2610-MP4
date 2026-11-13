# MP4 Individual Reflection on Engineering My Tester Workflow in BugWatch

Jonathen, first draft, 13 November 2026

**Scope.** This reflection covers my work on BugWatch's Tester features and how I developed the agent workflow around them. It examines the product decisions I made, how I used specifications and specialised agents, and what testing and review revealed. It also evaluates the evidence from our token usage and workflow experiments, including their limitations and the changes I would make next time.

## 1. My contribution and the main lesson

BugWatch is a bug tracker for Testers and Developers. The shared application uses React, TypeScript, Vite and Mantine, with Supabase authentication and PostgreSQL storage. Vitest supports automated testing, while GitHub and Vercel support development-branch review and preview deployment. My teammate led the Developer workflow and much of the shared application foundation. The Tester features I directed included submitting reports, private drafts, an AI report assistant, and submitted-report editing with the mailbox foundation for edit notifications. [E1, E2]

I led the development of the Tester features, from deciding how they should work to reviewing them before release. I worked through the user journeys, chose how drafts and report edits should behave, and challenged suggestions that did not fit how a Tester would use the app. I also shaped the way we used AI agents. I asked for mockups before implementation, clearer explanations of code and tests, coverage checks, and experiments to find out whether our workflow changes helped. The agents generated most of the code and tests, while I set the direction, reviewed the results and asked for corrections when something was missing or unclear.

The main lesson was that dividing work between agents is useful only when their responsibilities, information and verification are engineered together. More agents and more instructions did not automatically produce better results. Some additions caught specific defects. Other additions increased token use without improving the measured outcome. This reflection therefore distinguishes implemented controls, observed benefits and claims that remain unproven.

## 2. Moving from generated code to decisions I could explain

My early process gave the coding agent too much room to proceed before I understood the complete user journey. The submission feature already had implementation before its later detailed exploration. I questioned this because I would struggle to explain or defend decisions that I had not actually considered. I subsequently adopted my teammate's feature-by-feature OpenSpec approach. I first discussed how the feature should work with the agent and checked its summary of our decisions. I then reviewed the proposal, requirements, design and task list before giving the go-ahead to code. [E1, E3]

Private drafts provide a clearer example of this revised sequence. I decided that a draft must belong to a project from its first save because reports were grouped by project. Allowing a general draft would require another place to display it. I also preferred explicit saving and a warning before leaving unsaved edits. These were product choices with consequences for navigation, storage and tests, rather than technical defaults that the agent should invent.

Submitted-report editing required another deliberate choice. If a Developer changed severity while a Tester was editing, I wanted the first save to stop, retain the Tester's text and explain the change. After considering the interaction, I allowed a second deliberate save to use the Tester's chosen severity. The implementation therefore needed a server-maintained severity revision, including detection of a change that was later reversed. Simply comparing the visible severity values would miss that case. [E2]

I also challenged the proposed project restriction for duplicate-linked reports. The agent checked the actual same-project database references, rather than treating the phrase “database lock” as an explanation. I accepted keeping linked reports in their project for this release while allowing their other eligible fields to be edited. Unlinked reports can still move. This decision preserves duplicate relationships and recorded resolution history without silently changing other reports.

These examples apply **Lecture 5's human oversight and approval gates**. I retained responsibility for the product decisions. They also apply **Lecture 7's specification engineering**. The specification changed as integration exposed a real constraint. A specification was a reviewed source of truth, not a document whose mere existence justified every implementation choice. [L5. L7]

## 3. How we improved the agent workflow

My teammate established the initial specialist-agent workflow, including explanations after implementation, UI polishing, shared plans and independent review. I used that foundation while developing the Tester features and then adapted it to problems I encountered. This section distinguishes the mechanisms we already shared from the changes I requested, and examines what evidence we have that they helped. [E2, E4]

### 3.1 The foundation my teammate introduced

One useful part of my teammate's workflow was the explanation stage after implementation and review. The implementer and tester had to produce summaries of what they changed and how they checked it. This gave me a way to review the work without relying only on a completion message or reading every line of code. In the editing feature, for example, the frontend summary explained why an uncertain save reused the same request identifier, while a deliberate conflict override received a new one. That connected an implementation detail to the user-facing need to retry safely. My later plain-English skill and test-design requirements extended this existing explanation stage. They did not introduce summaries from scratch. We have the completed summaries as evidence of the output, but did not measure whether they reduced my review time. [E2, E4]

My teammate also included a UI polisher as a specialist role. Its job was to inspect the implemented screens after the functional work had stabilised and improve layout, spacing and consistency. This added a separate check of the rendered result alongside code review. In our editing feature, the visual pass identified that the selected mailbox filter had no clear visual distinction and that related actions were spread across the card. These presentation issues were corrected. These findings show how the role contributed to this feature, although we did not run a matched comparison with and without a UI polisher. My additions strengthened the evidence expected from that role by requiring actual whole-window captures and clearer records of what was checked. [E2, E4]

The shared workflow also used a versioned feature plan, agreed interfaces, one active writer per file and independent re-review after fixes. These gave the specialists a common reference and made responsibility visible. When teammate changes affected our editing work, the combined application had to be checked again instead of relying on earlier passes. That helped keep approval tied to the version we intended to publish. I found this a useful foundation for adding specialised agents, but the handoffs and repeated checks also added work. We did not measure a single-agent baseline, so I would not claim that the arrangement made delivery faster overall. [E2, E4, L8]

### 3.2 Making visual feedback part of exploration

I requested a dedicated mockup agent because written descriptions alone made it difficult to judge the design. During exploration of submitted-report editing, I wanted to see where the Edit button, severity-change notice and mailbox would appear before agreeing to them. I asked for mockups to become a standard part of exploring visible changes. However, I still had to remind the coordinator twice to show them. This exposed a problem with the coordination. Defining a specialist did not ensure that it would be used. We added an explicit trigger linking an agreed visual change to a mockup assignment. A later successful trigger showed that the instruction could work, but did not prove that reminders would never be needed again. [E2]

I also pushed for actual whole-window screenshots in the app's dark theme when reviewing the implemented UI. I wanted to see the navigation and complete layout, not just individual fields. The later rendered review found that a hidden navigation panel still occupied space on a narrow screen, squeezing the form. The layout was corrected and checked again. This was a concrete benefit of rendered inspection, although the original before-image was overwritten, so we cannot present a complete paired screenshot comparison. [E2]

### 3.3 Making agent summaries easier to understand and review

I requested a plain-English writing skill based on selected ASD-STE100 clarity principles and the style of Channel News Asia explainers. Technical summaries often named functions without explaining why they existed. I wanted them to connect the problem, the decision, the implementation, the tests and the limitations. This was our project adaptation, not an official writing standard or certification. I later limited the skill to summaries, planning artifacts and reflection writing because applying it to ordinary chat added unnecessary overhead. We then evaluated it rather than assuming that clearer instructions would produce a better result. [E8]

For the tester agent, I added a requirement to explain equivalence partitions, boundary values, expected results and coverage. I wanted to understand why each group of tests existed and be able to question missing cases. The editing work produced test-design summaries and coverage evidence, while a separate exercise showed that two intended tests detected deliberately introduced defects. These were useful outputs, but they do not establish that the summary requirement itself reduced defects. Section 4 explains the testing lessons in more detail. [E2, E4]

### 3.4 Improving exploration recaps and agent handoffs

I also added guidance for exploration recaps and focused handoffs. Recaps distinguish decisions I confirmed from agent recommendations and unresolved questions. Handoffs identify the relevant requirements, interfaces, file ownership and required checks, so a specialist can find what it needs without receiving every document. I wanted fewer assumptions to pass unnoticed between planning and implementation. We compared this guidance with the existing workflow, alongside the writing-skill evaluation, using the repeated pilots below. The baseline already contained good guidance, so this was not a comparison with an intentionally weak alternative. [E8, E9]

| Repeated pilot | Method and outcome | Resource observation | What I can conclude |
| --- | --- | --- | --- |
| Explanation skill | Four tasks, two repetitions per condition, giving sixteen outputs/eight pairs. One masked AI grader scored clarity 77/80 versus 78/80. One pair improved and seven tied. | Generation tokens increased from 109,868 to 118,246, about 7.6%. | A small assessed wording benefit. Human comprehension was not measured. |
| Exploration/handoff guidance | The same sixteen-output/eight-pair structure. Both conditions satisfied all fixed checks and all artifacts were accepted. | Generation tokens increased from 119,692 to 124,337, about 3.9%. | No demonstrated improvement in the measured acceptance or coverage criteria. |

Each pilot used four tasks, with two generations for each task under each condition. That produced sixteen outputs and eight matched comparisons per pilot. The writing pilot used one masked AI grader. Its clarity score rose only slightly, while seven of the eight comparisons tied. Both pilots used more generation tokens. The exploration and handoff pilot showed no improvement under its fixed acceptance checks. These results do not demonstrate reduced coding rework, better human understanding or lower cost. The strong baseline also left little room for improvement under the selected checks, and an AI grader cannot establish whether I personally understood the summaries better. [E8, E9]

These additions apply Lecture 8's specialist-agent approach and Lecture 10's harness engineering. I changed the instructions, expected outputs and checks around the agents, then examined whether they helped. The results were mixed. Rendered inspection found a real layout issue, the mockup trigger initially failed, and the writing pilot did not demonstrate better human understanding. My takeaway was to judge each addition against the problem it was meant to solve, rather than treat more agents or longer instructions as an improvement on their own. [L8, L10]

## 4. What testing taught me about trusting agent-generated code

I wanted to know whether the tests would catch a mistake that mattered to a Tester. A long list of passes could not answer that on its own. I therefore asked for explanations of the cases being tested, checks against the actual database, and evidence that selected tests failed when the code was deliberately made wrong. Three lessons stood out.

### 4.1 Start with what could go wrong for the user

I added a requirement for the tester agent to write summaries explaining how it designed the tests. These summaries had to explain the equivalence partitions, boundary values and expected results, rather than simply list which tests passed. Equivalence partitions group inputs or situations that should behave in the same way, such as users who are allowed to edit a report and users who are not. Boundary values check the exact limits. For a title with a 200-character limit, testing 200 and 201 characters checks whether the limit is enforced correctly. I wanted these explanations so I could understand why each group of tests was needed and question whether anything important was missing. [E2, E4]

Some risks needed more than a form test. If a report moved to another project while a Developer linked it as a duplicate, both actions could look valid separately but produce an invalid relationship together. The database tests controlled the order of these actions and checked the saved result. This helped me understand why testing each button separately was not enough. The interaction between actions also needed checking.

### 4.2 A passing test can still miss the real situation

The AI report assistant exposed a gap in an earlier test. A Tester could start generating suggestions and save their first draft while generation was still running. In a controlled reproduction, React's development StrictMode briefly removed and restored the form's subscription. The code treated that temporary interruption as the Tester leaving the page and cancelled generation. The original test had omitted StrictMode, so it had missed the condition that caused the failure. [E5]

The stronger test reproduced the failure with the faulty cleanup. After the fix, saving the first draft allowed generation to continue, while actually leaving the form still cancelled it. This was more convincing than another passing test count because the same scenario demonstrated both the defect and the repair. It also showed me that I needed to question whether a test represented the situation we were trying to check. [L4, L10]

### 4.3 Check whether the tests can detect an incorrect result

I also wanted evidence that the assertions could catch mistakes. In a separate exercise, the agent deliberately introduced two defects. One mishandled the severity revision used to detect conflicting edits. The other made Delete call Mark as read. The intended tests failed for both defects, and the original versions passed again after restoration. That supported those two tests, although two examples do not establish how well the entire suite would detect other defects. [E2]

Coverage gave us another way to find gaps. Across twelve agreed production files, the final checks exercised 98.26% of lines and 91.32% of branches. These figures describe how much code ran during testing, not whether every requirement was satisfied. My main takeaway was to combine several kinds of evidence. Tests should explain the expected behaviour, reproduce important failures and check the saved outcome. Coverage helps identify untested code, while manual preview testing remains necessary for the user's experience. A successful build or deployment cannot replace that final check. [E2, L4]

## 5. Context engineering and resource-aware experiments

I treated context engineering at two levels. In the product, the Tester assistant received only the approved report fields and selected-project background. In development, agents needed the relevant requirements, contracts, ownership and verification obligations, with paths for retrieving additional detail. Giving an agent less information is helpful only if the remaining context still contains the decisions necessary to do the task correctly. [L9]

### 5.1 Focused handoffs and a useful pattern with limited evidence

Five exploratory comparisons used the same requested model and reasoning setting within each pair. This was GPT-6.1 Sol with low reasoning effort. Both conditions already used OpenSpec material. The broad condition received the wider briefing. The focused condition was directed to relevant requirements and design sections. [E6]

| Task | Broad total tokens | Focused total tokens | Reduction | Quality check |
| --- | --- | --- | --- | --- |
| Rate-limit test design | 121,021 | 40,118 | 66.9% | Both covered six requested categories by inspection |
| Submission test design | 122,698 | 62,633 | 49.0% | Both covered six categories by inspection |
| Draft test design | 107,718 | 61,484 | 42.9% | Both covered six categories by inspection |
| Isolated quota-function coding | 179,745 | 104,312 | 42.0% | Both passed the same ten checks |
| Isolated endpoint coding, including repair | 280,521 | 187,185 | 33.3% | Both passed eighteen checks and TypeScript after repair |

All five pairs showed lower reported total tokens for focused context. However, there was only one pair per task. These were five different tasks, not five replications of the same experiment. Cache conditions and order were uncontrolled, and the test-design answers sometimes differed in useful extra detail. The comparisons support the narrower observation that focused handoffs used fewer total tokens in these runs. They do not isolate OpenSpec adoption or prove a universal saving.

The endpoint experiment exposed a contract omission. Both initial programs used title-case Tester, while the real role literal was lowercase tester. Both received the same clarification, and both needed one repair. Including those repairs gave the 33.3% reduction above. The focused arm still took 111.3 seconds of measured agent time, compared with 106.5 seconds for broad. Fewer tokens did not mean faster completion in that pair. [E7]

### 5.2 Caching is different from sending less context

Cached input is input that the provider reports as reused. Uncached input was not reported as reused. Cached input is already part of total input and must not be added again. In the quota coding pair, total tokens fell 42.0%, but uncached input fell only 1.2%. In the drafts pair, total tokens fell while uncached input rose 28.4%. Actual charges were not measured, so I cannot translate either result directly into credit savings. [E6, L9]

Later usage records included owning coordinator and subagent responses, retries and repairs within fixed windows. They also exposed overhead. Long conversation history was processed repeatedly, and measurement itself consumed resources. The reconciliation snapshot recorded 28,344 reasoning tokens within 101,945 output tokens, or about 27.8% of output. That is a partial phase-level observation, not a per-function measurement. Reasoning is already included in output. The windows exclude later work, so they are not a complete feature invoice. [E10]

I required the workflow to preserve short decision rationales, contracts, checks and handoffs so a new agent could continue without reconstructing every discussion. I did not measure a causal saving from those notes or from a particular model-routing policy. For future cache experiments I would keep a stable shared prefix, vary only the necessary task context, record reported cache hits and actual charges, and compare repeated runs at the same quality gate.

## 6. Security and responsible boundaries

For the Tester AI feature, the server verifies authentication and role, checks the active project, reserves a server-side allowance and forwards only approved context. Secrets remain outside browser variables. The feature uses five attempts per rolling five minutes and a fifteen-second provider timeout. Suggestions are advisory. The Tester reviews and applies fields explicitly, then saves separately. Invalid output entries are filtered, and recoverable failures preserve manual input. [E11]

These boundaries matter because model text and user-provided report content are not trusted instructions. A prompt saying “do not leak data” would not replace server-side authorization, context minimisation or a design that gives model output no direct authority to edit the database. This relates to **Lecture 6's prompt-injection threat model**. My deterministic payload, authentication and failure tests do not establish complete resistance to live model attacks. I should not attribute my teammate's separate security work to my own Tester feature. [L6]

Development safety required similar separation. Database fixtures and forced failures ran against isolated local projects with synthetic accounts. Private credentials stayed outside the submitted evidence, and raw network diagnostics required care because exceptions can contain authorization headers. Preview deployment success also did not prove database readiness. The earlier submission preview failed when its schema was missing, despite a successful deployment. This is why I separated local checks, CI, deployment and signed-in preview acceptance. [E1, E2]

At the draft cutoff, editing/mailbox work was published in draft PR12 to development. Its GitHub tests and Vercel deployment had passed. Hosted migration and manual preview acceptance were still unverified in my records. I did not describe it as a completed production release. The development-first policy also does not by itself establish that all submission requirements are on master.

## 7. What I would improve next

My main process weakness was starting structured exploration and measurement too late. I cannot reconstruct the original coding cost from later simulations. I also cannot claim fewer human-discovered defects when the latest user acceptance session has not been measured. Waiting for usage limits or dependency changes is not active coding time.

For the next feature, I would agree on scenarios and interfaces before coding, take a complete source snapshot before tests/screenshots, and maintain the decision and approval records at each handoff. I would measure the user's first manual acceptance, valid correction rounds and actual review minutes. I would repeat context comparisons on the same tasks with counterbalanced order, include repairs and coordination overhead, and collect charges before claiming financial savings. Additional specialists should address an observed bottleneck, not become a mandatory checklist for every small change.

My strongest outcome is therefore a more accountable development process. Important choices came back to me, implementation claims were challenged with observable checks, and failed experiments remained part of the evidence. The work also showed where that process is still inefficient. I can defend specific decisions and fixes more clearly than I can defend a claim that multi-agent development is always faster or cheaper.

## AI assistance declaration

I used Codex and specialised AI agents to inspect source code, explore requirements, produce planning artifacts, generate and revise implementation and tests, review changes, collect evidence, prepare presentation material and draft this reflection. I directed product decisions and requested explanations and verification. This is an AI-assisted first draft. I must review the claims and wording before submitting it, and I remain responsible for the final content.

## Evidence references

- **E1, Earlier Tester delivery and human decisions.** [Submission record](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/blob/3c6a6c4125879c63357e753e95535e809efe7f5f/workflow/2026-11-05-tester-report-submission.md), [drafts record](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/blob/3c6a6c4125879c63357e753e95535e809efe7f5f/workflow/2026-11-06-tester-report-drafts.md), and preview migration failure (local file logs/2026-11-06-triage-pr-3-preview-submission.md). Published feature PRs include [submission #3](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/pull/3), [drafts #4](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/pull/4), [Tester assistant #7](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/pull/7).

- **E2, Editing/mailbox implementation, review and actual checks.** [Feature plan](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/blob/3c6a6c4125879c63357e753e95535e809efe7f5f/workflow/submitted-report-editing/feature-plan.md), [test summary](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/blob/3c6a6c4125879c63357e753e95535e809efe7f5f/workflow/submitted-report-editing/tester-summary.md), [race summary](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/blob/3c6a6c4125879c63357e753e95535e809efe7f5f/workflow/submitted-report-editing/tester-race-summary.md), [final coverage](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/blob/3c6a6c4125879c63357e753e95535e809efe7f5f/workflow/submitted-report-editing/pr10-coverage-locations.md), [actual browser record](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/blob/3c6a6c4125879c63357e753e95535e809efe7f5f/workflow/submitted-report-editing/pr10-visual-review.md), exact-head CI/deployment status checked for this draft (local file workflow/mp4-presentation/individual-report-publication-check.json), and [draft PR12](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/pull/12).

- **E3, Specification-first draft workflow.** [Draft proposal](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/blob/3c6a6c4125879c63357e753e95535e809efe7f5f/openspec/changes/tester-report-drafts/proposal.md), [draft specification](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/blob/3c6a6c4125879c63357e753e95535e809efe7f5f/openspec/changes/tester-report-drafts/specs/report-drafts/spec.md), [editing specification](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/blob/3c6a6c4125879c63357e753e95535e809efe7f5f/openspec/changes/edit-submitted-reports/specs/report-editing/spec.md).

- **E4, Coordination and explanation contracts.** Coordinator instructions (local file workflow/instructions/coordinator.md), handoff instructions (local file workflow/instructions/handoffs.md), tester summary template (local file workflow/templates/tester-summary-template.md). Some workflow-engineering changes remain local and are not part of PR12.

- **E5, Assistant lifecycle failure and reproduction.** First-save cancellation case study (local file workflow/2026-11-07-assistant-first-save-case-study.md) and [regression tests](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/blob/3c6a6c4125879c63357e753e95535e809efe7f5f/src/test/report-suggestions-ui.test.ts).

- **E6, Five context comparisons.** Rate-limit design pilot (local file workflow/2026-11-06-mp4-token-usage-pilot.md), submission/draft replays (local file workflow/2026-11-07-mp4-token-usage-replays.md), quota coding pilot (local file workflow/2026-11-07-mp4-coding-token-pilot.md), and five-comparison summary (local file workflow/mp4-presentation/five-comparison-summary.json).

- **E7, Larger coding comparison including repairs.** Endpoint experiment (local file workflow/2026-11-07-mp4-endpoint-token-experiment.md).

- **E8, Repeated explanation-skill evaluation.** Report, matched results and limitations (local file workflow/explanation-skill-evaluation/report.md).

- **E9, Repeated exploration/handoff evaluation.** Report, frozen checks and masked assessment (local file workflow/explore-handoff-improvements/report.md).

- **E10, Partial usage accounting.** [Apply window](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/blob/3c6a6c4125879c63357e753e95535e809efe7f5f/workflow/submitted-report-editing/usage-accounting.md), [reconciliation window](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/blob/3c6a6c4125879c63357e753e95535e809efe7f5f/workflow/submitted-report-editing/usage-accounting-reconciliation.md), and [numeric reconciliation snapshot](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/blob/3c6a6c4125879c63357e753e95535e809efe7f5f/workflow/submitted-report-editing/usage-observation-03.json). These are observed token records, not invoices or complete lifecycle totals.

- **E11, Tester assistant security and behavior.** [Endpoint](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/blob/3c6a6c4125879c63357e753e95535e809efe7f5f/api/tester/report-suggestions.ts), [server dependencies](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/blob/3c6a6c4125879c63357e753e95535e809efe7f5f/api/_lib/_report-suggestion-dependencies.ts), and [assistant workflow record](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/blob/3c6a6c4125879c63357e753e95535e809efe7f5f/workflow/2026-11-07-tester-report-assistant.md).

## Lecture references

These references identify the supplied course PDFs, not public copies of lecture material. Page numbers refer to PDF pages.

- **L4.** CS3227 Lecture 4, pp.5,7,29, evaluating agent systems, black/white-box testing, deterministic and model-based checks, and rubric-based assessment.

- **L5.** CS3227 Lecture 5, pp.16,18–19,44, human oversight, approval gates, traceability and workflow metrics.

- **L6.** CS3227 Lecture 6, p.17, prompt injection and the distinction between intended behavior and attacker-controlled instructions.

- **L7.** CS3227 Lecture 7, pp.7,10,16–18, shared specifications, requirements before implementation, iterative specification engineering, interfaces, security and non-happy paths.

- **L8.** CS3227 Lecture 8, pp.5,8–9, generator–verifier and orchestrator–subagent patterns and their coordination trade-offs.

- **L9.** CS3227 Lecture 9, pp.4,23–24, context utility under constraints, prompt caching, prefix matching and resource-aware interpretation.

- **L10.** CS3227 Lecture 10, pp.5–8, harness engineering and feedforward/feedback controls.

## Before turning this draft into the submission

Confirm the required length/template, add full student details, and edit the first-person statements so they match my own understanding. Combine this with my teammate's reflection without claiming their work as mine. Ensure cited local evidence is accessible to graders. Recheck PR12/preview status and the required final master release. Include the AI declaration. These are outstanding finalisation steps, not claims that the draft is ready for submission.
