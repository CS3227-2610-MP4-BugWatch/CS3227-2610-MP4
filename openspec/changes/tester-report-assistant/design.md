# Design

## Context

ReportForm owns editable values for new and resumed reports. ReportCreatePage owns project loading, save and submit. AuthenticatedApp already provides a Supabase session boundary. Keep generation separate from report persistence. BugWatch.md C-34 records the Tester-only project context exception.

## Goals / Non-Goals

**Goals:** Reuse existing report fields and validation limits, preserve explicit user control, and provide a shared SoCLaaS transport that the future Developer assistant can reuse.

**Non-Goals:** Developer assistant behavior, streaming, automatic application, saved assistant output, tools or repository access, and changing report or draft persistence contracts.

## Decisions

- Require the exact stored profile role `tester`. Define the request DTO explicitly from projectId plus the seven report fields in the spec. Use projectId only for the server lookup. Ignore unrecognized request fields and never forward severity. Allow question labels for the seven report fields.
- Validate the response envelope before examining individual entries. Within a readable envelope, drop invalid suggestions or questions and return the valid entries. Treat a response with zero valid entries as an upstream failure. Offer another generation after partial success and preserve previous output on failure. Apply the existing quota and regeneration confirmation rules to retry.
- The implementation contract returns a `partial` flag with suggestions and questions. Limit displayed questions to five, with 200 Unicode code points each. Use an eight-second provider timeout and a requested output cap of 1,500 tokens. These are initial implementation bounds for verification. Live model support and behavior remain to be tested.
- Keep live calls behind the server-only `TESTER_SUGGESTIONS_ENABLED` flag. Include Vercel API modules and their tests in the Node TypeScript build so the server code is checked independently of browser types.

- Propose a same-origin Vercel Function at `api/tester/report-suggestions.ts` for `POST /api/tester/report-suggestions`. The caller sends a Supabase access token as a bearer credential and the JSON request DTO. Verify the token server-side, derive the actor and role from the authenticated profile, and resolve the active project through authorized Supabase reads. Use a request-scoped client, never a caller-provided role, project name, or description. Reject unauthorized requests, invalid bodies and invalid project selections before spending quota.
- Define a shared DTO in `src/features/reports/reportSuggestionTypes.ts`. Success returns `{ suggestions: Partial<Record<'title' | 'description' | 'reproductionSteps', string>>, questions: Array<{ field?: SuggestionReportField, text: string }> }`. Field labels come from the form's known labels. Errors return a stable code and, for local rate limiting, a retry interval. Use 401 for invalid sessions, 403 for wrong role, 400 for invalid input or project, 429 for quota, and a safe upstream error for malformed results or failure. Do not forward upstream error bodies.
- Use a small server-only `api/_lib/soclaas.ts` transport with built-in fetch and a bounded timeout. Use one non-streaming request to SoCLaaS Chat Completions per admission and no automatic retries. Keep the model and key in server-side configuration. The endpoint constructs an allowlisted payload from the current fields and project name and description. The project ID stays in BugWatch. Separate trusted instructions from untrusted field data. Give the model no tools or app actions. Validate the decoded response envelope and filter entries by allowed fields, types and size before returning. Render all text literally.
- Store quota reservations in Supabase using a single atomic per-Tester check and record operation with server time. Reserve immediately before dispatch, after validation and configuration checks. Serialize simultaneous reservations across instances and return the time until a slot opens. Store only the actor and timestamps needed for enforcement. Define cleanup and shared upstream protection in the live integration setup, using the actual account limits.
- Keep generation state scoped to the authenticated form instance. Snapshot request input and mark responses generated before later edits. Do not mutate form values on generation. Clear an applied suggestion from the pending set. Keep edits and prior questions on cancelled or failed regeneration. Use the existing form validation limits when applying suggestions and discard transient assistant state when leaving the form or losing the session.

## Risks / Trade-offs

- The SoCLaaS model ID, upstream usage budget and rate caps, and provider retention are open. Confirm these and test reachability from the isolated preview before enabling the live path.
- Project descriptions can contain misleading instructions. Test the exact outbound context and adversarial project and report examples. Response schema checks constrain output shape but cannot establish that prose is grounded. Evaluate content separately on representative cases.
- A successful API response can arrive after the form changes. Keep the original context snapshot for the stale-result label and ignore responses after the form unmounts or the session changes.
