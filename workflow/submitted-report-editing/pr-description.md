Allow the original reporting Tester to correct eligible submitted reports and notify the assigned Developer through a private mailbox. Preserve report identity, discussion, lifecycle state and assignment. Severity conflicts retain input and require another deliberate save; unchanged saves and retries avoid duplicate history or notifications.

Reconciled with merged PR9 and PR10. Duplicate-linked reports stay in their project, with clear Project feedback; their other eligible fields remain editable. Existing resolution history and the Developer question assistant are preserved.

Apply `014_report_editing_mailbox.sql` after migrations001–013 in the isolated preview Supabase project before testing persistence. No production migration or master merge is included. The PR remains draft pending preview migration and signed-in manual checks.

Validation on the exact feature-only candidate:

- 1,122 deterministic tests passed;251 opt-in tests skipped.
- Six separate local report database suites:152 passed. Deterministic SQL races:14 passed.
- All12 agreed production files meet80%line and80%branch coverage; aggregate98.26%lines and91.32%branches.
- Lint, TypeScript/production build, documentation build and strict OpenSpec validation passed.
- Actual dark desktop/narrow browser checks cover linked-move rejection/input retention, ordinary edits, combined history, read-only resolution and mailbox actions.

Evidence, review decisions, summaries, retained failures and a manual checklist are in `workflow/submitted-report-editing/`. Hosted preview behavior and live AI remain unverified. Separate local workflow-engineering and presentation changes are excluded from this PR.
