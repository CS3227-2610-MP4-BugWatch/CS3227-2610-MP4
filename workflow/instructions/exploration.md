# Explore a Feature with the User

Use this reference for feature discovery, alongside the existing OpenSpec explore skill when applicable. It supplements that skill without replacing its scope, artifact-writing or authorization rules. Do not start implementation from a discovery conversation alone.

## Establish the Starting Point

Read the relevant existing behavior, requirements and tests before asking factual questions. State what is implemented, what is proposed and what remains unknown. Resolve a material conflict rather than choosing whichever source is easiest. Ask the user about intent or preference that cannot be established from evidence, not facts already available in the repository.

## Walk Through the Experience

Start with the user's goal, actor and entry point. Walk through the ordinary journey to its visible outcome. Then discuss relevant failures or state changes: invalid input, lost connection, changed permissions, archive state, duplicate action or navigation. These are prompts to consider, not a mandatory checklist for every feature. Explain the user consequence with a small example before introducing technical contracts.

Ask one focused blocking question at a time unless the user requests a batch. Give a grounded recommendation and its trade-off where helpful. Follow dependencies: settle the outcome before detailed implementation choices. Stop when there is enough clarity; do not manufacture questions or extend the feature to exhaust a checklist.

Keep these categories distinct:

- **Confirmed:** what the user decided or an authoritative requirement already establishes; cite its source.
- **Recommendation:** an agent's suggested behavior, with its reason; it is not an accepted requirement.
- **Open:** a decision still needed, its owner and what it blocks.

Silence, an agent recommendation and a simulated stakeholder answer are not human approval. Preserve authorization already given; this reference does not add repeated permission requests for agreed work.

## Show a UI Mockup

When the user confirms a material visible change or a newly discussed UI state, automatically assign an updated mockup before moving on; do not wait for a separate image request. Reuse the current image when the discussion does not change what is visible. A review of an old image does not satisfy a requested new visual state.

Assign `ui_mockup_designer` the decision sources, current whole-screen references, relevant states, exact owned image/notes paths and unresolved choices. Start with one recommended layout unless alternatives are requested. If the role is unavailable in the running client, disclose that and assign a standard subagent the same instructions; do not claim the custom role loaded. The coordinator handles user questions and feedback. Obtain independent reviewer assessment of each returned mockup submission and relevant revision before closing that task; user design feedback is separate from technical review.

For a feature that adds or materially changes a screen, generate a mockup image during exploration once the proposed flow is clear enough, before implementation. Use the actual app's theme and available whole-screen references. Show the complete screen context and relevant actions rather than isolated cropped fields. Label it as a proposed mockup, not an implemented screen or test evidence; identify unresolved behavior instead of silently deciding it through the image. Ask for feedback as part of the ongoing exploration, and carry material feedback into the recap. Reuse or revise the image when needed rather than generating one for every chat turn. Tasks with no visible UI change do not need a mockup. This step does not replace required real-app screenshots or functional verification, and does not authorize application code or OpenSpec artifact writes.

## Recap Before Proposing

Use `workflow/templates/exploration-recap-template.md` as a conversational aid. Summarize the ordinary flow, important failure outcomes, confirmed decisions, remaining questions and exclusions. Make the recap easy to correct before proposal. Scale it to the task rather than forcing a long form.

Keep the recap in the conversation by default. Persist it in artifacts only within existing authorization and the applicable skill's rules. A recommendation or an answered discovery question alone does not authorize new artifact writes. Link a confirmed decision to an observable acceptance scenario when preparing the authorized proposal.

## Evidence for Evaluation

When evaluation is assigned, preserve the question/answer sequence, decision sources and recap. Classify later changes as missed existing requirement, misunderstood decision or new scope. Count those separately. A simulated discovery exercise can measure unresolved decisions surfaced and unsupported assumptions, not actual satisfaction, human review time or coding rework avoided. Do not invent historical timings or label all new user ideas as exploration failures.
