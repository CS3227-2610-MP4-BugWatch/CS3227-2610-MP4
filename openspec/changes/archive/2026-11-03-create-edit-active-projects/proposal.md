# Proposal

## Why

Developers need to establish the applications that testers will report against and correct project metadata as it changes. BugWatch currently renders only a heading, so project creation, browsing, editing, and persistence must be introduced before the reporting workflow can use projects.

## What Changes

- The completed development-only simulation was a temporary implementation stage. After real authentication and project persistence are integrated and verified, remove its session selector, demo shell, launch settings and unused memory implementation. Preserve shared project code and only test doubles with concrete remaining test consumers; no runtime simulation or service-failure fallback remains in the final feature.
- Add an authenticated active-project browser and project details, with developer-only creation and editing of any active project, regardless of creator.
- Require a trimmed name of 1–100 characters, trimmed plain-text description of 1–5,000 characters, and an absolute HTTP/HTTPS repository URL of at most 2,048 characters. Store links without repository verification or synchronization.
- Enforce globally unique project names using case-insensitive comparison after trimming; preserve display capitalization. Archived projects retain their names.
- Persist stable project identity, creator, timestamps, and a concurrency revision. Reject stale edits instead of overwriting another developer's changes.
- Record creation and field-change history, including actor/time and previous/new values, readable by all authenticated users. Resolve history actors to current display names through a project-scoped lookup without broadening profile access; retain stable actor IDs. Save project mutations and history atomically.
- Enforce permissions and validation at the database boundary, not only through UI controls. Prevent deletion and changes to protected metadata.
- Consume authentication and permanent roles from a separately delivered prerequisite. Do not implement login, logout, account provisioning, session policies, or role management here.
- Document the implemented project workflow and persistence/security setup, and verify validation, permissions, uniqueness races, stale saves, and history consistency.

## Capabilities

### New Capabilities

- `project-management`: Authenticated project browsing, developer creation and active-project editing, validated unique metadata, concurrent-edit protection, and atomic project history.

### Modified Capabilities

None. The OpenSpec capability inventory is currently empty. This change captures C-09/C-32 and section 5 of `BugWatch.md`, plus the product owner's decisions from exploration: input limits and URL rules, normalized name uniqueness across active/archived projects, stale-save rejection, and project history. The main specification defers validation limits and explicitly enumerates report history; these approved project-specific decisions resolve those gaps without changing unrelated requirements.

## Impact

- Application: introduce project-specific React/TypeScript code under `src/features/projects/`, integrate with the existing application entry point and installed router, and consume the authentication prerequisite's identity/client interfaces.
- Persistence: add versioned Supabase database migrations under an existing top-level directory (`src/features/projects/database/`) for projects, history, validation, permissions, and atomic mutation operations. No infrastructure provisioning or deployment is authorized.
- Dependencies: reuse the Supabase client supplied by the authentication prerequisite; do not introduce a second client or identity implementation. Vitest exists, but browser/component test tooling is not currently configured.
- Tests: add deterministic Vitest tests under `src/test/*.test.ts`, plus controlled database integration coverage for security and transactional guarantees.
- Documentation: add focused project usage and architecture/setup topics, with MarkBind navigation and landing-page links.
- Exclusions: archive/restore actions and archived browsing, project deletion, memberships/teams, report workflows, project drafts, repository access, and authentication implementation. Store archival state only to preserve the active-edit boundary and future name reservation.
- Delivery dependency: real Supabase integration and release remain blocked until separate authentication provides trusted identities/roles and a configured database. Local feature development can proceed against the approved simulation. The development adapter does not satisfy real persistence, database security, concurrency, or transaction-verification requirements.
- Record proposed schema/table/column/RPC names and fixture labels in `docs/developerGuide/Projects.md`, distinguishing assumptions from deployed infrastructure. Reconcile these names with the authentication teammate before backend integration.
