# Functional Requirements Specification (FRS)

**Project:** Team Task Tracker
**Document:** FRS v0.1 (Draft, pending approval)
**Related:** [SDS.md](./SDS.md) · `openspec/` changes · Issue tracker project `DEV`

| Version | Date | Author | Status | Notes |
| --- | --- | --- | --- | --- |
| 0.1 | 2026-10-29 | Paramjit Jena | Draft | Initial requirements from assignment brief |

---

## 1. Introduction

### 1.1 Purpose
This document defines **what** the Team Task Tracker must do. It is the source of functional requirements for all OpenSpec changes. Every OpenSpec spec scenario, test and pull request must reference the requirement IDs defined here (for example `FR-TASK-003`).

### 1.2 Scope
A full-stack web application where authenticated users create projects, manage tasks, assign team members, track status, set priorities and deadlines, and view comments and activity history.

### 1.3 Out of scope
Real-time collaboration, chat or video, file attachments, native mobile apps, OAuth or social login, payments, email delivery, AI-based task prioritization, a custom issue tracker, a custom MCP server, and autonomous production deployments.

### 1.4 Definitions

| Term | Meaning |
| --- | --- |
| User | A registered person with an account |
| Project member | A user added to a project, with a project role |
| Owner | Project role that can manage the project and its members |
| Member | Project role that can work on tasks and comments |
| Archived | Soft-deleted: hidden from default lists, kept for history, read-only |
| Activity | An immutable record of a change to a task |
| Access token | Short-lived JWT used to authorize API requests |
| Refresh token | Long-lived token used only to obtain a new access token |

### 1.5 Requirement conventions
- Requirement IDs: `FR-<AREA>-<NNN>` (functional), `NFR-<AREA>-<NNN>` (non-functional).
- Keywords **SHALL** (mandatory), **SHOULD** (recommended), **MAY** (optional).
- Acceptance criteria use **WHEN / THEN** form so they map directly to OpenSpec scenarios and tests.
- Every requirement lists its originating ticket.

---

## 2. Users and roles

### 2.1 System roles

| Role | Description |
| --- | --- |
| Guest | Not authenticated. Can only register, log in and see public pages. |
| USER | Default role for every registered account. |
| ADMIN | Can view all projects for support purposes. Cannot bypass archive rules. |

### 2.2 Project roles

| Action | Owner | Member | Non-member |
| --- | --- | --- | --- |
| View project, tasks, comments, activity | ✅ | ✅ | ❌ (404) |
| Update or archive project | ✅ | ❌ (403) | ❌ (404) |
| Add or remove members | ✅ | ❌ (403) | ❌ (404) |
| Create, update, assign, archive tasks | ✅ | ✅ | ❌ (404) |
| Add comments | ✅ | ✅ | ❌ (404) |
| Edit or delete own comment | ✅ | ✅ | ❌ |
| Delete any comment | ✅ | ❌ (403) | ❌ |

Non-members receive **404 Not Found** rather than 403, so that the existence of a project is not revealed.

---

## 3. Functional requirements

### 3.1 Authentication and authorization (DEV-1006)

#### FR-AUTH-001: User registration
The system SHALL allow a guest to register with name, email and password.
- Email SHALL be unique (case-insensitive) and valid.
- Password SHALL be at least 8 characters and contain at least one letter and one number.
- Passwords SHALL be stored only as secure hashes.

Acceptance criteria:
- WHEN a guest submits a valid name, email and password THEN an account is created with role USER and the response returns 201 with the user (without the password).
- WHEN the email is already registered THEN the response is 409 `EMAIL_TAKEN`.
- WHEN any field is missing or invalid THEN the response is 400 `VALIDATION_ERROR` with field details.

#### FR-AUTH-002: Login
The system SHALL authenticate a user with email and password and issue an access token and a refresh token.

Acceptance criteria:
- WHEN valid credentials are submitted THEN the response is 200 with an access token, and a refresh token is set as an httpOnly cookie.
- WHEN the email or password is wrong THEN the response is 401 `INVALID_CREDENTIALS`, with the same message for both cases.
- WHEN more than 10 failed attempts are made from the same IP within 15 minutes THEN further attempts return 429 `RATE_LIMITED`.

#### FR-AUTH-003: Token refresh
The system SHALL issue a new access token when a valid refresh token is presented, and SHALL rotate the refresh token.

Acceptance criteria:
- WHEN a valid, unexpired, unrevoked refresh token is presented THEN a new access token and a new refresh token are issued, and the old refresh token is revoked.
- WHEN an expired, revoked or unknown refresh token is presented THEN the response is 401 `INVALID_REFRESH_TOKEN`.
- WHEN a previously rotated (already used) refresh token is presented again THEN all refresh tokens for that user are revoked (reuse detection) and the response is 401.

#### FR-AUTH-004: Logout
The system SHALL allow an authenticated user to log out.

Acceptance criteria:
- WHEN the user logs out THEN the current refresh token is revoked, the cookie is cleared and the response is 204.
- WHEN the revoked refresh token is used afterwards THEN the response is 401 `INVALID_REFRESH_TOKEN`.

#### FR-AUTH-005: Protected routes
All API endpoints except registration, login, refresh and health checks SHALL require a valid access token.

Acceptance criteria:
- WHEN a request has no access token, or an invalid or expired one, THEN the response is 401 `UNAUTHORIZED`.
- WHEN an unauthenticated user opens a protected page in the web app THEN they are redirected to the login page.

#### FR-AUTH-006: Role-based permissions
The system SHALL enforce the system and project role permissions defined in section 2.

Acceptance criteria:
- WHEN a member attempts an owner-only action THEN the response is 403 `FORBIDDEN`.
- WHEN a non-member accesses any project resource THEN the response is 404 `NOT_FOUND`.

#### FR-AUTH-007: Current user
The system SHALL return the profile of the authenticated user.

Acceptance criteria:
- WHEN an authenticated user requests their profile THEN the response is 200 with id, name, email and role.

### 3.2 Projects (DEV-1007)

#### FR-PROJ-001: Create project
An authenticated user SHALL be able to create a project with a name (required, 1 to 100 characters) and an optional description (up to 1000 characters). The creator becomes the project Owner.

Acceptance criteria:
- WHEN a valid project is submitted THEN it is created with status ACTIVE, the creator is added as Owner, and the response is 201.
- WHEN the name is missing or too long THEN the response is 400 `VALIDATION_ERROR`.

#### FR-PROJ-002: List and view projects
A user SHALL be able to list the projects they are a member of, and view a single project's details and members.

Acceptance criteria:
- WHEN a user lists projects THEN only projects where they are a member are returned, excluding archived projects unless `includeArchived=true` is set.
- WHEN a member views a project THEN the response includes the project and its member list.
- WHEN a non-member views a project THEN the response is 404 `NOT_FOUND`.

#### FR-PROJ-003: Update project
The Owner SHALL be able to update the name and description of an active project.

Acceptance criteria:
- WHEN the Owner submits valid changes THEN the project is updated and the response is 200.
- WHEN a Member attempts the update THEN the response is 403 `FORBIDDEN`.
- WHEN the project is archived THEN the response is 409 `PROJECT_ARCHIVED`.

#### FR-PROJ-004: Archive project
The Owner SHALL be able to archive a project. Archived projects and their tasks become read-only.

Acceptance criteria:
- WHEN the Owner archives a project THEN its status becomes ARCHIVED and the response is 200.
- WHEN anyone tries to create or modify tasks or comments in an archived project THEN the response is 409 `PROJECT_ARCHIVED`.

#### FR-PROJ-005: Add member
The Owner SHALL be able to add a registered user to the project by email, as Owner or Member.

Acceptance criteria:
- WHEN the Owner adds an existing user THEN the user becomes a member and the response is 201.
- WHEN the email does not belong to a registered user THEN the response is 404 `USER_NOT_FOUND`.
- WHEN the user is already a member THEN the response is 409 `ALREADY_MEMBER`.

#### FR-PROJ-006: Remove member
The Owner SHALL be able to remove a member from the project.

Acceptance criteria:
- WHEN the Owner removes a member THEN that user loses access and the response is 204.
- WHEN the removal would leave the project with no Owner THEN the response is 409 `LAST_OWNER`.
- WHEN a removed member was assigned to tasks THEN those tasks become unassigned and an activity entry is recorded for each.

### 3.3 Tasks (DEV-1008)

#### FR-TASK-001: Create task
A project member SHALL be able to create a task with:

| Field | Rules |
| --- | --- |
| title | Required, 1 to 200 characters |
| description | Optional, up to 5000 characters |
| status | Defaults to `TODO` |
| priority | `LOW`, `MEDIUM` (default), `HIGH` or `URGENT` |
| dueDate | Optional ISO date; SHALL NOT be in the past at creation |
| assigneeId | Optional; must be a project member |

Acceptance criteria:
- WHEN a member submits a valid task THEN it is created and the response is 201.
- WHEN the assignee is not a project member THEN the response is 400 `ASSIGNEE_NOT_MEMBER`.
- WHEN the due date is in the past THEN the response is 400 `VALIDATION_ERROR`.

#### FR-TASK-002: View task
A project member SHALL be able to view a task's full details, including assignee, creator and timestamps.

Acceptance criteria:
- WHEN a member requests a task THEN the response is 200 with the task details.
- WHEN the task does not exist or the user is not a member THEN the response is 404 `NOT_FOUND`.

#### FR-TASK-003: Update task
A project member SHALL be able to update a task's title, description, priority and due date.

Acceptance criteria:
- WHEN a member submits valid changes THEN the task is updated, `updatedAt` changes and the response is 200.
- WHEN the task is archived THEN the response is 409 `TASK_ARCHIVED`.

#### FR-TASK-004: Assign task
A project member SHALL be able to assign a task to a project member, or unassign it.

Acceptance criteria:
- WHEN a task is assigned to a project member THEN the assignee is updated and an activity entry is recorded.
- WHEN the target user is not a project member THEN the response is 400 `ASSIGNEE_NOT_MEMBER`.

#### FR-TASK-005: Status transitions
Task status SHALL follow this transition table:

| From | Allowed to |
| --- | --- |
| TODO | IN_PROGRESS |
| IN_PROGRESS | TODO, IN_REVIEW |
| IN_REVIEW | IN_PROGRESS, DONE |
| DONE | IN_PROGRESS (reopen) |

Acceptance criteria:
- WHEN an allowed transition is requested THEN the status changes and an activity entry records the old and new status.
- WHEN a disallowed transition is requested (for example TODO to DONE) THEN the response is 409 `INVALID_STATUS_TRANSITION` with the allowed targets listed.

#### FR-TASK-006: Archive task
A project member SHALL be able to archive a task. Archived tasks are read-only and hidden from default lists.

Acceptance criteria:
- WHEN a member archives a task THEN `archivedAt` is set, an activity entry is recorded and the response is 200.
- WHEN an archived task is updated THEN the response is 409 `TASK_ARCHIVED`.

### 3.4 Task filtering, sorting and pagination (DEV-1009)

#### FR-FILT-001: Filter tasks
A member SHALL be able to filter a project's tasks by status, priority, assignee and due-date range. Multiple filters combine with AND; multiple values for one filter combine with OR.

Acceptance criteria:
- WHEN `status=TODO,IN_PROGRESS&priority=HIGH` is requested THEN only HIGH tasks in TODO or IN_PROGRESS are returned.
- WHEN `assigneeId=me` is requested THEN only tasks assigned to the current user are returned.
- WHEN `assigneeId=none` is requested THEN only unassigned tasks are returned.
- WHEN an invalid filter value is given THEN the response is 400 `VALIDATION_ERROR`.

#### FR-FILT-002: Sort tasks
A member SHALL be able to sort tasks by `dueDate`, `priority`, `createdAt` or `updatedAt`, ascending or descending. The default is `createdAt` descending.

Acceptance criteria:
- WHEN `sort=dueDate&order=asc` is requested THEN tasks are ordered by due date, with tasks without a due date last.
- WHEN sorting by priority THEN the order is URGENT, HIGH, MEDIUM, LOW (descending).

#### FR-FILT-003: Paginate tasks
Task lists SHALL be paginated with `page` (default 1) and `pageSize` (default 20, maximum 100).

Acceptance criteria:
- WHEN a page is requested THEN the response contains `items` and `meta { page, pageSize, total, totalPages }`.
- WHEN `pageSize` is greater than 100 THEN the response is 400 `VALIDATION_ERROR`.

### 3.5 Comments (DEV-1010)

#### FR-CMT-001: Add comment
A project member SHALL be able to add a comment (1 to 2000 characters) to a non-archived task.

Acceptance criteria:
- WHEN a member adds a valid comment THEN it is saved with author and timestamp and the response is 201.
- WHEN the body is empty or too long THEN the response is 400 `VALIDATION_ERROR`.

#### FR-CMT-002: Edit comment
The author SHALL be able to edit their own comment. Edited comments show an "edited" indicator.

Acceptance criteria:
- WHEN the author edits their comment THEN the body and `editedAt` are updated.
- WHEN another user tries to edit it THEN the response is 403 `FORBIDDEN`.

#### FR-CMT-003: Delete comment
The author or a project Owner SHALL be able to delete a comment.

Acceptance criteria:
- WHEN the author or an Owner deletes a comment THEN it is removed from the list and the response is 204.
- WHEN any other member tries to delete it THEN the response is 403 `FORBIDDEN`.

#### FR-CMT-004: List comments
A member SHALL be able to list a task's comments in chronological order, paginated.

### 3.6 Activity history (DEV-1010)

#### FR-ACT-001: Record activity
The system SHALL record an activity entry for these task events:

| Action | Metadata recorded |
| --- | --- |
| `TASK_CREATED` | title, initial status, priority |
| `TASK_UPDATED` | changed fields with old and new values |
| `TASK_ASSIGNED` | old assignee, new assignee |
| `TASK_STATUS_CHANGED` | old status, new status |
| `TASK_ARCHIVED` | (none) |

Acceptance criteria:
- WHEN any of these events occurs THEN exactly one activity entry is stored with actor, action, timestamp and metadata.
- WHEN the change fails or is rolled back THEN no activity entry is stored.
- Activity entries SHALL NOT be editable or deletable through the API.

#### FR-ACT-002: View activity
A member SHALL be able to view a task's activity history, newest first, paginated.

Acceptance criteria:
- WHEN a member requests the history THEN each entry shows actor name, action, timestamp and change details.

### 3.7 Frontend (DEV-1011, DEV-1012, DEV-1013)

| ID | Requirement | Ticket |
| --- | --- | --- |
| FR-UI-001 | Register, login and logout pages with inline validation errors | DEV-1011 |
| FR-UI-002 | The session refreshes automatically on token expiry; if refresh fails, redirect to login | DEV-1011 |
| FR-UI-003 | Projects page: list, create, edit and archive projects | DEV-1011 |
| FR-UI-004 | Project members page: add and remove members (Owner only; hidden for Members) | DEV-1011 |
| FR-UI-005 | Task list with filters, sorting and pagination; filters reflected in the URL | DEV-1012 |
| FR-UI-006 | Task detail page with all fields | DEV-1012 |
| FR-UI-007 | Task create and edit forms, status change limited to allowed transitions | DEV-1013 |
| FR-UI-008 | Comments section: add, edit and delete according to permissions | DEV-1013 |
| FR-UI-009 | Activity history timeline on the task detail page | DEV-1013 |
| FR-UI-010 | Loading, empty and error states on every data view | DEV-1011 to 1013 |

### 3.8 System (DEV-1001)

#### FR-SYS-001: Health checks
Every backend service SHALL expose `GET /health`.

Acceptance criteria:
- WHEN the service and its dependencies are healthy THEN the response is 200 `{ "status": "ok" }`.
- WHEN the database is unreachable THEN the response is 503 `{ "status": "error" }`.

---

## 4. Non-functional requirements

| ID | Category | Requirement |
| --- | --- | --- |
| NFR-SEC-001 | Security | Passwords hashed with bcrypt (cost ≥ 12) or argon2id; never logged or returned |
| NFR-SEC-002 | Security | Refresh tokens stored only as hashes; httpOnly, Secure, SameSite=Strict cookie |
| NFR-SEC-003 | Security | All input validated with Zod schemas from the shared package |
| NFR-SEC-004 | Security | All database access through the ORM with parameterized queries; no string-built SQL |
| NFR-SEC-005 | Security | Secrets come only from environment variables; no secrets in git, logs or error responses |
| NFR-SEC-006 | Security | Security headers (helmet) and CORS restricted to the web origin |
| NFR-PERF-001 | Performance | Task list endpoint p95 < 300 ms for a project with 10,000 tasks (local environment) |
| NFR-PERF-002 | Performance | Filter and sort columns are indexed |
| NFR-REL-001 | Reliability | Multi-step writes (change + activity) run in one database transaction |
| NFR-USA-001 | Usability | Every interactive element is keyboard-accessible and labelled |
| NFR-MNT-001 | Maintainability | TypeScript strict mode; no `any`; lint and format checks pass |
| NFR-MNT-002 | Maintainability | API documented in OpenAPI 3.1, generated from the Zod schemas |
| NFR-TST-001 | Testing | Every acceptance criterion has at least one automated test |
| NFR-TST-002 | Testing | A Playwright journey covers register → create project → add member → create, assign and complete a task → comment |
| NFR-OPS-001 | Operations | The whole stack starts locally with Docker Compose; images pinned to exact versions |
| NFR-OBS-001 | Observability | Structured JSON logs with a request ID propagated from the gateway to services |

---

## 5. Traceability: tickets to requirements

| Ticket | Requirements |
| --- | --- |
| DEV-1001 | FR-SYS-001, NFR-OPS-001, NFR-MNT-001 |
| DEV-1006 | FR-AUTH-001 to FR-AUTH-007, NFR-SEC-001 to 003 |
| DEV-1007 | FR-PROJ-001 to FR-PROJ-006, FR-AUTH-006 |
| DEV-1008 | FR-TASK-001 to FR-TASK-006 |
| DEV-1009 | FR-FILT-001 to FR-FILT-003, NFR-PERF-001, NFR-PERF-002 |
| DEV-1010 | FR-CMT-001 to FR-CMT-004, FR-ACT-001, FR-ACT-002, NFR-REL-001 |
| DEV-1011 | FR-UI-001 to FR-UI-004, FR-UI-010 |
| DEV-1012 | FR-UI-005, FR-UI-006, FR-UI-010 |
| DEV-1013 | FR-UI-007 to FR-UI-010 |
| DEV-1016 | NFR-TST-001, NFR-TST-002 |

Workflow tickets (DEV-1002 to 1005, 1014, 1015, 1017, 1018) cover the development process and are specified in their OpenSpec changes rather than in this document.

Each requirement's status (Draft → Approved → Implemented → Verified) is tracked in the OpenSpec specs under `openspec/specs/` and updated when a change is archived.

---

## 6. Assumptions and open questions

| # | Item | Status |
| --- | --- | --- |
| A1 | Status workflow is TODO → IN_PROGRESS → IN_REVIEW → DONE, as in FR-TASK-005 | Assumed, needs approval |
| A2 | Any project member (not only the Owner) may archive a task | Assumed, needs approval |
| A3 | Access token lifetime 15 minutes, refresh token lifetime 7 days | Assumed, needs approval |
| A4 | Archiving is one-way (no unarchive) | Assumed, needs approval |
| Q1 | Should ADMIN be able to modify projects they don't belong to? | Open |
