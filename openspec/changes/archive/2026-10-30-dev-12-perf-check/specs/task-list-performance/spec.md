## ADDED Requirements

### Requirement: Task list latency
The task list endpoint SHALL answer with a 95th percentile below 300 ms for a project holding 10,000 tasks, on the local environment, for the default, filtered, sorted and deep-page requests.

#### Scenario: p95 under 300 ms with 10,000 tasks [NFR-PERF-001]
- **WHEN** a project with 10,000 tasks is listed 200 times, mixing the default view, a status filter, an assignee filter, sorting by due date and page 100
- **THEN** every response is 200 and the 95th percentile of the response times is below 300 ms

#### Scenario: Measurement fails when too slow [NFR-PERF-001]
- **WHEN** the computed p95 is 300 ms or more
- **THEN** the performance test fails and prints the measured value

#### Scenario: Pagination stays bounded [NFR-PERF-001]
- **WHEN** a page is requested from the 10,000 tasks with `pageSize=100`
- **THEN** exactly 100 items are returned and `meta.total` is 10000

### Requirement: Indexed filter and sort columns
The database SHALL index the task columns used by filtering and sorting.

#### Scenario: Indexes exist in the migrated database [NFR-PERF-002]
- **WHEN** the migrated test database is inspected
- **THEN** `tasks` has indexes on (project_id, archived_at, status), (project_id, assignee_id), (project_id, due_date) and (project_id, priority)
