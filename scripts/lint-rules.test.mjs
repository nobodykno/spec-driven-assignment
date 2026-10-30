import { ESLint } from 'eslint';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Lints fixtures with the real eslint.config.js (design D15).
const root = join(fileURLToPath(import.meta.url), '..', '..');
const eslint = new ESLint({ cwd: root });
const APP_FILE = 'services/auth/src/services/sample-service.ts';

async function lint(code, filePath = APP_FILE) {
  const [result] = await eslint.lintText(code, { filePath: join(root, filePath) });
  const ids = (severity) =>
    result.messages.filter((m) => m.severity === severity).map((m) => m.ruleId);
  return { errors: ids(2), warnings: ids(1) };
}

const CLEAN = `export const DEFAULT_LIMIT = 10;

export function clampLimit(limit: number): number {
  if (limit > DEFAULT_LIMIT) {
    return DEFAULT_LIMIT;
  }
  return limit;
}
`;

describe('eslint guideline rules', { timeout: 30_000 }, () => {
  it('NFR-MNT-001: clean guideline-style code passes', async () => {
    expect(await lint(CLEAN)).toEqual({ errors: [], warnings: [] });
  });

  it('NFR-MNT-001: rejects double quotes and missing semicolons', async () => {
    const { errors } = await lint('export const name: string = "x"\n');
    expect(errors).toEqual(expect.arrayContaining(['quotes', 'semi']));
  });

  it('NFR-MNT-001: rejects == and if without braces', async () => {
    const code =
      'export function isOne(value: number): boolean {\n' +
      '  if (value == 1) return true;\n' +
      '  return false;\n' +
      '}\n';
    const { errors } = await lint(code);
    expect(errors).toEqual(expect.arrayContaining(['eqeqeq', 'curly']));
  });

  it('NFR-MNT-001: rejects nesting deeper than 3 and complexity over 10', async () => {
    const deep =
      'export function deep(a: boolean): number {\n' +
      '  if (a) {\n    if (a) {\n      if (a) {\n        if (a) {\n          return 1;\n' +
      '        }\n      }\n    }\n  }\n  return 0;\n}\n';
    const branches = Array.from(
      { length: 11 },
      (_, i) => `  if (n === ${i}) {\n    return ${i};\n  }\n`,
    ).join('');
    const complex = `export function pick(n: number): number {\n${branches}  return -1;\n}\n`;
    expect((await lint(deep)).errors).toContain('max-depth');
    expect((await lint(complex)).errors).toContain('complexity');
  });

  it('NFR-MNT-001: rejects a missing return type on an exported function', async () => {
    const { errors } = await lint('export function double(n: number) {\n  return n * 2;\n}\n');
    expect(errors).toContain('@typescript-eslint/explicit-function-return-type');
  });

  it('NFR-MNT-001: rejects explicit any and ts-ignore', async () => {
    const anyResult = await lint('export const x: any = 1;\n');
    const ignoreResult = await lint('// @ts-ignore\nexport const y: number = 1;\n');
    expect(anyResult.errors).toContain('@typescript-eslint/no-explicit-any');
    expect(ignoreResult.errors).toContain('@typescript-eslint/ban-ts-comment');
  });

  it('NFR-MNT-001: rejects a default export outside config files', async () => {
    const code = 'const value = 1;\nexport default value;\n';
    expect((await lint(code)).errors).toContain('no-restricted-exports');
    expect((await lint(code, 'apps/web/vite.config.ts')).errors).not.toContain(
      'no-restricted-exports',
    );
  });

  it('NFR-MNT-001: rejects identifiers that break the naming rules', async () => {
    const code =
      "export const user_name = 'a';\n" +
      'export class userService {}\n' +
      'export function Do_thing(): void {}\n';
    const { errors } = await lint(code);
    expect(errors.filter((id) => id === '@typescript-eslint/naming-convention')).toHaveLength(3);
  });

  it('NFR-MNT-001: warns on console and on functions over 30 lines', async () => {
    const body = Array.from({ length: 31 }, (_, i) => `  total += ${i};\n`).join('');
    const long = `export function long(): number {\n  let total = 0;\n${body}  return total;\n}\n`;
    const logs = "export function hello(): void {\n  console.log('hi');\n}\n";
    const longResult = await lint(long);
    const logResult = await lint(logs);
    expect(longResult.warnings).toContain('max-lines-per-function');
    expect(longResult.errors).toEqual([]);
    expect(logResult.warnings).toContain('no-console');
    expect(logResult.errors).toEqual([]);
  });
});
