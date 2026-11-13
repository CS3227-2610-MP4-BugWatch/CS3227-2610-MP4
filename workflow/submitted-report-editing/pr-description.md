Allow the original reporting Tester to correct eligible submitted reports and notify the assigned Developer through a private mailbox. Preserve report identity, discussion, lifecycle state and assignment. Severity conflicts retain input and require another deliberate save; unchanged saves and retries avoid duplicate history or notifications.

Reconciled with merged PR9 and PR10. Duplicate-linked reports stay in their project, with clear Project feedback; their other eligible fields remain editable. Existing resolution history and the Developer question assistant are preserved.

Apply `014_report_editing_mailbox.sql` after migrations001–013 in the isolated preview Supabase project before testing persistence. No production migration or master merge is included. Preview migration and signed-in manual acceptance remain outstanding and should be checked before merging.

Validation of the documentation/workflow publication candidate:

- 1,183 deterministic tests passed with two workers; 251 opt-in tests skipped. This includes the 61 published workflow-reporter tests.
- Previously recorded isolated feature verification passed 152 database tests and 14 SQL race checks. These were not rerun for the documentation update.
- Previously recorded editing-feature coverage met 80% line and branch targets in all 12 scoped files, with 98.26% lines and 91.32% branches overall.
- Lint, TypeScript/production build, documentation build and strict OpenSpec validation passed.
- Actual dark desktop/narrow browser checks cover linked-move rejection/input retention, ordinary edits, combined history, read-only resolution and mailbox actions.

Evidence, review decisions, summaries, retained failures and a manual checklist are in `workflow/submitted-report-editing/`. Hosted preview behavior and live AI remain unverified. The PR also publishes the maintained setup/user/developer documentation, agent instructions, mockup role, explanation skill, individual reflection and selected experiment evidence. Presentation-authoring records and raw provider traces remain excluded.

Evidence cleanup removes redundant intermediate logs and stores the detailed numeric usage snapshots as lossless gzip downloads. Final verification records, source manifests, coverage detail, summaries and screenshots remain available. See `workflow/submitted-report-editing/evidence-retention.md` for original hashes, extraction and historical access.

Documentation cleanup repairs the guide navigation, removes starter-template descriptions and publishes compressed study materials with explicit evidence limits. The workflow helper passed its scoped V8 targets with 100% line coverage and 93.8% branch coverage; CLI behavior is tested separately, with no instrumented CLI percentage claimed.
