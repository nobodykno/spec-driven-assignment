import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { checkApproval, checkVerified, checkWorkflowDocs } from './check-workflow.mjs';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const proposal = (status, by, on) =>
  `Ticket: DEV-8\nTicket source: live MCP\nStatus: ${status}\nApproved-by:${by}\nApproved-on:${on}\n\n# Proposal\n`;

describe('approval gate', () => {
  it('NFR-MNT-001: approved change with approver and date passes', () => {
    const text = proposal('Approved', ' Paramjit Jena (via chat)', ' 2026-10-30 16:58 IST');
    expect(checkApproval(text)).toEqual([]);
  });

  it('NFR-MNT-001: draft change is refused', () => {
    const text = proposal('Draft', '', '');
    expect(checkApproval(text)).toEqual([expect.stringContaining('Status: Approved')]);
  });

  it.each([
    ['Approved-by', proposal('Approved', '', ' 2026-10-30 16:58 IST')],
    ['Approved-on', proposal('Approved', ' Paramjit Jena (via chat)', '')],
  ])('NFR-MNT-001: approved without %s is refused', (field, text) => {
    expect(checkApproval(text)).toEqual([expect.stringContaining(field)]);
  });

  it('NFR-MNT-001: a proposal with no status line is refused', () => {
    expect(checkApproval('# Proposal\n')).not.toEqual([]);
  });
});

describe('verification gate', () => {
  it('NFR-MNT-001: READY FOR PR report passes', () => {
    expect(checkVerified('## Result\n\n**READY FOR PR**, pending /cost.\n')).toEqual([]);
  });

  it('NFR-MNT-001: NOT READY report is refused', () => {
    expect(checkVerified('## Result\n\n**NOT READY**: 2 findings open\n')).toEqual([
      expect.stringContaining('NOT READY'),
    ]);
  });

  it('NFR-MNT-001: a missing report is refused', () => {
    expect(checkVerified(undefined)).toEqual([expect.stringContaining('verification.md')]);
  });
});

describe('workflow documentation', () => {
  const doc = '### /sdd:propose\n### /sdd:apply\n';

  it('NFR-MNT-001: every command documented passes', () => {
    expect(checkWorkflowDocs(['propose', 'apply'], doc)).toEqual([]);
  });

  it('NFR-MNT-001: undocumented command fails and is named', () => {
    expect(checkWorkflowDocs(['propose', 'apply', 'archive'], doc)).toEqual([
      expect.stringContaining('/sdd:archive'),
    ]);
  });
});

describe('check-workflow CLI', () => {
  const run = (cwd) =>
    spawnSync('node', [join(ROOT, 'scripts', 'check-workflow.mjs')], { cwd, encoding: 'utf8' });

  it('NFR-MNT-001: the repository passes', () => {
    expect(readFileSync(join(ROOT, 'docs', 'workflow.md'), 'utf8')).toContain('/sdd:archive');
    const result = run(ROOT);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it('NFR-MNT-001: exits 1 and names the command when a command is undocumented', () => {
    const root = mkdtempSync(join(tmpdir(), 'wf-'));
    mkdirSync(join(root, '.claude', 'commands', 'sdd'), { recursive: true });
    mkdirSync(join(root, 'docs'));
    writeFileSync(join(root, '.claude', 'commands', 'sdd', 'ghost.md'), '---\n---\n');
    writeFileSync(join(root, 'docs', 'workflow.md'), '# Workflow\n');
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('/sdd:ghost');
  });
});
