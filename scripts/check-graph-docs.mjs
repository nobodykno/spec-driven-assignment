// Fails when the graph-tool setup is not pinned, ignored by git and documented with measured values
// (DEV-18 design D5).
// Usage: node scripts/check-graph-docs.mjs   (part of pnpm lint)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const GRAPH_IGNORES = ['.code-review-graph/', 'graphify-out/'];
const TOOLS = ['uv', 'code-review-graph', 'graphifyy'];
const EXACT_VERSION = /^\d+\.\d+\.\d+$/;
const MIN_QUERIES = 5;
const RUNS = 4;
const METRICS = {
  tokens: /^\d[\d,]*$/,
  files: /^\d+$/,
  time: /^\d+(\.\d+)? ?(s|min)$/,
  findings: /^\d+$/,
};

const cells = (line) =>
  line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());

const section = (doc, title) => {
  const lines = doc.split('\n');
  const start = lines.findIndex((line) => line.startsWith(`## ${title}`));
  if (start === -1) {
    return undefined;
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
};

/** @returns {string[]} findings for tools without an exact version in docs/versions.md */
export function checkVersions(doc) {
  const rows = doc
    .split('\n')
    .filter((line) => line.startsWith('|'))
    .map(cells);
  return TOOLS.filter(
    (tool) => !rows.some(([name, version]) => name === tool && EXACT_VERSION.test(version ?? '')),
  ).map((tool) => `docs/versions.md: ${tool} needs an exact version (x.y.z)`);
}

/** @returns {string[]} findings for graph caches that .gitignore does not list */
export function checkGitignore(text) {
  const lines = new Set(text.split('\n').map((line) => line.trim()));
  return GRAPH_IGNORES.filter((path) => !lines.has(path)).map(
    (path) => `.gitignore: ${path} must be ignored`,
  );
}

/** @returns {string[]} findings for the build stats and the targeted queries */
export function checkGraphDoc(doc) {
  const findings = [];
  if (section(doc, 'Build stats') === undefined) {
    findings.push('docs/graph-tools.md: section "Build stats" is missing');
  }
  const queries = doc.split(/^### (?=Query \d+)/m).slice(1);
  if (queries.length < MIN_QUERIES) {
    findings.push(`docs/graph-tools.md: at least ${MIN_QUERIES} queries are required`);
  }
  for (const query of queries) {
    if (!/^- Confirmed against: \S/m.test(query)) {
      findings.push(`docs/graph-tools.md: ${query.split(':')[0]} has no "Confirmed against" line`);
    }
  }
  return findings;
}

/** @returns {string[]} findings for the four-run comparison, its method and limitations */
export function checkTokenDoc(doc) {
  const findings = [];
  const table = section(doc, 'Baseline vs graph-assisted');
  const rows = (table ?? '')
    .split('\n')
    .filter((line) => line.startsWith('|'))
    .slice(2)
    .map(cells);
  if (rows.length !== RUNS) {
    findings.push('docs/token-efficiency.md: the comparison needs four measured runs');
  }
  for (const [run, mode, ...values] of rows) {
    const bad = Object.entries(METRICS).filter(([, pattern], i) => !pattern.test(values[i] ?? ''));
    if (bad.length > 0) {
      findings.push(
        `docs/token-efficiency.md: ${run} ${mode} needs measured ${bad.map(([name]) => name).join(', ')}`,
      );
    }
  }
  for (const title of ['Method', 'Limitations']) {
    if (section(doc, title) === undefined) {
      findings.push(`docs/token-efficiency.md: section "${title}" is missing`);
    }
  }
  return findings;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = join(fileURLToPath(import.meta.url), '..', '..');
  const read = (file) => readFileSync(join(root, file), 'utf8');
  const findings = [
    ...checkVersions(read('docs/versions.md')),
    ...checkGitignore(read('.gitignore')),
    ...checkGraphDoc(read('docs/graph-tools.md')),
    ...checkTokenDoc(read('docs/token-efficiency.md')),
  ];
  if (findings.length > 0) {
    console.error(`Graph tool problems (${findings.length}):`);
    for (const finding of findings) {
      console.error(`  - ${finding}`);
    }
    process.exit(1);
  }
}
