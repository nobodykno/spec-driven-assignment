---
name: openspec-apply-change
description: Implement tasks from an OpenSpec change (test-writer, reviewer, commit after the user replies commit). Use when the user says "openspec apply", "opsx apply" or "openspec implement".
allowed-tools: Bash(pnpm exec openspec:*), Read, Write, Edit, Glob, Grep, Agent
---

<!-- Project-customised from the reference project; see docs/workflow.md. Do not regenerate. -->

Follow `.claude/commands/opsx/apply.md` exactly, together with the rule files it names in `.claude/rules/`. Use `pnpm exec openspec` for every CLI call. This skill holds no steps of its own, so the workflow is defined in one place.
