# {Feature name} — Implementation Summary

This summary covers the implementer's work for {feature name}, as accepted in {approved submission IDs and plan revision}. Describe the final reviewed work in plain language, using a concrete user example before technical detail. Use complete sentences and links to the relevant source and tests. Cover every added or materially changed function; group trivial helpers only when their distinct responsibilities remain clear. If a section has no entries, write "None" and briefly explain why. Report what the code does separately from what was verified.

## User Flow and Decisions

Use `.agents/skills/explain-software-changes/SKILL.md` for wording and explanations. Keep this template's required coverage and factual evidence; do not add a second article-style report.

{Explain the problem, one normal user journey, and the important decisions and trade-offs. Identify confirmed behavior and remaining limitations. Define necessary jargon when first used.}

## Files Added

- `{path}` was added to {broad purpose and functionality}.

## Files Changed

- `{path}` was changed to {broad change and why it was needed}.

## Functions Created

- **Function and source:** {function name and source link}.
  - **Purpose:** {what problem it solves, with a short example when helpful}.
  - **Inputs and result:** {what it receives and returns, in plain language}.
  - **Side effects:** {database writes, screen state, navigation, or None}.
  - **Failures and recovery:** {important invalid, unauthorized, unavailable or uncertain outcomes and what the caller/user does next}.
  - **Tests:** {links and exact test names/families covering the behavior; identify any untested claim}.

## Functions Changed

- **Function and source:** {function name and source link}.
  - **Change and reason:** {before/after behavior and why the change was needed}.
  - **Inputs and result:** {current contract and any compatibility change}.
  - **Side effects:** {what it changes, or None}.
  - **Failures and recovery:** {important failures and expected handling}.
  - **Tests:** {links and exact test names/families; identify gaps}.

## Verification and Remaining Limits

| Command or check | Actual outcome | Evidence and scope |
| --- | --- | --- |
| {exact command/check} | Passed / Failed / Skipped / Not run | {output location, relevant counts, reviewed revision; distinguish local mocks, database execution, browser checks and user-reported results} |

{State what remains unverified. Link the approved visual-review record for UI work. Do not describe a skipped suite, successful build or source inspection as a successful database/browser test.}
