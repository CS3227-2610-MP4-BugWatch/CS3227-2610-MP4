---
  layout: default.md
  title: "Developer Guide"
  pageNav: 3
---

# BugWatch Developer Guide

BugWatch uses React, TypeScript, Vite and Mantine for the browser, Supabase Auth and PostgreSQL for identity and persistence, and server-side API functions for SoCLaaS requests. Database permissions and transactions enforce ownership and state rules beyond the UI.

## Design references

- [Application architecture](developerGuide/Architecture.md)
- [Use cases](developerGuide/UseCases.md)
- [User stories](developerGuide/UserStories.md)

## Setup and implementation

- Start with the [README](../README.md) for Node.js 24, locked npm installation, environment configuration and local startup.
- Follow [authentication setup](developerGuide/Authentication.md) for accounts, profiles and the identity migration.
- Read [project development](developerGuide/Projects.md) for project storage, access boundaries and isolated test configuration.
- Read [report development](developerGuide/Reports.md) for migrations through 014, RPC contracts, AI endpoints, quotas, security and report/database verification.
- Read [mailbox development](developerGuide/Mailbox.md) for notification persistence and per-user access.

Keep development/test and production Supabase environments separate. Provider and service-role secrets stay server-side. The assistants accept only their allowed context, and suggestions do not automatically submit reports or post messages.

## Engineering workflow and verification

- [Agent workflow](developerGuide/AgentWorkflow.md) describes OpenSpec, specialist ownership, shared contracts, review, explanations, coverage and evidence collection.
- [Continuous integration](developerGuide/ContinuousIntegration.md) distinguishes unit-test checks from documentation deployment and separate database/manual checks.
- Run `npm run test -- --run`, `npm run lint`, `npm run build` and `npm run docs:build` from the repository root. Database and browser checks have separate prerequisites and evidence.
- [Release plans](../release-planning/shared-features.md) distinguish delivered scope from planned features. Tester retest/closure/return-to-investigation is deferred; this documentation does not authorize its implementation.

## Acknowledgements

- The mockup specialist uses the standalone custom-agent format described in [official OpenAI subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents).

- Coverage setup follows the [Vitest coverage guide](https://main.vitest.dev/guide/coverage) and [coverage configuration reference](https://main.vitest.dev/config/coverage), using the V8 provider matched to the installed Vitest version.

- Shared client setup follows [Supabase JavaScript initialization](https://supabase.com/docs/reference/javascript/initializing), [Supabase API key guidance](https://supabase.com/docs/guides/getting-started/api-keys), and [Vite environment-variable documentation](https://vite.dev/guide/env-and-mode).
- The Tester assistant's server entry point follows [Vercel Node.js function guidance](https://vercel.com/docs/functions/runtimes/node-js). The provider transport follows the [SoCLaaS direct API guide](https://soclaas.comp.nus.edu.sg/guides/api.html).
- Developer assistant prompt-injection planning used [OWASP LLM01: Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) and the [OWASP LLM Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html).
- Project mutations follow [Supabase database function guidance](https://supabase.com/docs/guides/database/functions) and [row-level security guidance](https://supabase.com/docs/guides/database/postgres/row-level-security). Interaction tests use Testing Library and jsdom.
- The application workspace uses [Mantine](https://mantine.dev/) components and styling.
- The software-explanation skill adapts selected principles described by the [ASD-STE100 official FAQ](https://www.asd-ste100.org/STE_faq.html) and our observations of a [published CNA technology explainer](https://www.channelnewsasia.com/world/frontier-ai-anthropic-mythos-cybersecurity-risks-cna-explains-6103406). It does not claim full STE compliance or official CNA editorial rules; source-access limits are recorded with the skill.
- SQL hostname ContextJ validation follows [RFC 5892](https://www.rfc-editor.org/rfc/rfc5892#appendix-A), with generated Unicode property data from Python and [python-idna](https://github.com/kjd/idna); data versions and licensing references are recorded in the project development topic.
