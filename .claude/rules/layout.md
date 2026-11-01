
<!-- Project-customised from the reference project; see docs/workflow.md. Do not regenerate. -->
# Layout and vocabulary

One layout, one vocabulary. Commands, specs, tasks and agents use these names and no others.
Every command also follows `CLAUDE.md`, `docs/CODING_GUIDELINES.md` and `docs/token-policy.md`.

| Layer | Path | Layer rules | Branch domain | Task tag | Commit area |
|-------|------|-------------|---------------|----------|-------------|
| Shared contract (`@app/shared`) | `packages/shared` | `CLAUDE.md` (Code rules) | `shared` | `[shared]` | `shared` |
| Database (`@app/database`) | `packages/database` | `CLAUDE.md`, skill `sequelize-migration` | `database` | `[database]` | `database` |
| Auth service (:4001) | `services/auth` | `services/CLAUDE.md` | `auth` | `[auth]` | `auth` |
| Tracker service (:4002) | `services/tracker` | `services/CLAUDE.md` | `tracker` | `[tracker]` | `tracker` |
| API gateway (:4000) | `services/api-gateway` | `services/CLAUDE.md` | `gateway` | `[gateway]` | `gateway` |
| Web (React SPA, :5173) | `apps/web` | `apps/web/CLAUDE.md` | `web` | `[web]` | `web` |
| End-to-end (Playwright) | `e2e/` | `CLAUDE.md` (Commands) | `e2e` | `[e2e]` | `web` |
| Docker and local environment | `docker-compose.yml`, `Dockerfile`s | none | `docker` | `[docker]` | `docker` |
| Docs, OpenSpec, Claude setup | `docs/`, `openspec/`, `.claude/` | none | `docs` | `[docs]` | `docs` or `workflow` |

- Say "service" for `services/*` and "web" for `apps/web`. The word "API" means the HTTP contract (`delta-openapi.yaml`, SDS section 6), not a directory.
- `@app/database` is the only package that imports `sequelize`. Layering inside a service: routes, controllers, services, `@app/database` models (SDS 3.1).
- Before touching a layer, read its `CLAUDE.md`.
- Dependency order for tasks: `[shared]`, then `[database]`, then `[auth]` / `[tracker]` (then `[gateway]`), then `[web]` (parallel after shared and the services are committed), then `[e2e]`, then `[docker]`, then `[docs]`.
- Parallel tickets (`[PARALLEL]` in `docs/mcp-setup.md`) use one git worktree each; the `coordinator` agent plans them and records them in `docs/worktrees.md`.
- Branch: `feature/{domain}/DEV-<n>-<short-name>` (for example `feature/auth/DEV-9-auth`). Change name: `dev-<n>-<short-name>`, lowercase.
- Ticket keys: use the Jira key `DEV-<n>` in branches, change names and commit footers. The assignment ID (`DEV-10xx`) appears in the Jira summary and in `docs/FRS.md` section 5; the map is `docs/mcp-setup.md` ("Ticket key mapping").
- Paths in specs, designs and tasks are repo-relative and start with one of the paths above.
