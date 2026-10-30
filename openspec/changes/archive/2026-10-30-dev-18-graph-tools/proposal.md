Ticket: DEV-18
Ticket source: live MCP
Status: Approved
Approved-by: Paramjit Jena (via chat)
Approved-on: 2026-10-30 16:58 IST

# Proposal: DEV-18 Codebase graph setup

> Jira issue `DEV-18` is titled "[DEV-1015] Codebase graph setup — Code Review Graph and Graphify,
> queries and token-efficiency evaluation". The assignment ID is **DEV-1015**.

## Why

Agents read whole files to find affected code. Graph tools let them query affected files and review
impact first (Assignment Rules 12–16). The ticket installs both tools reproducibly, records real
queries confirmed against source, and measures token efficiency with real numbers, no claims without evidence.

## FRS requirements covered

Workflow tickets are specified in their OpenSpec change, not in the FRS (FRS §5).

| ID | Coverage |
| --- | --- |
| NFR-OPS-001 | Both tools pinned to exact versions, recorded in `docs/versions.md`; `pnpm check:versions` still passes |
| NFR-MNT-001 | `scripts/check-graph-docs.mjs` in `pnpm lint`: graph caches git-ignored, docs have required sections and measured values |
| Assignment Rules 12–16 | Install via `uv`, build graph, ≥5 queries confirmed against source, impact radius in review, 4 measured runs |

## SDS sections followed / changed

- **Followed:** §3 Repository structure, §11 Testing strategy.
- **Changed:** none.

## Affected packages

Root only: `docs/versions.md`, `docs/graph-tools.md` (new), `docs/token-efficiency.md` (extend DEV-6's file),
`.gitignore`, `scripts/check-graph-docs.mjs` (+ test), root lint script.

## New dependencies (outside any `package.json`; installed as `uv` tools)

| Tool | PyPI package | Version | Reason |
| --- | --- | --- | --- |
| uv | `uv` (Homebrew or official installer; not installed yet) | version recorded at install | Required by the ticket: no manual Python install |
| Code Review Graph | `code-review-graph` | 2.3.9 (PyPI, checked 2026-10-30) | Impact radius, detect-changes, graph review |
| Graphify | `graphifyy` (double y; CLI `graphify`) | 0.9.97 (PyPI, checked 2026-10-30) | Queryable knowledge graph of code and docs |

Versions are re-checked at apply time; if PyPI shows a different release the proposal is updated and
you re-approve before anything is installed.

## Database changes

None.

## Rollback plan

`uv tool uninstall code-review-graph graphifyy`, delete the graph cache folders, revert the doc and `.gitignore` commits.

## Ticket dependencies

- DEV-1 (DEV-1001) — **Done** (checked live, 2026-10-30). Blocks DEV-21 (not started).

## Open questions

1. `uv` is not installed. OK to install it with Homebrew (system-level, outside the repo)?
2. Does either tool upload code or call an external LLM (Graphify may use one for docs/images)? The
   plan restricts runs to local/AST mode and records what each tool sends; if a key would be needed, I stop and ask.
3. The four token runs (task × 2, review × 2) use this session's measurable counts; `/cost` may need to
   come from you, as in DEV-6.
