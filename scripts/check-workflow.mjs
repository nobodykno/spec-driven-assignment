// Approval and verification gates for OpenSpec changes, and a check that docs/workflow.md
// documents every /sdd:* command (DEV-8 design D1, D4).
// Usage: node scripts/check-workflow.mjs   (run from the repository root; part of pnpm lint)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const COMMANDS_DIR = join('.claude', 'commands', 'sdd');
const DOC = join('docs', 'workflow.md');
const field = (text, name) => new RegExp(`^${name}:[ \\t]*(.*)$`, 'm').exec(text)?.[1].trim() ?? '';

/** @returns {string[]} reasons why implementation must be refused (empty when approved) */
export function checkApproval(proposalText) {
  if (field(proposalText, 'Status') !== 'Approved') {
    return ['proposal.md must contain "Status: Approved"'];
  }
  return ['Approved-by', 'Approved-on']
    .filter((name) => field(proposalText, name) === '')
    .map((name) => `proposal.md must have a filled-in "${name}:"`);
}

/** @returns {string[]} reasons why a change must not be archived (empty when verified) */
export function checkVerified(verificationText) {
  if (verificationText === undefined) {
    return ['verification.md is missing: run /sdd:verify first'];
  }
  if (verificationText.includes('NOT READY')) {
    return ['verification.md reports NOT READY'];
  }
  return verificationText.includes('READY FOR PR')
    ? []
    : ['verification.md has no "READY FOR PR" result'];
}

/** @returns {string[]} one finding per command without a "### /sdd:<name>" heading in the doc */
export function checkWorkflowDocs(commands, doc) {
  return commands
    .filter((name) => !new RegExp(`^#{2,4} /sdd:${name}\\b`, 'm').test(doc))
    .map((name) => `${DOC}: command /sdd:${name} is not documented`);
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
