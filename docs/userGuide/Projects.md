---
  layout: default.md
  title: "Projects"
  pageNav: 3
---

# Projects

After the project migration has been applied in your environment, log in with your real account to browse active projects at `/projects`. Developers can create and edit any active project; testers can browse metadata/history. The application uses shared Supabase storage, so successful saves persist after reload. Your environment needs the project migrations described in the [developer guide](../developerGuide/Projects.md).

## Real project workflow

1. Log in, then choose **Create project** as a developer.
2. Supply name, plain-text description and absolute HTTP/HTTPS repository URL; select **Save project**.
3. The details page shows the persisted fields and initial history. Select **Edit project** to change metadata, or **Cancel** to leave without writing.
4. Any developer can edit another developer's active project. Testers receive no create/edit actions, including through direct edit routes.
5. Duplicate names are compared ignoring surrounding whitespace and case. Save errors keep your text; stale-save conflicts require **Reload latest project**, which replaces unsaved values before you can save again.

Names allow 1-100 characters after trimming, descriptions 1-5,000, URLs at most 2,048. Repository existence is not checked. Descriptions are escaped plain text. History records initial values or previous/new changed fields. History actor labels show current display names, including other users, after the history-name migration is applied. Names are plain text; a missing label shows `Unknown user`. Actor IDs remain stable in audit data. Creator/list metadata may still show other users by UUID. No-op saves add no event. Archive/restore, project deletion, teams, reports and saved project drafts are outside this feature.

Logout or session loss removes the protected workspace and unsaved form text. If storage is unavailable, retry when the service is available.

## Browser verification checklist (test project)

Use the separate test environment configured by your administrator, not production:

1. As Developer One, create a valid project, reload, and confirm fields/history persist.
2. Log in separately as Developer Two; edit that project, then view it as Developer One and as the tester. Confirm the history shows Developer Two's display name and the old/new values.
3. Attempt an equivalent project name on create and rename; confirm duplicate feedback without partial changes.
4. Open the same project's edit page in two independent browser sessions. Save one, then save the stale second form; confirm conflict, explicit reload and successful re-save using latest values.
5. As a tester, browse details/history and try a direct new/edit route; confirm write controls/access are denied.
6. Check invalid inputs, cancellation, keyboard navigation, logout with an unsaved form, and a storage failure/retry if practical. Report actual results; database security is also checked separately by the hosted test suite.
