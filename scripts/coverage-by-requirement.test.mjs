import { describe, expect, it } from 'vitest';
import {
  buildCoverage,
  extractRequirementIds,
  extractTestTitleIds,
  renderTable,
} from './coverage-by-requirement.mjs';

const FRS = [
  '#### FR-AUTH-001: Register',
  'text',
  '| NFR-SEC-001 | Security | Passwords hashed |',
  '| DEV-1006 | FR-AUTH-001 to FR-AUTH-007, NFR-SEC-001 to 003 |',
  '#### FR-TASK-005: Status transitions',
].join('\n');

describe('coverage-by-requirement', () => {
  it('NFR-TST-001: reads requirement ids from headings and NFR rows only', () => {
    expect(extractRequirementIds(FRS)).toEqual(['FR-AUTH-001', 'FR-TASK-005', 'NFR-SEC-001']);
  });

  it('NFR-TST-001: finds ids at the start of it, test, each and template titles', () => {
    const source = [
      "it('FR-AUTH-001: registers', () => {});",
      'test(`FR-SYS-002: shows ${state}`, async () => {});',
      "it.each(['a'])('NFR-OPS-001: rejects %s', () => {});",
      "it('does not start with an id FR-TASK-005', () => {});",
    ].join('\n');
    expect(extractTestTitleIds(source)).toEqual(['FR-AUTH-001', 'FR-SYS-002', 'NFR-OPS-001']);
  });

  it('NFR-TST-001: lists tests per requirement and reports functional gaps', () => {
    const coverage = buildCoverage(
      ['FR-AUTH-001', 'FR-TASK-005', 'NFR-SEC-001'],
      [
        { file: 'a.test.ts', ids: ['FR-AUTH-001', 'FR-AUTH-001'] },
        { file: 'b.test.ts', ids: ['FR-AUTH-001'] },
      ],
    );
    expect(coverage.rows[0]).toMatchObject({ id: 'FR-AUTH-001', count: 3 });
    expect(coverage.rows[0].files).toEqual(['a.test.ts', 'b.test.ts']);
    expect(coverage.missingFunctional).toEqual(['FR-TASK-005']);
    expect(coverage.missingNonFunctional).toEqual(['NFR-SEC-001']);
  });

  it('NFR-TST-001: renders a markdown table with a row per requirement', () => {
    const table = renderTable({
      rows: [
        { id: 'FR-AUTH-001', count: 2, files: ['a.test.ts'] },
        { id: 'FR-TASK-005', count: 0, files: [] },
      ],
    });
    expect(table).toContain('| Requirement | Tests | Files |');
    expect(table).toContain('| FR-AUTH-001 | 2 | a.test.ts |');
    expect(table).toContain('| FR-TASK-005 | 0 | none |');
  });
});
