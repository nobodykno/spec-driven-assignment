// Claude Code PreToolUse hook: blocks dangerous commands and secret-file access (DEV-5 design D3).
// Reads the hook payload from stdin; exit 2 + stderr blocks the call, exit 0 allows it.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const HOOK = '.claude/hooks/pre-tool-guard.mjs';
const MAX_DEPTH = 3;
// Quoted strings, separators (operators, grouping, substitution), redirections, or bare words.
const TOKEN = /"([^"]*)"|'([^']*)'|(&&|\|\||[;|&\n(){}`])|[<>]+|([^\s"';|&(){}`<>]+)/g;
// Command substitutions anywhere in the text, including inside double quotes.
const SUBSTITUTION = /\$\(([^()]*)\)|`([^`]*)`/g;
// An env-file name anywhere in the raw text: `.env`, `.env.<x>`, `.env*` (group 1 = suffix).
const ENV_IN_TEXT =
  /(?:^|[\s/=@:'"`(<>{},;|&])\.env(?:\.([A-Za-z0-9_.*-]+)|\*)?(?=$|[\s'"`)<>;|&,}/])/g;
const HUSKY_OFF = /(?:^|[\s;&|(])(?:export\s+)?HUSKY=["']?0["']?(?=$|[\s;&|)])/;
// GIT_CONFIG_KEY_<n>=core.hooksPath sets the hooks path through the environment.
const GIT_CONFIG_HOOKS = /(?:^|[\s;&|(])GIT_CONFIG_KEY_\d+=["']?core\.hookspath/i;
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
// Words that run another command later on the same line (keywords and wrapper programs).
const WRAPPERS = new Set([
  ...['sudo', 'command', 'exec', 'nohup', 'time', 'timeout', 'nice', 'ionice', 'stdbuf', 'xargs'],
  ...['find'],
  ...['if', 'elif', 'then', 'else', 'while', 'until', 'do', '!'],
]);
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash']);
const GUARDED = new Set(['rm', 'git', 'printenv', 'env', 'docker', 'docker-compose', ...SHELLS]);
const GIT_VALUE_OPTIONS = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace']);
const PUSH_VALUE_OPTIONS = new Set(['-o', '--push-option', '--repo', '--receive-pack', '--exec']);
const CONFIG_READS = new Set(['--get', '--get-all', '--unset', '--unset-all', '--list', '-l']);
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
 * @param {unknown} value a path or glob from a file tool
 * @returns {boolean} true for `.env`, `.env.<x>` and globs such as `.env*`, but not `.env.example`
 */
export function isEnvPath(value) {
  const base = String(value).split('/').at(-1);
  return base !== '.env.example' && (base === '.env' || /^\.env[.*]/.test(base));
}

/**
 * @param {string} text raw shell text
 * @returns {boolean} true when the text names an env file other than `.env.example`
 */
export function mentionsEnvFile(text) {
  return [...text.matchAll(ENV_IN_TEXT)].some(([, suffix]) => suffix !== 'example');
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
const isNoVerify = (arg) => arg.startsWith('--no-veri');

/** Drops leading assignments; after a wrapper, continues at the next guarded command (if any). */
function unwrap(words) {
  let rest = [...words];
  while (rest.length > 0 && ASSIGNMENT.test(rest[0])) {
    rest = rest.slice(1);
  }
  const name = commandName(rest[0] ?? '');
  if (WRAPPERS.has(name) || (name === 'env' && rest.length > 1)) {
    const next = rest.findIndex((word, i) => i > 0 && GUARDED.has(commandName(word)));
    return next === -1 ? [] : unwrap(rest.slice(next));
  }
  return rest;
}

function checkRm(args) {
  const recursive = hasFlag(args, '--recursive', 'r') || shortFlags(args).includes('R');
  return recursive && hasFlag(args, '--force', 'f') ? 'rm-recursive-force' : null;
}

function positionalPushArgs(args) {
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    if (PUSH_VALUE_OPTIONS.has(args[i])) {
      i += 1;
    } else if (!args[i].startsWith('-')) {
      positional.push(args[i]);
    }
  }
  return positional;
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
  if (args.some(isNoVerify)) {
    return 'no-verify';
  }
  const forced = args.some((a) => a.startsWith('--force') || a.startsWith('+'));
  if (forced || shortFlags(args).includes('f')) {
    return 'force-push';
  }
  if (args.includes('--all') || args.includes('--mirror')) {
    return 'push-main';
  }
  return pushesToMain(positionalPushArgs(args).slice(1), currentBranch) ? 'push-main' : null;
}

/** Splits `git [global options] <subcommand> args` and collects `-c key=value` settings. */
function parseGit(args) {
  const config = [];
  let i = 0;
  while (i < args.length && args[i].startsWith('-')) {
    const takesValue = GIT_VALUE_OPTIONS.has(args[i]);
    if (args[i] === '-c') {
      config.push(args[i + 1] ?? '');
    }
    i += takesValue ? 2 : 1;
  }
  return { subcommand: args[i], rest: args.slice(i + 1), config };
}

const setsHooksPath = (words) => words.some((w) => w.toLowerCase().startsWith('core.hookspath'));

function checkGit(args, currentBranch) {
  const { subcommand, rest, config } = parseGit(args);
  const configWrite = subcommand === 'config' && !rest.some((arg) => CONFIG_READS.has(arg));
  if (setsHooksPath(config) || (configWrite && setsHooksPath(rest))) {
    return 'no-verify';
  }
  if (subcommand === 'push') {
    return checkGitPush(rest, currentBranch);
  }
  const noVerify = rest.some(isNoVerify) || shortFlags(rest).includes('n');
  return subcommand === 'commit' && noVerify ? 'no-verify' : null;
}

function checkDocker(name, args) {
  const isCompose = name === 'docker-compose' || args.includes('compose');
  const down = args.indexOf('down');
  if (!isCompose || down === -1) {
    return null;
  }
  return hasFlag(args.slice(down + 1), '--volumes', 'v') ? 'docker-volumes' : null;
}

// `-c`, also combined (`-lc`, `-ec`); the script is the next word, after an optional `--`.
function checkShell(args, currentBranch, depth) {
  const flag = args.findIndex((arg) => /^-[A-Za-z]*c[A-Za-z]*$/.test(arg));
  const rest = flag === -1 ? [] : args.slice(flag + 1);
  const script = rest[0] === '--' ? rest[1] : rest[0];
  return script && depth < MAX_DEPTH ? checkBash(script, currentBranch, depth + 1) : null;
}

function checkSimpleCommand(words, currentBranch, depth) {
  const [first = '', ...args] = unwrap(words);
  const name = commandName(first);
  if (SHELLS.has(name)) {
    return checkShell(args, currentBranch, depth);
  }
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

// Standalone quoted words (`-m "..."`) are data for the HUSKY check; `HUSKY="0"` keeps its quotes.
const withoutQuotedWords = (command) => command.replace(/(^|\s)(?:"[^"]*"|'[^']*')/g, '$1""');

function checkText(command) {
  if (mentionsEnvFile(command)) {
    return 'env-file-shell';
  }
  const unquoted = withoutQuotedWords(command);
  return HUSKY_OFF.test(unquoted) || GIT_CONFIG_HOOKS.test(unquoted) ? 'no-verify' : null;
}

function checkSubstitutions(command, currentBranch, depth) {
  for (const [, dollar, backtick] of command.matchAll(SUBSTITUTION)) {
    const inner = (dollar ?? backtick ?? '').trim();
    const rule = inner && depth < MAX_DEPTH ? checkBash(inner, currentBranch, depth + 1) : null;
    if (rule) {
      return rule;
    }
  }
  return null;
}

function checkBash(command, currentBranch, depth = 0) {
  if (typeof command !== 'string' || command.trim() === '') {
    return 'malformed-input';
  }
  const textRule = checkText(command) ?? checkSubstitutions(command, currentBranch, depth);
  if (textRule) {
    return textRule;
  }
  for (const words of splitCommand(command)) {
    const rule = checkSimpleCommand(words, currentBranch, depth);
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
