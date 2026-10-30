// Claude Code PreToolUse hook: blocks dangerous commands and secret-file access (DEV-5 design D3).
// Reads the hook payload from stdin; exit 2 + stderr blocks the call, exit 0 allows it.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const HOOK = '.claude/hooks/pre-tool-guard.mjs';
// Quoted strings, separators (operators, grouping, substitution), redirections, or bare words.
const TOKEN = /"([^"]*)"|'([^']*)'|(&&|\|\||[;|&\n(){}`])|[<>]+|([^\s"';|&(){}`<>]+)/g;
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
// Words that run the command after them (shell keywords and wrapper programs).
const WRAPPERS = new Set([
  'sudo',
  'command',
  'exec',
  'nohup',
  'time',
  'xargs',
  'then',
  'do',
  'else',
  '!',
]);
const GIT_VALUE_OPTIONS = new Set([
  '-C',
  '-c',
  '--git-dir',
  '--work-tree',
  '--namespace',
  '--config-env',
]);
const FILE_TOOLS = new Set(['Read', 'Edit', 'MultiEdit', 'Write']);
const SEARCH_TOOL_FIELDS = { Grep: ['path', 'glob'], Glob: ['pattern', 'path'] };
const ENV_FILES = '.env files hold secrets and secrets come only from the environment';

const REASONS = {
  'rm-recursive-force':
    'recursive forced delete. Delete specific paths with rm -r, or ask the user',
  'force-push': 'force push rewrites shared history. Push normally or ask the user',
  'push-main': 'the agent never pushes to main. Push the feature branch and merge through a PR',
  'no-verify': 'Git hooks must not be bypassed (CLAUDE.md). Fix the cause the hook reports',
  'env-dump': 'printing the environment can expose secrets (NFR-SEC-005)',
  'docker-volumes': 'removing Docker volumes deletes the database. Use docker compose down',
  'env-file-shell': `${ENV_FILES}; only .env.example may be read (NFR-SEC-005)`,
  'env-file-tool': `${ENV_FILES}; only .env.example may be read (NFR-SEC-005)`,
  'malformed-input': 'the hook payload could not be read, so the call is blocked to be safe',
};

const allow = () => ({ allow: true });
const block = (rule) => ({
  allow: false,
  rule,
  reason: `Blocked by ${HOOK} (${rule}): ${REASONS[rule]}.`,
});

/**
 * @param {unknown} value a path, shell word or glob
 * @returns {boolean} true for `.env`, `.env.<x>` and globs such as `.env*`, but not `.env.example`
 */
export function isEnvPath(value) {
  const base = String(value).split('/').at(-1);
  return base !== '.env.example' && (base === '.env' || /^\.env[.*]/.test(base));
}

/**
 * @param {string} command a shell command line
 * @returns {string[][]} simple commands as arrays of unquoted words
 */
export function splitCommand(command) {
  const parts = [[]];
  for (const [token, doubleQuoted, singleQuoted, separator, bare] of command.matchAll(TOKEN)) {
    if (separator !== undefined) {
      parts.push([]);
      continue;
    }
    if (/^[<>]+$/.test(token)) {
      continue;
    }
    parts.at(-1).push(doubleQuoted ?? singleQuoted ?? bare);
  }
  return parts.filter((words) => words.length > 0);
}

const shortFlags = (args) => args.filter((a) => /^-[A-Za-z]+$/.test(a)).join('');
const hasFlag = (args, long, short) => args.includes(long) || shortFlags(args).includes(short);
const commandName = (word) => word.split('/').at(-1);

const dropOptions = (words) => {
  const first = words.findIndex((word) => !word.startsWith('-'));
  return first === -1 ? [] : words.slice(first);
};
// `env VAR=x cmd` runs cmd; a bare `env` prints the environment (checked as env-dump).
const isEnvWrapper = (words) => commandName(words[0]) === 'env' && words.length > 1;

/** Drops leading assignments and wrappers; returns { words, assignments } for the real command. */
function unwrap(words) {
  let rest = [...words];
  const assignments = [];
  while (rest.length > 0) {
    if (ASSIGNMENT.test(rest[0])) {
      assignments.push(rest.shift());
    } else if (WRAPPERS.has(commandName(rest[0])) || isEnvWrapper(rest)) {
      rest = dropOptions(rest.slice(1));
    } else {
      break;
    }
  }
  return { words: rest, assignments };
}

function checkRm(args) {
  const recursive = hasFlag(args, '--recursive', 'r') || shortFlags(args).includes('R');
  return recursive && hasFlag(args, '--force', 'f') ? 'rm-recursive-force' : null;
}

function pushesToMain(refspecs, currentBranch) {
  if (refspecs.length === 0) {
    return currentBranch === 'main' || currentBranch === '';
  }
  const resolve = (ref) => (['HEAD', '@'].includes(ref) ? currentBranch : ref);
  return refspecs.some((refspec) => {
    const destination = resolve(refspec.replace(/^\+/, '').split(':').at(-1));
    return destination === 'main' || destination === 'refs/heads/main';
  });
}

function checkGitPush(args, currentBranch) {
  if (args.includes('--no-verify')) {
    return 'no-verify';
  }
  const forced = args.some((a) => a.startsWith('--force') || a.startsWith('+'));
  if (forced || shortFlags(args).includes('f')) {
    return 'force-push';
  }
  if (args.includes('--all') || args.includes('--mirror')) {
    return 'push-main';
  }
  const refspecs = args.filter((a) => !a.startsWith('-')).slice(1);
  return pushesToMain(refspecs, currentBranch) ? 'push-main' : null;
}

/** Splits `git [global options] <subcommand> args` and collects `-c key=value` settings. */
function parseGit(args) {
  const config = [];
  let i = 0;
  while (i < args.length && args[i].startsWith('-')) {
    const takesValue = GIT_VALUE_OPTIONS.has(args[i]);
    if (takesValue && ['-c', '--config-env'].includes(args[i])) {
      config.push(args[i + 1] ?? '');
    }
    i += takesValue ? 2 : 1;
  }
  return { subcommand: args[i], rest: args.slice(i + 1), config };
}

function checkGit(args, currentBranch) {
  const { subcommand, rest, config } = parseGit(args);
  if (config.some((setting) => setting.toLowerCase().startsWith('core.hookspath'))) {
    return 'no-verify';
  }
  if (subcommand === 'push') {
    return checkGitPush(rest, currentBranch);
  }
  if (subcommand === 'commit' && hasFlag(rest, '--no-verify', 'n')) {
    return 'no-verify';
  }
  return null;
}

function checkDocker(name, args) {
  const isCompose = name === 'docker-compose' || args[0] === 'compose';
  const down = args.indexOf('down');
  if (!isCompose || down === -1) {
    return null;
  }
  return hasFlag(args.slice(down + 1), '--volumes', 'v') ? 'docker-volumes' : null;
}

function checkSimpleCommand(words, currentBranch) {
  if (words.some(isEnvPath)) {
    return 'env-file-shell';
  }
  const { words: command, assignments } = unwrap(words);
  if (assignments.some((a) => a === 'HUSKY=0')) {
    return 'no-verify';
  }
  const [first = '', ...args] = command;
  const name = commandName(first);
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
 * @param {{ currentBranch?: string }} context current Git branch ('' when unknown)
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
    // Unknown branch: a refspec-less push is then blocked (fail closed in pushesToMain).
    return '';
  }
}

function readPayload() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    // Unreadable payload: evaluateToolCall blocks it as malformed input.
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
