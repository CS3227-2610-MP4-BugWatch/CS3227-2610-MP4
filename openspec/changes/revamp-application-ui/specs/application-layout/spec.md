# Spec Delta

## Purpose

Provide a consistent, responsive interface that helps authenticated BugWatch users navigate and understand the currently available project, report, and draft workflows.

## ADDED Requirements

### Requirement: Authenticated workspace frame
The system SHALL present authenticated pages in a shared workspace with a sidebar, a header showing the current user's display name and role, and a Log out action. The active page SHALL have a clear title and main content area.

#### Scenario: Tester opens the workspace
- **WHEN** an authenticated tester opens the project browser
- **THEN** the workspace shows the tester's identity and role, a Projects destination, a My drafts destination, and the project page title

#### Scenario: Developer opens the workspace
- **WHEN** an authenticated developer opens the project browser
- **THEN** the workspace shows the developer's identity and role, a Projects destination, and the project page title
- **AND** it does not show My drafts

#### Scenario: Session ends
- **WHEN** an authenticated user's session ends or the user logs out
- **THEN** protected workspace navigation and content disappear and the login screen is shown

### Requirement: Responsive and operable navigation
The system SHALL keep workspace navigation visible in a sidebar on wide screens and make the same available destinations reachable through a collapsible menu on narrow screens. Navigation controls SHALL remain operable by keyboard and communicate their current or expanded state.

#### Scenario: Wide viewport
- **WHEN** an authenticated user views the workspace at a desktop width
- **THEN** the available destinations are visible in the sidebar without opening a menu

#### Scenario: Narrow viewport
- **WHEN** an authenticated user views the workspace at a narrow width
- **THEN** a menu control exposes the same available destinations without covering the page permanently

#### Scenario: Keyboard navigation
- **WHEN** a user operates the menu and destinations with a keyboard
- **THEN** they can open or close the menu and reach an available destination with visible focus and an announced current or expanded state

### Requirement: Current destinations only
The workspace SHALL display navigation destinations only for implemented features available to the user's role. It SHALL NOT display inactive links or placeholders for future capabilities.

#### Scenario: Tester destinations
- **WHEN** a tester views the workspace navigation
- **THEN** Projects and My drafts are available
- **AND** links for unimplemented mailbox, profiles, dashboards, or other planned capabilities are absent

#### Scenario: Developer destinations
- **WHEN** a developer views the workspace navigation
- **THEN** Projects is available and My drafts is absent
- **AND** links for unimplemented capabilities are absent

### Requirement: Project-local navigation and actions
The system SHALL retain project Overview and Reports as project-local views with shareable URLs. The project page SHALL show role-appropriate primary actions for an active project and identify the selected view.

#### Scenario: Project overview entry
- **WHEN** an authenticated user opens `/projects/:projectId`
- **THEN** Overview is selected and the project's metadata and history remain available

#### Scenario: Project reports deep link
- **WHEN** an authenticated user opens `/projects/:projectId?tab=reports` directly
- **THEN** Reports is selected and that project's submitted reports remain available

#### Scenario: Role-specific project action
- **WHEN** a tester or developer views an active project
- **THEN** the tester can find Report bug and the developer can find Edit project
- **AND** neither role is shown the other's action

### Requirement: Readable current workflows
The interface SHALL visually group related information and place existing actions and feedback near the content they affect across login, projects, project editing, report creation and editing, drafts, and report details. Restyling SHALL preserve all current fields, links, and observable outcomes.

#### Scenario: Report form with unsaved input
- **WHEN** a tester fills a report form and receives a recoverable save error
- **THEN** the entered fields and error remain visible and the user can correct or retry without losing input

#### Scenario: Draft resume
- **WHEN** a tester opens a saved draft
- **THEN** its saved fields, Save draft, Submit report, and applicable unsaved-change warning remain available

#### Scenario: Report detail and history
- **WHEN** an authenticated user opens a saved report
- **THEN** its title, key status information, report fields, breadcrumb, and creation history remain readable and reachable

#### Scenario: Load and empty states
- **WHEN** a project, report list, draft list, or detail view is loading, empty, missing, or fails to load
- **THEN** the applicable existing status, empty message, not-found message, or retry action remains distinguishable

### Requirement: Quiet and legible presentation
The interface SHALL use a restrained visual hierarchy with legible text, clear action emphasis, and distinguishable report state and severity text. Status meaning SHALL not depend on color alone.

#### Scenario: Report summary at desktop width
- **WHEN** a user reads a report listing on a wide screen
- **THEN** title, project, severity, state, assignee, and reporter remain identifiable

#### Scenario: Report summary at narrow width
- **WHEN** a user reads a report listing on a narrow screen
- **THEN** the same report information and title link remain reachable without horizontal clipping of essential actions

#### Scenario: State and severity labels
- **WHEN** a user reads a report summary or detail
- **THEN** state and severity are identifiable from text as well as any visual treatment
