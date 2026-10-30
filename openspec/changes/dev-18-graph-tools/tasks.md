# Tasks: DEV-18 Codebase graph setup

Rules: tests first; test names start with the requirement ID; one commit per task
`type(area): <n.m> <summary>` with footer `Refs: DEV-18`. Area `workflow` (`docs` for docs only).

## 1. Checker (D5)

- [x] 1.1 Write `scripts/check-graph-docs.test.mjs` first: versions, ignore entries, query count, 4-run table, placeholders. Verify: `pnpm exec vitest run scripts/check-graph-docs.test.mjs` fails. **[NFR-OPS-001, NFR-MNT-001]**
- [ ] 1.2 Implement `scripts/check-graph-docs.mjs`; add `check:graph-docs` to `pnpm lint`. Verify: the test passes. **[NFR-OPS-001, NFR-MNT-001]**

## 2. Install and build (D1–D3)

- [ ] 2.1 Install `uv`, then `code-review-graph` and `graphifyy` at the approved versions; record in `docs/versions.md`. Verify: `uv tool list`. **[NFR-OPS-001]**
- [ ] 2.2 Build both graphs; add cache paths to `.gitignore`. Verify: `git status` shows no cache files. **[NFR-OPS-001]**

## 3. Queries and docs

- [ ] 3.1 Write `docs/graph-tools.md`: setup, versions, build stats, ≥5 queries each confirmed against source. Verify: checker passes. **[NFR-MNT-001]**

## 4. Token efficiency (D4)

- [ ] 4.1 Run task baseline and graph-assisted; record tokens, files, time, findings. Verify: table rows filled. **[NFR-MNT-001]**
- [ ] 4.2 Run review baseline and graph-assisted with impact radius / detect-changes output; record. Verify: checker passes. **[NFR-MNT-001]**
- [ ] 4.3 Write method and limitations; no reduction claim beyond the measured numbers. Verify: checker passes. **[NFR-MNT-001]**

## 5. Quality gates

- [ ] 5.1 `pnpm build && pnpm lint && pnpm typecheck && pnpm test` all pass.
