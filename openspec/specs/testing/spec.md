# testing Specification

## Purpose
Proves the system against the requirements: a report that maps every FRS requirement to its automated tests, the role-by-action authorization matrix and conflict regression tests against a real PostgreSQL database, and the Playwright user journey through the running stack.

Requirement status (FRS §5): Coverage by requirement, Authorization matrix, Conflict and consistency regression tests, Playwright user journey and Recorded results are all **Verified** by DEV-19 on 2026-10-30 (see the archived `verification.md`).

## Requirements

### Requirement: Coverage by requirement
The repository SHALL generate a table that maps every FRS requirement to the automated tests whose names start with its ID, and SHALL fail when a functional requirement has no test.

#### Scenario: Every requirement has a test [NFR-TST-001]
- **WHEN** the coverage script runs over the FRS and all test files
- **THEN** each `FR-*` requirement lists at least one test and the script exits 0

#### Scenario: Missing test is reported [NFR-TST-001]
- **WHEN** a requirement ID has no test whose name starts with it
- **THEN** the script lists the ID and exits non-zero

### Requirement: Authorization matrix
The tracker SHALL be tested against a real PostgreSQL database for every role × action cell of FRS §2.2.

#### Scenario: Owner can do everything [FR-PROJ-003]
- **WHEN** an Owner updates or archives the project, adds and removes members, and deletes any comment
- **THEN** each call succeeds

#### Scenario: Member limited by role [FR-PROJ-005]
- **WHEN** a Member updates or archives the project, adds or removes a member, or deletes another user's comment
- **THEN** the response is 403 `FORBIDDEN`

#### Scenario: Member works with tasks and comments [FR-TASK-001]
- **WHEN** a Member creates, updates, assigns and archives a task and adds a comment
- **THEN** each call succeeds

#### Scenario: Non-member sees nothing [FR-PROJ-002]
- **WHEN** a user who is not a member views, updates, or adds members, tasks, comments to the project
- **THEN** every response is 404 `NOT_FOUND`, identical to a project that does not exist

#### Scenario: Comment ownership [FR-CMT-002]
- **WHEN** a Member edits another user's comment, or an Owner edits another user's comment
- **THEN** the response is 403 `FORBIDDEN`; editing one's own comment succeeds

### Requirement: Conflict and consistency regression tests
Conflict codes and the atomic activity write SHALL be proven against real database constraints.

#### Scenario: Conflict codes [FR-PROJ-006]
- **WHEN** the last Owner is removed, a member is added twice, a task moves TODO→DONE, an assignee is not a member, or an archived project or task is written to
- **THEN** the response is 409 `LAST_OWNER`, 409 `ALREADY_MEMBER`, 409 `INVALID_STATUS_TRANSITION`, 400 `ASSIGNEE_NOT_MEMBER`, 409 `PROJECT_ARCHIVED` or 409 `TASK_ARCHIVED` respectively

#### Scenario: Activity written with the change [NFR-REL-001]
- **WHEN** a task status change fails mid-transaction
- **THEN** neither the status nor an activity row is persisted

#### Scenario: Activity recorded on success [FR-ACT-001]
- **WHEN** a task is created, assigned and moved to DONE
- **THEN** one activity entry exists per change, newest first in the listing

### Requirement: Playwright user journey
A Playwright test SHALL drive the running application through the whole journey of NFR-TST-002.

#### Scenario: Full journey [NFR-TST-002]
- **WHEN** a new user registers, creates a project, adds a second user as member, creates a task, assigns it, moves it to DONE, comments, and opens the activity
- **THEN** each step is visible in the UI and the activity lists create, assign and status entries

#### Scenario: Journey fails loudly [NFR-TST-002]
- **WHEN** the application is not running at the base URL
- **THEN** the test fails with a connection error and is never reported as skipped

### Requirement: Recorded results
`docs/test-results.md` SHALL record the commands, counts and the coverage table of the last full run.

#### Scenario: Results saved [NFR-TST-001]
- **WHEN** `pnpm test` and `pnpm test:e2e` pass
- **THEN** `docs/test-results.md` contains both results with date and the coverage-by-requirement table
