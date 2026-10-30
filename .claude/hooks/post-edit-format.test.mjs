import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const HOOK = join(fileURLToPath(import.meta.url), '..', 'post-edit-format.mjs');
const ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');

function runHook(filePath, toolName = 'Write') {
  const payload = JSON.stringify({
    tool_name: toolName,
    tool_input: { file_path: filePath },
    cwd: ROOT,
  });
  return spawnSync(process.execPath, [HOOK], {
    input: payload,
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT },
  });
}

describe('post-edit-format', { timeout: 60_000 }, () => {
  let dir;
  const created = [];

  beforeEach(() => {
    dir = mkdtempSync(join(ROOT, 'tmp-hook-check-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    for (const path of created.splice(0)) {
      rmSync(path, { force: true });
    }
  });

  it('NFR-MNT-001: formats an edited ts file', () => {
    const file = join(dir, 'sample.ts');
    writeFileSync(file, 'export const name: string = "x"\n');
    const result = runHook(file);
    expect(result.status).toBe(0);
    expect(readFileSync(file, 'utf8')).toBe("export const name: string = 'x';\n");
  });

  it('NFR-MNT-001: reports unfixable lint errors', () => {
    const file = join(dir, 'sample.ts');
    writeFileSync(file, 'export const x: any = 1;\n');
    const result = runHook(file, 'Edit');
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('@typescript-eslint/no-explicit-any');
  });

  it('NFR-MNT-001: leaves other files untouched', () => {
    const markdown = join(dir, 'notes.md');
    const original = '# Title\n\n*   item\n';
    writeFileSync(markdown, original);
    expect(runHook(markdown).status).toBe(0);
    expect(readFileSync(markdown, 'utf8')).toBe(original);

    const ignored = join(ROOT, 'openspec', 'tmp-hook-check.json');
    created.push(ignored);
    writeFileSync(ignored, '{"a":1,\n"b":2}\n');
    expect(runHook(ignored).status).toBe(0);
    expect(readFileSync(ignored, 'utf8')).toBe('{"a":1,\n"b":2}\n');
  });

  it('NFR-MNT-001: ignores paths outside the project', () => {
    const outside = mkdtempSync(join(tmpdir(), 'hook-outside-'));
    const file = join(outside, 'sample.ts');
    writeFileSync(file, 'export const name = "x"\n');
    try {
      expect(runHook(file).status).toBe(0);
      expect(readFileSync(file, 'utf8')).toBe('export const name = "x"\n');
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it('NFR-MNT-001: does not follow a symlink out of the project', () => {
    const outside = mkdtempSync(join(tmpdir(), 'hook-outside-'));
    const target = join(outside, 'target.ts');
    writeFileSync(target, 'export const name = "x"\n');
    const link = join(dir, 'link.ts');
    symlinkSync(target, link);
    try {
      expect(runHook(link).status).toBe(0);
      expect(readFileSync(target, 'utf8')).toBe('export const name = "x"\n');
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it('NFR-MNT-001: never blocks on unreadable input', () => {
    const result = spawnSync(process.execPath, [HOOK], { input: 'not json', encoding: 'utf8' });
    expect(result.status).toBe(0);
  });
});
