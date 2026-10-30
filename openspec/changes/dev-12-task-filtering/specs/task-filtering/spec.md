## ADDED Requirements

### Requirement: Filter tasks
A member SHALL filter a project's tasks by status, priority, assignee and due-date range; filters combine with AND, values within one filter with OR.

#### Scenario: Status and priority [FR-FILT-001]
- **WHEN** `status=TODO,IN_PROGRESS&priority=HIGH` is requested
- **THEN** only HIGH tasks in TODO or IN_PROGRESS are returned

#### Scenario: Assigned to me [FR-FILT-001]
- **WHEN** `assigneeId=me` is requested
- **THEN** only tasks assigned to the caller are returned

#### Scenario: Unassigned [FR-FILT-001]
- **WHEN** `assigneeId=none` is requested
- **THEN** only unassigned tasks are returned

#### Scenario: Invalid filter [FR-FILT-001]
- **WHEN** an invalid or unknown parameter is given
- **THEN** the response is 400 `VALIDATION_ERROR`

#### Scenario: Non-member lists [FR-FILT-001]
- **WHEN** a non-member lists a project's tasks
- **THEN** the response is 404 `NOT_FOUND`

### Requirement: Sort tasks
A member SHALL sort by `dueDate`, `priority`, `createdAt` or `updatedAt`, ascending or descending; default `createdAt` descending.

#### Scenario: Sort by due date [FR-FILT-002]
- **WHEN** `sort=dueDate&order=asc` is requested
- **THEN** tasks are ordered by due date with tasks without a due date last

#### Scenario: Sort by priority [FR-FILT-002]
- **WHEN** sorting by priority descending
- **THEN** the order is URGENT, HIGH, MEDIUM, LOW

#### Scenario: Invalid sort field [FR-FILT-002]
- **WHEN** `sort` is not one of the allowed fields
- **THEN** the response is 400 `VALIDATION_ERROR`

### Requirement: Paginate tasks
Task lists SHALL be paginated with `page` (default 1) and `pageSize` (default 20, max 100).

#### Scenario: Paged response [FR-FILT-003]
- **WHEN** a page is requested
- **THEN** the response contains `items` and `meta { page, pageSize, total, totalPages }`

#### Scenario: Page size too large [FR-FILT-003]
- **WHEN** `pageSize` is greater than 100
- **THEN** the response is 400 `VALIDATION_ERROR`

### Requirement: Indexed filter and sort columns
Filter and sort columns SHALL be indexed.

#### Scenario: Indexes exist [NFR-PERF-002]
- **WHEN** the tasks migration is inspected
- **THEN** indexes exist on (project_id, archived_at, status), (project_id, assignee_id), (project_id, due_date) and (project_id, priority)
