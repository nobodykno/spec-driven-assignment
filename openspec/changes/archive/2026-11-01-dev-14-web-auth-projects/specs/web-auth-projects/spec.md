## ADDED Requirements

### Requirement: Register, login and logout pages
The web app SHALL provide register, login and logout with inline validation errors.

#### Scenario: Successful login [FR-UI-001]
- **WHEN** the user submits valid credentials on /login
- **THEN** the session is stored in memory and the user lands on /projects

#### Scenario: Inline validation errors [FR-UI-001]
- **WHEN** a form field is invalid or the server returns `VALIDATION_ERROR` or `INVALID_CREDENTIALS`
- **THEN** the message is shown next to the field or form

#### Scenario: Logout [FR-UI-001]
- **WHEN** the user logs out
- **THEN** the session is cleared and the app shows /login

### Requirement: Session handling
The access token SHALL be kept in memory, refreshed automatically on 401, and an unrecoverable session SHALL redirect to login.

#### Scenario: Automatic refresh [FR-UI-002]
- **WHEN** an API call returns 401 and refresh succeeds
- **THEN** the call is retried once with the new token

#### Scenario: Refresh fails [FR-UI-002]
- **WHEN** refresh fails
- **THEN** the session is cleared and the user is redirected to /login

#### Scenario: Protected page as guest [FR-AUTH-005]
- **WHEN** an unauthenticated user opens a protected page
- **THEN** they are redirected to /login

### Requirement: Projects page
The web app SHALL list, create, edit and archive projects.

#### Scenario: List and create [FR-UI-003]
- **WHEN** the user opens /projects and submits a valid new project
- **THEN** the project appears in the list

#### Scenario: Edit and archive [FR-UI-003]
- **WHEN** the Owner edits or archives a project
- **THEN** the list reflects the change, and API errors such as `PROJECT_ARCHIVED` are shown

### Requirement: Project members page
The Owner SHALL add and remove members; the controls SHALL be hidden for Members.

#### Scenario: Owner manages members [FR-UI-004]
- **WHEN** the Owner adds a member by email or removes one
- **THEN** the member list updates, and `USER_NOT_FOUND`, `ALREADY_MEMBER` and `LAST_OWNER` are shown as messages

#### Scenario: Member sees no owner controls [FR-UI-004]
- **WHEN** a Member views the project
- **THEN** edit, archive and member-management controls are not rendered

### Requirement: Loading, empty and error states
Every data view SHALL show loading, empty and error states.

#### Scenario: States [FR-UI-010]
- **WHEN** the projects query is loading, returns no items or fails
- **THEN** a loading indicator, an empty message or an error message with retry is shown
