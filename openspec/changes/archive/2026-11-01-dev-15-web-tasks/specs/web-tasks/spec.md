## ADDED Requirements

### Requirement: Task list with filters, sorting and pagination
The project page SHALL list tasks with filters, sorting and pagination, all reflected in the URL.

#### Scenario: Filters in URL [FR-UI-005]
- **WHEN** the user selects status TODO and priority HIGH
- **THEN** the URL contains `status=TODO&priority=HIGH`, the request uses them and page resets to 1

#### Scenario: State survives reload [FR-UI-005]
- **WHEN** the page is opened with `?sort=dueDate&order=asc&page=2`
- **THEN** the controls and the request reflect those values

#### Scenario: Invalid URL value [FR-UI-005]
- **WHEN** the URL has an invalid `pageSize` or `sort`
- **THEN** defaults are used instead of an error page

#### Scenario: Pagination [FR-UI-005]
- **WHEN** the user clicks next page
- **THEN** `page` in the URL increases and the new page loads

### Requirement: Task detail page
The task detail page SHALL show all task fields.

#### Scenario: Shows fields [FR-UI-006]
- **WHEN** a member opens `/tasks/:taskId`
- **THEN** title, description, status, priority, due date, assignee, creator and timestamps are shown

#### Scenario: Task not found [FR-UI-006]
- **WHEN** the API returns 404 `NOT_FOUND`
- **THEN** a not-found message is shown

### Requirement: Loading, empty and error states
Task views SHALL show loading, empty and error states.

#### Scenario: States [FR-UI-010]
- **WHEN** the task query is loading, returns no items or fails
- **THEN** a loading indicator, an empty message, or an error with retry is shown
