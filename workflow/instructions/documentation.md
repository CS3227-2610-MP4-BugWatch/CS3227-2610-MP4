# Documentation Instructions

Read before planning, writing, or reviewing guide documentation or documentation requirements. Use the documentation writing skill for guide edits.

## Documentation

Before writing or updating user or developer guide documentation, read and use the documentation writing skill at `.agents/skills/write-documentation/SKILL.md`.

`docs/userGuide/UserGuide.md` and `docs/developerGuide/DeveloperGuide.md` serve as landing pages. Detailed content belongs in topic Markdown files within the corresponding guide folder. Determine whether the information fits an existing topic page or needs a new page using the skill's placement criteria.

Whenever creating a new guide Markdown page, add its navigation entry in `_markbind/layouts/default.md` in the same change. Follow the skill's navigation and verification instructions.

### User Documentation

Document all added user-facing features in the appropriate topic pages within `docs/userGuide/`. Include, where applicable:

- An explanation of the feature.
- Instructions for using it.
- Example use cases and expected outcomes.
- Relevant restrictions.
- Warnings or important behaviour the user should know.

Documentation must describe the actual current implementation. Do not document unimplemented functionality, describe planned behaviour as existing behaviour, invent screens or workflows, or claim testing that did not occur.

When an existing user-facing feature changes, update its User Guide documentation as part of the same task.

### Developer Documentation

Reflect material changes to architecture, design, dependencies, setup, development workflows, or major implementation decisions in the appropriate topic pages within `docs/developerGuide/`.

Do not update the Developer Guide for trivial implementation details that do not affect developers' understanding of the system.

When external code, ideas, designs, or documentation are reused or adapted, record acknowledgements required by the project in the Developer Guide's acknowledgement section.
