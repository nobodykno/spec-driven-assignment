## ADDED Requirements

### Requirement: Create task
A project member SHALL create a task (title 1–200, description ≤ 5000, status TODO, priority default MEDIUM, optional future due date, optional member assignee).

#### Scenario: Valid task [FR-TASK-001]
- **WHEN** a member submits a valid task
- **THEN** it is created and the response is 201

#### Scenario: Assignee not a member [FR-TASK-001]
- **WHEN** the assignee is not a project member
- **THEN** the response is 400 `ASSIGNEE_NOT_MEMBER`

#### Scenario: Past due date [FR-TASK-001]
- **WHEN** the due date is in the past
- **THEN** the response is 400 `VALIDATION_ERROR`

#### Scenario: Non-member creates [FR-TASK-001]
- **WHEN** a non-member creates a task in the project
- **THEN** the response is 404 `NOT_FOUND`

#### Scenario: Archived project [FR-TASK-001]
- **WHEN** the project is archived
- **THEN** the response is 409 `PROJECT_ARCHIVED`

### Requirement: View task
A member SHALL view a task's full details.

#### Scenario: Member views [FR-TASK-002]
- **WHEN** a member requests a task
- **THEN** the response is 200 with assignee, creator and timestamps

#### Scenario: Missing or foreign task [FR-TASK-002]
- **WHEN** the task does not exist or the user is not a member
- **THEN** the response is 404 `NOT_FOUND`

### Requirement: Update task
A member SHALL update title, description, priority and due date.

#### Scenario: Valid update [FR-TASK-003]
- **WHEN** a member submits valid changes
- **THEN** the task is updated, `updatedAt` changes and the response is 200

#### Scenario: Archived task [FR-TASK-003]
- **WHEN** the task is archived
- **THEN** the response is 409 `TASK_ARCHIVED`

### Requirement: Assign task
A member SHALL assign a task to a project member or unassign it.

#### Scenario: Assign member [FR-TASK-004]
- **WHEN** the target is a project member
- **THEN** the assignee is updated, an activity event is emitted in the same transaction and the response is 200

#### Scenario: Assign non-member [FR-TASK-004]
- **WHEN** the target is not a project member
- **THEN** the response is 400 `ASSIGNEE_NOT_MEMBER`

### Requirement: Status transitions
Task status SHALL follow TODO→IN_PROGRESS; IN_PROGRESS→TODO, IN_REVIEW; IN_REVIEW→IN_PROGRESS, DONE; DONE→IN_PROGRESS.

#### Scenario: Allowed transition [FR-TASK-005]
- **WHEN** an allowed transition is requested
- **THEN** the status changes and an activity event with old and new status is emitted

#### Scenario: Disallowed transition [FR-TASK-005]
- **WHEN** TODO to DONE is requested
- **THEN** the response is 409 `INVALID_STATUS_TRANSITION` listing the allowed targets

### Requirement: Archive task
A member SHALL archive a task; archived tasks are read-only.

#### Scenario: Archive [FR-TASK-006]
- **WHEN** a member archives a task
- **THEN** `archivedAt` is set, an activity event is emitted and the response is 200

#### Scenario: Modify archived [FR-TASK-006]
- **WHEN** an archived task is updated
- **THEN** the response is 409 `TASK_ARCHIVED`

#### Scenario: Non-member archives [FR-TASK-006]
- **WHEN** a non-member archives a task
- **THEN** the response is 404 `NOT_FOUND`
