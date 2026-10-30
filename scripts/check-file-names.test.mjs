import { describe, expect, it } from 'vitest';
import { findBadFileNames } from './check-file-names.mjs';

describe('check-file-names', () => {
  it('NFR-MNT-001: accepts kebab-case source files and folders', () => {
    expect(
      findBadFileNames([
        'services/auth/src/middleware/error-handler.ts',
        'apps/web/src/app.test.tsx',
        'apps/web/src/vite-env.d.ts',
        'scripts/check-versions.mjs',
        'e2e/web-api-status.spec.ts',
        'eslint.config.js',
      ]),
    ).toEqual([]);
  });

  it('NFR-MNT-001: rejects a file name that is not kebab-case', () => {
    expect(findBadFileNames(['services/auth/src/services/UserService.ts'])).toEqual([
      'services/auth/src/services/UserService.ts',
    ]);
    expect(findBadFileNames(['apps/web/src/App.tsx', 'scripts/check_names.mjs'])).toHaveLength(2);
  });

  it('NFR-MNT-001: rejects a folder name that is not kebab-case', () => {
    expect(findBadFileNames(['services/auth/src/UserServices/index.ts'])).toEqual([
      'services/auth/src/UserServices/index.ts',
    ]);
  });

  it('NFR-MNT-001: ignores non-code files and documents', () => {
    expect(
      findBadFileNames([
        'docs/CODING_GUIDELINES.md',
        'CLAUDE.md',
        'services/auth/Dockerfile',
        'docs/evidence/DEV-1/web-api-online.png',
      ]),
    ).toEqual([]);
  });
});
