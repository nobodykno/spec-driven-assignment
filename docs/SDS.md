# Software Design Specification (SDS)

**Project:** Team Task Tracker
**Document:** SDS v0.1 (Draft, pending approval)
**Related:** [FRS.md](./FRS.md) · `openspec/` changes · `docs/versions.md`

| Version | Date | Author | Status | Notes |
| --- | --- | --- | --- | --- |
| 0.1 | 2026-10-29 | Paramjit Jena | Draft | Initial design |

---

## 1. Introduction

### 1.1 Purpose
This document defines **how** the Team Task Tracker is built: its architecture, components, data model, API, security and testing design. Requirements are defined in the [FRS](./FRS.md). Every OpenSpec `design.md` must reference the SDS sections it follows or changes, and must update this document when it changes the design.

### 1.2 Design principles
1. **Contracts first.** API shapes are Zod schemas in `packages/shared`, approved before backend or frontend work starts.
2. **One owner per concern.** Only `packages/database` talks to PostgreSQL; only the gateway is exposed publicly.
3. **Secure by default.** Every route is authenticated unless explicitly public; every query is scoped to the user's project memberships.
4. **Changes are traceable.** Ticket → FRS ID → OpenSpec change → code → test → PR.

---

## 2. Architecture overview

```
                       ┌───────────────────────────────┐
  Browser              │  apps/web  (React 19 + Vite)  │
  :5173 (dev)          │  TanStack Query, shadcn/ui    │
                       └───────────────┬───────────────┘
                                       │ HTTPS  /api/v1/*
                                       ▼
                       ┌───────────────────────────────┐
                       │  services/api-gateway  :4000  │
                       │  - verifies access JWT        │
                       │  - request ID, rate limiting  │
                       │  - routes to services         │
                       └───────┬───────────────┬───────┘
                 /api/v1/auth/* │               │ /api/v1/projects/*  (+ tasks, comments, activity)
                                ▼               ▼
              ┌──────────────────────┐   ┌────────────────────────┐
              │ services/auth :4001  │   │ services/tracker :4002 │
              │ register, login,     │   │ projects, members,     │
              │ refresh, logout, me  │   │ tasks, comments,       │
              └──────────┬───────────┘   │ activity               │
                         │               └───────────┬────────────┘
                         │   @app/database (Sequelize models, migrations)
                         └───────────────┬───────────┘
                                         ▼
                              ┌────────────────────┐
                              │ PostgreSQL 16      │
                              │ (Docker, :5433)    │
                              └────────────────────┘
```

### 2.1 Components

| Component | Responsibility | Port | Public |
| --- | --- | --- | --- |
| `apps/web` | User interface | 5173 (dev) / 80 (nginx) | Yes |
| `services/api-gateway` | Single entry point; JWT verification; routing; rate limiting; request IDs | 4000 | Yes |
| `services/auth` | Accounts, password hashing, token issue, rotation and revocation | 4001 | No |
| `services/tracker` | Projects, membership, tasks, comments, activity history | 4002 | No |
| `packages/database` | Sequelize connection, models, migrations, seeders | (library) | n/a |
| `packages/shared` | Zod schemas, TypeScript types, error codes, OpenAPI registry | (library) | n/a |

> **Decision D-01:** projects, tasks, comments and activity live in one `tracker` service, because they share transactions (a task change and its activity entry are written atomically, NFR-REL-001). Splitting them into more services would require distributed transactions for no benefit at this scale.

### 2.2 Request flow (authenticated request)
1. The web app sends `Authorization: Bearer <access token>` to the gateway.
2. The gateway verifies the JWT signature and expiry. If invalid, it returns 401 `UNAUTHORIZED`.
3. The gateway adds `X-Request-Id`, `X-User-Id` and `X-User-Role` headers and an internal shared-secret header `X-Internal-Token`, then proxies the request.
4. The service rejects any request without a valid `X-Internal-Token` (services are not reachable from outside the Docker network, and this is defence in depth).
5. The service applies authorization (project membership and role), runs the business logic and returns a response.

Public routes (no JWT required): `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /health`.

---

## 3. Repository structure

```
spec-driven-assignment/
├── apps/
│   └── web/                     React 19 + Vite + Tailwind + shadcn/ui
│       └── src/
│           ├── features/        auth/, projects/, tasks/, comments/  (components, hooks, api)
│           ├── components/ui/   shadcn components
│           ├── lib/             api client, query client, auth store
│           └── routes/          route definitions + protected route wrapper
├── services/
│   ├── api-gateway/src/         app.ts, index.ts, middleware/, routes/
│   ├── auth/src/                app.ts, index.ts, routes/, controllers/, services/, middleware/
│   └── tracker/src/             app.ts, index.ts, routes/, controllers/, services/, middleware/
├── packages/
│   ├── database/
│   │   ├── src/models/          User, RefreshToken, Project, ProjectMember, Task, Comment, Activity
│   │   ├── src/index.ts         sequelize instance, connectDatabase(), models export
│   │   ├── migrations/
│   │   └── seeders/
│   └── shared/src/
│       ├── schemas/             auth.ts, project.ts, task.ts, comment.ts, activity.ts, common.ts
│       ├── errors.ts            error codes
│       └── openapi.ts           OpenAPI 3.1 registry
├── docs/                        FRS.md, SDS.md, versions.md, mcp-setup.md, ...
├── openspec/                    config.yaml, specs/, changes/
├── .claude/                     settings.json, agents/, commands/, skills/, hooks/
├── e2e/                         Playwright tests
├── docker-compose.yml
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── CLAUDE.md
```

### 3.1 Service internal layering
`routes → controllers → services → @app/database models`

- **Routes:** URL, middleware (validate, authorize), handler wiring. No logic.
- **Controllers:** map the HTTP request to a service call and the result to an HTTP response.
- **Services:** business rules (transitions, membership checks, activity recording).
- **Models:** accessed only from services, never from controllers.

Each service keeps `app.ts` (Express app) separate from `index.ts` (`listen`) so Supertest can test the app directly.

---

## 4. Technology stack

Exact versions are pinned in `package.json` files and recorded in `docs/versions.md`. No `latest` tags and no floating Docker image tags.

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, React Router |
| Backend | Node.js 22, Express 5, TypeScript (strict) |
| Database | PostgreSQL 16, **Sequelize** (see section 13, Deviations) |
| Auth | JWT (`jsonwebtoken`), bcrypt |
| Validation / API docs | Zod, OpenAPI 3.1 (generated from Zod) |
| Testing | Vitest, Supertest, Playwright |
| Tooling | pnpm workspaces, ESLint, Prettier, Docker Compose |
| AI workflow | Claude Code, OpenSpec, Context7 MCP, issue-tracker MCP, Code Review Graph, Graphify |

---

## 5. Data design

### 5.1 Entity relationship

```
users 1───* refresh_tokens
users 1───* project_members *───1 projects
projects 1───* tasks
users 1───* tasks (assignee, nullable)
users 1───* tasks (creator)
tasks 1───* comments *───1 users (author)
tasks 1───* activities *───1 users (actor)
```

### 5.2 Tables

All tables use UUID primary keys, `created_at` and `updated_at` timestamps (UTC), and snake_case column names (Sequelize `underscored: true`).

**users**
| Column | Type | Constraints |
| --- | --- | --- |
| id | UUID | PK |
| name | VARCHAR(100) | NOT NULL |
| email | CITEXT | NOT NULL, UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL |
| role | ENUM('USER','ADMIN') | NOT NULL, default 'USER' |

**refresh_tokens**
| Column | Type | Constraints |
| --- | --- | --- |
| id | UUID | PK |
| user_id | UUID | FK → users, ON DELETE CASCADE |
| token_hash | VARCHAR(255) | NOT NULL, UNIQUE (SHA-256 of the token) |
| family_id | UUID | NOT NULL (for reuse detection) |
| expires_at | TIMESTAMPTZ | NOT NULL |
| revoked_at | TIMESTAMPTZ | NULL |
| replaced_by_id | UUID | NULL, FK → refresh_tokens |

**projects**
| Column | Type | Constraints |
| --- | --- | --- |
| id | UUID | PK |
| name | VARCHAR(100) | NOT NULL |
| description | VARCHAR(1000) | NULL |
| status | ENUM('ACTIVE','ARCHIVED') | NOT NULL, default 'ACTIVE' |
| owner_id | UUID | FK → users (creator) |
| archived_at | TIMESTAMPTZ | NULL |

**project_members**
| Column | Type | Constraints |
| --- | --- | --- |
| project_id | UUID | PK part, FK → projects |
| user_id | UUID | PK part, FK → users |
| role | ENUM('OWNER','MEMBER') | NOT NULL |

**tasks**
| Column | Type | Constraints |
| --- | --- | --- |
| id | UUID | PK |
| project_id | UUID | FK → projects, NOT NULL |
| title | VARCHAR(200) | NOT NULL |
| description | TEXT | NULL (max 5000, validated in Zod) |
| status | ENUM('TODO','IN_PROGRESS','IN_REVIEW','DONE') | NOT NULL, default 'TODO' |
| priority | ENUM('LOW','MEDIUM','HIGH','URGENT') | NOT NULL, default 'MEDIUM' |
| due_date | DATE | NULL |
| assignee_id | UUID | NULL, FK → users |
| created_by_id | UUID | FK → users |
| archived_at | TIMESTAMPTZ | NULL |

**comments**
| Column | Type | Constraints |
| --- | --- | --- |
| id | UUID | PK |
| task_id | UUID | FK → tasks |
| author_id | UUID | FK → users |
| body | VARCHAR(2000) | NOT NULL |
| edited_at | TIMESTAMPTZ | NULL |
| deleted_at | TIMESTAMPTZ | NULL (Sequelize paranoid) |

**activities** (append-only)
| Column | Type | Constraints |
| --- | --- | --- |
| id | UUID | PK |
| task_id | UUID | FK → tasks |
| actor_id | UUID | FK → users |
| action | ENUM('TASK_CREATED','TASK_UPDATED','TASK_ASSIGNED','TASK_STATUS_CHANGED','TASK_ARCHIVED') | NOT NULL |
| metadata | JSONB | NOT NULL, default '{}' |
| created_at | TIMESTAMPTZ | NOT NULL |

### 5.3 Indexes
| Table | Index | Supports |
| --- | --- | --- |
| project_members | (user_id) | "my projects" list |
| tasks | (project_id, archived_at, status) | status filter |
| tasks | (project_id, assignee_id) | assignee filter |
| tasks | (project_id, due_date) | due-date filter and sort |
| tasks | (project_id, priority) | priority filter and sort |
| comments | (task_id, created_at) | comment list |
| activities | (task_id, created_at DESC) | activity history |
| refresh_tokens | (user_id), (family_id) | revocation |

### 5.4 Migrations and seed data
- Migrations live in `packages/database/migrations` and run with `sequelize-cli` (`pnpm db:migrate`).
- `sync()` is **never** used outside tests.
- An applied migration is never edited; changes need a new migration.
- Seeders create demo users, a project with members, and tasks in every status (`pnpm db:seed`). Seed data is synthetic only.

### 5.5 Transactions
These operations run in a single Sequelize managed transaction:
- Create, update, assign, change the status of or archive a task, **together with** its activity entry
- Remove a member **together with** unassigning their tasks and recording activities
- Refresh-token rotation (revoke old token + insert new token)

---

## 6. API design

### 6.1 Conventions
- Base path `/api/v1`, JSON only.
- Request and response bodies are validated with Zod schemas from `@app/shared`.
- Errors always use this format:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Readable message", "details": [ { "path": "title", "message": "Required" } ] } }
```

- Paginated lists return `{ "items": [...], "meta": { "page": 1, "pageSize": 20, "total": 57, "totalPages": 3 } }`.
- The OpenAPI 3.1 document is generated from the Zod schemas and served at `GET /api/v1/docs/openapi.json`.

### 6.2 Endpoints

**Auth service** (via gateway `/api/v1/auth`)
| Method | Path | Auth | FR |
| --- | --- | --- | --- |
| POST | /auth/register | Public | FR-AUTH-001 |
| POST | /auth/login | Public | FR-AUTH-002 |
| POST | /auth/refresh | Refresh cookie | FR-AUTH-003 |
| POST | /auth/logout | Refresh cookie | FR-AUTH-004 |
| GET | /auth/me | Access token | FR-AUTH-007 |

**Tracker service** (via gateway)
| Method | Path | Role | FR |
| --- | --- | --- | --- |
| GET | /projects | User | FR-PROJ-002 |
| POST | /projects | User | FR-PROJ-001 |
| GET | /projects/:projectId | Member | FR-PROJ-002 |
| PATCH | /projects/:projectId | Owner | FR-PROJ-003 |
| POST | /projects/:projectId/archive | Owner | FR-PROJ-004 |
| POST | /projects/:projectId/members | Owner | FR-PROJ-005 |
| DELETE | /projects/:projectId/members/:userId | Owner | FR-PROJ-006 |
| GET | /projects/:projectId/tasks | Member | FR-FILT-001 to 003 |
| POST | /projects/:projectId/tasks | Member | FR-TASK-001 |
| GET | /tasks/:taskId | Member | FR-TASK-002 |
| PATCH | /tasks/:taskId | Member | FR-TASK-003 |
| PATCH | /tasks/:taskId/assignee | Member | FR-TASK-004 |
| PATCH | /tasks/:taskId/status | Member | FR-TASK-005 |
| POST | /tasks/:taskId/archive | Member | FR-TASK-006 |
| GET | /tasks/:taskId/comments | Member | FR-CMT-004 |
| POST | /tasks/:taskId/comments | Member | FR-CMT-001 |
| PATCH | /comments/:commentId | Author | FR-CMT-002 |
| DELETE | /comments/:commentId | Author or Owner | FR-CMT-003 |
| GET | /tasks/:taskId/activity | Member | FR-ACT-002 |

**Every service:** `GET /health` (FR-SYS-001).

**Gateway:** `GET /api/v1/health`, public, answered by the gateway itself and never proxied (FR-SYS-002; added in DEV-1).

### 6.3 Task list query parameters
`status` (comma-separated), `priority` (comma-separated), `assigneeId` (UUID, `me` or `none`), `dueFrom`, `dueTo` (ISO dates), `includeArchived` (boolean), `sort` (`dueDate | priority | createdAt | updatedAt`), `order` (`asc | desc`), `page`, `pageSize` (≤ 100). All parameters are parsed with a Zod schema; unknown parameters are rejected.

### 6.4 Error codes
`VALIDATION_ERROR` 400 · `ASSIGNEE_NOT_MEMBER` 400 · `UNAUTHORIZED` 401 · `INVALID_CREDENTIALS` 401 · `INVALID_REFRESH_TOKEN` 401 · `FORBIDDEN` 403 · `NOT_FOUND` 404 · `USER_NOT_FOUND` 404 · `EMAIL_TAKEN` 409 · `ALREADY_MEMBER` 409 · `LAST_OWNER` 409 · `PROJECT_ARCHIVED` 409 · `TASK_ARCHIVED` 409 · `INVALID_STATUS_TRANSITION` 409 · `RATE_LIMITED` 429 · `INTERNAL_ERROR` 500 · `SERVICE_UNAVAILABLE` 503

---

## 7. Security design

### 7.1 Passwords
bcrypt with cost factor 12. The hash is never returned, logged or included in error messages. Login returns the same error for an unknown email and a wrong password, and runs a dummy hash comparison for unknown emails so response timing doesn't reveal which accounts exist.

### 7.2 Tokens

| Token | Format | Lifetime | Storage (client) | Storage (server) |
| --- | --- | --- | --- | --- |
| Access | JWT HS256: `sub`, `role`, `iat`, `exp` | 15 min | In memory (not localStorage) | Not stored |
| Refresh | 256-bit random string | 7 days | httpOnly, Secure, SameSite=Strict cookie, path `/api/v1/auth` | SHA-256 hash in `refresh_tokens` |

**Rotation and reuse detection:** every refresh revokes the presented token and issues a new one in the same `family_id`. If a revoked token is presented again, the whole family is revoked (FR-AUTH-003).

### 7.3 Authorization
- **Authentication** is done at the gateway (JWT verification) and repeated as an identity check in services via `X-User-Id` together with the internal token.
- **Authorization** is done in the tracker service layer with a `requireProjectRole(projectId, ['OWNER' | 'MEMBER'])` helper. Every query is scoped by membership, for example `Task.findOne({ where: { id }, include: membership of current user })`, rather than fetching first and checking afterwards.
- Non-members receive 404 (FRS section 2.2).

### 7.4 Other controls
- `helmet` security headers; CORS allows only the web origin.
- Rate limiting on `/auth/login` and `/auth/register` at the gateway (FR-AUTH-002).
- Request body size limit of 100 KB.
- Secrets (`JWT_SECRET`, `INTERNAL_TOKEN`, `DATABASE_URL`) come only from the environment. `.env` is git-ignored; `.env.example` documents every variable.
- Logs use pino with redaction of `authorization`, `cookie`, `password` and `token` fields.

---

## 8. Activity logging design
- An `ActivityService.record(tx, { taskId, actorId, action, metadata })` helper is called inside the same transaction as the change (section 5.5).
- `TASK_UPDATED` metadata stores only changed fields: `{ "changes": { "title": { "from": "A", "to": "B" } } }`.
- The `activities` table has no update or delete endpoints, and the service's database role has no UPDATE or DELETE grant on it in production configurations.

---

## 9. Frontend design

### 9.1 Routes
| Path | Page | Access |
| --- | --- | --- |
| /login, /register | Auth pages | Guest only |
| /projects | Project list | Authenticated |
| /projects/:projectId | Project detail + task list with filters | Member |
| /projects/:projectId/settings | Project edit and members | Owner |
| /tasks/:taskId | Task detail, comments, activity | Member |

### 9.2 State and data fetching
- Server state with TanStack Query, one hook per endpoint in `features/<feature>/api` (for example `useTasksQuery(projectId, filters)`, `useUpdateTaskStatusMutation()`). No `fetch` calls inside components.
- Task-list filters live in URL search params so views are shareable and survive reloads.
- Access token held in memory. The API client retries once after calling `/auth/refresh` on a 401, then redirects to `/login` if refresh fails.
- Types and form validation reuse the Zod schemas from `@app/shared` (via `react-hook-form` + `zodResolver`).

### 9.3 UI
shadcn/ui components on Tailwind. Every data view has loading, empty and error states. Status changes only offer allowed transitions (FR-TASK-005). Owner-only controls are hidden for Members, and the API still enforces the rule.

---

## 10. Error handling and logging
- Each service has a central Express error middleware. Code throws `AppError(code, status, message, details?)`; unknown errors become 500 `INTERNAL_ERROR` without leaking stack traces.
- Express 5 forwards rejected promises from async handlers to the error middleware automatically.
- The gateway returns 503 `SERVICE_UNAVAILABLE` when a downstream service is unreachable.
- Logs: pino JSON with `requestId`, `userId`, method, path, status and duration.

---

## 11. Testing strategy

| Level | Tool | Scope | Location |
| --- | --- | --- | --- |
| Unit | Vitest | Schemas, status-transition rules, token helpers, permission helpers | `packages/*`, `services/*/src/**/*.test.ts` |
| Integration | Vitest + Supertest | Each endpoint against a real PostgreSQL test database: success, validation, 401, 403/404, conflict cases | `services/*/test/` |
| Authorization | Vitest + Supertest | Matrix of role × action from FRS section 2.2 | `services/tracker/test/authz.test.ts` |
| Component | Vitest + React Testing Library | Forms, filters, permission-based UI | `apps/web/src/**/*.test.tsx` |
| End-to-end | Playwright | User journey from NFR-TST-002 | `e2e/` |

- Test names include the FR ID, for example `it('FR-TASK-005: rejects TODO → DONE with 409')`, so test results trace back to requirements.
- Integration tests use a separate database (`tracker_test`) that is migrated before the run and truncated between tests.
- Quality gates before every PR: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`.
- `pnpm test` runs each workspace's own Vitest config (`pnpm -r test`, so web can use jsdom), then the root `scripts/` tests. Unit and Supertest tests in this layer inject the database health check, so they need no running PostgreSQL. `pnpm lint` also runs `pnpm check:versions`, which rejects floating npm ranges and Docker tags (DEV-1).

---

## 12. Deployment and local environment

### 12.1 Docker Compose
| Service | Image | Host port |
| --- | --- | --- |
| postgres | `postgres:16.x-alpine` (exact tag in `docs/versions.md`) | 5433 → 5432 |
| auth | built from `services/auth/Dockerfile` | internal only |
| tracker | built from `services/tracker/Dockerfile` | internal only |
| api-gateway | built from `services/api-gateway/Dockerfile` | 4000 |
| web | built from `apps/web/Dockerfile` (nginx) | 8080 |

Host port 5433 is used for PostgreSQL to avoid conflicting with a locally installed PostgreSQL on 5432.

### 12.2 Dockerfiles
Multi-stage builds: install with `pnpm install --frozen-lockfile`, build, then copy only `dist` and production dependencies into a slim runtime image running as a non-root user. Install errors must not be suppressed.

### 12.3 Environment variables
| Variable | Used by | Example (`.env.example`) |
| --- | --- | --- |
| DATABASE_URL | auth, tracker, database | `postgresql://dev:dev@localhost:5433/tracker` |
| JWT_SECRET | gateway, auth | `change-me` |
| INTERNAL_TOKEN | gateway, auth, tracker | `change-me` |
| AUTH_SERVICE_URL | gateway | `http://localhost:4001` |
| TRACKER_SERVICE_URL | gateway | `http://localhost:4002` |
| WEB_ORIGIN | gateway | `http://localhost:5173` |
| PORT | each service | `4000` / `4001` / `4002` |

---

## 13. Deviations from the assignment's fixed stack

| # | Assignment specifies | This design uses | Reason | Approval |
| --- | --- | --- | --- | --- |
| DV-01 | Prisma ORM | Sequelize | Team decision | **Pending: record approver and date here** |
| DV-02 | (single backend implied) | api-gateway + auth + tracker services | Microservice structure requested for the project | **Pending** |

---

## 14. Open design decisions

| # | Decision | Status |
| --- | --- | --- |
| D-01 | Projects, tasks, comments and activity in one `tracker` service | Proposed |
| D-02 | JWT verified at the gateway, identity forwarded via headers plus internal token | Proposed |
| D-03 | bcrypt (cost 12) rather than argon2id | Proposed |
| D-04 | OpenAPI generated from Zod (`@asteasolutions/zod-to-openapi`) | Proposed, verify version compatibility with Context7 |
