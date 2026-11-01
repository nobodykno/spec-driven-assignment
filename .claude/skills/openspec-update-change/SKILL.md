---
name: openspec-update-change
description: Update an OpenSpec change by revising its existing planning artifacts and keeping them coherent. Use when the user says "openspec update change" or "opsx update". If the user means the openspec update CLI command, run that command instead. Never edits code.
allowed-tools: Bash(pnpm exec openspec:*), Read, Write, Edit, Glob, Grep
---

<!-- Project-customised from the reference project; see docs/workflow.md. Do not regenerate. -->

Follow `.claude/commands/opsx/update.md` exactly, together with the rule files it names in `.claude/rules/`. Use `pnpm exec openspec` for every CLI call. This skill holds no steps of its own, so the workflow is defined in one place.
