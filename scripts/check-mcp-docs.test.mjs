import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  checkCommands,
  checkContext7Log,
  checkFailureLog,
  checkMcpConfig,
  checkSettingsWrites,
} from './check-mcp-docs.mjs';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');

const ATLASSIAN = { type: 'http', url: 'https://mcp.atlassian.com/v1/mcp' };

const context7 = (pkg, extra = {}) => ({
  type: 'stdio',
  command: 'npx',
  args: ['-y', pkg],
  ...extra,
});

const config = (servers) => JSON.stringify({ mcpServers: servers }, null, 2);

const CREDENTIAL_WORDS = /credential|env|header|authorization|secret|token/i;

describe('Context7 server pinned', () => {
  it('DEV-1004-AC-1: Context7 server pinned with exact version', () => {
    const findings = checkMcpConfig(
      config({ context7: context7('@upstash/context7-mcp@1.2.3'), atlassian: ATLASSIAN }),
    );

    expect(findings).toEqual([]);

    const real = readFileSync(join(ROOT, '.mcp.json'), 'utf8');
    expect(checkMcpConfig(real)).toEqual([]);
  });

  it('DEV-1004-AC-1: Floating Context7 version rejected', () => {
    const floating = [
      '@upstash/context7-mcp',
      '@upstash/context7-mcp@latest',
      '@upstash/context7-mcp@^1.2.3',
      '@upstash/context7-mcp@1.x',
    ];

    for (const pkg of floating) {
      const findings = checkMcpConfig(config({ context7: context7(pkg), atlassian: ATLASSIAN }));

      expect(findings.length, pkg).toBeGreaterThan(0);
      const text = findings.join('\n');
      expect(text, pkg).toContain('context7');
      expect(text, pkg).toMatch(/unpinned|not pinned|floating|exact/i);
    }
  });
});

describe('MCP config robustness [design]', () => {
  const PINNED = '@upstash/context7-mcp@1.2.3';

  it('[design] a non-object server entry yields a finding and does not throw', () => {
    const text = config({ context7: context7(PINNED), x: null, y: 'text' });
    let findings = [];

    expect(() => {
      findings = checkMcpConfig(text);
    }).not.toThrow();

    const joined = findings.join('\n');
    expect(findings.some((finding) => /\bx\b/.test(finding))).toBe(true);
    expect(findings.some((finding) => /\by\b/.test(finding))).toBe(true);
    expect(joined).toMatch(/object|invalid|malformed/i);
  });

  it('[design] a look-alike package is not accepted as the pinned context7 package', () => {
    const findings = checkMcpConfig(
      config({ context7: context7('@upstash/context7-mcp-evil@1.0.0') }),
    );
    const text = findings.join('\n');

    expect(findings.length).toBeGreaterThan(0);
    expect(text).toContain('context7');
    expect(text).toMatch(/unpinned|not pinned|exact/i);
  });

  it('[design] a value after --api-key, --token or --secret yields a finding', () => {
    for (const flag of ['--api-key', '--token', '--secret']) {
      const findings = checkMcpConfig(
        config({ context7: context7(PINNED, { args: ['-y', PINNED, flag, 'plainvalue123'] }) }),
      );

      expect(findings.length, flag).toBeGreaterThan(0);
      expect(findings.join('\n'), flag).toContain('context7');
    }
  });
});

describe('MCP evidence and secrets', () => {
  it('DEV-1004-AC-6: MCP config holds no credentials', () => {
    const fixture = checkMcpConfig(
      config({ context7: context7('@upstash/context7-mcp@1.2.3'), atlassian: ATLASSIAN }),
    );
    expect(fixture).toEqual([]);

    const real = readFileSync(join(ROOT, '.mcp.json'), 'utf8');
    const credentialFindings = checkMcpConfig(real).filter((finding) =>
      CREDENTIAL_WORDS.test(finding),
    );

    expect(credentialFindings).toEqual([]);
  });

  it('DEV-1004-AC-6: Credential in MCP config rejected', () => {
    const pinned = '@upstash/context7-mcp@1.2.3';
    const cases = [
      ['env block', { context7: context7(pinned, { env: { CONTEXT7_API_KEY: 'x' } }) }, /env/i],
      [
        'Authorization header',
        {
          context7: context7(pinned),
          atlassian: { ...ATLASSIAN, headers: { Authorization: 'Bearer abc' } },
        },
        /header|authorization/i,
      ],
      [
        'ctx7sk key',
        {
          context7: context7(pinned, { args: ['-y', pinned, '--api-key', 'ctx7sk-abc123def456'] }),
        },
        /ctx7sk|secret|token|key/i,
      ],
    ];

    for (const [label, servers, problem] of cases) {
      const findings = checkMcpConfig(config(servers));
      const entry = label === 'Authorization header' ? 'atlassian' : 'context7';
      const text = findings.join('\n');

      expect(findings.length, label).toBeGreaterThan(0);
      expect(text, label).toContain(entry);
      expect(text, label).toMatch(problem);
    }
  });
});

const WRITE_TOOLS = [
  'createJiraIssue',
  'editJiraIssue',
  'transitionJiraIssue',
  'addCommentToJiraIssue',
  'addWorklogToJiraIssue',
  'createIssueLink',
].map((name) => `mcp__atlassian__${name}`);

const settings = (permissions) => JSON.stringify({ permissions }, null, 2);

const COMMAND_FILES = {
  'opsx/explore': 'opsx/explore.md',
  'opsx/propose': 'opsx/propose.md',
  'opsx/archive': 'opsx/archive.md',
  'create-pr': 'create-pr.md',
  'frs-ticket': 'frs-ticket.md',
};

const readRealCommands = () =>
  Object.fromEntries(
    Object.entries(COMMAND_FILES).map(([key, file]) => [
      key,
      readFileSync(join(ROOT, '.claude', 'commands', file), 'utf8'),
    ]),
  );

const FAILURE_RULE = 'On any Jira failure stop and report; never invent ticket data.';
const APPROVAL_RULE = 'The Jira write happens only with the approval of the user.';

const goodCommands = () => ({
  'opsx/explore': FAILURE_RULE,
  'opsx/propose': `${FAILURE_RULE} ${APPROVAL_RULE}`,
  'opsx/archive': `${FAILURE_RULE} ${APPROVAL_RULE}`,
  'create-pr': `${FAILURE_RULE} ${APPROVAL_RULE}`,
  'frs-ticket': `${FAILURE_RULE} ${APPROVAL_RULE}`,
});

describe('Write operations need approval', () => {
  it('DEV-1004-AC-4: Jira write tools require approval', () => {
    const fixture = checkSettingsWrites(settings({ ask: WRITE_TOOLS, allow: ['Read'] }));
    expect(fixture).toEqual([]);

    const real = readFileSync(join(ROOT, '.claude', 'settings.json'), 'utf8');
    expect(checkSettingsWrites(real)).toEqual([]);
  });

  it('DEV-1004-AC-4: Write tool outside the ask list rejected', () => {
    const tool = 'mcp__atlassian__transitionJiraIssue';
    const rest = WRITE_TOOLS.filter((name) => name !== tool);

    const inAllow = checkSettingsWrites(settings({ ask: rest, allow: [tool] }));
    expect(inAllow.length).toBeGreaterThan(0);
    expect(inAllow.join('\n')).toContain(tool);

    const missing = checkSettingsWrites(settings({ ask: rest, allow: [] }));
    expect(missing.length).toBeGreaterThan(0);
    expect(missing.join('\n')).toContain(tool);
  });

  it('DEV-1004-AC-4: Commands ask before a Jira write', () => {
    const noApproval = checkCommands({ ...goodCommands(), 'create-pr': FAILURE_RULE });
    expect(noApproval.length).toBeGreaterThan(0);
    expect(noApproval.join('\n')).toContain('create-pr');

    const approvalFindings = checkCommands(readRealCommands()).filter((finding) =>
      /approval/i.test(finding),
    );
    expect(approvalFindings).toEqual([]);
  });
});

describe('Jira failure handling (commands)', () => {
  it('DEV-1004-AC-3: Jira commands state every failure case', () => {
    expect(checkCommands(goodCommands())).toEqual([]);
    expect(checkCommands(readRealCommands())).toEqual([]);
  });

  it('DEV-1004-AC-3: Command without the failure rule rejected', () => {
    const findings = checkCommands({
      ...goodCommands(),
      'opsx/archive': `On failure stop. ${APPROVAL_RULE}`,
    });
    const text = findings.join('\n');

    expect(findings.length).toBeGreaterThan(0);
    expect(text).toContain('opsx/archive');
    expect(text).not.toContain('opsx/explore');
  });
});

const CONTEXT7_HEADER = '| Date (IST) | Library | Version | Topic | Result |';
const FAILURE_HEADER = '| Date (IST) | Case | Call | Result |';

const context7Table = (rows) =>
  ['## Context7 lookups', '', CONTEXT7_HEADER, '| --- | --- | --- | --- | --- |', ...rows, ''].join(
    '\n',
  );

const failureTable = (rows) =>
  ['## Failure test log', '', FAILURE_HEADER, '| --- | --- | --- | --- |', ...rows, ''].join('\n');

const LOOKUP_ROW = '| 2026-11-01 10:12 | express | 5.1.0 | routing | documented |';

const FAILURE_ROWS = {
  missing:
    '| 2026-11-01 10:20 | missing ticket | getJiraIssue DEV-999 | not found, no data invented |',
  disabled: '| 2026-11-01 10:25 | MCP disabled | getJiraIssue DEV-1004 | stopped and reported |',
  auth: '| 2026-11-01 10:30 | auth cleared | getJiraIssue DEV-1004 | stopped and reported |',
  unsupported:
    '| 2026-11-01 10:35 | unsupported operation | deleteJiraIssue DEV-1004 | reported, not attempted by another route |',
};

const validFailureRows = () => Object.values(FAILURE_ROWS);

const validDoc = () =>
  ['# MCP setup', '', context7Table([LOOKUP_ROW]), failureTable(validFailureRows())].join('\n');

const readRealDoc = () => readFileSync(join(ROOT, 'docs', 'mcp-setup.md'), 'utf8');

const bothFindings = (text) => [...checkContext7Log(text), ...checkFailureLog(text)];

describe('Context7 lookup recorded', () => {
  it('DEV-1004-AC-1: Context7 lookup recorded with library, version and time', () => {
    expect(checkContext7Log(validDoc())).toEqual([]);

    const real = checkContext7Log(readRealDoc()).filter((finding) =>
      /context7|lookup/i.test(finding),
    );
    expect(real).toEqual([]);
  });

  it('DEV-1004-AC-1: Lookup row without version rejected', () => {
    const noVersion = '| 2026-11-01 10:12 | express |  | routing | documented |';
    const doc = ['# MCP setup', '', context7Table([noVersion]), failureTable(validFailureRows())];
    const findings = checkContext7Log(doc.join('\n'));
    const text = findings.join('\n');

    expect(findings.length).toBeGreaterThan(0);
    expect(text).toContain('express');
    expect(text).toMatch(/version/i);
  });
});

describe('Failure log', () => {
  it('DEV-1004-AC-2: Missing ticket reported as not found', () => {
    expect(checkFailureLog(validDoc())).toEqual([]);

    const real = checkFailureLog(readRealDoc()).filter((finding) =>
      /missing ticket|DEV-999/i.test(finding),
    );
    expect(real).toEqual([]);
  });

  it('DEV-1004-AC-3: Disabled MCP and cleared auth recorded as a stop', () => {
    expect(checkFailureLog(validDoc())).toEqual([]);

    const real = checkFailureLog(readRealDoc()).filter((finding) =>
      /MCP disabled|auth cleared/i.test(finding),
    );
    expect(real).toEqual([]);
  });

  it('DEV-1004-AC-3: Unsupported operation recorded', () => {
    expect(checkFailureLog(validDoc())).toEqual([]);

    const real = checkFailureLog(readRealDoc()).filter((finding) => /unsupported/i.test(finding));
    expect(real).toEqual([]);
  });

  it('DEV-1004-AC-2: Failure log missing a case rejected', () => {
    const rows = validFailureRows().filter((row) => !row.includes('auth cleared'));
    const findings = checkFailureLog(['# MCP setup', failureTable(rows)].join('\n'));
    const text = findings.join('\n');

    expect(findings.length).toBeGreaterThan(0);
    expect(text).toMatch(/auth cleared/i);
    expect(text).not.toMatch(/missing ticket|MCP disabled|unsupported operation/i);
  });
});

describe('Failure log entries', () => {
  it('DEV-1004-AC-5: Failure log entries carry date and time', () => {
    expect(bothFindings(validDoc())).toEqual([]);

    const real = bothFindings(readRealDoc()).filter((finding) => /timestamp|date/i.test(finding));
    expect(real).toEqual([]);
  });

  it('DEV-1004-AC-5: Log entry without date rejected', () => {
    const rows = validFailureRows().map((row) =>
      row.includes('MCP disabled') ? row.replace('2026-11-01 10:25', '') : row,
    );
    const findings = checkFailureLog(['# MCP setup', failureTable(rows)].join('\n'));
    const text = findings.join('\n');

    expect(findings.length).toBeGreaterThan(0);
    expect(text).toMatch(/MCP disabled/i);
    expect(text).toMatch(/timestamp|date/i);
  });
});
