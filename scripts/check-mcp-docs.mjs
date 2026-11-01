// Keeps the MCP setup honest (DEV-7 / DEV-1004): Context7 pinned, no credentials in MCP files.
// Usage: node scripts/check-mcp-docs.mjs   (run from the repository root; part of pnpm lint)
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const MCP_FILE = '.mcp.json';
const CONTEXT7_PACKAGE = '@upstash/context7-mcp';
const EXACT_VERSION = /^\d+\.\d+\.\d+$/;
const SECRET_FLAG = /^--?(api-?key|token|secret|password|auth(orization)?)$/i;
const TOKEN_SHAPED = /ctx7sk-|sk-[A-Za-z0-9]{16,}|xox[bap]-|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}/;

/** @returns {string[]} findings for the Context7 server entry (missing or not pinned) */
function checkContext7(servers) {
  const server = servers.context7;
  if (server === undefined || server === null) {
    return [`${MCP_FILE}: server "context7" is missing (add ${CONTEXT7_PACKAGE}@<exact version>)`];
  }
  const args = Array.isArray(server.args) ? server.args : [];
  const pkg = args.find(
    (arg) =>
      typeof arg === 'string' &&
      (arg === CONTEXT7_PACKAGE || arg.startsWith(`${CONTEXT7_PACKAGE}@`)),
  );
  const version = pkg?.slice(CONTEXT7_PACKAGE.length + 1);
  if (pkg === undefined || !EXACT_VERSION.test(version ?? '')) {
    return [
      `${MCP_FILE}: server "context7" has an unpinned version "${pkg ?? 'none'}"; use ${CONTEXT7_PACKAGE}@<major>.<minor>.<patch> (exact)`,
    ];
  }
  return [];
}

/** @returns {string[]} findings for one server entry that holds a credential */
function checkEntry(name, server) {
  if (typeof server !== 'object' || server === null || Array.isArray(server)) {
    return [`${MCP_FILE}: server "${name}" is not an object`];
  }
  const findings = [];
  if (server.env !== undefined) {
    findings.push(`${MCP_FILE}: server "${name}" has an env block (no credentials in MCP files)`);
  }
  if (server.headers !== undefined) {
    findings.push(`${MCP_FILE}: server "${name}" has a headers/Authorization value`);
  }
  const args = Array.isArray(server.args) ? server.args : [];
  if (args.some((arg, i) => SECRET_FLAG.test(String(arg)) && String(args[i + 1] ?? '') !== '')) {
    findings.push(`${MCP_FILE}: server "${name}" passes a secret value in args`);
  }
  if (TOKEN_SHAPED.test(JSON.stringify(server))) {
    findings.push(`${MCP_FILE}: server "${name}" holds a token-shaped secret`);
  }
  return findings;
}

/**
 * @param {string} mcpJsonText content of .mcp.json
 * @returns {string[]} one finding per problem; empty when the config is valid
 */
export function checkMcpConfig(mcpJsonText) {
  let servers;
  try {
    servers = JSON.parse(mcpJsonText).mcpServers ?? {};
  } catch {
    return [`${MCP_FILE}: is not valid JSON`];
  }
  if (typeof servers !== 'object' || servers === null || Array.isArray(servers)) {
    return [`${MCP_FILE}: "mcpServers" is not an object`];
  }
  const findings = checkContext7(servers);
  for (const [name, server] of Object.entries(servers)) {
    findings.push(...checkEntry(name, server));
  }
  return findings;
}

const SETTINGS_FILE = '.claude/settings.json';
const WRITE_TOOLS = [
  ...['createJiraIssue', 'editJiraIssue', 'transitionJiraIssue'],
  ...['addCommentToJiraIssue', 'addWorklogToJiraIssue', 'createIssueLink'],
].map((name) => `mcp__atlassian__${name}`);
const READ_COMMANDS = ['opsx/explore'];
const WRITE_COMMANDS = ['opsx/propose', 'opsx/archive', 'create-pr', 'frs-ticket'];

/** @returns {{ ask: string[], allow: string[] } | string} the permission lists, or a finding text */
function permissionLists(settingsJsonText) {
  let permissions;
  try {
    permissions = JSON.parse(settingsJsonText).permissions ?? {};
  } catch {
    return `${SETTINGS_FILE}: is not valid JSON`;
  }
  const { ask = [], allow = [] } = permissions;
  return Array.isArray(ask) && Array.isArray(allow)
    ? { ask, allow }
    : `${SETTINGS_FILE}: permissions.ask and permissions.allow must be arrays`;
}

/**
 * @param {string} settingsJsonText content of .claude/settings.json
 * @returns {string[]} findings for Jira write tools that are not behind an approval prompt
 */
export function checkSettingsWrites(settingsJsonText) {
  const lists = permissionLists(settingsJsonText);
  if (typeof lists === 'string') {
    return [lists];
  }
  return WRITE_TOOLS.flatMap((tool) => {
    if (lists.allow.includes(tool)) {
      return [`${SETTINGS_FILE}: ${tool} is in allow; Jira writes need approval (ask)`];
    }
    return lists.ask.includes(tool)
      ? []
      : [`${SETTINGS_FILE}: ${tool} is not in ask; Jira writes need approval`];
  });
}

/** @returns {string[]} findings for one command text */
function checkCommand(key, text) {
  const findings = [];
  if (!/never invent/i.test(text) || !/\bstop\b/i.test(text)) {
    findings.push(
      `command ${key}: lacks the failure rule (stop, report, never invent ticket data)`,
    );
  }
  if (WRITE_COMMANDS.includes(key) && !(/approval/i.test(text) && /\bonly\b|\bask/i.test(text))) {
    findings.push(`command ${key}: does not say Jira writes happen only with the user's approval`);
  }
  return findings;
}

/**
 * @param {Record<string, string>} commands command texts by path under .claude/commands, no `.md`
 * @returns {string[]} findings for Jira-using commands without the failure or approval rules
 */
export function checkCommands(commands) {
  return [...READ_COMMANDS, ...WRITE_COMMANDS].flatMap((key) =>
    commands[key] === undefined ? [`command ${key}: is missing`] : checkCommand(key, commands[key]),
  );
}

const TIMESTAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
const DOC_FILE = 'docs/mcp-setup.md';
const FAILURE_CASES = [
  { name: 'missing ticket', call: 'DEV-999', result: ['not found', 'no data invented'] },
  { name: 'MCP disabled', result: ['stopped and reported'] },
  { name: 'auth cleared', result: ['stopped and reported'] },
  { name: 'unsupported operation', result: ['reported, not attempted by another route'] },
];

/** @returns {string[][]} the data rows (cells) of the table under the `## <heading>` section */
function tableRows(doc, heading) {
  const start = doc.split('\n').findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) {
    return [];
  }
  const rows = [];
  for (const line of doc.split('\n').slice(start + 1)) {
    if (line.startsWith('#')) {
      break;
    }
    if (line.trim().startsWith('|')) {
      rows.push(
        line
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((cell) => cell.trim()),
      );
    }
  }
  return rows.slice(2).filter((cells) => cells.some((cell) => cell !== ''));
}

/** @returns {string[]} findings for the "Context7 lookups" table of the setup doc */
export function checkContext7Log(docText) {
  const rows = tableRows(docText, 'Context7 lookups');
  if (rows.length === 0) {
    return [`${DOC_FILE}: "Context7 lookups" has no recorded lookup`];
  }
  return rows.flatMap(([date = '', library = '', version = '', topic = ''], i) => {
    const label = `lookup row ${i + 1} (${library || 'no library'})`;
    return [
      ...(TIMESTAMP.test(date) ? [] : [`${DOC_FILE}: ${label} has no valid timestamp`]),
      ...(library === '' ? [`${DOC_FILE}: ${label} has no library`] : []),
      ...(version === '' ? [`${DOC_FILE}: ${label} has no version`] : []),
      ...(topic === '' ? [`${DOC_FILE}: ${label} has no topic`] : []),
    ];
  });
}

/** @returns {string[]} findings for one required failure case */
function checkFailureCase(rows, spec) {
  const row = rows.find((cells) =>
    (cells[1] ?? '').toLowerCase().includes(spec.name.toLowerCase()),
  );
  if (row === undefined) {
    return [`${DOC_FILE}: failure log has no "${spec.name}" row`];
  }
  const findings = [];
  if (spec.call !== undefined && !(row[2] ?? '').includes(spec.call)) {
    findings.push(`${DOC_FILE}: "${spec.name}" row must name ${spec.call} in Call`);
  }
  for (const phrase of spec.result) {
    if (!(row[3] ?? '').toLowerCase().includes(phrase)) {
      findings.push(`${DOC_FILE}: "${spec.name}" row Result must say "${phrase}"`);
    }
  }
  return findings;
}

/** @returns {string[]} findings for the "Failure test log" table of the setup doc */
export function checkFailureLog(docText) {
  const rows = tableRows(docText, 'Failure test log');
  const dated = rows
    .filter((cells) => !TIMESTAMP.test(cells[0] ?? ''))
    .map(
      (cells) => `${DOC_FILE}: failure log row "${cells[1] ?? cells.join(' ')}" has no timestamp`,
    );
  return [...FAILURE_CASES.flatMap((spec) => checkFailureCase(rows, spec)), ...dated];
}

/** @returns {string | undefined} the file text, or undefined when the file is missing */
const readIfExists = (root, file) =>
  existsSync(join(root, file)) ? readFileSync(join(root, file), 'utf8') : undefined;

/** @returns {string[]} every finding for the repository at `root` */
function run(root) {
  const config = readIfExists(root, MCP_FILE);
  const settings = readIfExists(root, SETTINGS_FILE);
  const commands = Object.fromEntries(
    [...READ_COMMANDS, ...WRITE_COMMANDS]
      .map((key) => [key, readIfExists(root, `.claude/commands/${key}.md`)])
      .filter(([, text]) => text !== undefined),
  );
  const doc = readIfExists(root, DOC_FILE);
  return [
    ...(doc === undefined
      ? [`${DOC_FILE} is missing`]
      : [...checkContext7Log(doc), ...checkFailureLog(doc)]),
    ...(config === undefined ? [`${MCP_FILE} is missing`] : checkMcpConfig(config)),
    ...(settings === undefined ? [`${SETTINGS_FILE} is missing`] : checkSettingsWrites(settings)),
    ...checkCommands(commands),
  ];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const findings = run(process.cwd());
  if (findings.length > 0) {
    console.error(`check-mcp-docs: ${findings.length} problem(s)`);
    for (const finding of findings) {
      console.error(`  - ${finding}`);
    }
    process.exit(1);
  }
}
