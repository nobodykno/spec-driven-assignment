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
  it('NFR-MNT-001: propose then gate-1 APPROVED passes', () => {
    expect(checkApproval(handoff(['propose', 'AWAITING_GATE_1'], ['gate-1', 'APPROVED']))).toEqual(
      [],
    );
  });

  it('NFR-MNT-001: no gate-1 block is refused', () => {
    expect(checkApproval(handoff(['propose', 'AWAITING_GATE_1']))).toEqual([
      expect.stringContaining('gate-1'),
    ]);
  });

  it('NFR-MNT-001: gate-1 REJECTED is refused', () => {
    expect(
      checkApproval(handoff(['propose', 'AWAITING_GATE_1'], ['gate-1', 'REJECTED'])),
    ).not.toEqual([]);
  });

  it('NFR-MNT-001: an update after the approval cancels it', () => {
    const text = handoff(
      ['propose', 'AWAITING_GATE_1'],
      ['gate-1', 'APPROVED'],
      ['update', 'AWAITING_GATE_1'],
    );
    expect(checkApproval(text)).toEqual([expect.stringContaining('cancelled')]);
  });

  it('NFR-MNT-001: a missing handoff is refused', () => {
    expect(checkApproval(undefined)).toEqual([expect.stringContaining('handoff.md')]);
  });
});

describe('verification gate (review block in handoff.md)', () => {
  it('NFR-MNT-001: latest review PASS passes', () => {
    expect(checkVerified(handoff(['review', 'FAIL'], ['review', 'PASS']))).toEqual([]);
  });

  it('NFR-MNT-001: latest review FAIL is refused', () => {
    expect(checkVerified(handoff(['review', 'PASS'], ['review', 'FAIL']))).toEqual([
      expect.stringContaining('FAIL'),
    ]);
  });

  it('NFR-MNT-001: no review block or no file is refused', () => {
    expect(checkVerified(handoff(['apply', 'COMPLETE']))).not.toEqual([]);
    expect(checkVerified(undefined)).toEqual([expect.stringContaining('handoff.md')]);
  });
});

describe('workflow documentation', () => {
  const doc = '### /opsx:propose\n### /opsx:apply\n';

  it('NFR-MNT-001: every command documented passes', () => {
    expect(checkWorkflowDocs(['propose', 'apply'], doc)).toEqual([]);
  });

  it('NFR-MNT-001: undocumented command fails and is named', () => {
    expect(checkWorkflowDocs(['propose', 'apply', 'archive'], doc)).toEqual([
      expect.stringContaining('/opsx:archive'),
    ]);
  });
});

describe('check-workflow CLI', () => {
  const run = (cwd) =>
    spawnSync('node', [join(ROOT, 'scripts', 'check-workflow.mjs')], { cwd, encoding: 'utf8' });

  it('NFR-MNT-001: the repository passes', () => {
    expect(readFileSync(join(ROOT, 'docs', 'workflow.md'), 'utf8')).toContain('/opsx:archive');
    const result = run(ROOT);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it('NFR-MNT-001: exits 1 and names the command when a command is undocumented', () => {
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
