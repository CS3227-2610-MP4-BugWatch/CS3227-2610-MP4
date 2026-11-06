# Tasks

## 1. Integration baseline

- [ ] 1.1 Coordinator confirms the submission change is integrated into development and checks migration order and actual contracts against design.md. Record the agreed artifact revision and exclusive file ownership in the feature record.

## 2. Private persistence and submission

- [x] 2.1 Implementer owns the report database migration, repository types, repository and validation. Add owner-scoped draft operations and transactional draft submission. Verify against the database and repository cases in 2.2.
- [ ] 2.2 Tester owns `src/test/report-draft-{validation,repository,database}.test.ts`. Verify incomplete values, limits, project requirements, cross-account and role isolation, delete, rollback, and repeated submission after a lost response. Verify that saves targeting an archived project are rejected without overwriting the last save, including if archival happens while the form is open. Verify that moving the same draft to an active project succeeds and that drafts never enter shared reads.
- [x] 2.3 Documentation writer owns `docs/developerGuide/Reports.md`. Document actual persistence, permissions, migration and submission behavior. Verify with the MarkBind build.

## 3. Draft workflow in the app

- [x] 3.1 Implementer owns the draft pages, shared report form and create-page wiring, and serialized changes to authenticated route and session wiring. Verify grouped drafts, save and resume, confirmation before deletion, project reassignment, archived draft visibility, unsaved-navigation warning and submission result against 3.2.
- [x] 3.2 Tester owns `src/test/report-draft-ui.test.ts` and affected route/auth regression tests. Verify session resets, author-only routes, first save staying on the form, confirmed deletion, leaving with unsaved edits, submission failure retaining input, successful navigation, and existing report deep links.
- [x] 3.3 Documentation writer owns `docs/userGuide/Reports.md`. Explain the actual draft workflow, warning and archive behavior. Verify with the MarkBind build.

## 4. Integrated verification and review

- [x] 4.1 Coordinator runs `npm run test -- --run`, `npm run lint`, `npm run build`, `npm run docs:build`, strict OpenSpec validation and diff checks. Record actual outcomes and any skipped hosted checks.
- [x] 4.2 Independent reviewer explicitly decides every implementer and tester submission and approves the final combined implementation and tests. Coordinator records decisions and routes fixes for re-review.
- [ ] 4.3 Coordinator prepares a separate PR targeting development and verifies the Vercel preview with authorized isolated data and roles. Record actual preview evidence, decisions and limitations in the feature record and interaction log.
