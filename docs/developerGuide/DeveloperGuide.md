---
  layout: default.md
  title: "Developer Guide"
  pageNav: 3
---

# BugWatch Developer Guide

This guide introduces the application setup, implementation, and development workflows. Choose a topic below for details.

## Topics

- [Authentication and account setup](Authentication.md): Identity migration, manual provisioning, and permission checks.
- [Multi-Agent Workflow](AgentWorkflow.md): Project agent roles, configuration, and coordination.
- [Project development and Supabase handoff](Projects.md): Project migrations, application contracts, isolated hosted tests, and integration status.
- [Bug report development](Reports.md): Report migration, permissions, and verification.
- [Continuous integration](ContinuousIntegration.md): Unit tests and documentation deployment workflows.

- [Mailbox development](Mailbox.md): Notification persistence, access, and verification.

## **Acknowledgements**

- The mockup specialist uses the standalone custom-agent format described in [official OpenAI subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents).

- Coverage setup follows the [Vitest coverage guide](https://main.vitest.dev/guide/coverage) and [coverage configuration reference](https://main.vitest.dev/config/coverage), using the V8 provider matched to the installed Vitest version.

- Shared client setup follows [Supabase JavaScript initialization](https://supabase.com/docs/reference/javascript/initializing), [Supabase API key guidance](https://supabase.com/docs/guides/getting-started/api-keys), and [Vite environment-variable documentation](https://vite.dev/guide/env-and-mode).
- The Tester assistant's server entry point follows [Vercel Node.js function guidance](https://vercel.com/docs/functions/runtimes/node-js). The provider transport follows the [SoCLaaS direct API guide](https://soclaas.comp.nus.edu.sg/guides/api.html).
- Developer assistant prompt-injection planning used [OWASP LLM01: Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) and the [OWASP LLM Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html).
- Project mutations follow [Supabase database function guidance](https://supabase.com/docs/guides/database/functions) and [row-level security guidance](https://supabase.com/docs/guides/database/postgres/row-level-security). Interaction tests use Testing Library and jsdom.
- The application workspace uses [Mantine](https://mantine.dev/) components and styling.
- The software-explanation skill adapts selected principles described by the [ASD-STE100 official FAQ](https://www.asd-ste100.org/STE_faq.html) and our observations of a [published CNA technology explainer](https://www.channelnewsasia.com/world/frontier-ai-anthropic-mythos-cybersecurity-risks-cna-explains-6103406). It does not claim full STE compliance or official CNA editorial rules; source-access limits are recorded with the skill.
- SQL hostname ContextJ validation follows [RFC 5892](https://www.rfc-editor.org/rfc/rfc5892#appendix-A), with generated Unicode property data from Python and [python-idna](https://github.com/kjd/idna); data versions and licensing references are recorded in the project development topic.
