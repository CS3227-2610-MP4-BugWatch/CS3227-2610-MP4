# Proposal

## Why

The report form in the submission change holds unfinished work in memory. Private drafts let Testers pause a report and resume it after signing back in.

## What Changes

- Add explicit Save draft to the report form. Require a project and allow other fields to be incomplete.
- Add Tester-only My drafts beside Projects. Group drafts by project and allow resuming or deleting with confirmation.
- Allow reassignment to an active project. Preserve existing drafts if their project is archived and block submission to it.
- Warn on navigation away from unsaved edits. On successful submission, consume the draft and open the submitted report.

## Capabilities

### New Capabilities

- `report-drafts` covers private persistence, discovery, editing, deletion, and submission of saved drafts.

### Modified Capabilities

## Impact

Build on `tester-report-submission` once it is integrated into development. Extend the existing report form, authenticated routing, Supabase persistence, and reporting guides. The shared project Reports tab continues to show submitted reports. This change excludes autosave, AI, evidence, submitted-report editing, and archive/restore controls.
