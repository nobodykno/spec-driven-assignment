import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Runs the real commitlint CLI with the same config the commit-msg hook uses (design D15).
const root = join(fileURLToPath(import.meta.url), '..', '..');
const bin = join(root, 'node_modules', '.bin', 'commitlint');

function lint(message) {
  const result = spawnSync(bin, ['--config', join(root, 'commitlint.config.mjs')], {
    cwd: root,
    input: message,
    encoding: 'utf8',
  });
  return { code: result.status, output: `${result.stdout}${result.stderr}` };
}

describe('commitlint config', { timeout: 20_000 }, () => {
  it('NFR-MNT-001: accepts feat(auth) with Refs: DEV-9', () => {
    expect(lint('feat(auth): 2.1 add login endpoint\n\nRefs: DEV-9\n').code).toBe(0);
    const withBody =
      'fix(gateway): 2.2 return 503 SERVICE_UNAVAILABLE on timeout\n\n' +
      'Explain the change here.\n\nRefs: DEV-9\nCo-Authored-By: Someone <someone@example.com>\n';
    expect(lint(withBody).code).toBe(0);
  });

  it.each([
    'auth',
    'tracker',
    'gateway',
    'web',
    'shared',
    'database',
    'docker',
    'workflow',
    'docs',
  ])('NFR-MNT-001: accepts every area scope (%s)', (scope) => {
    expect(lint(`chore(${scope}): update something\n\nRefs: DEV-1\n`).code).toBe(0);
  });

  it('NFR-MNT-001: rejects a message without a scope', () => {
    const result = lint('feat: add login endpoint\n\nRefs: DEV-9\n');
    expect(result.code).not.toBe(0);
    expect(result.output).toContain('scope-empty');
  });

  it.each(['DEV-9', 'login'])('NFR-MNT-001: rejects a scope that is not an area (%s)', (scope) => {
    const result = lint(`feat(${scope}): add login endpoint\n\nRefs: DEV-9\n`);
    expect(result.code).not.toBe(0);
    expect(result.output).toContain('scope-enum');
  });

  it.each([
    ['missing', 'docs(docs): update key mapping\n'],
    ['not a Jira key', 'docs(docs): update key mapping\n\nRefs: auth\n'],
  ])('NFR-MNT-001: rejects a missing Refs footer, including on main (%s)', (_, message) => {
    const result = lint(message);
    expect(result.code).not.toBe(0);
    expect(result.output).toContain('footer-refs');
  });

  it.each([
    ['unknown type', 'feature(auth): add login endpoint\n\nRefs: DEV-9\n', 'type-enum'],
    ['revert type', 'revert(auth): add login endpoint\n\nRefs: DEV-9\n', 'type-enum'],
    ['header over 72', `feat(auth): ${'a'.repeat(61)}\n\nRefs: DEV-9\n`, 'header-max-length'],
    ['capitalised subject', 'feat(auth): Add login endpoint\n\nRefs: DEV-9\n', 'subject-case'],
    ['trailing period', 'feat(auth): add login endpoint.\n\nRefs: DEV-9\n', 'subject-full-stop'],
    [
      'body line over 72',
      `feat(auth): add login endpoint\n\n${'b'.repeat(73)}\n\nRefs: DEV-9\n`,
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

  it('NFR-MNT-001: ignores merge commits', () => {
    expect(lint("Merge branch 'main' into feature/DEV-9-auth\n").code).toBe(0);
  });
});
