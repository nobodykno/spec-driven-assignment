// DEV-1014: docs/worktrees.md must show the worktree commands for the two parallel pairs.
// Pure functions return a list of findings; an empty list means the document is valid.

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

const normalisePair = (text) => text.replace('‖', '||').replace(/\s+/g, ' ').trim();

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
    return ['docs/worktrees.md has no "## Commands" section'];
  }
  const findings = [];
  for (const pair of PAIRS) {
    const body = pairBody(section, pair.label);
    const adds =
      body === null ? [] : body.split('\n').filter((line) => /^\s*git worktree add\b/.test(line));
    const named = pair.branches.every((branch) => adds.some((line) => line.includes(branch)));
    if (adds.length < 2 || !named) {
      findings.push(
        `${pair.label}: needs two "git worktree add" lines naming ${pair.branches.join(' and ')}`,
      );
    }
  }
  for (const command of ['git worktree list', 'git worktree remove']) {
    const present = section.split('\n').some((line) => line.trim().startsWith(command));
    if (!present) {
      findings.push(`the Commands section has no "${command}" command`);
    }
  }
  return findings;
}
