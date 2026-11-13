---
  layout: default.md
  title: "Application architecture"
  pageNav: 3
---

# Application architecture

BugWatch is a React and TypeScript single-page application built with Vite. Its browser application uses Supabase for authentication and persistent project and report data. Two server endpoints provide optional AI assistance through SoCLaaS. This page describes the current codebase; the feature-specific guides contain detailed contracts and migration instructions.

## System overview

The application has three execution boundaries: the browser, BugWatch's AI server endpoints, and external services. Ordinary project and report operations use the shared browser Supabase client. AI requests use a separate server path that protects provider credentials and validates access before generation.

| Component | Responsibility | Main source locations |
| --- | --- | --- |
| Browser application | Presents workflows, manages session and local interaction state, validates inputs, and invokes data and AI adapters. | `src/main.tsx`, `src/App.tsx`, `src/features/`, `src/shared/` |
| Supabase Auth | Authenticates provisioned accounts and manages sessions. | Browser adapter: `src/features/auth/authService.ts` |
| Supabase PostgreSQL and data API | Persists profiles, projects, reports, drafts, comments, history, and AI quota records; enforces access and transactional business rules. | SQL migrations under each feature's `database/` directory |
| AI server endpoints | Verify user identity and eligibility, assemble permitted context, reserve quota, and validate generated results. | `api/tester/report-suggestions.ts`, `api/developer/tester-questions.ts` |
| SoCLaaS | Generates report suggestions and follow-up questions using server-supplied context. | Server transport: `api/_lib/_soclaas.ts` |

The main request paths are:

```text
Browser application
  -> shared Supabase client -> Supabase Auth
  -> feature repositories -> shared Supabase client -> Supabase data API / PostgreSQL
  -> AI clients -> BugWatch AI endpoints -> SoCLaaS
                                       -> Supabase (identity, context, quota)
```

The AI endpoints supplement the direct Supabase integration. They do not mediate ordinary project and report saves.

## Browser composition and feature modules

### Entry point and workspace

`src/main.tsx` loads global styles and mounts React in Strict Mode. `App.tsx` supplies the shared Mantine theme and lazily loads `AuthenticatedApp`. Mantine provides application UI components; React Router handles client-side navigation.

`AuthenticatedApp` composes authentication, the concrete project and report repositories, and the authenticated router. It shows protected content only after the session and application profile have been resolved. `ProjectsApp` supplies project, draft, and report routes within `WorkspaceShell`. Despite its name, it hosts the complete authenticated workspace. The shell provides shared navigation and logout presentation without querying repositories itself.

| Module | Responsibility |
| --- | --- |
| `src/features/auth/` | Login, identity validation, session lifecycle, and authentication context. |
| `src/features/projects/` | Project browsing, creation, editing, history, project contracts, and Supabase adaptation. |
| `src/features/reports/` | Report submission, private drafts, discussion, investigation, resolution, canonical references, and both browser AI integrations. |
| `src/shared/components/` | Components shared across features, including the workspace shell. |
| `src/shared/lib/` | The single shared browser Supabase client and its TypeScript declaration. |
| `src/shared/types/` | Shared contracts, including `SessionUser`. |

### Feature contracts and adapters

Feature pages receive repository interfaces and the current user through their composition layer. Feature `types.ts` and `validation.ts` files define data contracts and reusable validation. Repository adapters map those contracts to database calls, decode responses, and translate failures into application errors. This keeps Supabase queries out of the presentation components and allows tests to supply repository substitutes.

## Authentication and authorization

### Identity and session lifecycle

`AuthProvider` exposes the state managed by `authSession.ts`. The session controller coordinates restoration, sign-in, sign-out, authentication events, and identity retries. `authService.ts` reads the signed-in account's protected `profiles` record and validates it before producing a `SessionUser` with a Tester or Developer role. Application identity is derived from that profile rather than editable authentication metadata.

Session loss or logout removes protected content and unsaved local state. Session refresh events for the same authenticated account preserve mounted content. Repository errors classified as unauthenticated trigger identity re-resolution; ordinary storage failures do not automatically sign the user out.

### Server and database enforcement

Browser role checks govern available workflows, while database permissions enforce access independently. Database functions derive the actor from `auth.uid()` and read the trusted profile. Row-level security, restricted grants, and function checks prevent callers from bypassing ownership, role, assignment, active-project, and report-state rules by invoking the data API directly. AI endpoints independently verify the bearer token and role before using their server privileges.

See [Authentication and account setup](Authentication.md) for provisioning and session details.

## Persistence and consistency

### Shared client and migrations

The shared client in `src/shared/lib/supabaseClient.js` is initialized from the browser's Supabase URL and publishable key. Project and report adapters use this client for authorized reads and database function calls, also called RPCs. SQL migrations live beside the relevant feature and must be applied in dependency order in each target environment.

### Data relationships

The core data relationships are:

- A Supabase Auth account has a corresponding application profile.
- A project has submitted reports and project history.
- A report references its reporting Tester and, after acceptance, its assigned Developer. It has discussion comments and report history; resolution data and a canonical report reference are stored with the report.
- A private draft belongs to one Tester and references a project. Draft submission receipts support returning the existing report when the same draft submission is retried.
- Separate Tester and Developer quota records support the two AI assistants.

### Transactions and concurrent changes

Writes that require coordinated changes run inside PostgreSQL functions. For example, accepting a report updates its state, assignee, assignment time, and history atomically. Project edits check an expected revision to detect stale saves. Report transitions check current state and assignment under database locks. These checks prevent a browser's stale view from silently replacing newer work.

### Validation and readback

Validation in the browser provides prompt feedback; database validation remains authoritative. After confirmed saves or conflicts, pages read back current data. An uncertain report mutation is not automatically repeated: the user is asked to inspect the saved report and history first. Report details, discussion, and activity use separate read states so a secondary read failure need not hide the report itself.

See [Project development](Projects.md) and [Report development](Reports.md) for schema, RPC, error, and migration details.

## AI assistance boundary

Browser hooks manage pending requests, cancellation, temporary suggestions, and user review. Browser AI clients send authenticated HTTP requests to these endpoints:

| Endpoint | Context and result |
| --- | --- |
| `POST /api/tester/report-suggestions` | Accepts permitted in-progress report details and a project ID; loads project context and returns suggested report text and questions about missing details. |
| `POST /api/developer/tester-questions` | Accepts a report ID; loads the saved report and complete discussion using the user's permissions and returns suggested follow-up questions with a context version. |

### Server dependencies and credentials

The server dependency modules in `api/_lib/` provide authentication, context access, quota reservation, and provider transport. User-scoped Supabase clients perform context reads; a separate service-role client reserves quota through restricted database functions. The provider API key and Supabase service-role key remain server-side. Only publishable Supabase configuration belongs in browser-exposed variables.

### Generation and user review

The two assistants share the SoCLaaS transport but have separate prompts, eligibility rules, and quotas. The Developer endpoint also rechecks report eligibility after generation. Generated output is validated before being returned. Suggestions remain advisory: generating them does not submit a report, post a comment, or change a report's state. Users review and apply or post content through the ordinary workflows.

See the AI assistant sections in [Report development](Reports.md) for configuration, bounds, security limitations, and verification status.

## Runtime and deployment

### Local development

During local development, `npm run dev` starts Vite. The custom middleware in `vite.config.ts` runs the same AI endpoint modules for `/api/tester/report-suggestions` and `/api/developer/tester-questions`, alongside the browser development server.

### Application hosting

The repository supplies Vercel-compatible server endpoint entry points and `vercel.json` rewrites for direct project, report, and draft URLs. `npm run build` type-checks the application and creates the Vite browser bundle. Hosting must also execute the AI server endpoints if AI assistance is enabled; serving the static bundle alone does not provide those endpoints.

Supabase configuration, server secrets, feature flags, account provisioning, and database migrations must be configured for the target environment separately.

### Documentation hosting

MarkBind builds the guide site through `npm run docs:build`. This documentation site is separate from the React application and its data services.

## Verification structure

Vitest tests live in `src/test/*.test.ts` and cover validation, repositories, authentication, React interactions, and API handlers with controlled dependencies. Dedicated database runners and opt-in database tests verify permissions, transactions, and concurrency against configured test environments. Local mocked tests alone do not establish the configuration of a hosted database or the behavior of a live AI provider.

The repository's required checks are described in the feature guides and [Continuous integration](ContinuousIntegration.md). This overview introduces no new application components or deployment changes.
