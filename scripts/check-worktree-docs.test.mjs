import { describe, expect, it } from 'vitest';
import { checkCommands } from './check-worktree-docs.mjs';

const PAIR_A = 'DEV-1007 || DEV-1008';
const PAIR_B = 'DEV-1011 || DEV-1012';

const ADD_A = [
  'git worktree add ../wt-auth -b feature/DEV-10-auth-setup main',
  'git worktree add ../wt-tracker -b feature/DEV-11-tracker-projects main',
];
const ADD_B = [
  'git worktree add ../wt-web-a -b feature/DEV-14-web-tasks main',
  'git worktree add ../wt-web-b -b feature/DEV-15-web-board main',
];

const fenced = (lines) => ['```bash', ...lines, '```'].join('\n');

const subsection = (pair, lines) => [`### ${pair}`, '', fenced(lines), ''].join('\n');

const commandsDoc = ({
  addA = ADD_A,
  addB = ADD_B,
  list = 'git worktree list',
  remove = 'git worktree remove ../wt-auth',
} = {}) =>
  [
    '# Worktrees',
    '',
    '## Commands',
    '',
    subsection(PAIR_A, addA),
    subsection(PAIR_B, addB),
    fenced([list, remove].filter(Boolean)),
    '',
    '## Merge conflicts',
    '',
  ].join('\n');

describe('Worktree commands documented', () => {
  it('DEV-1014-AC-1: Commands for both pairs documented', () => {
    expect(checkCommands(commandsDoc())).toEqual([]);
  });

  it('DEV-1014-AC-1: Missing remove command rejected', () => {
    const findings = checkCommands(commandsDoc({ remove: '' }));
    const text = findings.join('\n');

    expect(findings.length).toBeGreaterThan(0);
    expect(text).toContain('git worktree remove');
    expect(text).not.toContain('git worktree list');
    expect(text).not.toContain(PAIR_A);
    expect(text).not.toContain(PAIR_B);
  });

  it('DEV-1014-AC-1: Pair without its add commands rejected', () => {
    const findings = checkCommands(commandsDoc({ addB: [ADD_B[0]] }));
    const text = findings.join('\n');

    expect(findings.length).toBeGreaterThan(0);
    expect(text).toContain(PAIR_B);
    expect(text).not.toContain(PAIR_A);
    expect(text).not.toContain('git worktree remove');
  });
});
