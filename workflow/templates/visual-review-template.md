# {Feature name} — Rendered UI Review

## Scope and Environment

- **Plan revision and submission:** {links and IDs}.
- **Source revision:** {commit plus preserved dirty diff/hash when applicable}.
- **Observed at:** {date/time and timezone}.
- **Application and fixtures:** {local/preview location, synthetic data, mocked/local/hosted services; no credentials}.
- **Browser, theme and viewports:** {actual values}.
- **Screens and acceptance criteria:** {affected scope; link criteria}.

## Checks and Captures

Use whole-viewport app screenshots, labelled separately from full-page captures. Inspect images and operate controls before claiming a pass. Record each applicable state separately; N/A requires a reason.

| Screen/state or operation | Viewport/theme | Action and expected result | Actual observation | Status | Capture and source revision |
| --- | --- | --- | --- | --- | --- |
| {normal / loading / empty / validation error / request error / long text / narrow layout / keyboard use} | {actual values} | {steps and criterion} | {what was observed, including controlled simulation} | Passed / Failed / Unverified / N/A | {capture link; viewport/full-page; before/after if relevant} |

## Findings and Resolutions

| Finding | User impact | Owner and fix submission | Retest evidence |
| --- | --- | --- | --- |
| {issue or None} | {impact} | {assignment; visual-only owner escalates functional changes} | {actual outcome or Pending} |

## Review and Limits

- **Outstanding checks and prerequisites:** {Unverified checks and reasons, or None}.
- **Evidence boundaries:** {what screenshots/browser actions establish; separate database/auth tests}.
- **Reviewer and decision:** {explicit reviewer decision and reviewed state; Pending until reviewed}.
- **Later affected changes:** {fresh checks/review, or None}.
