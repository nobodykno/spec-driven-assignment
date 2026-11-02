import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  checkCommands,
  checkConflicts,
  checkContractApproval,
  checkEvidence,
  checkWorktreeDocs,
  gitCommitExists,
  isShallow,
  main,
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

describe('Worktree log checked against the real repository', () => {
  const root = resolve(import.meta.dirname, '..');
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

  const realCommitExists = () => {
    if (git(['rev-parse', '--is-shallow-repository']) === 'true') {
      return () => true;
    }
    return (sha) => {
      if (!/^[0-9a-f]+$/i.test(sha)) {
        return false;
      }
      try {
        execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    };
  };

  it('DEV-1014-AC-4: Repository worktree log passes the check', () => {
    const doc = readFileSync(join(root, 'docs', 'worktrees.md'), 'utf8');
    const findings = checkWorktreeDocs(doc, realCommitExists());

    expect(findings).toEqual([]);
  });

  it('DEV-1014-AC-4: Lint chain runs the worktree check', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const lint = pkg.scripts.lint;
    const mcp = lint.indexOf('pnpm check:mcp-docs');
    const worktree = lint.indexOf('pnpm check:worktree-docs');

    expect(pkg.scripts['check:worktree-docs']).toBe('node scripts/check-worktree-docs.mjs');
    expect(mcp).toBeGreaterThanOrEqual(0);
    expect(worktree).toBeGreaterThan(mcp);
  });
});

describe('Worktree check helpers and entry point', () => {
  const root = resolve(import.meta.dirname, '..');

  const VALID_DOC = [
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

  const rootWith = (doc) => {
    const dir = mkdtempSync(join(tmpdir(), 'wt-main-'));
    mkdirSync(join(dir, 'docs'));
    writeFileSync(join(dir, 'docs', 'worktrees.md'), doc);
    return dir;
  };

  it('DEV-1014-AC-4: gitCommitExists tells real commits from unknown ones', () => {
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    const exists = gitCommitExists(root);

    expect(exists(head)).toBe(true);
    expect(exists('0000000000000000000000000000000000000000')).toBe(false);
    expect(exists('0000000')).toBe(false);
    expect(exists('zzzzzzz')).toBe(false);
    expect(exists('; echo hi')).toBe(false);
  });

  it('DEV-1014-AC-4: isShallow reads the git history state', () => {
    expect(typeof isShallow(root)).toBe('boolean');

    const notRepo = mkdtempSync(join(tmpdir(), 'wt-norepo-'));
    try {
      expect(isShallow(notRepo)).toBe(true);
    } finally {
      rmSync(notRepo, { recursive: true, force: true });
    }
  });

  it('DEV-1014-AC-4: main prints the findings or the OK line and returns the exit code', () => {
    const broken = rootWith('# Worktrees\n\n## Commands\n\nnothing here\n');
    const valid = rootWith(VALID_DOC);
    try {
      const log = [];
      const error = [];
      const code = main(broken, {
        commitExists: () => true,
        shallow: false,
        log: (line) => log.push(line),
        error: (line) => error.push(line),
      });
      const expected = checkWorktreeDocs(
        '# Worktrees\n\n## Commands\n\nnothing here\n',
        () => true,
      );
      expect(code).toBe(1);
      expect(expected.length).toBeGreaterThan(0);
      expect(error).toEqual(expected);
      expect(log).toEqual([]);

      const okLog = [];
      const okError = [];
      const okCode = main(valid, {
        commitExists: () => true,
        shallow: false,
        log: (line) => okLog.push(line),
        error: (line) => okError.push(line),
      });
      expect(okCode).toBe(0);
      expect(okLog).toEqual(['check-worktree-docs: docs/worktrees.md OK']);
      expect(okError).toEqual([]);

      const failLog = [];
      const failError = [];
      const failCode = main(valid, {
        commitExists: () => true,
        shallow: true,
        log: (line) => failLog.push(line),
        error: (line) => failError.push(line),
      });
      expect(failCode).toBe(1);
      expect(failError.some((l) => l.includes('WORKTREE_DOCS_SKIP_GIT'))).toBe(true);
      expect(failError.some((l) => l.includes('shallow or unreadable git history'))).toBe(true);
      expect(failLog).toEqual([]);

      const brokenError = [];
      const brokenCode = main(broken, {
        commitExists: () => true,
        shallow: true,
        log: () => {},
        error: (line) => brokenError.push(line),
      });
      expect(brokenCode).toBe(1);
      for (const finding of expected) {
        expect(brokenError).toContain(finding);
      }

      const shLog = [];
      const shError = [];
      const shCode = main(valid, {
        commitExists: () => true,
        shallow: true,
        skipGit: true,
        log: (line) => shLog.push(line),
        error: (line) => shError.push(line),
      });
      expect(shCode).toBe(0);
      expect(shError).toHaveLength(1);
      expect(
        shError[0].startsWith(
          'check-worktree-docs: shallow or unreadable git history, commit existence not checked',
        ),
      ).toBe(true);
      expect(shLog).toEqual(['check-worktree-docs: docs/worktrees.md OK']);
    } finally {
      rmSync(broken, { recursive: true, force: true });
      rmSync(valid, { recursive: true, force: true });
    }
  });

  it('DEV-1014-AC-4: the CLI runs when the script is reached through a symlink', () => {
    const script = resolve(import.meta.dirname, 'check-worktree-docs.mjs');
    const linkDir = mkdtempSync(join(tmpdir(), 'wt-link-'));
    const broken = rootWith('# Worktrees\n\n## Commands\n\nnothing here\n');
    try {
      const link = join(linkDir, 'link.mjs');
      symlinkSync(script, link);

      let status = 0;
      let output = '';
      try {
        execFileSync(process.execPath, [link], { cwd: broken, encoding: 'utf8', stdio: 'pipe' });
      } catch (error) {
        status = error.status;
        output = `${error.stdout}${error.stderr}`;
      }
      expect(status).toBe(1);
      expect(output).toContain('docs/worktrees.md: ');
    } finally {
      rmSync(linkDir, { recursive: true, force: true });
      rmSync(broken, { recursive: true, force: true });
    }
  });

  it('DEV-1014-AC-4: the CLI fails closed outside a git checkout unless skipping is requested', () => {
    const script = resolve(import.meta.dirname, 'check-worktree-docs.mjs');
    const valid = rootWith(VALID_DOC);
    try {
      const env = { ...process.env };
      delete env.WORKTREE_DOCS_SKIP_GIT;

      let status = 0;
      let output = '';
      try {
        execFileSync(process.execPath, [script], {
          cwd: valid,
          env,
          encoding: 'utf8',
          stdio: 'pipe',
        });
      } catch (error) {
        status = error.status;
        output = `${error.stdout}${error.stderr}`;
      }
      expect(status).toBe(1);
      expect(output).toContain('WORKTREE_DOCS_SKIP_GIT');

      const stdout = execFileSync(process.execPath, [script], {
        cwd: valid,
        env: { ...env, WORKTREE_DOCS_SKIP_GIT: '1' },
        encoding: 'utf8',
        stdio: 'pipe',
      });
      expect(stdout).toContain('check-worktree-docs: docs/worktrees.md OK');
    } finally {
      rmSync(valid, { recursive: true, force: true });
    }
  });
});
