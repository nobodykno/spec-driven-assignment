import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkSettings } from './check-claude-settings.mjs';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const allExist = () => true;

const withPermissions = (permissions, extra = {}) => ({
  permissions: { allow: [], ask: [], deny: [], ...permissions },
  ...extra,
});

describe('check-claude-settings', () => {
  it('NFR-MNT-001: current settings pass', () => {
    const settings = JSON.parse(readFileSync(join(ROOT, '.claude', 'settings.json'), 'utf8'));
    expect(checkSettings(settings, { root: ROOT })).toEqual([]);
  });

  it('NFR-MNT-001: accepts well-formed rules', () => {
    const settings = withPermissions({
      allow: [
        'Bash(pnpm test:e2e:*)',
        'Bash(curl -s * localhost*)',
        'mcp__atlassian__getJiraIssue',
      ],
      ask: ['Bash(git push:*)'],
      deny: ['Read(./.env)', 'Bash(env)'],
    });
    expect(checkSettings(settings, { fileExists: allExist })).toEqual([]);
  });

  it.each(['Bash(curl -s:* http://localhost*)', 'Bash(git push', 'Bash()', 'bash git push', ''])(
    'NFR-MNT-001: rejects malformed rules (%j)',
    (rule) => {
      const findings = checkSettings(withPermissions({ allow: [rule] }), { fileExists: allExist });
      expect(findings).toHaveLength(1);
      expect(findings[0]).toContain(JSON.stringify(rule));
    },
  );

  it('NFR-MNT-001: rejects a rule in two lists', () => {
    const settings = withPermissions({ allow: ['Bash(git push:*)'], ask: ['Bash(git push:*)'] });
    const findings = checkSettings(settings, { fileExists: allExist });
    expect(findings).toEqual([expect.stringContaining('allow and ask')]);
  });

  it('NFR-MNT-001: rejects an unknown defaultMode', () => {
    const settings = withPermissions({ defaultMode: 'yolo' });
    expect(checkSettings(settings, { fileExists: allExist })).toEqual([
      expect.stringContaining('defaultMode'),
    ]);
  });

  it('NFR-MNT-001: rejects a missing hook script', () => {
    const settings = withPermissions(
      {},
      {
        hooks: {
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [
                { type: 'command', command: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/nope.mjs"' },
              ],
            },
          ],
        },
      },
    );
    const findings = checkSettings(settings, { fileExists: (path) => !path.endsWith('nope.mjs') });
    expect(findings).toEqual([expect.stringContaining('.claude/hooks/nope.mjs')]);
  });

  it('NFR-MNT-001: requires the guard and formatter hooks to be registered', () => {
    const findings = checkSettings(withPermissions({}), {
      fileExists: allExist,
      requiredHooks: { PreToolUse: 'pre-tool-guard.mjs', PostToolUse: 'post-edit-format.mjs' },
    });
    expect(findings).toHaveLength(2);
  });
});
