# Proposal

## Why

Developers can read submitted reports but cannot take responsibility for them or indicate that investigation has begun. Deliver the second and third developer MVP features together while keeping acceptance and active work as explicit, separate actions.

## What Changes

- Add **Accept report** only on the report detail page for Developers viewing an unassigned Open report in an active project. Assign the authenticated Developer, record assignment time, and enter Accepted atomically.
- Add **Start investigation** only on the detail page for the assigned Developer viewing an Accepted report in an active project. Enter In progress without changing assignment.
- Enforce permissions and transitions in the database; first successful acceptance wins and competitors receive an already-assigned message.
- Show persisted state, assignee identity, assignment time, and attributable activity history after actions and reload. Update project report summaries to display state and assignee without adding actions to the list.
- Preserve report creation, drafts, shared read access, and navigation. Add automated coverage and update the existing Reports guide topics during implementation.
- Exclude release/transfer, clarification, resolution/closure, report editing, notifications, profiles/work queues, and automatic investigation. Do not add archive/restore controls; respect existing archived-project data.

## Capabilities

### New Capabilities

- `report-workflow`: Developer ownership, explicit investigation transitions, and their shared readback and activity history.

### Modified Capabilities

None. The durable inventory currently contains authentication and project-management only. The in-flight `tester-report-submission` change owns `bug-reporting`; this change extends its implemented report foundation through a separate cohesive workflow capability rather than duplicating or rewriting that change's submission requirements.

## Impact

- Reports database migration after `007_report_drafts.sql`: constraints, assignment timestamp, protected workflow RPCs, read RPC labels, and activity events.
- `src/features/reports/types.ts`, `reportRepository.ts`, `ReportDetailsPage.tsx`, and `ProjectReportsPanel.tsx`; authenticated routing/repository wrapper in `src/features/auth/AuthenticatedApp.tsx`.
- Existing report repository, UI, authentication-boundary, listing, and isolated database tests, with focused workflow tests under `src/test/*.test.ts`.
- `docs/userGuide/Reports.md` and `docs/developerGuide/Reports.md` for usage, migration, security, and verification.
- Coordinate overlapping files with the in-flight report submission, draft, and UI changes. No new package dependency is expected. Deploy the compatible database migration before the updated frontend.
