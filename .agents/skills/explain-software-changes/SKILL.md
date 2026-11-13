---
name: explain-software-changes
description: Write software summaries, artifacts and the individual reflection in plain English. Use only for those written outputs; do not load or apply for ordinary chat, exploration questions, quick explanations or progress updates. This is a writing aid, not implementation permission or writing-standard certification.
---

# Explain Software Changes

Apply this skill only when writing summaries, artifacts or the individual reflection. Do not load or apply it for ordinary chat, exploration questions, quick explanations or progress updates. Write for a teammate who wants to understand the work and explain it independently. Combine selected ASD-STE100 clarity principles with a direct, measured tone informed by published CNA explainers. This is a project adaptation, not full ASD-STE100 compliance or an official CNA style guide. Read [style sources](references/style-sources.md) only when checking provenance or evaluating the writing.

## Establish the Facts

Use the supplied facts and relevant source, tests or workflow records. Distinguish implemented behavior, proposed changes, test observations and interpretation. Link the exact available evidence for substantive claims. If evidence is missing, explain what is unknown. An explanation request alone does not authorize code edits, extra experiments, a quiz or external actions.

Preserve function names, UI labels, roles, states, units, numeric limits and error meanings. Do not silently change requirements, remove an important exception or invent a successful check to make the explanation simpler.

## Explain for the Reader

- Lead with the answer and its practical effect. Add context that explains why the decision matters.
- Prefer concrete subjects, active verbs, short sentences and one main point per sentence. For instructions, put a necessary condition before its action and separate sequential actions.
- Use a consistent term for each concept. Retain necessary technical terms and define them at first use in the relevant explanation. Do not rename literal code or UI text to match a preferred vocabulary.
- Use connected prose and short paragraphs. Use lists, tables or a simple diagram when they explain a flow or comparison more clearly. Respect the user's requested format and depth; a short question does not need a full report.
- For a substantial explanation, cover the problem, a concrete example, the decision, how the implementation works, the relevant tests and remaining limits. Choose a natural order; do not force six headings or repeat facts already understood.
- Keep the tone factual and approachable. Avoid dramatic headlines, invented quotations, marketing claims, unexplained acronyms and compressed technical shorthand. An analogy is optional and must not replace the actual mechanism.

For example, explain a transaction as database changes that save together or all roll back. Then state which changes belong to that transaction. Explain a regression test as a test for a previously found bug, then identify the behavior it protects.

## Check Meaning Before Sending

Can the reader identify who acts, what changes and what happens on failure? Does each necessary term have an explanation? Are conditions, numbers, uncertainty and source links intact?

Keep passed, failed, skipped and not-run results distinct. A build is not a browser or database check. Cached input is part of total input; fewer tokens do not establish lower charges. Preserve uncertainty after an unconfirmed write rather than asserting that nothing was saved. Follow any required summary template without duplicating its structure in a second report.
