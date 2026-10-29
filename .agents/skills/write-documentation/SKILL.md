---
name: write-documentation
description: Create or update BugWatch user and developer guide content, choosing an existing topic page or a new Markdown page and updating MarkBind navigation for each new page.
---

# Write BugWatch Documentation

## Guide structure

- User documentation lives in `docs/userGuide/`.
- Developer documentation lives in `docs/developerGuide/`.
- `docs/userGuide/UserGuide.md` and `docs/developerGuide/DeveloperGuide.md` are landing pages. Keep them focused on introductions, orientation, and links; put detailed content in topic Markdown files within the same guide folder.
- Shared navigation is defined in `_markbind/layouts/default.md` (the actual filename uses a period before `md`).

## Choose where information belongs

Read the relevant landing page, topic pages in the guide folder, and shared navigation before editing. Inspect the implementation or other authoritative repository sources to confirm the information being documented.

Update an existing topic page when its subject and intended audience already cover the new information, or when the information is a natural extension of that topic. Add or revise the relevant section instead of duplicating content in another page.

Create a new Markdown page in the same guide folder when no existing topic page is suitable or the information forms a distinct topic that would make an existing page unfocused. Follow nearby filename, heading, and frontmatter conventions. Use the shared `default.md` layout. Do not use the landing page as a catch-all for detailed content.

For changes affecting both audiences, update the appropriate topics in both guide folders and link between them where useful rather than repeating the same detailed explanation.

## Make every new page navigable

Whenever creating a guide Markdown page, add a navigation entry for it in `_markbind/layouts/default.md` in the same change. Follow the existing navigation markup and group the entry under the corresponding User Guide or Developer Guide. Preserve existing links and ordering unless the task requires a change.

The layout contains a header `<navbar>` and a `<site-nav>` guide tree. Ensure the new page is reachable through the guide navigation; use a nested entry under its guide in the tree and follow any existing header dropdown convention if present. Do not replace the guide landing-page links with topic links.

Use the generated `.html` target, preserving the source path and case and following the existing `{{ baseUrl }}` convention. Verify the output path from the source location and MarkBind configuration or generated files; do not copy a nearby URL without checking it. Update landing-page topic links when needed for useful orientation.

## Verify and report

Check that content describes implemented behaviour, the placement fits the topic, and every newly created page has a matching navigation entry with a valid target. Run `npm run docs:build` and inspect failures caused by the change. Report any verification that cannot be completed.

In the task summary or required interaction log, briefly state which existing page was extended or why a new topic page was needed, and identify navigation changes for new pages.
