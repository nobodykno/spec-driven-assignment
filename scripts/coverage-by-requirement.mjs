// Maps every FRS requirement to the automated tests whose names start with its ID (NFR-TST-001).
// Usage: node scripts/coverage-by-requirement.mjs [--write docs/test-results.md]
// Exits 1 when a functional requirement (FR-*) has no test.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ID = '(?:N?FR)-[A-Z]+-\\d+';
const HEADING = new RegExp(`^#### (${ID})\\b`, 'gm');
const NFR_ROW = new RegExp('^\\| (NFR-[A-Z]+-\\d+) \\|', 'gm');
// it/test(...) or the call that follows .each(...): the title is the first string argument.
const TITLE = new RegExp(`(?:\\b(?:it|test)(?:\\.\\w+)*|\\))\\(\\s*['"\`](${ID}):`, 'g');

/** @returns {string[]} sorted unique requirement ids declared in the FRS (headings and NFR rows) */
export function extractRequirementIds(frs) {
  const ids = new Set();
  for (const pattern of [HEADING, NFR_ROW]) {
    for (const match of frs.matchAll(pattern)) {
      ids.add(match[1]);
    }
  }
  return [...ids].sort();
}

/** @returns {string[]} the requirement id of each test title that starts with one */
export function extractTestTitleIds(source) {
  return [...source.matchAll(TITLE)].map((match) => match[1]);
}

/**
 * @param {string[]} requirementIds
 * @param {{ file: string, ids: string[] }[]} tests ids found per test file
 */
export function buildCoverage(requirementIds, tests) {
  const rows = requirementIds.map((id) => {
    const files = [];
    let count = 0;
    for (const test of tests) {
      const hits = test.ids.filter((found) => found === id).length;
      if (hits > 0) {
        count += hits;
        files.push(test.file);
      }
    }
    return { id, count, files };
  });
  const missing = rows.filter((row) => row.count === 0).map((row) => row.id);
  return {
    rows,
    missingFunctional: missing.filter((id) => id.startsWith('FR-')),
    missingNonFunctional: missing.filter((id) => id.startsWith('NFR-')),
  };
}

/** @returns {string} markdown table, one row per requirement */
export function renderTable({ rows }) {
  const lines = ['| Requirement | Tests | Files |', '| --- | --- | --- |'];
  for (const row of rows) {
    lines.push(`| ${row.id} | ${row.count} | ${row.files.join(', ') || 'none'} |`);
  }
  return lines.join('\n');
}

function listTestFiles() {
  const out = execFileSync(
    'git',
    ['ls-files', '*.test.ts', '*.test.tsx', '*.test.mjs', 'e2e/*.spec.ts'],
    {
      encoding: 'utf8',
    },
  );
  return out.split('\n').filter(Boolean);
}

function main() {
  const requirementIds = extractRequirementIds(readFileSync('docs/FRS.md', 'utf8'));
  const tests = listTestFiles().map((file) => ({
    file,
    ids: extractTestTitleIds(readFileSync(file, 'utf8')),
  }));
  const coverage = buildCoverage(requirementIds, tests);
  console.log(renderTable(coverage));
  if (coverage.missingNonFunctional.length > 0) {
    console.error(
      `No test names start with: ${coverage.missingNonFunctional.join(', ')} (non-functional)`,
    );
  }
  if (coverage.missingFunctional.length > 0) {
    console.error(
      `Functional requirements without a test: ${coverage.missingFunctional.join(', ')}`,
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
