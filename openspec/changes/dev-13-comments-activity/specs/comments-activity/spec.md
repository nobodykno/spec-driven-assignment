## ADDED Requirements

### Requirement: Add comment
A member SHALL add a 1–2000 character comment to a non-archived task.

#### Scenario: Valid comment [FR-CMT-001]
- **WHEN** a member adds a valid comment
- **THEN** it is saved with author and timestamp and the response is 201

#### Scenario: Invalid body [FR-CMT-001]
- **WHEN** the body is empty or longer than 2000 characters
- **THEN** the response is 400 `VALIDATION_ERROR`

#### Scenario: Non-member or archived [FR-CMT-001]
- **WHEN** a non-member comments, or the task is archived
- **THEN** the response is 404 `NOT_FOUND`, or 409 `TASK_ARCHIVED`

### Requirement: Edit comment
The author SHALL edit their own comment; edited comments carry `editedAt`.

#### Scenario: Author edits [FR-CMT-002]
- **WHEN** the author edits the comment
- **THEN** body and `editedAt` are updated

#### Scenario: Other user edits [FR-CMT-002]
- **WHEN** another member tries to edit it
- **THEN** the response is 403 `FORBIDDEN`

### Requirement: Delete comment
The author or a project Owner SHALL delete a comment.

#### Scenario: Author or Owner deletes [FR-CMT-003]
- **WHEN** the author or an Owner deletes a comment
- **THEN** it disappears from the list and the response is 204

#### Scenario: Other member deletes [FR-CMT-003]
- **WHEN** any other member tries to delete it
- **THEN** the response is 403 `FORBIDDEN`; a non-member gets 404 `NOT_FOUND`

### Requirement: List comments
A member SHALL list a task's comments chronologically, paginated.

#### Scenario: Chronological page [FR-CMT-004]
- **WHEN** a member lists comments
- **THEN** items are oldest first with `meta { page, pageSize, total, totalPages }`

#### Scenario: Non-member lists [FR-CMT-004]
- **WHEN** a non-member lists comments
- **THEN** the response is 404 `NOT_FOUND`

### Requirement: Record activity
The system SHALL store exactly one activity entry (actor, action, timestamp, metadata) for task created, updated, assigned, status changed and archived, in the same transaction as the change.

#### Scenario: Entry stored [FR-ACT-001]
- **WHEN** one of those events occurs
- **THEN** exactly one activity entry is stored with the metadata defined by the FRS

#### Scenario: Rollback leaves no entry [FR-ACT-001]
- **WHEN** the change fails or is rolled back
- **THEN** no activity entry is stored, and a failing activity insert rolls the change back [NFR-REL-001]

#### Scenario: Append-only [FR-ACT-001]
- **WHEN** a client calls PATCH, PUT or DELETE on an activity resource
- **THEN** the response is 404 `NOT_FOUND` (no such route exists)

### Requirement: View activity
A member SHALL view a task's activity, newest first, paginated.

#### Scenario: History [FR-ACT-002]
- **WHEN** a member requests the history
- **THEN** each entry shows actor name, action, timestamp and change details

#### Scenario: Non-member views [FR-ACT-002]
- **WHEN** a non-member requests the history
- **THEN** the response is 404 `NOT_FOUND`
