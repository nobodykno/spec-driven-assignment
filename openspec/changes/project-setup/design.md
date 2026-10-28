# Design

## Context

This is a greenfield monorepo. The workspace structure and base TypeScript config exist, but no packages, services, or tooling are in place. See proposal.md for motivation.

The existing constraints:
- pnpm workspaces already configured at `apps/*`, `services/*`, `packages/*`
- `tsconfig.base.json` sets TypeScript strict mode, ES2022 target, NodeNext modules
- ESM (`"type": "module"`) is the default

## Goals / Non-Goals

**Goals:**
- Establish a working dev environment where `pnpm dev` starts all services
- Create shared packages that services can import via workspace protocol
- Set up database connectivity infrastructure (connection pool, migrations folder)
- Enable testing with `pnpm test` across all packages

**Non-Goals:**
- Authentication logic (login, register, JWT) - deferred to a future change
- Database tables or migrations - this change sets up the folder only
- Production deployment configuration beyond Dockerfiles
- CI/CD pipeline

## Decisions

### 1. Test runner: Vitest

**Choice:** Vitest over Jest

**Rationale:** Native ESM support without configuration complexity. The project uses `"type": "module"` and NodeNext resolution; Jest requires additional transforms for ESM. Vitest works out of the box with the existing TypeScript setup.

**Alternatives considered:**
- Jest: Requires `ts-jest` or `babel-jest` transforms, `extensionsToTreatAsEsm`, and mock configuration for ESM
- Node test runner: Built-in but lacks watch mode and snapshot features

### 2. Shared schemas: Zod in packages/shared

**Choice:** Define all API request/response schemas in `@app/shared` using Zod

**Rationale:**
- Single source of truth for API contracts
- Runtime validation + TypeScript inference from one definition
- Services and web import the same schemas, ensuring consistency

**Alternatives considered:**
- JSON Schema: Requires separate code generation step for TypeScript types
- io-ts: More complex API, smaller community
- Per-service schemas: Duplicates definitions, risks drift

### 3. Database access: Sequelize isolated in packages/database

**Choice:** Only `@app/database` imports Sequelize; services import the package

**Rationale:**
- Encapsulates connection management and model definitions
- Services call `connectDatabase()` without knowing connection details
- Enables connection pooling configuration in one place

**Alternatives considered:**
- Direct Sequelize imports in services: Scatters database concerns
- Prisma: Requires build step for client generation; Sequelize is more conventional for this project's migration-based workflow

### 4. Gateway proxy: http-proxy-middleware

**Choice:** Use `http-proxy-middleware` in api-gateway to forward `/api/v1/auth/*`

**Rationale:** Well-maintained Express middleware with path rewriting, WebSocket support (for future use), and straightforward configuration.

**Alternatives considered:**
- Manual HTTP forwarding: More code, error-prone
- nginx as gateway: Adds deployment complexity; Express allows business logic in routing
- Fastify with `@fastify/http-proxy`: Would require switching frameworks

### 5. Service structure: Separate app.ts from index.ts

**Choice:** Each service has `app.ts` (Express app setup) and `index.ts` (server start)

**Rationale:** Tests import `app` directly and use Supertest without starting a server. Server concerns (port binding, graceful shutdown) stay in `index.ts`.

### 6. Configuration: Environment variables with .env.example

**Choice:** All configuration from environment variables, documented in `.env.example` files

**Rationale:**
- 12-factor app compliance
- Docker and local dev use the same mechanism
- `.env.example` serves as documentation; actual `.env` is gitignored

### 7. Health check contract

**Choice:** Health endpoints return `{ "status": "ok" | "error" }` with HTTP 200 or 503

**Rationale:** Simple boolean contract that Docker healthchecks and load balancers can interpret. The gateway checks only its own process; the auth service verifies database connectivity.

**Schema (in @app/shared):**
```typescript
const HealthResponseSchema = z.object({
  status: z.enum(["ok", "error"])
});
```

## Risks / Trade-offs

**[Risk] Sequelize CLI requires CommonJS config** → The `.sequelizerc` and `config/config.js` files must be CommonJS despite the project using ESM. This is a known Sequelize limitation. The migration files themselves can be ESM.

**[Risk] Development proxy adds latency** → Vite proxying to api-gateway adds a hop in dev. Acceptable for development; production serves static assets directly from nginx.

**[Trade-off] No type checking between packages at dev time** → pnpm workspace protocol links to built output. Running `pnpm typecheck` validates, but IDE errors may lag until rebuild. Accepted for simplicity over path aliases or project references.

**[Trade-off] No linting configuration in this change** → ESLint and Prettier are installed but not configured. A separate `.eslintrc` and `.prettierrc` setup is deferred to avoid scope creep.
