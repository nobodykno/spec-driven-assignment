## ADDED Requirements

### Requirement: Task create and edit forms
The web app SHALL provide task create and edit forms; status changes SHALL only offer allowed transitions.

#### Scenario: Create and edit [FR-UI-007]
- **WHEN** a member submits a valid task form
- **THEN** the task is created or updated and the views refresh

#### Scenario: Validation and server errors [FR-UI-007]
- **WHEN** a field is invalid or the API returns `ASSIGNEE_NOT_MEMBER`, `TASK_ARCHIVED` or `PROJECT_ARCHIVED`
- **THEN** the error is shown on the form

#### Scenario: Allowed transitions only [FR-UI-007]
- **WHEN** a task is TODO
- **THEN** the status control offers only TODO and IN_PROGRESS

### Requirement: Comments section
The task page SHALL let members add comments and let authors edit and Owners or authors delete them, following permissions.

#### Scenario: Add comment [FR-UI-008]
- **WHEN** a member submits a valid comment
- **THEN** it appears in the list

#### Scenario: Buttons follow permissions [FR-UI-008]
- **WHEN** the viewer is not the author and not an Owner
- **THEN** edit and delete buttons are not rendered; an Owner sees delete but not edit on others' comments

#### Scenario: Edited indicator and API error [FR-UI-008]
- **WHEN** a comment has `editedAt`, or the API returns 403
- **THEN** an "edited" label is shown, or the error message is displayed

### Requirement: Activity timeline
The task page SHALL show the activity history as a timeline.

#### Scenario: Timeline entries [FR-UI-009]
- **WHEN** a task has activity
- **THEN** entries show actor, action, time and change details, newest first

#### Scenario: Empty or failed [FR-UI-009]
- **WHEN** there is no activity or the request fails
- **THEN** an empty message or an error with retry is shown

### Requirement: Loading, empty and error states
Every new data view SHALL show loading, empty and error states.

#### Scenario: States [FR-UI-010]
- **WHEN** comments or activity are loading, empty or failing
- **THEN** the matching state is rendered
