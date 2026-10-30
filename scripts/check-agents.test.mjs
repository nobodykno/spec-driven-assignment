import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ALLOWED_TOOLS, checkAgents, parseFrontmatter } from './check-agents.mjs';

const SCRIPT = join(fileURLToPath(import.meta.url), '..', 'check-agents.mjs');
const HEADINGS = ['Scope', 'Permitted actions', 'Output', 'Restrictions', 'When used'];
const GUARD = '.claude/hooks/agent-scope-guard.mjs';

const agentFile = (
  name,
  { tools = ALLOWED_TOOLS[name], description = `Use ${name}.`, hook = name } = {},
) =>
  [
    '---',
    `name: ${name}`,
    `description: ${description}`,
    `tools: ${tools.join(', ')}`,
    'hooks:',
    '  PreToolUse:',
    '    - matcher: "*"',
    '      hooks:',
    '        - type: command',
    `          command: node "$CLAUDE_PROJECT_DIR/${GUARD}" --agent ${hook}`,
    '---',
    '',
    `You are the ${name}.`,
  ].join('\n');

const docSection = (name, tools = ALLOWED_TOOLS[name]) =>
  [
    `## ${name}`,
    ...HEADINGS.map(
      (h) =>
        `### ${h}\n${h === 'Permitted actions' ? tools.map((t) => `- \`${t}\``).join('\n') : 'text'}`,
    ),
  ].join('\n\n');

const validInput = () => {
  const names = Object.keys(ALLOWED_TOOLS);
  return {
    agents: Object.fromEntries(names.map((name) => [name, agentFile(name)])),
    docs: ['# Agents', ...names.map((name) => docSection(name))].join('\n\n'),
    scriptExists: (path) => path === GUARD,
  };
};

describe('check-agents', () => {
  it('NFR-MNT-001: parses frontmatter with comma and list tools', () => {
    expect(parseFrontmatter(agentFile('reviewer'))).toMatchObject({
      name: 'reviewer',
      description: 'Use reviewer.',
      tools: ALLOWED_TOOLS.reviewer,
      hookCommands: [`node "$CLAUDE_PROJECT_DIR/${GUARD}" --agent reviewer`],
    });
    const list = '---\nname: x\ndescription: d\ntools:\n  - Read\n  - Grep\n---\nbody';
    expect(parseFrontmatter(list).tools).toEqual(['Read', 'Grep']);
    expect(parseFrontmatter('no frontmatter')).toBeNull();
  });

  it('NFR-MNT-001: valid definitions pass the checker (fixture set)', () => {
    expect(checkAgents(validInput())).toEqual([]);
  });

  it('NFR-MNT-001: valid definitions pass the checker (committed files)', () => {
    const result = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it.each([
    [
      'missing file',
      (i) => delete i.agents.coordinator,
      /coordinator: \.claude\/agents\/coordinator\.md is missing/,
    ],
    [
      'name mismatch',
      (i) => (i.agents.reviewer = agentFile('reviewer').replace('name: reviewer', 'name: review')),
      /reviewer: frontmatter name "review"/,
    ],
    [
      'empty description',
      (i) => (i.agents.implementer = agentFile('implementer', { description: '' })),
      /implementer: description is empty/,
    ],
    [
      'reviewer with Edit',
      (i) =>
        (i.agents.reviewer = agentFile('reviewer', { tools: [...ALLOWED_TOOLS.reviewer, 'Edit'] })),
      /reviewer: tool "Edit" is not allowed/,
    ],
    [
      'git push',
      (i) =>
        (i.agents.implementer = agentFile('implementer', {
          tools: [...ALLOWED_TOOLS.implementer, 'Bash(git push:*)'],
        })),
      /implementer: tool "Bash\(git push:\*\)" is not allowed/,
    ],
    [
      'no tools',
      (i) => (i.agents['test-writer'] = agentFile('test-writer', { tools: [] })),
      /test-writer: tools must be listed/,
    ],
    [
      'missing hook script',
      (i) => (i.scriptExists = () => false),
      /hook script \.claude\/hooks\/agent-scope-guard\.mjs does not exist/,
    ],
    [
      'hook for another agent',
      (i) => (i.agents.coordinator = agentFile('coordinator', { hook: 'implementer' })),
      /coordinator: no PreToolUse hook runs agent-scope-guard\.mjs --agent coordinator/,
    ],
    ['unparseable file', (i) => (i.agents.reviewer = 'just text'), /reviewer: no frontmatter/],
  ])('NFR-MNT-001: broken definition fails the checker (%s)', (_, breakIt, message) => {
    const input = validInput();
    breakIt(input);
    expect(checkAgents(input).join('\n')).toMatch(message);
  });

  it('NFR-MNT-001: documentation out of date fails the checker (missing file)', () => {
    expect(checkAgents({ ...validInput(), docs: null })).toEqual(['docs/agents.md is missing']);
  });

  it('NFR-MNT-001: documentation out of date fails the checker (missing section)', () => {
    const input = validInput();
    input.docs = input.docs.replace('## coordinator', '## planner');
    expect(checkAgents(input)).toContain(
      'coordinator: docs/agents.md has no "## coordinator" section',
    );
  });

  it('NFR-MNT-001: documentation out of date fails the checker (missing heading)', () => {
    const input = validInput();
    input.docs = input.docs.replace(/## reviewer[\s\S]*?### Output/, (s) =>
      s.replace('### Output', '### Result'),
    );
    expect(checkAgents(input)).toContain('reviewer: docs/agents.md section lacks "### Output"');
  });

  it('NFR-MNT-001: documentation out of date fails the checker (tool not documented)', () => {
    const input = validInput();
    input.docs = input.docs.replace(
      /## reviewer[\s\S]*$/,
      docSection('reviewer', ['Read']) + '\n\n' + docSection('coordinator'),
    );
    expect(checkAgents(input)).toContain('reviewer: docs/agents.md does not mention tool "Grep"');
  });

  it('NFR-MNT-001: extra agents only need a name and description', () => {
    const input = validInput();
    input.agents.helper = '---\nname: helper\ndescription: Helps.\n---\nbody';
    expect(checkAgents(input)).toEqual([]);
    input.agents.helper = '---\nname: helper\ndescription:\n---\nbody';
    expect(checkAgents(input)).toEqual(['helper: description is empty']);
  });
});
