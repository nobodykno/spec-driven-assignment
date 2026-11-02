// DEV-1014: docs/worktrees.md must show the worktree commands, merge conflicts, contract approvals
// and integration evidence of parallel development. Pure functions return a list of findings; an
// empty list means the document is valid. The CLI at the end reads the real file and git.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const PREFIX = 'docs/worktrees.md: ';

const PAIRS = [
  { label: 'DEV-1007 || DEV-1008', branches: ['feature/DEV-10-', 'feature/DEV-11-'] },
  { label: 'DEV-1011 || DEV-1012', branches: ['feature/DEV-14-', 'feature/DEV-15-'] },
];

/**
 * @param {string} doc markdown text
 * @param {string} heading exact second-level heading text
 * @returns {string | null} the section body, or null when the heading is missing
 */
export function getSection(doc, heading) {
  const lines = doc.split('\n');
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) {
    return null;
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^## /.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}

/**
 * @param {string} text subsection heading text
 * @returns {string} the pair label with `‖` written as `||` and spaces collapsed
 */
const normalisePair = (text) => text.replaceAll('‖', '||').replace(/\s+/g, ' ').trim();

/**
 * @param {string} section body of the Commands section
 * @param {string} label pair label such as `DEV-1007 || DEV-1008`
 * @returns {string | null} the subsection body for that pair
 */
function pairBody(section, label) {
  const lines = section.split('\n');
  const start = lines.findIndex(
    (line) => /^### /.test(line) && normalisePair(line.slice(4)) === label,
  );
  if (start === -1) {
    return null;
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^###? /.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}

/**
 * AC-1: exact `git worktree add`, `list` and `remove` commands, per pair.
 * @param {string} doc docs/worktrees.md text
 * @returns {string[]} findings
 */
export function checkCommands(doc) {
  const section = getSection(doc, 'Commands');
  if (section === null) {
    return [`${PREFIX}no "## Commands" section`];
  }
  const findings = [];
  for (const pair of PAIRS) {
    const body = pairBody(section, pair.label);
    const adds =
      body === null ? [] : body.split('\n').filter((line) => /^\s*git worktree add\b/.test(line));
    const named = pair.branches.every((branch) => adds.some((line) => line.includes(branch)));
    if (adds.length < 2 || !named) {
      findings.push(
        `${PREFIX}${pair.label} needs two "git worktree add" lines naming ${pair.branches.join(' and ')}`,
      );
    }
  }
  for (const command of ['git worktree list', 'git worktree remove']) {
    const present = section.split('\n').some((line) => line.trim().startsWith(command));
    if (!present) {
      findings.push(`${PREFIX}the Commands section has no "${command}" command`);
    }
  }
  return findings;
}

/**
 * @param {string} section body of a section that holds one markdown table
 * @returns {string[][]} the data rows as trimmed cells (header and separator rows dropped);
 *   a doubled `||` inside a cell (the pair label) is not a cell separator
 */
function tableRows(section) {
  const rows = section
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .map((line) =>
      line
        .trim()
        .replace(/^\|(?!\|)|(?<!\|)\|$/g, '')
        .split(/(?<!\|)\|(?!\|)/)
        .map((cell) => cell.trim()),
    );
  return rows.slice(2);
}

/**
 * @param {string[]} row cells of one Merge conflicts row: date, branch, file, cause, resolution, re-verified
 * @returns {string[]} findings for that conflict
 */
function conflictFindings(row) {
  const [, branch = '', file = '', , resolution = '', verified = ''] = row;
  const where = `${file || '(no file)'} (${branch})`;
  const findings = [];
  if (resolution === '') {
    findings.push(`${PREFIX}conflict in ${where} has no resolution`);
  }
  const words = verified.replace(/`/g, '').trim().split(/\s+/);
  if (!/\bpnpm\b/.test(verified) || words.length < 3) {
    findings.push(
      `${PREFIX}conflict in ${where} has no re-verification (a pnpm command and its result)`,
    );
  }
  return findings;
}

/**
 * AC-2: every merge conflict names its file, a resolution and the gates run afterwards.
 * @param {string} doc docs/worktrees.md text
 * @returns {string[]} findings
 */
export function checkConflicts(doc) {
  const section = getSection(doc, 'Merge conflicts');
  if (section === null) {
    return [`${PREFIX}no "## Merge conflicts" section`];
  }
  const rows = tableRows(section);
  if (rows.length === 0) {
    return [`${PREFIX}the Merge conflicts section lists no conflict`];
  }
  return rows.flatMap(conflictFindings);
}

/**
 * AC-3: per pair, the commit that put the shared contracts on the branches, and it must exist.
 * @param {string} doc docs/worktrees.md text
 * @param {(sha: string) => boolean} commitExists predicate that tells whether a commit is in git
 * @returns {string[]} findings
 */
export function checkContractApproval(doc, commitExists) {
  const section = getSection(doc, 'Shared contracts approved before parallel work');
  if (section === null) {
    return [`${PREFIX}no "## Shared contracts approved before parallel work" section`];
  }
  const rows = tableRows(section);
  const findings = [];
  for (const pair of PAIRS) {
    const row = rows.find(([cell = '']) => normalisePair(cell) === pair.label);
    if (row === undefined) {
      findings.push(`${PREFIX}${pair.label} has no approval row`);
      continue;
    }
    const sha = /\b(?=[0-9a-f]*\d)[0-9a-f]{7,40}\b/i.exec((row[1] ?? '').replace(/`/g, ''))?.[0];
    if (sha === undefined) {
      findings.push(`${PREFIX}${pair.label} has no commit SHA`);
    } else if (!commitExists(sha)) {
      findings.push(`${PREFIX}${pair.label} cites commit ${sha}, which git does not know`);
    }
  }
  return findings;
}

/**
 * @param {string} section section body
 * @returns {string[][]} the lines of each fenced block, in order
 */
function fencedBlocks(section) {
  const blocks = [];
  let current = null;
  for (const line of section.split('\n')) {
    if (line.trim().startsWith('```')) {
      if (current === null) {
        current = [];
      } else {
        blocks.push(current);
        current = null;
      }
    } else if (current !== null) {
      current.push(line);
    }
  }
  return blocks;
}

/**
 * AC-4: a `git log --graph` excerpt that shows a merge, and the `git worktree list` output.
 * @param {string} doc docs/worktrees.md text
 * @returns {string[]} findings
 */
export function checkEvidence(doc) {
  const section = getSection(doc, 'Evidence');
  if (section === null) {
    return [`${PREFIX}no "## Evidence" section`];
  }
  const blocks = fencedBlocks(section);
  const findings = [];
  const graph = blocks.find((lines) => (lines[0] ?? '').trim().startsWith('$ git log --graph'));
  if (graph === undefined) {
    findings.push(`${PREFIX}Evidence has no graph excerpt block starting with "$ git log --graph"`);
  } else if (!graph.slice(1).some((line) => line.includes('Merge'))) {
    findings.push(`${PREFIX}the graph excerpt shows no Merge commit`);
  }
  const list = blocks.find((lines) => (lines[0] ?? '').trim() === '$ git worktree list');
  const paths = list === undefined ? [] : list.slice(1).filter((line) => /^\s*\//.test(line));
  if (list === undefined || paths.length < 2) {
    findings.push(
      `${PREFIX}terminal output is missing: a "$ git worktree list" block with two worktree paths`,
    );
  }
  return findings;
}

/**
 * @param {string} doc docs/worktrees.md text
 * @param {(sha: string) => boolean} commitExists predicate that tells whether a commit is in git
 * @returns {string[]} the findings of every check
 */
export function checkWorktreeDocs(doc, commitExists) {
  return [
    ...checkCommands(doc),
    ...checkConflicts(doc),
    ...checkContractApproval(doc, commitExists),
    ...checkEvidence(doc),
  ];
}

/**
 * Reads docs/worktrees.md under a root and checks it.
 * @param {string} root repository root
 * @param {{ commitExists: (sha: string) => boolean }} deps commit lookup
 * @returns {{ code: number, lines: string[] }} exit code (1 with findings) and the lines to print
 */
export function run(root, { commitExists }) {
  const doc = readFileSync(join(root, 'docs', 'worktrees.md'), 'utf8');
  const lines = checkWorktreeDocs(doc, commitExists);
  return { code: lines.length > 0 ? 1 : 0, lines };
}

/**
 * @param {string} root repository root, used as the git working directory
 * @returns {(sha: string) => boolean} true when `git cat-file -e <sha>^{commit}` succeeds
 */
function gitCommitExists(root) {
  return (sha) => {
    if (!/^[0-9a-f]{7,40}$/i.test(sha)) {
      return false;
    }
    try {
      execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  };
}

/**
 * @param {string} root repository root, used as the git working directory
 * @returns {boolean} true when git history is shallow or cannot be read
 */
function isShallow(root) {
  try {
    const out = execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
      cwd: root,
      encoding: 'utf8',
    });
    return out.trim() === 'true';
  } catch {
    return true;
  }
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const root = process.cwd();
  const shallow = isShallow(root);
  if (shallow) {
    console.error(
      'check-worktree-docs: shallow or unreadable git history, commit existence not checked',
    );
  }
  const { code, lines } = run(root, { commitExists: shallow ? () => true : gitCommitExists(root) });
  for (const line of lines) {
    console.error(line);
  }
  process.exit(code);
}
