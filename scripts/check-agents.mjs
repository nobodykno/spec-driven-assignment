// Fails when the project subagents or docs/agents.md drift from their allowed scope (DEV-6 design D4).
// Usage: node scripts/check-agents.mjs   (part of pnpm lint)
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const AGENTS_DIR = '.claude/agents';
const DOCS = 'docs/agents.md';
const POLICY = 'docs/token-policy.md';
const SDD_DIR = '.claude/commands/sdd';
export const POLICY_LINE = `Follow ${POLICY}`;
export const SDD_COMMANDS = ['propose', 'apply', 'verify', 'ship', 'run'];
const GUARD = 'agent-scope-guard.mjs';
const HEADINGS = ['Scope', 'Permitted actions', 'Output', 'Restrictions', 'When used'];
const HOOK_SCRIPT = /node\s+"?(?:\$CLAUDE_PROJECT_DIR\/)?([^"\s]+\.(?:mjs|cjs|js))"?/;
const READ_ONLY_GIT = ['Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git log:*)'];

// The allowed tool set per required agent (design D1); the scope guard enforces the details.
export const ALLOWED_TOOLS = {
  implementer: [
    ...['Read', 'Grep', 'Glob', 'Edit', 'Write', 'MultiEdit', 'Skill', 'Bash(pnpm:*)'],
    ...READ_ONLY_GIT,
    ...['Bash(git add:*)', 'Bash(git commit:*)'],
  ],
  'test-writer': [
    'Read',
    'Grep',
    'Glob',
    'Edit',
    'Write',
    'Skill',
    'Bash(pnpm:*)',
    ...READ_ONLY_GIT,
  ],
  reviewer: ['Read', 'Grep', 'Glob', 'Bash(git diff:*)', 'Bash(git log:*)'],
  coordinator: [
    ...['Read', 'Grep', 'Glob', 'Edit', ...READ_ONLY_GIT],
    ...['Bash(git branch:*)', 'Bash(git worktree list:*)', 'Bash(openspec:*)'],
  ],
};

const unquote = (value) => value.trim().replace(/^(["'])(.*)\1$/, '$2');

function parseTools(lines, index) {
  const inline = lines[index].replace(/^tools:/, '').trim();
  if (inline !== '') {
    return inline
      .split(',')
      .map((tool) => tool.trim())
      .filter(Boolean);
  }
  const list = [];
  for (let i = index + 1; i < lines.length && /^\s+-\s/.test(lines[i]); i += 1) {
    list.push(unquote(lines[i].replace(/^\s+-\s/, '')));
  }
  return list;
}

/**
 * @param {string} text agent Markdown file
 * @returns {{ name: string, description: string, tools: string[], hookCommands: string[] } | null}
 */
export function parseFrontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(text);
  if (!match) {
    return null;
  }
  const lines = match[1].split('\n');
  const value = (key) =>
    unquote(lines.find((line) => line.startsWith(`${key}:`))?.slice(key.length + 1) ?? '');
  const toolsLine = lines.findIndex((line) => line.startsWith('tools:'));
  return {
    name: value('name'),
    description: value('description'),
    tools: toolsLine === -1 ? [] : parseTools(lines, toolsLine),
    hookCommands: lines
      .map((line) => /^\s*command:\s*(.+)$/.exec(line)?.[1])
      .filter(Boolean)
      .map(unquote),
  };
}

function checkHooks(name, hookCommands, scriptExists) {
  const errors = [];
  const guard = hookCommands.find((command) =>
    new RegExp(`${GUARD}"?\\s+--agent\\s+${name}(\\s|$)`).test(command),
  );
  if (!guard) {
    errors.push(`${name}: no PreToolUse hook runs ${GUARD} --agent ${name}`);
  }
  for (const command of hookCommands) {
    const script = HOOK_SCRIPT.exec(command)?.[1];
    if (script && !scriptExists(script)) {
      errors.push(`${name}: hook script ${script} does not exist`);
    }
  }
  return errors;
}

function checkRequiredAgent(name, frontmatter, scriptExists) {
  const errors = [];
  if (frontmatter.tools.length === 0) {
    errors.push(`${name}: tools must be listed`);
  }
  for (const tool of frontmatter.tools.filter((t) => !ALLOWED_TOOLS[name].includes(t))) {
    errors.push(`${name}: tool "${tool}" is not allowed`);
  }
  return [...errors, ...checkHooks(name, frontmatter.hookCommands, scriptExists)];
}

function checkAgent(name, text, scriptExists) {
  const frontmatter = parseFrontmatter(text);
  if (!frontmatter) {
    return [`${name}: no frontmatter`];
  }
  const errors = [];
  if (frontmatter.name !== name) {
    errors.push(`${name}: frontmatter name "${frontmatter.name}" differs from the file name`);
  }
  if (frontmatter.description === '') {
    errors.push(`${name}: description is empty`);
  }
  const required = Object.hasOwn(ALLOWED_TOOLS, name);
  return required ? [...errors, ...checkRequiredAgent(name, frontmatter, scriptExists)] : errors;
}

function docSection(docs, name) {
  const start = docs.search(new RegExp(`^## ${name}\\s*$`, 'm'));
  if (start === -1) {
    return null;
  }
  const next = docs.slice(start + 1).search(/^## /m);
  return next === -1 ? docs.slice(start) : docs.slice(start, start + 1 + next);
}

function checkDocs(name, docs, tools) {
  const section = docSection(docs, name);
  if (section === null) {
    return [`${name}: ${DOCS} has no "## ${name}" section`];
  }
  return [
    ...HEADINGS.filter((h) => !section.includes(`### ${h}`)).map(
      (h) => `${name}: ${DOCS} section lacks "### ${h}"`,
    ),
    ...tools
      .filter((t) => !section.includes(t))
      .map((t) => `${name}: ${DOCS} does not mention tool "${t}"`),
  ];
}

// The policy line must be in the body, not hidden in the frontmatter.
const hasPolicyLine = (text) =>
  text
    .replace(/^---\n[\s\S]*?\n---(?:\n|$)/, '')
    .split('\n')
    .some((line) => line.trim() === POLICY_LINE);

/** Token-policy references in the policy file, every agent and every sdd command (design D6). */
function checkPolicy({ agents, commands, scriptExists }) {
  const errors = scriptExists(POLICY) ? [] : [`${POLICY} is missing`];
  for (const name of Object.keys(agents).filter((n) => !hasPolicyLine(agents[n]))) {
    errors.push(`${name}: ${AGENTS_DIR}/${name}.md lacks "${POLICY_LINE}"`);
  }
  for (const name of SDD_COMMANDS) {
    const text = commands[name];
    if (text === undefined || !hasPolicyLine(text)) {
      const problem = text === undefined ? 'is missing' : `lacks "${POLICY_LINE}"`;
      errors.push(`sdd/${name}: ${SDD_DIR}/${name}.md ${problem}`);
    }
  }
  return errors;
}

/**
 * @param {{ agents: Record<string, string>, docs: string | null,
 *   scriptExists: (path: string) => boolean, commands: Record<string, string> }} input
 *   agent file contents by name (without `.md`), docs/agents.md text, a project file-exists
 *   check, and sdd command contents by name
 * @returns {string[]} problems; empty when everything is valid
 */
export function checkAgents({ agents, docs, scriptExists, commands }) {
  const errors = checkPolicy({ agents, commands, scriptExists });
  errors.push(
    ...Object.keys(ALLOWED_TOOLS)
      .filter((name) => !Object.hasOwn(agents, name))
      .map((name) => `${name}: ${AGENTS_DIR}/${name}.md is missing`),
  );
  for (const [name, text] of Object.entries(agents)) {
    errors.push(...checkAgent(name, text, scriptExists));
  }
  if (docs === null) {
    return [...errors, `${DOCS} is missing`];
  }
  for (const name of Object.keys(ALLOWED_TOOLS).filter((n) => Object.hasOwn(agents, n))) {
    errors.push(...checkDocs(name, docs, parseFrontmatter(agents[name])?.tools ?? []));
  }
  return errors;
}

function loadInput(root) {
  const dir = join(root, AGENTS_DIR);
  const files = existsSync(dir) ? readdirSync(dir).filter((file) => file.endsWith('.md')) : [];
  const docsPath = join(root, DOCS);
  return {
    agents: Object.fromEntries(
      files.map((file) => [file.slice(0, -3), readFileSync(join(dir, file), 'utf8')]),
    ),
    docs: existsSync(docsPath) ? readFileSync(docsPath, 'utf8') : null,
    scriptExists: (path) => existsSync(join(root, path)),
    commands: Object.fromEntries(
      SDD_COMMANDS.filter((name) => existsSync(join(root, SDD_DIR, `${name}.md`))).map((name) => [
        name,
        readFileSync(join(root, SDD_DIR, `${name}.md`), 'utf8'),
      ]),
    ),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = checkAgents(loadInput(process.cwd()));
  if (errors.length > 0) {
    console.error(
      `check-agents: ${errors.length} problem(s)\n${errors.map((e) => `  - ${e}`).join('\n')}`,
    );
    process.exit(1);
  }
}
