import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  checkGitignore,
  checkGraphDoc,
  checkTokenDoc,
  checkVersions,
  GRAPH_IGNORES,
} from './check-graph-docs.mjs';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (file) => readFileSync(join(ROOT, file), 'utf8');

const versionsDoc = [
  '| Tool | Version | Where |',
  '| --- | --- | --- |',
  '| uv | 0.9.1 | Homebrew |',
  '| code-review-graph | 2.3.9 | uv tool |',
  '| graphifyy | 0.9.97 | uv tool |',
].join('\n');

const query = (n) =>
  `### Query ${n}: question ${n}\n\n- Command: \`tool query ${n}\`\n- Result: 3 files\n- Confirmed against: \`src/file${n}.ts\`\n`;
const graphDoc = (count, extra = '') =>
  `## Build stats\n\n- Nodes: 10\n\n## Queries\n\n${Array.from({ length: count }, (_, i) => query(i + 1)).join('\n')}${extra}`;

const row = (run, mode, tokens = '12,000', files = '9', time = '95 s', findings = '2') =>
  `| ${run} | ${mode} | ${tokens} | ${files} | ${time} | ${findings} |`;
const tokenDoc = (rows) =>
  [
    '## Baseline vs graph-assisted',
    '| Run | Mode | Tokens | Files examined | Time | Findings |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows,
    '## Method',
    'Same task, fresh context.',
    '## Limitations',
    'One run per cell.',
  ].join('\n');
const fourRows = () => [
  row('Task', 'baseline'),
  row('Task', 'graph-assisted'),
  row('Review', 'baseline'),
  row('Review', 'graph-assisted'),
];

describe('versions', () => {
  it('NFR-OPS-001: exact versions for both tools pass', () => {
    expect(checkVersions(versionsDoc)).toEqual([]);
  });

  it.each(['code-review-graph', 'graphifyy'])('NFR-OPS-001: %s without a version fails', (tool) => {
    const doc = versionsDoc.replace(new RegExp(`\\| ${tool} \\| [^|]+\\|`), `| ${tool} | latest |`);
    expect(checkVersions(doc)).toEqual([expect.stringContaining(tool)]);
  });

  it('NFR-OPS-001: a missing tool row fails', () => {
    const doc = versionsDoc.replace(/\| graphifyy .*\n?/, '');
    expect(checkVersions(doc)).toEqual([expect.stringContaining('graphifyy')]);
  });
});

describe('gitignore', () => {
  it('NFR-OPS-001: cache paths ignored passes', () => {
    expect(checkGitignore(`${GRAPH_IGNORES.join('\n')}\n`)).toEqual([]);
  });

  it('NFR-OPS-001: a cache path that is not ignored fails', () => {
    expect(checkGitignore('node_modules/\n')).toHaveLength(GRAPH_IGNORES.length);
  });
});

describe('graph-tools doc', () => {
  it('NFR-MNT-001: stats and 5 confirmed queries pass', () => {
    expect(checkGraphDoc(graphDoc(5))).toEqual([]);
  });

  it('NFR-MNT-001: fewer than 5 queries fails', () => {
    expect(checkGraphDoc(graphDoc(4))).toEqual([expect.stringContaining('5')]);
  });

  it('NFR-MNT-001: a query without confirmation fails', () => {
    const doc = graphDoc(5).replace('- Confirmed against: `src/file3.ts`\n', '');
    expect(checkGraphDoc(doc)).toEqual([expect.stringContaining('Query 3')]);
  });

  it('NFR-MNT-001: missing build stats fails', () => {
    const doc = graphDoc(5).replace('## Build stats', '## Something else');
    expect(checkGraphDoc(doc)).toEqual([expect.stringContaining('Build stats')]);
  });
});

describe('token-efficiency doc', () => {
  it('NFR-MNT-001: four measured runs with method and limitations pass', () => {
    expect(checkTokenDoc(tokenDoc(fourRows()))).toEqual([]);
  });

  it('NFR-MNT-001: later tables in the same section are not read as runs', () => {
    const doc = tokenDoc(fourRows()).replace(
      '## Method',
      '### Differences\n| Comparison | Baseline |\n| --- | --- |\n| Task tokens | 1 |\n## Method',
    );
    expect(checkTokenDoc(doc)).toEqual([]);
  });

  it('NFR-MNT-001: fewer than four runs fails', () => {
    expect(checkTokenDoc(tokenDoc(fourRows().slice(0, 3)))).toEqual([
      expect.stringContaining('four'),
    ]);
  });

  it.each(['TBD', '~12,000', '', 'not provided'])(
    'NFR-MNT-001: placeholder token value "%s" fails',
    (value) => {
      const rows = fourRows();
      rows[2] = row('Review', 'baseline', value);
      expect(checkTokenDoc(tokenDoc(rows))).toEqual([expect.stringContaining('Review')]);
    },
  );

  it('NFR-MNT-001: missing limitations section fails', () => {
    const doc = tokenDoc(fourRows()).replace('## Limitations', '## Other');
    expect(checkTokenDoc(doc)).toEqual([expect.stringContaining('Limitations')]);
  });
});

describe('committed files', () => {
  it('NFR-OPS-001: repository docs and .gitignore pass', () => {
    const findings = [
      ...checkVersions(read('docs/versions.md')),
      ...checkGitignore(read('.gitignore')),
      ...checkGraphDoc(read('docs/graph-tools.md')),
      ...checkTokenDoc(read('docs/token-efficiency.md')),
    ];
    expect(findings).toEqual([]);
  });
});
