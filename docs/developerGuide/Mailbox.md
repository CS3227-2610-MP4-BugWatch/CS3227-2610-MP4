---
  layout: default.md
  title: "Mailbox development"
  pageNav: 3
---

# Mailbox development

Migration `014_report_editing_mailbox.sql` adds private mailbox items and the edit transaction described in [Report development](Reports.md). Apply the ordered migrations to an isolated test project and check migration history before applying `014` after `013_developer_question_quota.sql`. Use the existing isolated runtime configuration and production-origin guard; keep secrets out of client variables and documentation.

The report edit RPC derives the actor and recipient on the server. A real edit creates an item for the Developer assigned at commit time; callers cannot select recipients or create items directly. Items hold report and actor context and changed field names rather than report text. The mailbox repository pages through recipient-scoped results and exposes All and Unread, mark-read and delete operations. Database access is restricted to the authenticated recipient with a valid profile. Deleting an item does not delete the report. Opening an item first persists read status; a failed operation reports an error and allows retry. Account-scoped page state prevents an old account's pending result from being displayed after a change of account.

Only submitted-report edits currently produce items. Verify recipient isolation, pagination, read persistence, deletion and uncertain responses with guarded isolated database tests and signed-in browser checks separately from unit coverage. Do not treat skipped database tests or a documentation build as proof of those checks.
