import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Runs the real commitlint CLI with the same config the commit-msg hook uses.
const root = join(fileURLToPath(import.meta.url), '..', '..');
const bin = join(root, 'node_modules', '.bin', 'commitlint');
const FEATURE = 'feature/DEV-9-auth';

function lint(message, branch = FEATURE) {
  const result = spawnSync(bin, ['--config', join(root, 'commitlint.config.mjs')], {
    cwd: root,
    input: message,
    encoding: 'utf8',
    env: { ...process.env, COMMITLINT_BRANCH: branch },
  });
  return { code: result.status, output: `${result.stdout}${result.stderr}` };
}

describe('commitlint config', { timeout: 20_000 }, () => {
  it('NFR-MNT-001: accepts feat(DEV-9) with Refs: DEV-9', () => {
    expect(lint('feat(DEV-9): 2.1 add login endpoint\n\nRefs: DEV-9\n').code).toBe(0);
    const withBody =
      'fix(DEV-9): 2.2 return 503 SERVICE_UNAVAILABLE on timeout\n\n' +
      'Explain the change here.\n\nRefs: DEV-9\nCo-Authored-By: Someone <someone@example.com>\n';
    expect(lint(withBody).code).toBe(0);
  });

  it('NFR-MNT-001: rejects a message without a Jira scope', () => {
    const result = lint('feat: add login endpoint\n\nRefs: DEV-9\n');
    expect(result.code).not.toBe(0);
    expect(result.output).toContain('scope-jira-key');
  });

  it('NFR-MNT-001: rejects a non-Jira scope', () => {
    const result = lint('feat(auth): add login endpoint\n\nRefs: DEV-9\n');
    expect(result.code).not.toBe(0);
    expect(result.output).toContain('scope-jira-key');
  });

  it.each([
    ['missing', 'feat(DEV-9): add login endpoint\n'],
    ['mismatched', 'feat(DEV-9): add login endpoint\n\nRefs: DEV-10\n'],
  ])('NFR-MNT-001: rejects a missing or mismatched Refs footer (%s)', (_, message) => {
    const result = lint(message);
    expect(result.code).not.toBe(0);
    expect(result.output).toContain('footer-refs-scope');
  });

  it.each([
    ['unknown type', 'feature(DEV-9): add login endpoint\n\nRefs: DEV-9\n', 'type-enum'],
    ['header over 72', `feat(DEV-9): ${'a'.repeat(60)}\n\nRefs: DEV-9\n`, 'header-max-length'],
    ['capitalised subject', 'feat(DEV-9): Add login endpoint\n\nRefs: DEV-9\n', 'subject-case'],
    ['trailing period', 'feat(DEV-9): add login endpoint.\n\nRefs: DEV-9\n', 'subject-full-stop'],
    [
      'body line over 72',
      `feat(DEV-9): add login endpoint\n\n${'b'.repeat(73)}\n\nRefs: DEV-9\n`,
      'body-max-line-length',
    ],
  ])(
    'NFR-MNT-001: rejects an unknown type, a header over 72, a capitalised subject, a trailing period, a body line over 72 (%s)',
    (_, message, rule) => {
      const result = lint(message);
      expect(result.code).not.toBe(0);
      expect(result.output).toContain(rule);
    },
  );

  it('NFR-MNT-001: allows unscoped docs:/chore: on main only', () => {
    expect(lint('docs: update key mapping\n', 'main').code).toBe(0);
    expect(lint('chore: bump tooling\n', 'main').code).toBe(0);
    expect(lint('docs: update key mapping\n', FEATURE).code).not.toBe(0);
    expect(lint('docs: update key mapping\n', 'HEAD').code).not.toBe(0);
    expect(lint('feat: add something\n', 'main').code).not.toBe(0);
    expect(lint('chore(DEV-1): archive dev-1-project-setup\n', 'main').code).not.toBe(0);
  });

  it('NFR-MNT-001: ignores merge commits', () => {
    expect(lint("Merge branch 'main' into feature/DEV-9-auth\n").code).toBe(0);
  });
});
