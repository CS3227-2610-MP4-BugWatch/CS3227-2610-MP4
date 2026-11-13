---
  layout: default.md
  title: "Developer Guide"
  pageNav: 3
---

# BugWatch Developer Guide

BugWatch uses React, TypeScript, Vite and Mantine for the browser, Supabase Auth and PostgreSQL for identity and persistence, and server-side API functions for SoCLaaS requests. Database permissions and transactions enforce ownership and state rules beyond the UI.

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

Sources for reused libraries, code, designs and workflow ideas are maintained in the [detailed Developer Guide acknowledgements](developerGuide/DeveloperGuide.md#acknowledgements). The existing [developer topic index](developerGuide/DeveloperGuide.md) remains available.
