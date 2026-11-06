# Design

## Context

The submission change provides ReportForm, ReportCreatePage, ReportRepository and a Supabase report creation transaction. AuthenticatedApp owns session state and currently uses BrowserRouter. ProjectsApp owns feature routes. The active-project query cannot supply labels for archived draft groups.

## Goals / Non-Goals

**Goals:** Reuse the report fields, project picker, validation limits and creation transaction. Keep draft content and access independent of shared report reads.

**Non-Goals:** Changing submitted report permissions, adding archive controls, or introducing autosave or a second router.

## Decisions

- Keep private drafts in a separate Supabase table, with a project foreign key and author derived from the trusted authenticated Tester profile. Require the same owner and Tester role on every operation, including direct requests. Return project name and archive marker through owner-scoped draft reads. Render text literally. Keep these reads outside project and submitted-report listing contracts.
- Extend `src/features/reports/types.ts` and `reportRepository.ts` with `listDrafts(): Promise<DraftSummary[]>`, `getDraft(id): Promise<ReportDraft | null>`, `saveDraft(input: ReportInput, id?: string): Promise<ReportDraft>`, `deleteDraft(id): Promise<void>` and `submitDraft(id, input: ReportInput): Promise<Report>`. DraftSummary has id, projectId, projectName, projectArchivedAt, title and updatedAt. ReportDraft adds the remaining ReportInput fields. Reuse ReportError for validation, forbidden, not_found, archived, unauthenticated and unavailable results. Wrap draft calls in the existing session boundary. Missing and inaccessible draft IDs must not disclose ownership or contents.
- Add `/drafts` and `/drafts/:draftId` to the existing authenticated router. Group by project ID, display current project labels, and use **Untitled draft** for empty titles. Show the archived selection and provide the existing active-project choices. Opening and deleting remain available. Block saving and submitting while the selected project is archived. Enforce this against the target project at the database boundary so an author can update the same draft by moving it to an active project.
- Reuse the report form with draft-specific validation in `src/features/reports/validation.ts`. Save checks project and field shape, maximum lengths and valid nonempty severity values. Submit retains the full existing validation. Keep the saved snapshot separate from current edits. On first save, give the form a stable draft URL without losing input. Check the current router mode when wiring the leave dialog because React Router's navigation blocker requires a data router. If needed, migrate the single authenticated route tree and regression-test existing deep links, browser Back and auth resets. Reload and tab close use the browser's native warning where supported.
- Use a new migration after the submission migrations. Share the database creation logic so submission validates the target project, writes one Open report and creation history, and consumes the owned draft in a single transaction. Serialize competing actions on the same draft and reuse a persisted author-scoped draft-to-report receipt to resolve repeat submissions after a lost response. Keep receipt identifiers out of shared views. A rejected submission rolls back the operation. UI pending state prevents overlapping writes from the same form.

## Risks / Trade-offs

- App routing and authentication share a boundary. Keep router changes narrowly scoped and verify logout and session expiry clear draft form state.
- An archived project may be absent from the active picker or become archived mid-request. Scoped draft reads supply its label and the database checks the target at save and submission time.
- The submission PR is the implementation dependency. Confirm the integrated interfaces and migration sequence before parallel work.
