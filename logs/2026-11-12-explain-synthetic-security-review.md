# Agent Interaction Log

## User Prompt
Where are the synthetic test cases and how do I perform the test?

## Steps Taken
Read the complete prompt-injection-review.md case set and recording procedure plus current provider settings/transport. Distinguished manual UI/endpoint review from direct synthetic provider review and deterministic mocked tests.

## Reasoning Summary
The case set is a Markdown manual protocol, not an executable live-test runner. Testing through an isolated UI exercises authorization, saved context, quota and safe output. Resetting each case requires a fresh report because comments are append-only and report editing is not implemented. A safe502 alone does not reveal the raw model outcome, so application enforcement and model resistance must be recorded separately. Direct provider evaluation must preserve exact server instructions/settings and be labelled as not exercising application auth/quota.

## Changes Made
Created this required explanation log only. No app, test, review-case record, configuration or database changes.

## Verification
Read-only source inspection. No tests, provider calls, server launch, account provisioning or migrations executed.

## Final Output and Conclusion
Point to the review document and explain case groups, isolated local setup, fresh-report per-case workflow, example D01, quota handling, recording fields and safe502 interpretation. State that npm tests do not execute the live synthetic corpus and no automated live runner currently exists.
