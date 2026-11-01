---
name: openspec-propose
description: Propose a new OpenSpec change for a Jira ticket: fetch it, open-decision gate, all artifacts, stop at Gate 1. Use when the user says "openspec propose" or "opsx propose".
allowed-tools: Bash(pnpm exec openspec:*), Read, Write, Edit, Glob, Grep, AskUserQuestion
---

<!-- Project-customised from the reference project; see docs/workflow.md. Do not regenerate. -->

Follow `.claude/commands/opsx/propose.md` exactly, together with the rule files it names in `.claude/rules/`. Use `pnpm exec openspec` for every CLI call. This skill holds no steps of its own, so the workflow is defined in one place.
