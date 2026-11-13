# Tasks

## 1. Baseline and live integration decisions

- [x] 1.1 Coordinator confirms the report form and drafts baseline, records ownership and the agreed contract in the workflow record, and verifies that BugWatch.md and the release plans match the Tester-only context exception.
- [ ] 1.2 Coordinator confirms the chat-capable SoCLaaS model, upstream budget and shared limits, provider retention, and isolated preview configuration before enabling live requests. Record the decisions and verify with a minimal preview request using synthetic input.

## 2. Protected generation endpoint

- [x] 2.1 Implementer owns the shared suggestion DTO, Vercel endpoint, server-only SoCLaaS transport, and Supabase quota migration. Verify with the endpoint and database cases in 2.2.
- [x] 2.2 Tester owns `src/test/report-suggestions-api.test.ts` and the quota integration cases. Verify identity and role denial, active-project validation, exact outbound field allowlist, concurrent requests and the rolling cutoff, timeout and upstream errors, mixed valid and invalid entries, wholly unusable output, and adversarial project and report data. Use deterministic provider responses for contract tests.
- [x] 2.3 Documentation writer updates the existing report developer guide with server configuration, data and secret boundaries, quota, and failure verification. Verify the MarkBind build.

## 3. Report form integration

- [x] 3.1 Implementer owns report UI and authenticated client wiring. Reuse the report form for new reports and drafts, with generation, editable suggestions, per-field apply, regeneration confirmation, stale-result label, and numbered questions. Verify against 3.2.
- [x] 3.2 Tester owns `src/test/report-suggestions-ui.test.ts` and affected auth regression tests. Verify prerequisites, independent draft writes, per-field application, regeneration failure, concurrent edits, quota feedback, and transient assistant state on save, submit, navigation, and account change.
- [x] 3.3 Documentation writer updates the existing report user guide with the actual assistant workflow. Verify the MarkBind build.

## 4. Integrated verification and review

- [x] 4.1 Coordinator runs the full Vitest suite, lint, build, MarkBind, strict OpenSpec validation, and diff checks. Record actual results and any skips.
- [x] 4.2 Independent reviewer explicitly decides every implementer and tester submission and reviews the final combined change. Record each approval or request for changes and re-review fixes.
- [ ] 4.3 Coordinator prepares the PR against development and verifies signed-in Vercel preview behavior using an isolated account and synthetic report data. Separately evaluate usefulness, missing-details questions, unsupported claims, and adversarial content on representative examples. Record observations and evidence for MP4.
