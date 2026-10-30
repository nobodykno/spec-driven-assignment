// Fails when .claude/settings.json has malformed permission rules or broken hooks (DEV-5 design D6).
// Usage: node scripts/check-claude-settings.mjs   (part of pnpm lint)
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const FILE = '.claude/settings.json';
const RULE = /^([A-Za-z][A-Za-z0-9_]*)(?:\((.+)\))?$/;
// `node "$CLAUDE_PROJECT_DIR/<path>"` (or a plain relative path) in a hook command.
const HOOK_SCRIPT = /node\s+"?(?:\$CLAUDE_PROJECT_DIR\/)?([^"\s]+\.(?:mjs|cjs|js))"?/g;
const LISTS = ['allow', 'ask', 'deny'];
const MODES = new Set(['default', 'acceptEdits', 'plan', 'bypassPermissions']);
export const REQUIRED_HOOKS = {
  PreToolUse: 'pre-tool-guard.mjs',
  PostToolUse: 'post-edit-format.mjs',
};
// DEV-5 spec "Risky actions need human approval".
export const REQUIRED_POLICY = {
  defaultMode: 'default',
  ask: [
    'Bash(git push:*)',
    'Bash(gh pr create:*)',
    'Bash(gh pr merge:*)',
    'Bash(pnpm add:*)',
    'Bash(pnpm remove:*)',
    'Bash(pnpm install:*)',
    'mcp__atlassian__createJiraIssue',
    'mcp__atlassian__editJiraIssue',
    'mcp__atlassian__transitionJiraIssue',
    'mcp__atlassian__addCommentToJiraIssue',
  ],
  forbiddenAllow: ['Bash(docker:*)', 'Bash(git push:*)', 'Bash(gh pr merge:*)', 'Bash(pnpm add:*)'],
};

const isBalanced = (spec) => {
  let depth = 0;
  for (const char of spec) {
    depth += char === '(' ? 1 : char === ')' ? -1 : 0;
    if (depth < 0) {
      return false;
    }
  }
  return depth === 0;
};

/** @returns {string | null} a finding for a malformed permission rule */
export function checkRule(rule) {
  const match = typeof rule === 'string' ? RULE.exec(rule) : null;
  if (!match || (match[2] !== undefined && !isBalanced(match[2]))) {
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
    const scripts = hookCommands(hooks, event).flatMap((command) =>
      [...command.matchAll(HOOK_SCRIPT)].map((match) => match[1]),
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

function checkPolicy(permissions = {}, policy) {
  if (!policy) {
    return [];
  }
  const findings = [];
  if (permissions.defaultMode !== policy.defaultMode) {
    findings.push(`${FILE}: defaultMode must be "${policy.defaultMode}"`);
  }
  const ask = new Set(permissions.ask ?? []);
  const allow = new Set(permissions.allow ?? []);
  findings.push(
    ...policy.ask
      .filter((rule) => !ask.has(rule))
      .map((rule) => `${FILE}: ${JSON.stringify(rule)} must be in ask`),
  );
  findings.push(
    ...policy.forbiddenAllow
      .filter((rule) => allow.has(rule))
      .map((rule) => `${FILE}: ${JSON.stringify(rule)} must not be allowed`),
  );
  return findings;
}

/**
 * @param {object} settings parsed .claude/settings.json
 * @param {{ root?: string, fileExists?: (path: string) => boolean, requiredHooks?: object, requiredPolicy?: object }} options
 * @returns {string[]} findings
 */
export function checkSettings(settings, options = {}) {
  const {
    root = process.cwd(),
    fileExists = existsSync,
    requiredHooks = {},
    requiredPolicy,
  } = options;
  return [
    ...checkPermissions(settings.permissions),
    ...checkPolicy(settings.permissions, requiredPolicy),
    ...checkHooks(settings.hooks, { root, fileExists, requiredHooks }),
  ];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = join(fileURLToPath(import.meta.url), '..', '..');
  const settings = JSON.parse(readFileSync(join(root, FILE), 'utf8'));
  const findings = checkSettings(settings, {
    root,
    requiredHooks: REQUIRED_HOOKS,
    requiredPolicy: REQUIRED_POLICY,
  });
  if (findings.length > 0) {
    console.error(`Claude Code settings problems (${findings.length}):`);
    for (const finding of findings) {
      console.error(`  - ${finding}`);
    }
    process.exit(1);
  }
}
