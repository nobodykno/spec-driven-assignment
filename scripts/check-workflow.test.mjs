import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { checkApproval, checkVerified, checkWorkflowDocs } from './check-workflow.mjs';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const handoff = (...blocks) =>
  `# Handoff: dev-8\n\n${blocks.map(([stage, status]) => `### ${stage} | 2026-11-01 | ${status}\nhead: abc1234\n`).join('\n')}`;

describe('approval gate (Gate 1 in handoff.md)', () => {
  it('NFR-MNT-001: Propose then approved gate passes', () => {
    expect(checkApproval(handoff(['propose', 'AWAITING_GATE_1'], ['gate-1', 'APPROVED']))).toEqual(
      [],
    );
  });

  it('NFR-MNT-001: No gate block refused', () => {
    expect(checkApproval(handoff(['propose', 'AWAITING_GATE_1']))).toEqual([
      expect.stringContaining('gate-1'),
    ]);
  });

  it('NFR-MNT-001: Rejected gate refused', () => {
    expect(
      checkApproval(handoff(['propose', 'AWAITING_GATE_1'], ['gate-1', 'REJECTED'])),
    ).not.toEqual([]);
  });

  it('NFR-MNT-001: Update after approval cancels it', () => {
    const text = handoff(
      ['propose', 'AWAITING_GATE_1'],
      ['gate-1', 'APPROVED'],
      ['update', 'AWAITING_GATE_1'],
    );
    expect(checkApproval(text)).toEqual([expect.stringContaining('cancelled')]);
  });

  it('NFR-MNT-001: Missing handoff refused', () => {
    expect(checkApproval(undefined)).toEqual([expect.stringContaining('handoff.md')]);
  });
});

describe('archive command file', () => {
  const archive = readFileSync(join(ROOT, '.claude', 'commands', 'opsx', 'archive.md'), 'utf8');

  it('NFR-MNT-001: Archive requires a merged pull request and a follow-up branch', () => {
    expect(archive).toMatch(/must be the follow-up branch, not `main`; on `main` stop/);
    expect(archive).toMatch(/latest `pr` block must be `MERGED`/);
    expect(archive).toContain('Never push to `main`');
  });

  it('NFR-MNT-001: Archive syncs specs before moving the change', () => {
    const syncAt = archive.indexOf('run the `/opsx:sync` workflow inline');
    const moveAt = archive.indexOf('mv "<changeRoot>" "<planningHome.changesDir>/archive/');
    expect(syncAt).toBeGreaterThan(-1);
    expect(moveAt).toBeGreaterThan(-1);
    expect(syncAt).toBeLessThan(moveAt);
    expect(archive).toContain('Never archive while a sync is in flight');
  });
});

describe('verification gate (review block in handoff.md)', () => {
  it('NFR-MNT-001: Latest review pass allowed', () => {
    expect(checkVerified(handoff(['review', 'FAIL'], ['review', 'PASS']))).toEqual([]);
  });

  it('NFR-MNT-001: Latest review fail refused', () => {
    expect(checkVerified(handoff(['review', 'PASS'], ['review', 'FAIL']))).toEqual([
      expect.stringContaining('FAIL'),
    ]);
  });

  it('NFR-MNT-001: Missing review refused', () => {
    expect(checkVerified(handoff(['apply', 'COMPLETE']))).not.toEqual([]);
    expect(checkVerified(undefined)).toEqual([expect.stringContaining('handoff.md')]);
  });
});

describe('workflow documentation', () => {
  const doc = '### /opsx:propose\n### /opsx:apply\n';

  it('NFR-MNT-001: Every command documented', () => {
    expect(checkWorkflowDocs(['propose', 'apply'], doc)).toEqual([]);
  });

  it('NFR-MNT-001: Undocumented command fails and is named', () => {
    expect(checkWorkflowDocs(['propose', 'apply', 'archive'], doc)).toEqual([
      expect.stringContaining('/opsx:archive'),
    ]);
  });
});

describe('check-workflow CLI', () => {
  const run = (cwd) =>
    spawnSync('node', [join(ROOT, 'scripts', 'check-workflow.mjs')], { cwd, encoding: 'utf8' });

  it('NFR-MNT-001: Committed repository passes the checker', () => {
    expect(readFileSync(join(ROOT, 'docs', 'workflow.md'), 'utf8')).toContain('/opsx:archive');
    const result = run(ROOT);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it('NFR-MNT-001: Checker exits 1 for an undocumented command', () => {
    const root = mkdtempSync(join(tmpdir(), 'wf-'));
    mkdirSync(join(root, '.claude', 'commands', 'opsx'), { recursive: true });
    mkdirSync(join(root, 'docs'));
    writeFileSync(join(root, '.claude', 'commands', 'opsx', 'ghost.md'), '---\n---\n');
    writeFileSync(join(root, 'docs', 'workflow.md'), '# Workflow\n');
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('/opsx:ghost');
  });
});
