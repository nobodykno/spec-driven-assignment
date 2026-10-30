// Claude Code PreToolUse hook: blocks dangerous commands and secret-file access (DEV-5 design D3).
// Reads the hook payload from stdin; exit 2 + stderr blocks the call, exit 0 allows it.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const HOOK = '.claude/hooks/pre-tool-guard.mjs';
// Quoted strings, shell operators, or bare words.
const TOKEN = /"([^"]*)"|'([^']*)'|(&&|\|\||[;|&\n])|([^\s"';|&]+)/g;
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const FILE_TOOLS = new Set(['Read', 'Edit', 'MultiEdit', 'Write']);
const SEARCH_TOOL_FIELDS = { Grep: ['path', 'glob'], Glob: ['pattern', 'path'] };

const REASONS = {
  'rm-recursive-force':
    'recursive forced delete. Delete specific paths with rm -r, or ask the user',
  'force-push': 'force push rewrites shared history. Push normally or ask the user',
  'push-main': 'the agent never pushes to main. Push the feature branch and merge through a PR',
  'no-verify': 'Git hooks must not be bypassed (CLAUDE.md). Fix the cause the hook reports',
  'env-dump': 'printing the environment can expose secrets (NFR-SEC-005)',
  'docker-volumes': 'removing Docker volumes deletes the database. Use docker compose down',
  'env-file-shell': '.env files hold secrets; only .env.example may be read (NFR-SEC-005)',
  'env-file-tool': '.env files hold secrets; only .env.example may be read (NFR-SEC-005)',
  'malformed-input': 'the hook payload could not be read, so the call is blocked to be safe',
};

const allow = () => ({ allow: true });
const block = (rule) => ({
  allow: false,
  rule,
  reason: `Blocked by ${HOOK} (${rule}): ${REASONS[rule]}.`,
});

/** True for `.env`, `.env.<x>` and globs such as `.env*`, but not `.env.example`. */
export function isEnvPath(value) {
  const base = String(value).split('/').at(-1);
  return base !== '.env.example' && (base === '.env' || /^\.env[.*]/.test(base));
}

/** Splits a shell command into simple commands (arrays of unquoted words). */
export function splitCommand(command) {
  const parts = [[]];
  for (const [, doubleQuoted, singleQuoted, operator, bare] of command.matchAll(TOKEN)) {
    if (operator !== undefined) {
      parts.push([]);
      continue;
    }
    parts.at(-1).push(doubleQuoted ?? singleQuoted ?? bare);
  }
  return parts.filter((words) => words.length > 0);
}

const shortFlags = (args) => args.filter((a) => /^-[A-Za-z]+$/.test(a)).join('');
const hasFlag = (args, long, short) => args.includes(long) || shortFlags(args).includes(short);

function checkRm(args) {
  const recursive = hasFlag(args, '--recursive', 'r') || shortFlags(args).includes('R');
  return recursive && hasFlag(args, '--force', 'f') ? 'rm-recursive-force' : null;
}

const isMainRef = (refspec) => ['main', 'refs/heads/main'].includes(refspec.split(':').at(-1));

function checkGitPush(args, currentBranch) {
  if (args.includes('--no-verify')) {
    return 'no-verify';
  }
  const forced = args.some((a) => a.startsWith('--force') || a.startsWith('+'));
  if (forced || shortFlags(args).includes('f')) {
    return 'force-push';
  }
  const refspecs = args.filter((a) => !a.startsWith('-')).slice(1);
  const toMain = refspecs.length === 0 ? currentBranch === 'main' : refspecs.some(isMainRef);
  return toMain ? 'push-main' : null;
}

function checkGit(args, currentBranch) {
  const [subcommand, ...rest] = args;
  if (subcommand === 'push') {
    return checkGitPush(rest, currentBranch);
  }
  if (subcommand === 'commit' && hasFlag(rest, '--no-verify', 'n')) {
    return 'no-verify';
  }
  return null;
}

function checkDocker(name, args) {
  const downArgs = name === 'docker-compose' ? args : args.slice(1);
  const isDown = (name === 'docker-compose' || args[0] === 'compose') && downArgs[0] === 'down';
  return isDown && hasFlag(downArgs, '--volumes', 'v') ? 'docker-volumes' : null;
}

function checkSimpleCommand(words, currentBranch) {
  if (words.some(isEnvPath)) {
    return 'env-file-shell';
  }
  const [name, ...args] = words.filter((word, i) => i > 0 || !ASSIGNMENT.test(word));
  const checks = {
    rm: () => checkRm(args),
    git: () => checkGit(args, currentBranch),
    printenv: () => 'env-dump',
    env: () => (args.length === 0 ? 'env-dump' : null),
    docker: () => checkDocker(name, args),
    'docker-compose': () => checkDocker(name, args),
  };
  return checks[name]?.() ?? null;
}

function checkBash(command, currentBranch) {
  if (typeof command !== 'string' || command.trim() === '') {
    return 'malformed-input';
  }
  for (const words of splitCommand(command)) {
    const rule = checkSimpleCommand(words, currentBranch);
    if (rule) {
      return rule;
    }
  }
  return null;
}

function checkFileTool(toolName, input) {
  const fields = FILE_TOOLS.has(toolName) ? ['file_path'] : (SEARCH_TOOL_FIELDS[toolName] ?? []);
  return fields.some((field) => input[field] && isEnvPath(input[field])) ? 'env-file-tool' : null;
}

/**
 * Decides whether a tool call may run.
 * @param {unknown} payload Claude Code PreToolUse payload ({ tool_name, tool_input })
 * @param {{ currentBranch?: string }} context
 * @returns {{ allow: true } | { allow: false, rule: string, reason: string }}
 */
export function evaluateToolCall(payload, { currentBranch = '' } = {}) {
  const toolName = payload?.tool_name;
  const input = payload?.tool_input;
  if (typeof toolName !== 'string' || typeof input !== 'object' || input === null) {
    return block('malformed-input');
  }
  const rule =
    toolName === 'Bash' ? checkBash(input.command, currentBranch) : checkFileTool(toolName, input);
  return rule ? block(rule) : allow();
}

function readCurrentBranch(cwd) {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function readPayload() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return null;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const payload = readPayload();
  const result = evaluateToolCall(payload, {
    currentBranch: readCurrentBranch(payload?.cwd ?? process.cwd()),
  });
  if (!result.allow) {
    console.error(result.reason);
    process.exit(2);
  }
}
