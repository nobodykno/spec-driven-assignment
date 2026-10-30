# Design: DEV-8 OpenSpec workflow

## Context

`.claude/commands/sdd/` has apply, propose, run, ship, verify. `/sdd:apply` already stops without
`Status: Approved`, but only as prompt text. `.claude/commands/opsx/` is generated and not edited.
Follows SDS §3 and §11.

## Decisions

- **D1 Gate as code.** The approval rule is a pure function in `scripts/check-workflow.mjs`, unit tested;
  `/sdd:apply` keeps its text rule and names the script as the reference.
- **D2 Archive on the branch.** `/sdd:archive` is what `/sdd:run` stage d already does by hand; the
  command wraps native `openspec archive` and refuses without a passing `verification.md`.
- **D3 No second DEV-1001 archive.** Verified, not repeated.
- **D4 Doc/command sync.** The checker lists `.claude/commands/sdd/*.md` and requires a heading per command in `docs/workflow.md`.

## Docs checked

OpenSpec CLI `archive` and `validate` flags checked with `openspec archive --help` during apply; Context7 not needed (no library API).
