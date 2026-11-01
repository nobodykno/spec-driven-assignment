import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkMcpConfig } from './check-mcp-docs.mjs';

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
