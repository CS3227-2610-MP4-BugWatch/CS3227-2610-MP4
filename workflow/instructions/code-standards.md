# Coding Standards

Read before writing or reviewing application code, tests, architecture, or dependency changes. These requirements also apply when the coordinator performs that work directly.

## Architecture and Design

Follow the architecture already established in the repository. Before introducing a new architectural pattern, inspect how similar functionality is implemented.

Maintain clear separation of responsibilities:

- Components should primarily handle presentation and user interaction.
- Business rules should not be embedded unnecessarily in presentation code.
- Persistence and data access concerns should remain separate from presentation concerns.
- Domain types and logic should represent application concepts and enforce appropriate invariants.
- Authentication and authorization checks, when implemented, must not depend solely on UI visibility or navigation restrictions.

Avoid unnecessary layers, hooks, services, repositories, factories, or utility modules unless they solve a concrete design problem. Prefer simple designs that satisfy current requirements.

## TypeScript and React Coding Standards

The configured ESLint rules and TypeScript compiler settings are the executable source of truth for automatically enforceable requirements. Follow consistent conventions in existing code where these tools do not specify a rule.

- Use descriptive component, function, type, and variable names.
- Keep components and functions focused on a single responsibility.
- Follow React's Rules of Hooks and the configured React Hooks lint rules.
- Keep state updates immutable and follow existing state-management patterns.
- Avoid excessive function length, deeply nested control flow, and duplicated logic.
- Prefer clear code over unnecessarily clever code.
- Avoid magic numbers and unexplained string literals where a named constant is appropriate.
- Use appropriate types; do not bypass type checking merely to make verification pass.
- Keep module exports limited to what consumers require.
- Avoid mutable global state.
- Do not leave commented-out code or temporary debugging output.
- Remove unused imports and variables.
- Handle errors deliberately rather than silently ignoring them.

Do not suppress TypeScript or ESLint diagnostics simply to make verification pass.

## Dependencies

Before adding a dependency:

1. Check whether the functionality can reasonably be implemented using browser APIs, JavaScript/TypeScript facilities, React, or an existing project dependency.
2. Verify compatibility with the project's installed tooling and declared runtime requirements.
3. Prefer actively maintained and established libraries.
4. Add only the packages actually required.

Do not introduce dependencies merely to avoid implementing trivial functionality. Do not remove or upgrade unrelated dependencies unless required by the task. Keep `package.json` and `package-lock.json` consistent.

Mention significant new dependencies in the final task summary.
