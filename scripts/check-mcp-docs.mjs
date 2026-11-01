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

function run(root) {
  const path = join(root, MCP_FILE);
  return existsSync(path) ? checkMcpConfig(readFileSync(path, 'utf8')) : [`${MCP_FILE} is missing`];
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
