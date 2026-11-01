## ADDED Requirements

### Requirement: Create project
An authenticated user SHALL create a project (name 1–100, description ≤ 1000) and become its Owner.

#### Scenario: Valid project [FR-PROJ-001]
- **WHEN** a valid project is submitted
- **THEN** it is created ACTIVE, the creator is OWNER and the response is 201

#### Scenario: Invalid name [FR-PROJ-001]
- **WHEN** the name is missing or longer than 100 characters
- **THEN** the response is 400 `VALIDATION_ERROR`

### Requirement: List and view projects
A user SHALL list their own projects and view one project with its members.

#### Scenario: List own projects [FR-PROJ-002]
- **WHEN** a user lists projects
- **THEN** only projects they belong to are returned, archived ones only with `includeArchived=true`

#### Scenario: Member views project [FR-PROJ-002]
- **WHEN** a member views a project
- **THEN** the response contains the project and its members

#### Scenario: Non-member views project [FR-PROJ-002]
- **WHEN** a non-member views a project
- **THEN** the response is 404 `NOT_FOUND`

### Requirement: Update project
The Owner SHALL update name and description of an active project.

#### Scenario: Owner updates [FR-PROJ-003]
- **WHEN** the Owner submits valid changes
- **THEN** the response is 200 with the updated project

#### Scenario: Member updates [FR-AUTH-006]
- **WHEN** a Member attempts the update
- **THEN** the response is 403 `FORBIDDEN`

#### Scenario: Non-member updates [FR-AUTH-006]
- **WHEN** a non-member attempts the update
- **THEN** the response is 404 `NOT_FOUND`

#### Scenario: Archived project [FR-PROJ-003]
- **WHEN** the project is archived
- **THEN** the response is 409 `PROJECT_ARCHIVED`

### Requirement: Archive project
The Owner SHALL archive a project, making it read-only.

#### Scenario: Owner archives [FR-PROJ-004]
- **WHEN** the Owner archives the project
- **THEN** status becomes ARCHIVED, `archivedAt` is set and the response is 200

#### Scenario: Member archives [FR-PROJ-004]
- **WHEN** a Member attempts to archive
- **THEN** the response is 403 `FORBIDDEN`; a non-member gets 404 `NOT_FOUND`

### Requirement: Add member
The Owner SHALL add a registered user by email as OWNER or MEMBER.

#### Scenario: Add user [FR-PROJ-005]
- **WHEN** the Owner adds an existing user
- **THEN** the user becomes a member and the response is 201

#### Scenario: Unknown email [FR-PROJ-005]
- **WHEN** the email is not registered
- **THEN** the response is 404 `USER_NOT_FOUND`

#### Scenario: Already member [FR-PROJ-005]
- **WHEN** the user is already a member
- **THEN** the response is 409 `ALREADY_MEMBER`

#### Scenario: Member adds member [FR-AUTH-006]
- **WHEN** a Member attempts to add someone
- **THEN** the response is 403 `FORBIDDEN`; a non-member gets 404 `NOT_FOUND`

### Requirement: Remove member
The Owner SHALL remove a member; the project always keeps at least one Owner.

#### Scenario: Remove member [FR-PROJ-006]
- **WHEN** the Owner removes a member
- **THEN** the response is 204 and the user loses access

#### Scenario: Last owner [FR-PROJ-006]
- **WHEN** the removal would leave no Owner
- **THEN** the response is 409 `LAST_OWNER`

#### Scenario: Assigned tasks unassigned [FR-PROJ-006]
- **WHEN** a removed member had assigned tasks
- **THEN** those tasks become unassigned and one activity entry per task is recorded, all in one transaction

#### Scenario: Member removes member [FR-AUTH-006]
- **WHEN** a Member attempts removal
- **THEN** the response is 403 `FORBIDDEN`; a non-member gets 404 `NOT_FOUND`
