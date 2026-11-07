# Proposal

## Why

Testers can already write reports manually, but rough observations can be hard to turn into clear reproduction instructions. An optional SoCLaaS assistant helps improve the report and gives the Tester control over what goes into it.

## What Changes

- Add on-demand suggestions for title, description, and reproduction steps in new and resumed report forms. Require a project, title, and description before generation.
- Show editable, labeled suggestions with per-field application and a numbered list of short questions about missing details.
- Allow only the selected project's name and description as additional model context for this Tester capability. Use only current form fields as report context.
- Call SoCLaaS from a server-side Vercel Function and enforce three requests per Tester per rolling five minutes.
- Keep suggestions and questions in form memory. Save and submit only report field values. Preserve the manual workflow through assistant failures.

## Capabilities

### New Capabilities

- `tester-report-assistance` covers optional generation, explicit application, limited context, and server-side access controls.

### Modified Capabilities

## Impact

Build on the submission and drafts work in PRs #3 and #4. Extend the shared report form, server-side SoCLaaS transport, and Supabase authorization and quota storage. The Developer assistant and changes to its context are outside this change. Model selection, shared upstream budget, and provider retention must be confirmed before enabling the live integration.
