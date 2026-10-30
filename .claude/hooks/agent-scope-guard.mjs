// Claude Code PreToolUse hook registered in a subagent's frontmatter (DEV-6 design D2, D3).
// Usage: node agent-scope-guard.mjs --agent <name>; exit 2 + stderr blocks the call.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { splitCommand } from './pre-tool-guard.mjs';

const HOOK = '.claude/hooks/agent-scope-guard.mjs';
const MAX_DEPTH = 3;
const READ_TOOLS = new Set(['Read', 'Grep', 'Glob', 'TodoWrite']);
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const TEST_PATH = /\.(test|spec)\.[cm]?[jt]sx?$/;
const JIRA_READ = /^mcp__atlassian__(get|search|lookup|fetch|atlassianUserInfo)/;
// `>` or `>>` to a file; `2>&1` and `> /dev/null` are not writes.
const FILE_REDIRECT = /(^|[^0-9&>])>>?\s*(?!&|\/dev\/null\b)/;
const SUBSTITUTION = /\$\(|`/;
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const GIT_READS = ['diff', 'log', 'show', 'status'];
const PNPM_RUNS = new Set(['test', 'lint', 'typecheck', 'build', 'vitest']);
const PNPM_EXEC = new Set(['vitest', 'playwright']);
const OPENSPEC_READS = new Set(['list', 'status', 'show', 'validate', 'instructions']);

const REASONS = {
  'not-approved':
    'the current branch has no approved OpenSpec change (Status: Approved, Approved-by, Approved-on)',
  'push-or-pr': 'the implementer never pushes or opens/merges PRs; the main session ships',
  'jira-write': 'the implementer never writes to Jira; the main session updates tickets',
  'production-code': 'the test-writer may change only test files (*.test.*, *.spec.*, e2e/)',
  'edit-not-allowed': 'this agent may not edit this file (see docs/agents.md)',
  'command-not-allowed': 'this command is outside the agent allowlist (see docs/agents.md)',
  'tool-not-allowed': 'this tool is outside the agent allowlist (see docs/agents.md)',
  'unknown-agent': 'pass --agent implementer|test-writer|reviewer|coordinator',
  'malformed-input': 'the hook payload could not be read, so the call is blocked to be safe',
};

const allow = () => ({ allow: true });
const block = (rule) => ({
  allow: false,
  rule,
  reason: `Blocked by ${HOOK} (${rule}): ${REASONS[rule]}.`,
});

/** Words of each simple command, with leading `VAR=value` assignments removed. */
const simpleCommands = (command) =>
  splitCommand(command).map((words) => {
    const first = words.findIndex((word) => !ASSIGNMENT.test(word));
    return first === -1 ? [] : words.slice(first);
  });

const isGitRead = ([name, sub, ...rest], extra = []) =>
  name === 'git' &&
  [...GIT_READS, ...extra].includes(sub) &&
  !rest.some((arg) => arg.startsWith('--output'));

const isPnpmRun = ([name, ...args]) => {
  if (name !== 'pnpm') {
    return false;
  }
  const words = args.filter((arg, i) => !arg.startsWith('-') && args[i - 1] !== '--filter');
  return words[0] === 'exec' ? PNPM_EXEC.has(words[1]) : PNPM_RUNS.has(words[0]);
};

const isBranchList = ([name, sub, ...rest]) =>
  name === 'git' &&
  sub === 'branch' &&
  rest.every((arg) => ['-a', '-r', '--list', '-v'].includes(arg));
const isWorktreeList = ([name, sub, action]) =>
  name === 'git' && sub === 'worktree' && action === 'list';
const isOpenspecRead = ([name, sub]) => name === 'openspec' && OPENSPEC_READS.has(sub);

const BASH_ALLOWLIST = {
  reviewer: [isGitRead],
  'test-writer': [isGitRead, isPnpmRun],
  coordinator: [isGitRead, isBranchList, isWorktreeList, isOpenspecRead],
};

function checkAllowlistedBash(agent, command) {
  if (SUBSTITUTION.test(command) || FILE_REDIRECT.test(command)) {
    return 'command-not-allowed';
  }
  const checks = BASH_ALLOWLIST[agent];
  const allowed = simpleCommands(command).every((words) => checks.some((check) => check(words)));
  return allowed ? null : 'command-not-allowed';
}

const GIT_VALUE_OPTIONS = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace']);

/** The subcommand after git's global options (`-C <path>`, `-c k=v`, `--git-dir=<x>`, ...). */
function gitSubcommand(args) {
  let i = 0;
  while (i < args.length && args[i].startsWith('-')) {
    i += GIT_VALUE_OPTIONS.has(args[i]) ? 2 : 1;
  }
  return args[i];
}

/** True for `git [options] push` and any `gh` call, also inside quoted words and substitutions. */
function pushesOrOpensPr(command, depth = 0) {
  return simpleCommands(command.replace(/\$\(|`/g, ';')).some((words) => {
    // Any word that is git/gh (also `/usr/bin/git`, after `command`, `env`, `xargs`, ...) counts.
    const names = words.map((word) => word.split('/').at(-1));
    if (
      names.includes('gh') ||
      names.some((n, i) => n === 'git' && gitSubcommand(words.slice(i + 1)) === 'push')
    ) {
      return true;
    }
    return (
      depth < MAX_DEPTH && words.some((word) => /\s/.test(word) && pushesOrOpensPr(word, depth + 1))
    );
  });
}

function checkBash(agent, command) {
  if (typeof command !== 'string' || command.trim() === '') {
    return 'malformed-input';
  }
  if (agent === 'implementer') {
    return pushesOrOpensPr(command) ? 'push-or-pr' : null;
  }
  return checkAllowlistedBash(agent, command);
}

/** Project-relative path, or null when the path leaves the project. */
function projectPath(filePath, projectDir) {
  const path = relative(projectDir, resolve(projectDir, filePath));
  return path.startsWith('..') || isAbsolute(path) ? null : path;
}

function checkEdit(agent, input, { projectDir, approved }) {
  const filePath = input.file_path ?? input.notebook_path;
  if (typeof filePath !== 'string' || filePath === '') {
    return 'malformed-input';
  }
  const path = projectPath(filePath, projectDir);
  const rules = {
    implementer: () => (approved && path !== null ? null : 'not-approved'),
    'test-writer': () =>
      path !== null && (TEST_PATH.test(path) || path.startsWith('e2e/')) ? null : 'production-code',
    coordinator: () =>
      ['docs/progress.md', 'docs/worktrees.md'].includes(path) ? null : 'edit-not-allowed',
    reviewer: () => 'edit-not-allowed',
  };
  return rules[agent]();
}

function checkOtherTool(agent, toolName) {
  if (agent === 'implementer') {
    return toolName.startsWith('mcp__atlassian__') && !JIRA_READ.test(toolName)
      ? 'jira-write'
      : null;
  }
  return agent === 'test-writer' && toolName === 'Skill' ? null : 'tool-not-allowed';
}

function checkTool(agent, toolName, input, context) {
  if (toolName === 'Bash') {
    return checkBash(agent, input.command);
  }
  if (EDIT_TOOLS.has(toolName)) {
    return checkEdit(agent, input, context);
  }
  return READ_TOOLS.has(toolName) ? null : checkOtherTool(agent, toolName);
}

const AGENTS = new Set(['implementer', ...Object.keys(BASH_ALLOWLIST)]);

/**
 * Decides whether a subagent's tool call may run.
 * @param {string | undefined} agent agent name from `--agent`
 * @param {unknown} payload Claude Code PreToolUse payload ({ tool_name, tool_input })
 * @param {{ projectDir: string, approved: boolean }} context project root and change approval
 * @returns {{ allow: true } | { allow: false, rule: string, reason: string }}
 */
export function evaluateAgentCall(agent, payload, context) {
  if (!AGENTS.has(agent)) {
    return block('unknown-agent');
  }
  const toolName = payload?.tool_name;
  const input = payload?.tool_input;
  if (typeof toolName !== 'string' || typeof input !== 'object' || input === null) {
    return block('malformed-input');
  }
  const rule = checkTool(agent, toolName, input, context);
  return rule ? block(rule) : allow();
}

/**
 * @param {string} branch e.g. `feature/DEV-6-agents`
 * @returns {string | null} the OpenSpec change name, e.g. `dev-6-agents`
 */
export function changeNameForBranch(branch) {
  const match = /^feature\/([A-Z]+-\d+-[a-z0-9-]+)$/.exec(branch);
  return match ? match[1].toLowerCase() : null;
}

/**
 * @param {string} proposal proposal.md text
 * @returns {boolean} true when Status is Approved and Approved-by and Approved-on are filled in
 */
export function isApprovedProposal(proposal) {
  const field = (name) => new RegExp(`^${name}:[ \\t]*(\\S.*)$`, 'm').exec(proposal)?.[1].trim();
  return (
    field('Status') === 'Approved' && Boolean(field('Approved-by')) && Boolean(field('Approved-on'))
  );
}

const git = (cwd, args) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

/** The nearest existing directory at or above `path` (a Write may target a new folder). */
function existingDir(path) {
  let dir = dirname(path);
  while (!existsSync(dir) && dirname(dir) !== dir) {
    dir = dirname(dir);
  }
  return dir;
}

/**
 * The git work tree an agent call belongs to (DEV-22). In a linked worktree the branch, the
 * approved proposal and the project boundary are those of that worktree, not of the main
 * checkout that CLAUDE_PROJECT_DIR points to. A path in another repository falls back to
 * `projectDir`, so the guard never trusts a foreign repository's approval.
 * @param {string} projectDir main project root (CLAUDE_PROJECT_DIR)
 * @param {unknown} payload PreToolUse payload
 * @returns {string} the root to read the branch and proposal from
 */
export function resolveWorkRoot(projectDir, payload) {
  const input = payload?.tool_input;
  const target = input?.file_path ?? input?.notebook_path;
  const base = typeof payload?.cwd === 'string' ? payload.cwd : projectDir;
  const start = startDirectory(base, target);
  try {
    const top = realpathSync(git(start, ['rev-parse', '--show-toplevel']));
    return commonDir(start) === commonDir(projectDir) ? top : projectDir;
  } catch {
    // Not a git directory: keep the main project root (fail closed through the approval check).
    return projectDir;
  }
}

const commonDir = (cwd) => realpathSync(resolve(cwd, git(cwd, ['rev-parse', '--git-common-dir'])));

function startDirectory(base, target) {
  return typeof target === 'string' && target !== '' ? existingDir(resolve(base, target)) : base;
}

export function readApproval(root) {
  try {
    const branch = git(root, ['branch', '--show-current']);
    const change = changeNameForBranch(branch);
    const file = change && join(root, 'openspec/changes', change, 'proposal.md');
    return Boolean(file) && isApprovedProposal(readFileSync(file, 'utf8'));
  } catch {
    // No branch or no proposal: the change is not approved (fail closed).
    return false;
  }
}

function readPayload() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    // Unreadable payload: evaluateAgentCall blocks it as malformed input.
    return null;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const agentFlag = process.argv.indexOf('--agent');
  const agent = agentFlag === -1 ? undefined : process.argv[agentFlag + 1];
  const payload = readPayload();
  const projectDir = process.env.CLAUDE_PROJECT_DIR ?? payload?.cwd ?? process.cwd();
  const root = resolveWorkRoot(projectDir, payload);
  const result = evaluateAgentCall(agent, payload, {
    projectDir: root,
    approved: readApproval(root),
  });
  if (!result.allow) {
    console.error(result.reason);
    process.exit(2);
  }
}
