# authentication Specification

## Purpose

Authenticate pre-created BugWatch accounts and expose trusted, permanent tester or developer identities to protected application features.

## Requirements

### Requirement: Pre-created account login
The system SHALL authenticate pre-created tester and developer accounts using Supabase Auth email and password. It SHALL provide no public registration or role-selection action.

#### Scenario: Valid tester login
- **WHEN** a pre-created tester supplies the correct email and password
- **THEN** the account is authenticated and the application resolves its tester identity

#### Scenario: Valid developer login
- **WHEN** a pre-created developer supplies the correct email and password
- **THEN** the account is authenticated and the application resolves its developer identity

#### Scenario: Invalid credentials
- **WHEN** a user supplies an incorrect email or password
- **THEN** protected application content remains inaccessible and the login attempt reports failure

#### Scenario: Login service failure
- **WHEN** the authentication service is unavailable during login
- **THEN** protected content remains inaccessible and the user can retry without an assigned role

### Requirement: Permanent trusted identity
Each authenticated application account SHALL have one administrator-set profile linked to its Auth identity, containing a fixed username, display name, and exactly one permanent role of tester or developer. The application SHALL derive the role from this protected profile.

#### Scenario: Trusted profile resolution
- **WHEN** an authenticated account has a valid matching profile
- **THEN** its Auth ID, username, display name, and permanent role are available to application features

#### Scenario: User attempts role manipulation
- **WHEN** an ordinary authenticated user attempts to create, change, or delete a profile or alter role or username through a direct persistence request
- **THEN** the request is denied and the stored identity remains unchanged

#### Scenario: Client presents a different role
- **WHEN** a caller presents a role or actor ID that differs from its authenticated identity
- **THEN** authorization uses the trusted identity and rejects actions that role cannot perform

### Requirement: Unique fixed usernames
Profile usernames SHALL be unique using case-insensitive comparison. Ordinary users SHALL NOT change usernames.

#### Scenario: Distinct usernames
- **WHEN** an administrator creates two profiles with different usernames ignoring case
- **THEN** both profiles can be stored

#### Scenario: Case-insensitive collision
- **WHEN** a profile already has username `Alice` and an administrator attempts to create another with `alice`
- **THEN** the second profile is rejected as a duplicate

### Requirement: Incomplete account setup blocks access
An Auth account with no valid matching profile SHALL NOT enter the protected application or receive a default role. The application SHALL show "Account setup incomplete—contact the administrator."

#### Scenario: Missing profile
- **WHEN** a valid Auth account has no matching application profile
- **THEN** protected application access is blocked and the setup-incomplete message is shown

#### Scenario: Invalid profile
- **WHEN** a valid Auth account has a profile with a missing required field or unrecognized role
- **THEN** protected application access is blocked and the setup-incomplete message is shown

### Requirement: Session restoration and logout
The application SHALL restore a valid authenticated session on reload, allow both roles to log out, and clear protected in-memory feature state when the session ends.

#### Scenario: Reload with valid session
- **WHEN** a tester or developer reloads the application with a valid session and valid profile
- **THEN** the application restores that same identity after a loading state

#### Scenario: Reload without session
- **WHEN** the application loads without an authenticated session
- **THEN** it presents login without exposing protected content

#### Scenario: Logout
- **WHEN** an authenticated tester or developer logs out
- **THEN** its session ends, protected feature state is cleared, and login is shown

#### Scenario: Session loss
- **WHEN** authentication reports the session has ended or an authorized request is rejected because the session is no longer valid
- **THEN** protected feature state is cleared and the application returns to login

#### Scenario: Identity lookup fails transiently
- **WHEN** a valid session exists but its profile cannot be loaded because the service is unavailable
- **THEN** protected content remains blocked and the user can retry identity loading without receiving a default role

### Requirement: Administrator-only account setup
Account creation and profile assignment SHALL be performed by an administrator outside the normal application workflow. The application SHALL NOT expose public signup, a provisioning script, or an administrator interface in this feature.

#### Scenario: Public signup attempt
- **WHEN** an unauthenticated visitor attempts to register through the application or the public Auth signup endpoint
- **THEN** no account is created

#### Scenario: Manual completed setup
- **WHEN** an administrator creates an Auth account and matching valid profile through the Supabase dashboard
- **THEN** that user can log in with its assigned permanent role
