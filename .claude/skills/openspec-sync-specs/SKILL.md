---
name: openspec-sync-specs
description: Sync delta specs from an OpenSpec change to main specs after the PR is merged. Use when the user says "openspec sync" or "opsx sync".
allowed-tools: Bash(pnpm exec openspec:*), Read, Write, Edit, Glob, Grep
---

<!-- Project-customised from the reference project; see docs/workflow.md. Do not regenerate. -->

Follow `.claude/commands/opsx/sync.md` exactly, together with the rule files it names in `.claude/rules/`. Use `pnpm exec openspec` for every CLI call. This skill holds no steps of its own, so the workflow is defined in one place.
