# Local manual review: report editing and mailbox

Use a separate test database with migrations001–013 and this branch's `014_report_editing_mailbox.sql`. PR9 owns012resolutions and PR10 owns013Developer question quota. Do not apply fixture scripts to production. The existing local checks used a disposable instance; they did not update your hosted preview database.

1. Sign in as the Tester who originally submitted a report in an active project. For an assigned report, its state must be Accepted, In progress or Awaiting tester information. An unassigned Open report also permits editing.
2. Open that report and select **Edit report**. Check that the current fields are filled in. Another Tester or a Developer should not have this editing action.
3. Change the description and select **Save changes**. Check that you return to the same report address, see the change and can find its before/after values in Activity.
4. Sign in as its assigned Developer and open **Mailbox**. Check that a new unread item identifies the Tester, report and Description as the changed field. It should not contain the entire report text.
5. Choose **Mark as read** in the Unread view. The item should disappear from Unread and remain marked Read under All. Repeat with a fresh notification and **Open report**: it should mark read before opening the same report.
6. Choose **Delete** on an item. Check that the item disappears while its report and activity remain available.
7. As the original Tester, open the editor and save without changing anything. Check that no new edit activity or mailbox item appears.
8. For a report without duplicate links, change its project to another active project and save. Check the same ID, discussion, state and assignee, plus destination/source listings. For a duplicate-linked report, check that changing Project shows a clear field error and retains your text. Restore its original project and check that ordinary eligible edits still save.
9. Change a field, then Cancel. Check the unsaved-changes choice: staying keeps your text; deliberately leaving does not create a draft.
10. When AI is configured in the test environment, generate a suggestion, inspect it and apply one field. Check that the stored report changes only after **Save changes**. The retained browser evidence used labelled synthetic AI output; a live model check is still separate.

Severity conflict, archive races, transaction rollback and cross-user RPC denial have separate automated/local database evidence. Do not use an ordinary Developer screen to reproduce a severity change: that editing screen is not implemented in this slice. The retained conflict capture used a controlled local database fixture. Request that fixture for a repeat rather than changing hosted data manually.

Record each manual result as Passed, Failed or Not run. For a failure, note the actor, starting state, steps and expected/actual result. Record actual testing minutes if you want to measure human review effort. No manual acceptance result or timing is assumed from reading this checklist.
