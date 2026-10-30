// Fails when .claude/settings.json has malformed permission rules or broken hooks (DEV-5 design D6).
// Usage: node scripts/check-claude-settings.mjs   (part of pnpm lint)
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const FILE = '.claude/settings.json';
const RULE = /^([A-Za-z][A-Za-z0-9_]*)(?:\((.+)\))?$/;
const LISTS = ['allow', 'ask', 'deny'];
const MODES = new Set(['default', 'acceptEdits', 'plan', 'bypassPermissions']);
const HOOK_SCRIPT = /\.claude\/hooks\/[\w.-]+\.mjs/g;
export const REQUIRED_HOOKS = {
  PreToolUse: 'pre-tool-guard.mjs',
  PostToolUse: 'post-edit-format.mjs',
};

/** @returns {string | null} a finding for a malformed permission rule */
export function checkRule(rule) {
  const match = typeof rule === 'string' ? RULE.exec(rule) : null;
  if (!match) {
    return `${FILE}: malformed permission rule ${JSON.stringify(rule)}`;
  }
  const spec = match[2];
  if (spec?.includes(':*') && !spec.endsWith(':*')) {
    return `${FILE}: ":*" must end the rule ${JSON.stringify(rule)}`;
  }
  return null;
}

function checkPermissions(permissions = {}) {
  const findings = [];
  const seenIn = new Map();
  for (const list of LISTS) {
    for (const rule of permissions[list] ?? []) {
      findings.push(checkRule(rule));
      seenIn.set(rule, [...(seenIn.get(rule) ?? []), list]);
    }
  }
  for (const [rule, lists] of seenIn) {
    if (lists.length > 1) {
      findings.push(`${FILE}: ${JSON.stringify(rule)} appears in ${lists.join(' and ')}`);
    }
  }
  if (permissions.defaultMode !== undefined && !MODES.has(permissions.defaultMode)) {
    findings.push(`${FILE}: unknown defaultMode ${JSON.stringify(permissions.defaultMode)}`);
  }
  return findings.filter(Boolean);
}

const hookCommands = (hooks, event) =>
  (hooks?.[event] ?? []).flatMap((entry) => (entry.hooks ?? []).map((hook) => hook.command ?? ''));

function checkHooks(hooks, { root, fileExists, requiredHooks }) {
  const findings = [];
  for (const event of Object.keys(hooks ?? {})) {
    const scripts = hookCommands(hooks, event).flatMap(
      (command) => command.match(HOOK_SCRIPT) ?? [],
    );
    const missing = scripts.filter((script) => !fileExists(join(root, script)));
    findings.push(...missing.map((script) => `${FILE}: ${event} hook script ${script} not found`));
  }
  for (const [event, script] of Object.entries(requiredHooks)) {
    if (!hookCommands(hooks, event).some((command) => command.includes(script))) {
      findings.push(`${FILE}: ${event} hook ${script} is not registered`);
    }
  }
  return findings;
}

/**
 * @param {object} settings parsed .claude/settings.json
 * @param {{ root?: string, fileExists?: (path: string) => boolean, requiredHooks?: object }} options
 * @returns {string[]} findings
 */
export function checkSettings(settings, options = {}) {
  const { root = process.cwd(), fileExists = existsSync, requiredHooks = {} } = options;
  return [
    ...checkPermissions(settings.permissions),
    ...checkHooks(settings.hooks, { root, fileExists, requiredHooks }),
  ];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = join(fileURLToPath(import.meta.url), '..', '..');
  const settings = JSON.parse(readFileSync(join(root, FILE), 'utf8'));
  const findings = checkSettings(settings, { root, requiredHooks: REQUIRED_HOOKS });
  if (findings.length > 0) {
    console.error(`Claude Code settings problems (${findings.length}):`);
    for (const finding of findings) {
      console.error(`  - ${finding}`);
    }
    process.exit(1);
  }
}
