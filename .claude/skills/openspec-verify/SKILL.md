---
name: openspec-verify
description: Fresh-session verification of a change: gates, traceability and the reviewer agent with code-review-graph. Use when the user says "openspec verify" or "opsx verify".
allowed-tools: Bash(pnpm:*), Bash(pnpm exec openspec:*), Read, Write, Edit, Glob, Grep, Agent
---

<!-- Project-customised from the reference project; see docs/workflow.md. Do not regenerate. -->

Follow `.claude/commands/opsx/verify.md` exactly, together with the rule files it names in `.claude/rules/`. Use `pnpm exec openspec` for every CLI call. This skill holds no steps of its own, so the workflow is defined in one place.
