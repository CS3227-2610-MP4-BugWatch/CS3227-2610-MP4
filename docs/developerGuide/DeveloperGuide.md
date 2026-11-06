---
  layout: default.md
  title: "Developer Guide"
  pageNav: 3
---

# ProjectEx Developer Guide

--------------------------------------------------------------------------------------------------------------------

## Introduction

Welcome to the Developer Guide. This guide helps developers understand the architecture, setup, and development workflows of our software, serving as your starting point and companion.

## Purpose of this Guide
The main objectives of this guide are to:

1. Orient new developers to the software's architecture and codebase structure.
1. Provide a comprehensive reference for the development practices, coding standards, and tools used.
1. Detail the setup process for a development environment.



## Topics

- [Authentication and account setup](Authentication.md): Identity migration, manual provisioning, and permission checks.
- [Multi-Agent Workflow](AgentWorkflow.md): Project agent roles, configuration, and coordination.
- [Project development and Supabase handoff](Projects.md): Project migrations, application contracts, isolated hosted tests, and integration status.
- [Bug report development](Reports.md): Report migration, permissions, and verification.
- [Continuous integration](ContinuousIntegration.md): Unit test workflow for pushes to development and master.

## **Acknowledgements**

_{ List and link sources of all reused/adapted ideas, code, documentation, and third-party libraries }_

- Shared client setup follows [Supabase JavaScript initialization](https://supabase.com/docs/reference/javascript/initializing), [Supabase API key guidance](https://supabase.com/docs/guides/getting-started/api-keys), and [Vite environment-variable documentation](https://vite.dev/guide/env-and-mode).
- Project mutations follow [Supabase database function guidance](https://supabase.com/docs/guides/database/functions) and [row-level security guidance](https://supabase.com/docs/guides/database/postgres/row-level-security). Interaction tests use Testing Library and jsdom.
- SQL hostname ContextJ validation follows [RFC 5892](https://www.rfc-editor.org/rfc/rfc5892#appendix-A), with generated Unicode property data from Python and [python-idna](https://github.com/kjd/idna); data versions and licensing references are recorded in the project development topic.
