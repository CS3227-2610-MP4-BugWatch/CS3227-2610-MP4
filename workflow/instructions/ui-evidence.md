# Rendered UI Evidence

Read when planning, performing or reviewing visual checks for user-facing changes. Use `workflow/templates/visual-review-template.md` for the coordinator-assigned report under the feature's workflow directory. Existing implementation, ownership and independent-review rules still apply.

## Plan the Relevant Checks

Identify affected screens and acceptance criteria, then choose representative normal, loading, empty, validation-error and request-error states where applicable. Include narrow-screen use, long text and keyboard operation for affected controls. Record N/A with a reason for states outside this change instead of inventing an unrelated test requirement.

The coordinator assigns the report path, screenshot directory, app revision or dirty-diff identifier, fixture environment and exclusive presentation-file ownership. A code revision with uncommitted changes needs a preserved diff or hash identifying those changes, not just the base commit. Keep existing server/resource constraints and use isolated or synthetic data; do not expose account information, tokens or secrets in screenshots or reports.

## Inspect the Actual App

- Use the real rendered application with the established theme; record viewport size, browser and theme. Include at least one normal desktop and one representative narrow viewport for affected layouts unless the agreed acceptance criteria justify another scope.
- Capture the whole viewport without cropping individual fields. Use additional whole-page captures if needed to explain scrolling; label viewport versus full-page captures. Keep relevant controls/context visible. Generated mockups cannot stand in for app screenshots.
- Inspect captures and operate the controls. Check readable text, wrapping, focus visibility/order, names of controls, error recovery and no hidden/clipped required actions. Capture files alone do not establish that these checks passed.
- Record the action, expected outcome, observation and capture path for each relevant check. Include loading/error states using controlled fixtures where appropriate and label simulated conditions. Distinguish mock services, local database and hosted preview observations.
- Record actual run time and findings. Screenshots show presentation, not authorization, concurrency or full database correctness; link those separate tests where relevant.

## Report and Review

Use Passed, Failed, Unverified or N/A with a reason. If the browser, app or safe fixtures are unavailable, record the specific limitation and outstanding checks; do not mark them Passed based on source inspection or a build. Escalate functional defects to the coordinator rather than changing behavior under a visual-only assignment.

Link before/after captures when presentation changes are made, and label which revision each represents. The independent reviewer checks that evidence covers the final relevant state. Subsequent changes that affect the inspected behavior or presentation require fresh affected checks and review. Do not silently waive a required rendered acceptance check to finish a feature. This record does not add a UI pass to tasks with no application UI impact.
