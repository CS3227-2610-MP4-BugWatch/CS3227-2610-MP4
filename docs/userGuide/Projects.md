---
  layout: default.md
  title: "Projects"
  pageNav: 3
---

# Projects

After the project migrations have been applied in your environment, log in with your real account to browse active projects at `/projects`. Developers can create and edit any active project; Testers and Developers can browse project metadata, history, and submitted reports. The application uses shared Supabase storage, so successful saves persist after reload. Your environment needs the project migrations described in the [developer guide](../developerGuide/Projects.md) and the [report migrations](../developerGuide/Reports.md).

Select **Projects** in the workspace sidebar to return to the project list. On a narrow screen, select **Menu** first. Testers can also use **My drafts** in the sidebar to resume saved reports. The header shows your identity and **Log out**.

Each project entry is clickable across its title, description, and creator details. Hover over an entry to highlight it, or focus it with the keyboard and press Enter. Use **Back to projects** on the project details page to return to the list.

## Real project workflow

1. Log in, then choose **Create project** as a developer.
2. Supply name, plain-text description and absolute HTTP/HTTPS repository URL; select **Save project**.
3. The details page shows the persisted fields and initial history. Select **Edit project** to change metadata, or **Cancel** to leave without writing.
4. Any developer can edit another developer's active project. Testers receive no create/edit actions, including through direct edit routes.
5. Duplicate names are compared ignoring surrounding whitespace and case. Save errors keep your text; stale-save conflicts require **Reload latest project**, which replaces unsaved values before you can save again.

Names allow 1-100 characters after trimming, descriptions 1-5,000, URLs at most 2,048. Repository URLs allow standard URL punctuation, percent signs, fragments and IPv6 brackets; double quotes, backticks, control characters and Unicode noncharacters are rejected. Repository existence is not checked. Descriptions are escaped plain text. History records initial values or previous/new changed fields. History actor labels show current display names, including other users, after the history-name migration is applied. Names are plain text; a missing label shows `Unknown user`. Actor IDs remain stable in audit data. Creator/list metadata may still show other users by UUID. No-op saves add no event. Archive/restore, project deletion, teams and saved project drafts are outside this feature.

Logout or session loss removes the protected workspace and unsaved form text. If storage is unavailable, retry when the service is available.

Each project has an **Overview** tab for its metadata, repository link, and history and a **Reports** tab for that project's submitted reports. The selected tab is reflected in the URL, so a direct link to the Reports view opens that view again after a reload. Both roles can open a report by selecting anywhere in its highlighted row; its bold title remains a keyboard-accessible link. The list shows the newest reports first and distinguishes an empty list from a loading error; select **Retry** if loading fails. A history error on **Overview** does not prevent you from opening **Reports**, and a reports error does not prevent you from opening **Overview**.

Testers can open **Report bug** from an active project's details page. See [Bug reports](Reports.md) for the submission workflow and its database prerequisites.
