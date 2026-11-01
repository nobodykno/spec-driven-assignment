// Gate checks for OpenSpec changes (handoff.md, review.md) and a check that docs/workflow.md
// documents every /opsx:* command (DEV-8 design D1, D4; reworked for the opsx command set).
// Usage: node scripts/check-workflow.mjs   (run from the repository root; part of pnpm lint)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const COMMANDS_DIR = join('.claude', 'commands', 'opsx');
const DOC = join('docs', 'workflow.md');

/** @returns {{ stage: string, status: string, index: number }[]} handoff blocks in file order */
const blocks = (text) =>
  [...text.matchAll(/^### (\S+) \| [^|]+ \| (\S+)\s*$/gm)].map((match, index) => ({
    stage: match[1],
    status: match[2],
    index,
  }));
const latest = (list, ...stages) => list.filter((b) => stages.includes(b.stage)).at(-1);

/** @returns {string[]} reasons why implementation must be refused (empty when Gate 1 is approved) */
export function checkApproval(handoffText) {
  if (handoffText === undefined) {
    return ['handoff.md is missing: run /opsx:propose first'];
  }
  const list = blocks(handoffText);
  const gate = latest(list, 'gate-1');
  const plan = latest(list, 'propose', 'update');
  if (gate === undefined || gate.status !== 'APPROVED') {
    return ['handoff.md has no "gate-1 | APPROVED" block'];
  }
  return plan !== undefined && plan.index > gate.index
    ? ['a propose/update block is newer than gate-1: approval is cancelled']
    : [];
}

/** @returns {string[]} reasons why a change must not be archived (empty when the review passed) */
export function checkVerified(handoffText) {
  if (handoffText === undefined) {
    return ['handoff.md is missing: run /opsx:verify first'];
  }
  const review = latest(blocks(handoffText), 'review');
  if (review === undefined) {
    return ['handoff.md has no review block: run /opsx:verify first'];
  }
  return review.status === 'PASS' ? [] : [`latest review block is ${review.status}, not PASS`];
}

/** @returns {string[]} one finding per command without a "### /opsx:<name>" heading in the doc */
export function checkWorkflowDocs(commands, doc) {
  return commands
    .filter((name) => !new RegExp(`^#{2,4} /opsx:${name}\\b`, 'm').test(doc))
    .map((name) => `${DOC}: command /opsx:${name} is not documented`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const commands = existsSync(COMMANDS_DIR)
    ? readdirSync(COMMANDS_DIR)
        .filter((file) => file.endsWith('.md'))
        .map((file) => file.replace(/\.md$/, ''))
    : [];
  const findings = existsSync(DOC)
    ? checkWorkflowDocs(commands, readFileSync(DOC, 'utf8'))
    : [`${DOC} is missing`];
  if (findings.length > 0) {
    console.error(`Workflow problems (${findings.length}):`);
    for (const finding of findings) {
      console.error(`  - ${finding}`);
    }
    process.exit(1);
  }
}
