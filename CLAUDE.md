# CLAUDE.md

## Workflow
- All features and setup work go through OpenSpec:
  /opsx:propose → human review → /opsx:apply → /opsx:verify → PR → /opsx:archive
- Never write code without an approved change in openspec/changes/
- Work on a feature branch (feature/... or chore/...), never commit to main
- One task from tasks.md = one commit. Commit message: "<change-name>: <task number> <summary>"

## Commands (run from repo root)
- Install:      pnpm install
- Dev:          pnpm dev            (gateway :4000, auth :4001, web :5173)
- Test:         pnpm test
- Typecheck:    pnpm typecheck
- Build:        pnpm build
- One package:  pnpm --filter <name> test     (names: @app/shared, @app/database, auth, api-gateway, web)
- Add a dep:    pnpm --filter <name> add <pkg>   (ask the user first)
- Database:     pnpm db:up / pnpm db:down

## Architecture rules
- services/api-gateway is the only public entry point; web calls /api/v1/* through it
- Only packages/database imports sequelize; services import @app/database
- API request/response shapes are Zod schemas in packages/shared; services and web import them
- Each Express service keeps app.ts (routes) separate from index.ts (listen) so tests use supertest on `app`
- Every service exposes GET /health
- Errors are returned as { error: { code, message } }

## Code rules
- TypeScript strict; no `any`, no @ts-ignore
- Every Node package's tsconfig extends ../../tsconfig.base.json
- Config comes from environment variables; document every variable in .env.example
- Write tests before implementation for anything with behavior

## Never
- Read, print or commit .env files or secrets
- Use npm or yarn (pnpm only)
- Push to main, or force-push
- Add a package that isn't listed in the approved proposal without asking