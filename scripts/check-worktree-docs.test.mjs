import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  checkCommands,
  checkConflicts,
  checkContractApproval,
  checkEvidence,
  checkWorktreeDocs,
  run,
} from './check-worktree-docs.mjs';

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

const PREFIX = 'docs/worktrees.md: ';

const CONFLICT_HEADER = [
  '| Date | Branch | File | Cause | Resolution | Re-verified |',
  '|------|--------|------|-------|------------|-------------|',
];

const conflictsDoc = (rows) =>
  [
    '# Worktrees',
    '',
    '## Merge conflicts',
    '',
    ...CONFLICT_HEADER,
    ...rows,
    '',
    '## Evidence',
    '',
  ].join('\n');

const FILE_APP = 'services/tracker/src/app.ts';
const FILE_ROUTES = 'services/tracker/src/routes.ts';

const VALID_CONFLICT_ROW = `| 2026-10-30 | feature/DEV-11-tracker-projects | ${FILE_APP} | both branches mounted routes | kept both route mounts | \`pnpm test\` 40 passed |`;

describe('Merge conflict resolved and re-verified', () => {
  it('DEV-1014-AC-2: Conflict with resolution and gates recorded', () => {
    expect(checkConflicts(conflictsDoc([VALID_CONFLICT_ROW]))).toEqual([]);
  });

  it('DEV-1014-AC-2: Conflict without re-verification rejected', () => {
    const emptyCell = `| 2026-10-30 | feature/DEV-11-tracker-projects | ${FILE_APP} | mounts | kept both | |`;
    const noPnpm = `| 2026-10-31 | feature/DEV-13-tasks | ${FILE_ROUTES} | mounts | kept both | looked fine |`;

    for (const [row, file, other] of [
      [emptyCell, FILE_APP, FILE_ROUTES],
      [noPnpm, FILE_ROUTES, FILE_APP],
    ]) {
      const findings = checkConflicts(conflictsDoc([row]));
      const text = findings.join('\n');

      expect(findings.length).toBeGreaterThan(0);
      expect(findings.every((f) => f.startsWith(PREFIX))).toBe(true);
      expect(text).toContain(file);
      expect(text).not.toContain(other);
    }

    const mixed = checkConflicts(conflictsDoc([VALID_CONFLICT_ROW, emptyCell])).join('\n');
    expect(mixed).toContain(FILE_APP);
  });

  it('DEV-1014-AC-2: Conflicts section without an entry rejected', () => {
    const findings = checkConflicts(conflictsDoc([]));

    expect(findings).toHaveLength(1);
    expect(findings[0].startsWith(PREFIX)).toBe(true);
    expect(findings[0].toLowerCase()).toContain('no conflict');
  });
});

const SHA_A = 'a1b2c3d';
const SHA_B = '0123456789abcdef0123456789abcdef01234567';

const approvalDoc = (rows) =>
  [
    '# Worktrees',
    '',
    '## Shared contracts approved before parallel work',
    '',
    '| Pair | Commit | What was approved |',
    '|------|--------|-------------------|',
    ...rows,
    '',
    '## Evidence',
    '',
  ].join('\n');

const validApprovalRows = [
  `| ${PAIR_A} | \`${SHA_A}\` | auth and tracker contracts |`,
  `| ${PAIR_B} | \`${SHA_B}\` | web task contracts |`,
];

describe('Contract approval referenced by commit', () => {
  it('DEV-1014-AC-3: Approval commit recorded per pair', () => {
    const looked = [];
    const commitExists = (sha) => {
      looked.push(sha);
      return true;
    };

    expect(checkContractApproval(approvalDoc(validApprovalRows), commitExists)).toEqual([]);
    expect(looked).toEqual([SHA_A, SHA_B]);
  });

  it('DEV-1014-AC-3: Row without commit reference rejected', () => {
    const rows = [validApprovalRows[0], `| ${PAIR_B} | approved in chat | web task contracts |`];
    const findings = checkContractApproval(approvalDoc(rows), () => true);
    const text = findings.join('\n');

    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((f) => f.startsWith(PREFIX))).toBe(true);
    expect(text).toContain(PAIR_B);
    expect(text).not.toContain(PAIR_A);
  });

  it('DEV-1014-AC-3: Reference to unknown commit rejected', () => {
    const findings = checkContractApproval(approvalDoc(validApprovalRows), (sha) => sha !== SHA_B);
    const text = findings.join('\n');

    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((f) => f.startsWith(PREFIX))).toBe(true);
    expect(text).toContain(PAIR_B);
    expect(text).toContain(SHA_B);
    expect(text).not.toContain(PAIR_A);
    expect(text).not.toContain(SHA_A);
  });
});

const GRAPH_LINES = [
  '$ git log --graph --oneline -8',
  '*   a1b2c3d Merge branch feature/DEV-15-web-board',
  '|\\',
  '| * 9f8e7d6 feat(web): add board',
  '* | 5c4b3a2 feat(web): add tasks',
  '|/',
  '* 1234567 chore: base',
];
const GRAPH_NO_MERGE = [
  '$ git log --graph --oneline -3',
  '* 9f8e7d6 feat(web): add board',
  '* 5c4b3a2 feat(web): add tasks',
  '* 1234567 chore: base',
];
const LIST_LINES = [
  '$ git worktree list',
  '/Users/dev/repo                        a1b2c3d [main]',
  '/Users/dev/repo/.claude/worktrees/wt-a 9f8e7d6 [feature/DEV-14-web-tasks]',
];

const evidenceDoc = (...blocks) =>
  ['# Worktrees', '', '## Evidence', '', ...blocks.map((b) => fenced(b)), ''].join('\n');

describe('Integration evidence recorded', () => {
  it('DEV-1014-AC-4: Graph excerpt and terminal output present', () => {
    expect(checkEvidence(evidenceDoc(GRAPH_LINES, LIST_LINES))).toEqual([]);
  });

  it('DEV-1014-AC-4: Graph excerpt without a merge commit rejected', () => {
    const findings = checkEvidence(evidenceDoc(GRAPH_NO_MERGE, LIST_LINES));
    const text = findings.join('\n');

    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((f) => f.startsWith(PREFIX))).toBe(true);
    expect(text).toContain('Merge');
    expect(text).not.toContain('git worktree list');
  });

  it('DEV-1014-AC-4: Evidence without terminal output rejected', () => {
    const findings = checkEvidence(evidenceDoc(GRAPH_LINES));
    const text = findings.join('\n');

    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((f) => f.startsWith(PREFIX))).toBe(true);
    expect(text).toContain('git worktree list');
    expect(text).not.toContain('git log --graph');
  });
});

describe('Worktree log checked in lint', () => {
  const SCRIPT = resolve(import.meta.dirname, 'check-worktree-docs.mjs');
  const brokenDoc = '# Worktrees\n\n## Commands\n\nnothing here\n';

  const makeRoot = () => {
    const root = mkdtempSync(join(tmpdir(), 'wt-docs-'));
    mkdirSync(join(root, 'docs'));
    writeFileSync(join(root, 'docs', 'worktrees.md'), brokenDoc);
    return root;
  };

  it('DEV-1014-AC-2: Findings make the CLI exit 1', () => {
    const root = makeRoot();
    try {
      const findings = checkWorktreeDocs(brokenDoc, () => true);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings.every((f) => f.startsWith(PREFIX))).toBe(true);

      const result = run(root, { commitExists: () => true });
      expect(result.code).toBe(1);
      expect(result.lines.length).toBeGreaterThan(0);
      expect(result.lines.every((l) => l.startsWith(PREFIX))).toBe(true);

      let status;
      let output = '';
      try {
        execFileSync(process.execPath, [SCRIPT], { cwd: root, encoding: 'utf8', stdio: 'pipe' });
        status = 0;
      } catch (error) {
        status = error.status;
        output = `${error.stdout}${error.stderr}`;
      }
      expect(status).toBe(1);
      expect(output).toContain(PREFIX);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }

    const validDoc = [
      commandsDoc(),
      CONFLICT_HEADER.join('\n'),
      VALID_CONFLICT_ROW,
      '',
      '## Shared contracts approved before parallel work',
      '',
      '| Pair | Commit | What was approved |',
      '|------|--------|-------------------|',
      ...validApprovalRows,
      '',
      '## Evidence',
      '',
      fenced(GRAPH_LINES),
      fenced(LIST_LINES),
      '',
    ].join('\n');
    const validRoot = mkdtempSync(join(tmpdir(), 'wt-docs-ok-'));
    try {
      mkdirSync(join(validRoot, 'docs'));
      writeFileSync(join(validRoot, 'docs', 'worktrees.md'), validDoc);

      expect(checkWorktreeDocs(validDoc, () => true)).toEqual([]);
      expect(run(validRoot, { commitExists: () => true }).code).toBe(0);

      const stdout = execFileSync(process.execPath, [SCRIPT], {
        cwd: validRoot,
        encoding: 'utf8',
        stdio: 'pipe',
      });
      expect(stdout).toContain('check-worktree-docs: docs/worktrees.md OK');
    } finally {
      rmSync(validRoot, { recursive: true, force: true });
    }
  });
});
