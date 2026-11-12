# Proposal

## Why

Developers need focused follow-up questions that obtain missing or ambiguous information from testers without repeating answers already present in a bug report's discussion. An optional questions-only assistant can support the existing manual discussion workflow.

Report fields and comments can also carry instructions planted by another participant. The security extension reduces that influence with a hardened prompt, bounded credential-request output checks, and adversarial review while retaining the existing authorization and manual-action boundaries.

## What Changes

- Let only the currently assigned Developer generate and view suggestions for an active-project report in Accepted, In progress, or Awaiting tester information.
- Use the current report fields and current discussion to suggest up to five clear tester questions. Allow fewer or no questions when no useful follow-ups remain. Do not return hypotheses, fixes, investigation plans, or explanations.
- Display labeled, read-only suggestions with a Copy action. The Developer separately edits and posts through the existing discussion composer; generation does not post comments or change report state.
- Keep suggestions in page memory only and clear them on report departure or account changes.
- Enforce a separate quota of five attempts per Developer per rolling five minutes, independent of Tester allowances.
- Include the full saved discussion when it fits; decline oversized context with an explanation rather than truncating it.
- Retain suggestions when newly loaded discussion changes their context, label them outdated, and offer regeneration.
- Reuse the Tester assistant's SoCLaaS provider and defined `qwen3.5:9b` model. Evaluate reusable implementation pieces without changing Tester behavior.
- Start with reasoning disabled, temperature 0.7, and top-p 0.8, subject to provider support and manual verification.
- Use a **tentative 1,500-token output cap and tentative 15-second provider timeout**. Manual review must establish adequacy before feature completion; revise and manually recheck if inadequate. No automated quality benchmark is required.
- Exclude provider-retention checks as an enablement or completion gate, as explicitly requested. Provider retention remains unverified; BugWatch still stores no generated suggestions.
- Reconcile the broader Developer investigation assistant described in BugWatch.md with the agreed questions-only scope during the implementation workflow.
- Harden Developer instructions against task overrides, fake system/administrator messages, quoted conversations, and encoded or hidden instructions in saved context. Keep the complete allowed context unchanged; do not add input filtering or silently remove comments.
- Add deterministic, bounded checks for explicit requests to disclose credentials after structural output validation. Reject the entire matched result with safe failure feedback before display or Copy; preserve manual discussion and prior suggestions during failed regeneration.
- Instruct the model not to output URLs, external submission destinations, executable commands, or scripts. These are prompt-only restrictions: URL/command detection and filtering are explicitly excluded for now, and compliant output is not guaranteed.
- Add deterministic enforcement/regression tests and a synthetic adversarial review set. Keep real-model security assessment separate from mocked tests and the existing operational-bounds review. No second classifier model or automated quality benchmark is introduced.

## Capabilities

### New Capabilities

- `developer-tester-questions`: Assigned-Developer access, current-report context, optional questions-only generation, explicit copying, transient output, verified operational bounds, and layered prompt-injection mitigations with explicit coverage limits.

### Modified Capabilities

None. Existing report discussion and lifecycle requirements remain unchanged.

## Impact

Integration points are ReportDetailsPage, a Developer-specific endpoint and client, local Vite API routing, server TypeScript test inclusion, and the server-only SoCLaaS transport. Existing Tester generation embeds role-specific instructions and types, so transport reuse requires a scoped separation. Its Tester-only quota function cannot authorize Developers unchanged; add independent atomic Developer quota storage.

Preserve existing Tester tests and behavior. Add Developer API/UI/quota coverage and manual review of tentative bounds. Update the existing User and Developer Guide Reports topics when implemented. No new dependency is planned.

The security delta affects the Developer system instructions and endpoint output path, a small server-side credential-request policy helper, scoped API/dependency/UI tests, and the existing Reports guides. The coordinator owns any matching TypeScript test configuration changes and the synthetic review record. No new database migration, model tools, automatic action, output persistence, or Tester behavior change is required.

The initial application source exists with 14 previously completed tasks, but SQL verification and live model review remain pending. This revision adds planned security work; it does not claim that the new mitigations are implemented or that existing approvals cover the revised scope. Apply the security delta only through a subsequent implementation request.
