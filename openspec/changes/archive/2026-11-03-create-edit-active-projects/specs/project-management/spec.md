# Spec Delta

## Purpose

Allow authenticated users to discover application projects and developers to maintain reliable project metadata, with unique names, safe concurrent edits, and attributable history.

## ADDED Requirements

### Requirement: Real integration replaces the temporary simulation
After real authentication and project persistence are verified, the application SHALL use the real session and repository without a sample-user selector, demo entry point, or simulated fallback. Shared functionality SHALL be preserved. Simulation helpers SHALL remain only as isolated support for identified automated tests; obsolete simulation code and usage instructions SHALL be removed.

#### Scenario: Integrated application uses real services
- **WHEN** a user opens the integrated project feature
- **THEN** the feature uses their actual authenticated identity and persisted project data
- **AND** no development identity selector or runtime simulation setting is available

#### Scenario: Service failure does not enable simulation
- **WHEN** authentication or persistence fails
- **THEN** the application reports or handles the failure without activating a sample identity or memory repository

#### Scenario: Cleanup preserves useful tests
- **WHEN** temporary simulation code is retired
- **THEN** shared project functionality and meaningful regression coverage remain
- **AND** each retained simulation helper has an identified test consumer and no application runtime dependency

### Requirement: Authenticated active-project browsing
The system SHALL allow authenticated testers and developers to browse active projects and view their name, description, repository URL, and history. Unauthenticated requests SHALL receive no project data. Empty, loading, missing-project, and read-failure states SHALL be distinguishable. This change SHALL NOT expose archived browsing or archive/restore controls.

#### Scenario: Both roles browse persisted projects
- **WHEN** an authenticated tester or developer opens the active-project browser and selects a project
- **THEN** the system displays its persisted metadata and history
- **AND** only the developer is offered create/edit actions

#### Scenario: Empty project collection
- **WHEN** an authenticated user opens the browser and no active projects exist
- **THEN** the system displays an empty state rather than a loading or error state

#### Scenario: Missing project
- **WHEN** an authenticated user requests a project ID that does not exist
- **THEN** the system displays a not-found result without presenting a blank edit form

#### Scenario: Unauthenticated read
- **WHEN** an unauthenticated caller requests project data or history directly
- **THEN** access is denied without returning that data

#### Scenario: Read failure
- **WHEN** project loading fails
- **THEN** the system reports the failure and allows retry rather than claiming no projects exist

### Requirement: Developer project creation
The system SHALL allow any authenticated developer to create a project representing one application with valid required metadata. The system SHALL assign a stable ID, creator identity, creation/update timestamps, initial revision, and active state. Testers and unauthenticated callers SHALL NOT create projects, including through direct persistence requests.

#### Scenario: Successful creation
- **WHEN** a developer submits valid metadata with an available name
- **THEN** an active project is persisted with that developer as creator and system-generated metadata
- **AND** it is discoverable by both roles and remains available after reload

#### Scenario: Tester attempts creation
- **WHEN** an authenticated tester directly submits a create request
- **THEN** the request is rejected and no project or history is created

#### Scenario: Visitor attempts creation
- **WHEN** an unauthenticated caller submits a create request
- **THEN** the request is rejected and no project or history is created

### Requirement: Required project name validation
The system SHALL trim surrounding whitespace from project names and accept names containing 1 through 100 characters after trimming, inclusive. It SHALL preserve display capitalization. Invalid names SHALL be rejected in the form and at the persistence boundary, without changing project data or history.

#### Scenario: Name boundaries
- **WHEN** otherwise valid metadata has a trimmed name of 1 or 100 characters
- **THEN** name length validation succeeds

#### Scenario: Blank name
- **WHEN** metadata has an empty or whitespace-only name
- **THEN** it is rejected with a name validation error

#### Scenario: Name exceeds limit
- **WHEN** metadata has a name of 101 characters after trimming
- **THEN** it is rejected with a name validation error

#### Scenario: Preserve capitalization
- **WHEN** a developer saves an available name entered as ` BugWatch `
- **THEN** the displayed and persisted name is `BugWatch`

### Requirement: Required plain-text description validation
The system SHALL trim surrounding whitespace from descriptions and require 1 through 5,000 characters after trimming, inclusive. Descriptions SHALL be displayed as plain text rather than interpreted markup. Invalid descriptions SHALL be rejected in the form and at the persistence boundary without mutations.

#### Scenario: Description boundaries
- **WHEN** otherwise valid metadata has a trimmed description of 1 or 5,000 characters
- **THEN** description length validation succeeds

#### Scenario: Blank description
- **WHEN** metadata has an empty or whitespace-only description
- **THEN** it is rejected with a description validation error

#### Scenario: Description exceeds limit
- **WHEN** metadata has a description of 5,001 characters after trimming
- **THEN** it is rejected with a description validation error

#### Scenario: Markup remains text
- **WHEN** a saved description contains HTML-like text
- **THEN** viewing the project displays that text without executing or rendering it as HTML

### Requirement: Required repository URL validation
The system SHALL require an absolute HTTP or HTTPS repository URL of at most 2,048 characters. Empty, malformed, relative, and other-scheme values SHALL be rejected in the form and at persistence. The system SHALL store the link without fetching it, checking repository existence, or requiring a particular repository host.

#### Scenario: Ordinary repository link
- **WHEN** otherwise valid metadata contains an absolute HTTP or HTTPS repository URL within the limit
- **THEN** URL validation succeeds without contacting the destination

#### Scenario: Empty repository URL
- **WHEN** metadata omits the URL or provides only whitespace
- **THEN** it is rejected with a repository URL validation error

#### Scenario: Unsupported URL form
- **WHEN** metadata contains a relative path, malformed URL, SSH-style address, or non-HTTP/HTTPS scheme
- **THEN** it is rejected with a repository URL validation error

#### Scenario: URL upper boundary
- **WHEN** an otherwise valid absolute HTTP/HTTPS URL contains exactly 2,048 characters
- **THEN** URL length validation succeeds

#### Scenario: URL exceeds limit
- **WHEN** an otherwise valid absolute HTTP/HTTPS URL contains 2,049 characters
- **THEN** it is rejected with a repository URL validation error

### Requirement: Globally unique normalized project names
The system SHALL enforce name uniqueness across active and archived projects using case-insensitive comparison after trimming surrounding whitespace. Creation and renaming SHALL reject a name held by another project with a clear duplicate-name result. Updating a project's own metadata without changing its normalized name SHALL be permitted.

#### Scenario: Equivalent name on creation
- **GIVEN** a project named `BugWatch` exists
- **WHEN** a developer attempts to create ` bugwatch `
- **THEN** the request fails as a duplicate without creating a project or history

#### Scenario: Rename to another project's name
- **WHEN** a developer renames a project to another project's normalized name
- **THEN** the save fails as a duplicate and the original project remains unchanged

#### Scenario: Retain own name
- **WHEN** a developer edits a project's description or only changes its name capitalization
- **THEN** its own normalized name does not cause a uniqueness failure

#### Scenario: Simultaneous equivalent names
- **WHEN** two developers concurrently create projects with equivalent normalized names
- **THEN** exactly one creation succeeds and the other receives a duplicate-name result

#### Scenario: Archived name remains reserved
- **GIVEN** an archived project exists in controlled test data
- **WHEN** a developer creates or renames another project to its normalized name
- **THEN** the operation fails as a duplicate

### Requirement: Shared developer editing of active projects
The system SHALL allow any authenticated developer to edit an active project's name, description, and repository URL regardless of creator. Testers and unauthenticated callers SHALL NOT edit projects. Archived projects SHALL reject metadata edits. These permissions SHALL be enforced beyond UI visibility.

#### Scenario: Another developer edits
- **WHEN** a developer saves valid changes to an active project created by another developer
- **THEN** the metadata is updated while its ID and creator remain unchanged

#### Scenario: Tester attempts editing
- **WHEN** a tester directly requests a project metadata update
- **THEN** the update is rejected with no project or history changes

#### Scenario: Archived project edit
- **GIVEN** controlled test data contains an archived project
- **WHEN** a developer requests a metadata update
- **THEN** the update is rejected without changes

### Requirement: Concurrent edits do not overwrite newer changes
Every edit SHALL be conditional on the revision originally loaded. If that revision is stale, the system SHALL reject the save, leave the newer project and history unchanged, and explain that the developer must reload current data before saving again. Each successful metadata change SHALL advance the revision.

#### Scenario: Two developers edit the same revision
- **GIVEN** two developers loaded the same project revision
- **WHEN** one saves changes and the other subsequently submits changes based on that revision
- **THEN** the second save is rejected as a conflict and cannot overwrite the first
- **AND** the second developer is instructed to reload before trying again

#### Scenario: Save after reload
- **WHEN** a developer reloads current metadata after a conflict and submits valid changes against the new revision
- **THEN** the save succeeds if no intervening update occurred

### Requirement: Atomic attributable project history
The system SHALL record creation and metadata edits with project identity, authenticated actor, system timestamp, and previous/new values for changed fields. Creation SHALL record initial values. Project mutations and their history SHALL commit or fail together. All authenticated users SHALL be able to read history; ordinary clients SHALL NOT forge or alter history.

#### Scenario: Creation history
- **WHEN** a project creation succeeds
- **THEN** its history contains the creator, creation time, and initial metadata

#### Scenario: Edit history
- **WHEN** a developer changes a project's description and repository URL
- **THEN** history records that actor and time with the previous/new values of those fields
- **AND** unchanged fields are not presented as changed

#### Scenario: History write fails
- **WHEN** history persistence fails during creation or editing
- **THEN** the entire operation fails and no partial project change is committed

#### Scenario: Forged history
- **WHEN** an ordinary client directly attempts to insert, modify, or delete a history entry
- **THEN** the request is rejected

### Requirement: History actors display names
Project history SHALL display each actor's current display name as plain text while retaining their stable ID in data. Name resolution SHALL expose only labels for actors referenced by the requested project's readable history, without granting general profile access. If no usable name exists, the UI SHALL show a meaningful unavailable-user label instead of a raw actor UUID.

#### Scenario: Another developer edited the project
- **WHEN** a tester or developer views history containing another developer's action
- **THEN** that entry shows the actor's display name rather than their UUID

#### Scenario: Actor names contain markup or are unavailable
- **WHEN** a history name contains markup-like text or is unavailable
- **THEN** markup is displayed as escaped text and an unavailable name uses a meaningful fallback

#### Scenario: Name lookup does not expose a profile directory
- **WHEN** a caller requests history labels
- **THEN** only actors referenced by that authorized project's history are returned, and unauthenticated access is denied

### Requirement: Protected metadata and no deletion
Project IDs, creator identities, timestamps, revisions, and archival state SHALL be system-managed and excluded from ordinary metadata inputs. The system SHALL reject client attempts to bypass those boundaries. Normal application users SHALL NOT delete projects. No membership, team, archive, or restore mutation SHALL be exposed by this feature.

#### Scenario: Tampered protected metadata
- **WHEN** a caller attempts to replace creator identity, timestamps, revision, or archival state through a direct project write
- **THEN** the attempt is rejected without modifying the project

#### Scenario: Project deletion
- **WHEN** a developer or tester requests project deletion directly
- **THEN** deletion is denied and the project and history remain intact

### Requirement: Explicit form save outcomes
The system SHALL distinguish validation, duplicate-name, conflict, authorization, and service failures. Save controls SHALL prevent repeat submissions while a request is pending. Cancel SHALL perform no mutation. Recoverable save failures SHALL retain entered values for correction or retry; session expiry SHALL delegate to the authentication prerequisite without persisting a project draft.

#### Scenario: Recoverable save failure
- **WHEN** a save fails due to validation, duplicate name, conflict, or service unavailability
- **THEN** entered values remain available and the appropriate error is displayed
- **AND** a conflict still requires reloading before another save

#### Scenario: Cancel editing
- **WHEN** a developer changes form values and cancels before saving
- **THEN** persisted metadata and history remain unchanged

#### Scenario: Pending save
- **WHEN** a save is in progress
- **THEN** further save submissions are blocked until that request finishes

#### Scenario: Session expires during editing
- **WHEN** the authentication prerequisite reports expiry or persistence rejects an expired session
- **THEN** the project feature stops authorized operations and returns control to the prerequisite's authentication flow
- **AND** no persistent project draft is created
