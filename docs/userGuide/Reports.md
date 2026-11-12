---
  layout: default.md
  title: "Bug reports"
  pageNav: 3
---

# Bug reports

A Tester can submit a bug to an active project. A submitted report starts as **Open** and **Unassigned**. Both logged-in Testers and Developers can find submitted reports in the project's **Reports** tab, read their details and activity history, and join their discussions. Your environment must have the report migrations described in the [developer guide](../developerGuide/Reports.md).

## Submit a report

1. [Log in](Authentication.md) as a Tester, open an active project, and select **Report bug**.
2. Check the selected **Project**, then enter a **Title**, **Description**, **Version**, **Reproduction steps**, **Expected results**, and **Actual results**.
3. Choose a **Severity**: Very Low, Low, Medium, or High. There is no preselected severity. Optionally enter a **Test environment**, such as a browser and operating system.
4. Select **Submit report**. After a successful save, BugWatch opens the saved report page.
5. On the saved report page, select **Back to project reports** to return to the project's **Reports** tab. You can also reload the saved report link or share it with another logged-in user.

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

## Get AI suggestions

When the assistant is enabled, select an active project and enter a title and description. Select **Generate suggestions** at the bottom of the form. You can keep editing while the request runs.

- Review each **AI generated suggestion** below its report field. Edit the suggestion if needed, then select **Use suggestion** to replace that field.
- Read the numbered **Details to add** questions and enter any answers in the report fields. Generate again if you want to use the new details.
- Save or submit as usual. Only report fields, including any suggestions you applied, are saved. Unapplied suggestions and questions are temporary.

The assistant uses the selected project's name and description and the allowed report fields. The Tester chooses severity separately. The feature allows five generation attempts per Tester in a rolling five-minute window. If generation fails or you reach the limit, you can continue writing and saving the report.

## Find and read reports

Open a project and select its **Reports** tab. The table lists that project's submitted reports, newest first, with the title, project, severity, status, assignee, and reporter. Select anywhere in a report entry to open it; the bold title is also a keyboard-accessible link. Entries highlight on hover or keyboard focus. Listing severity badges retain their labels and use teal for Very Low, green for Low, yellow for Medium, and red for High. If the project has no reports, the tab shows **No reports yet**. If reports cannot be loaded, select **Retry**; this does not prevent you from opening the project's **Overview** tab.

The saved page shows the project, reporter, state, assigned developer, and severity above the report tabs. **Conversation** is selected first: its **Report details** section shows the report fields and timestamps, including the assignment time once a Developer accepts the report. Select **Report details** to collapse or expand it. Discussion follows below. The **Discussion** button near the header jumps to that section, and **Jump to latest** takes you to the newest comment when comments exist.

Select **Activity** to see who created or accepted the report, started investigation, requested tester information, resumed investigation, resolved it, or changed its canonical report link. The selected tab has an accent underline and stronger text. Select an entry's **Recorded changes** to inspect its saved values, including the original submission fields, resolution snapshot, or previous and new canonical report IDs. The report header and available actions remain above either tab. Select the **Project** link in the report facts to visit its overview, or select **Back to project reports** to return to the listing. The return button highlights on hover and shows a focus outline when using the keyboard. If a saved report cannot be loaded, select **Retry**. If only discussion or activity cannot be loaded, use **Retry discussion** or **Retry activity** in that section. A missing report shows **Report not found**.

## Discuss a report

1. Open a submitted report and find **Discussion** below **Report details** on the **Conversation** tab. Any logged-in Tester or Developer can participate, whether or not they reported or are assigned to the bug.
2. Enter your message in **Comment** and select **Post comment**. For example, a Developer can ask which browser version reproduced the bug, and a Tester can add that information. Comments appear in chronological order with their author and time.
3. To reference an earlier message, select its **Reply** button, enter your response, and select **Post comment**. The response stays in the same conversation and links back to the earlier comment. Select **Cancel reply** to remove the reference without clearing your text.

Comments must contain 1–5,000 Unicode code points after surrounding whitespace is removed. Comments are plain text and can include line breaks. Switching between **Conversation** and **Activity** or collapsing details keeps text you are composing on that page. Comment drafts are not saved: leaving or reloading the page, signing out, or losing your session discards unsent text. Archived-project discussions remain readable, but posting and replying are unavailable until the project is restored.

If a post cannot be confirmed, BugWatch keeps your text and explains that the comment may have been saved. Select **Reload** and check the conversation before posting again. BugWatch does not automatically repeat the post. Commenting does not change the report state.

## Suggest questions for a tester

When the assistant is enabled, the assigned Developer can use **Suggested tester questions** on an active project's report in **Accepted**, **In progress**, or **Awaiting tester information**. The full discussion must finish loading before generation is available.

1. On the report's **Conversation** tab, select **Generate tester questions**. The assistant uses the saved report and its saved discussion to suggest up to five questions, or tells you when it finds no useful follow-up questions.
2. Review the labeled suggestions. Select **Copy** beside a question, then paste and edit it in **Comment** if you want to ask it. Posting remains a separate action. For example, you could copy a question asking which browser version reproduced the problem, edit it, and post it as an ordinary discussion comment.
3. Select **Generate again** to request a new set. If the saved report or discussion changes and the page loads those changes, the previous suggestions remain visible and are marked outdated. A generation failure retains previous suggestions unless your access or eligibility has been lost. If copying fails, select and copy the question text manually.

Suggestions are temporary: switching tabs or reloading the discussion keeps them on the current report page, but leaving or refreshing the page, changing accounts, or losing eligibility clears them. Generating or copying a question does not post it, replace your comment or reply target, or change the report state.

BugWatch checks generated questions for certain explicit requests to disclose credentials. If one is found, the entire new set is withheld and the page shows the usual generation failure. Previous suggestions, your comment text, and reply target remain available unless you lose eligibility. The check does not catch every possible unsafe request, so review suggestions before copying or posting them. Suggestions are displayed as text; copying and posting remain manual actions.

The assistant uses the full saved discussion. If the report and discussion are too large, it explains that it cannot generate questions; continue the discussion manually. Each Developer has a separate allowance of five admitted attempts in a rolling five-minute window. A failed generation or an empty result still counts after an attempt is admitted. If generation is unavailable or the allowance is exhausted, you can continue the ordinary discussion.

## Accept a report and start investigation

1. Log in as a Developer, open an active project's **Reports** tab, and select an **Open**, unassigned report. Any Developer can accept an available report, including one in a project created by someone else.
2. On the report details page, select **Accept report**. The report becomes **Accepted**, is assigned to you, and records the assignment time in its details and activity history. Acceptance does not start investigation.
3. When you are ready to investigate, return to the same details page and select **Start investigation**. The report becomes **In progress** and keeps its existing assignee and assignment time.

Only the assigned Developer can start investigation. Testers can read the report and its history but cannot accept or start it. Neither action is available on the listing or for an archived project. Actions are unavailable while an action is being saved.

If another Developer accepts the report first, the page explains that it is already assigned and refreshes the report. It also refreshes after a state conflict or if the project was archived. If the connection drops during an action or its readback, the action may have been saved: select **Reload** to check the current report before trying another action. BugWatch does not automatically repeat the action.

## Wait for tester information

1. When you are the assigned Developer and a report is **In progress**, select **Await tester information** on its report page. It changes to **Awaiting tester information** and keeps its assignee and assignment time. You can change the state before writing a question; no existing comment is required.
2. Ask your question in the ordinary **Discussion**. The reporting Tester or another logged-in participant can respond there.
3. When you are ready to continue, select **Resume investigation**. The report returns to **In progress**. Only the assigned Developer can make either state change, and the report stays waiting until that Developer manually resumes it. Posting a question or reply never changes the state automatically.

The two state changes appear in **Activity** with the actor and time. As with other report actions, unavailable, archived, conflicting, or uncertain outcomes are explained on the page; reload when prompted before another action.

## Link a duplicate report

The canonical report is the original submitted report that another report duplicates. Its selection field appears only inside the resolution form when the assigned Developer chooses **Duplicate** on an active-project **In progress** report.

1. Open the assigned report's details page, select **Resolve report**, and choose **Duplicate** in **Resolution outcome**.
2. Choose another report in **Canonical report**. Each choice includes its title and ID. The choices include all submitted reports in the same project except this report, including **Resolved** and **Closed** targets; private drafts and other projects are excluded.
3. Select **Save canonical link**. This saves the link and records the previous and new targets in **Activity**. It keeps both reports' states and assignments unchanged and does not resolve the report.

For example, link a second checkout-discount report to the first report before resolving the second as **Duplicate**. Saving the already saved target again adds no activity. A saved link can be replaced, but link removal is not available. If choices fail to load, select **Retry canonical reports**; the report remains readable. An empty list means there are no other reports in that project to link.

Both roles can follow **Current canonical report** on the **Conversation** tab. A Duplicate resolution also retains **Canonical report at resolution**. Saved links remain readable after resolution, but the canonical selection controls are hidden once the resolution form closes or another outcome is selected. The link cannot be edited through this form after the report becomes **Resolved**.

## Resolve an investigated report

Only the assigned Developer can resolve an **In progress** report in an active project. Open its details page and select **Resolve report** above the tabs. Resolution records a Developer outcome and changes the report to **Resolved**, preserving its assignee, assignment time, and original submitted version.

To record a fix:

1. Leave **Resolution outcome** set to **Fixed**.
2. Enter a **Fix summary**, check or edit the **Affected version** prefilled from the report's version, and enter both **Commit URL** and **Pull request URL**. The affected version is stored separately from the submitted version; there is no fixed-version field.
3. Select **Save resolution**.

To record a non-fix outcome:

1. Choose **Duplicate**, **Invalid**, **Cannot reproduce**, or **Will not fix** in **Resolution outcome**.
2. Enter an **Explanation**. Fix fields do not apply to these outcomes. For **Duplicate**, choose a **Canonical report** within this form and select **Save canonical link** before **Save resolution**; choosing a target without saving it is insufficient. The canonical field is hidden for every other outcome.
3. Select **Save resolution**. For example, **Cannot reproduce** can explain the environment and steps tried.

Fix summary and explanation each require 1–5,000 Unicode code points; affected version requires 1–100. Both fix URLs are required, allow at most 2,048 code points each, and must be absolute HTTP or HTTPS URLs with a host. They can use different repository providers or hosts from the project's repository. Surrounding whitespace is removed before validation. BugWatch stores ordinary links without fetching or checking the commit or pull request. Only fields applicable to the selected outcome are saved.

Choose **Cancel resolution** to close the form without saving a resolution. Validation feedback keeps your applicable input for correction. Resolution text is temporary: leaving or reloading the page, signing out, or losing your session discards unsaved text. It is not saved as a draft.

After saving, either role can reload and read **Resolution** on the **Conversation** tab, including its outcome, applicable values, author, and time. **Activity** retains the captured values under **Recorded changes**. Fixed outcomes explain that the original Tester must retest before closure; non-fix outcomes require no retest. Tester retesting, closure, and reopening controls are not available yet, and Developers cannot close a report. Discussion remains available on active-project Resolved reports. Archived reports retain readable details, resolution, links, and activity, but have no mutation controls.

Resolution, linking, commenting, and other report actions share a save guard, so only one runs at a time. A state or link conflict refreshes authoritative data before another attempt. If a save or readback cannot be confirmed, it may already have been saved: select **Reload** and inspect the report and **Activity** before trying again. BugWatch does not automatically repeat the mutation. Applicable unsaved resolution text stays available while you remain on the page, though a confirmed Resolved state hides the form.

Releasing or transferring an assignment, report editing, and attachments are not available in this feature.
