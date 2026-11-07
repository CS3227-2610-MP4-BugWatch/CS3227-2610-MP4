---
  layout: default.md
  title: "Bug reports"
  pageNav: 3
---

# Bug reports

A Tester can submit a bug to an active project. A submitted report starts as **Open** and **Unassigned**. Both logged-in Testers and Developers can find submitted reports in the project's **Reports** tab and read their details and creation history. Your environment must have the report migrations described in the [developer guide](../developerGuide/Reports.md).

## Submit a report

1. [Log in](Authentication.md) as a Tester, open an active project, and select **Report bug**.
2. Check the selected **Project**, then enter a **Title**, **Description**, **Version**, **Reproduction steps**, **Expected results**, and **Actual results**.
3. Choose a **Severity**: Very Low, Low, Medium, or High. There is no preselected severity. Optionally enter a **Test environment**, such as a browser and operating system.
4. Select **Submit report**. After a successful save, BugWatch opens the saved report page.
5. On the saved report page, use the breadcrumb or **Back to project reports** to return to the project's **Reports** tab. You can also reload the saved report link or share it with another logged-in user.

The form groups fields under **Identify the problem**, **Reproduce the problem**, **Expected and actual results**, and **Impact**. **Submit report**, **Save draft**, and **Cancel** appear after the fields; validation and save feedback appear in the form.

Use the **Back to projects** button above the form to return to the project list. If you have unsaved changes, confirm whether to leave or keep editing.

For example, a checkout report could say what was in the cart, the steps to apply a discount, what total you expected, and what appeared instead. Give the version you tested so a Developer can investigate the same behaviour.

The title allows 1–200 characters; version allows 1–100. Description, reproduction steps, expected results, and actual results each allow 1–5,000 characters. The optional environment allows up to 1,000 characters. Lengths are counted after surrounding whitespace is removed. Choose **Cancel** to leave without submitting.

## Access and errors

Only Testers can create reports. If there are no active projects, a Developer must create one before a report can be submitted. If projects cannot be loaded, select **Retry**. If a field is invalid, correct the displayed feedback. An archived or missing project cannot receive a new report. If the selected project was archived, the form keeps your text and offers **Discard report**. If the bug still needs attention, contact the Developer who created that project outside BugWatch. If you selected the wrong project, you can change the dropdown without losing the rest of your input.

If a submission fails, your form text remains available for correction or retry while you remain on the form. For a report submitted directly without a saved draft, check the project's **Reports** tab in another browser tab before retrying an uncertain save. Logging out or losing your session clears unsaved text.

## Save and resume a private draft

1. Start a report and select an active project. Enter whatever you have and select **Save draft**. Other fields can be blank, and the report field length limits still apply. The form stays open and shows **Draft saved**.
2. Select **My drafts** in the workspace sidebar to find your drafts grouped by project, including after you sign back in. On a narrow screen, open **Menu** first. Only you can see your drafts. Select a draft to resume it or use **Delete** and confirm to remove it.
3. To move a draft, select another active project and save. If the original project is archived, you can still open or delete the draft. To save edits or submit, select an active project.
4. Finish the required fields and select **Submit report**. When submission succeeds, the report opens and the draft disappears from **My drafts**. If a connection drops after the report was saved, retrying submission from the same draft opens the existing report.

If you try to leave the form with unsaved changes, including by choosing a workspace destination, choose **Keep editing** or **Leave without saving**. Leaving preserves the last saved version. Save before signing out if you want to keep newer edits.

## Find and read reports

Open a project and select its **Reports** tab. The table lists that project's submitted reports, newest first, with the title, project, severity, status, assignee, and reporter. Select anywhere in a report entry to open it; the bold title is also a keyboard-accessible link. Entries highlight on hover or keyboard focus. Listing severity badges retain their labels and use teal for Very Low, green for Low, yellow for Medium, and red for High. If the project has no reports, the tab shows **No reports yet**. If reports cannot be loaded, select **Retry**; this does not prevent you from opening the project's **Overview** tab.

The saved page shows the project, report fields, reporter, state, assignment, timestamps, and creation history. Use its breadcrumb to visit **Projects**, the project's **Overview**, or **Reports**, or select **Back to project reports** to return to the listing. If a saved report cannot be loaded, select **Retry**. A missing report shows **Report not found**. Report editing, AI suggestions, discussion, assignment, resolution, and attachments are not available in this feature.
