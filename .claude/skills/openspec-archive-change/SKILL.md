---
name: openspec-archive-change
description: Archive a completed OpenSpec change after the PR is merged and the specs are synced. Use when the user says "openspec archive" or "opsx archive".
allowed-tools: Bash(pnpm exec openspec:*), Read, Write, Edit, Glob, Grep
---

<!-- Project-customised from the reference project; see docs/workflow.md. Do not regenerate. -->

Follow `.claude/commands/opsx/archive.md` exactly, together with the rule files it names in `.claude/rules/`. Use `pnpm exec openspec` for every CLI call. This skill holds no steps of its own, so the workflow is defined in one place.
