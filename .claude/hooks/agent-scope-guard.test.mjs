import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  changeNameForBranch,
  evaluateAgentCall,
  isApprovedProposal,
} from './agent-scope-guard.mjs';

const HOOK = join(fileURLToPath(import.meta.url), '..', 'agent-scope-guard.mjs');
const ROOT = '/repo';
const APPROVED = { projectDir: ROOT, approved: true };
const DRAFT = { projectDir: ROOT, approved: false };

const call = (agent, toolName, toolInput, context = APPROVED) =>
  evaluateAgentCall(agent, { tool_name: toolName, tool_input: toolInput }, context);
const bash = (agent, command, context) => call(agent, 'Bash', { command }, context);
const edit = (agent, filePath, context) => call(agent, 'Edit', { file_path: filePath }, context);

const expectAllowed = (result) => expect(result).toEqual({ allow: true });
const expectBlocked = (result, rule) => {
  expect(result.allow).toBe(false);
  expect(result.rule).toBe(rule);
  expect(result.reason).toMatch(/^Blocked by \.claude\/hooks\/agent-scope-guard\.mjs/);
};

describe('agent-scope-guard: implementer', () => {
  it.each(['services/auth/src/app.ts', '/repo/packages/shared/src/index.ts'])(
    'NFR-MNT-001: implementer edits allowed on an approved change (%s)',
    (path) => expectAllowed(edit('implementer', path)),
  );

  it('NFR-MNT-001: implementer may run tests and commit locally', () => {
    expectAllowed(bash('implementer', 'pnpm --filter auth test'));
    expectAllowed(bash('implementer', 'git add -A && git commit -m "feat(auth): 2.1 add login"'));
  });

  it.each(['Edit', 'Write', 'MultiEdit'])(
    'NFR-MNT-001: implementer edits blocked on an unapproved change (%s)',
    (toolName) =>
      expectBlocked(call('implementer', toolName, { file_path: 'a.ts' }, DRAFT), 'not-approved'),
  );

  it.each([
    'git push',
    'git push origin feature/DEV-6-agents',
    'git -C . push',
    'pnpm test && git push',
    'bash -c "git push"',
    'echo $(git push)',
    'gh pr create --fill',
    'gh pr merge 3 --merge',
  ])('NFR-MNT-001: implementer push blocked (%s)', (command) =>
    expectBlocked(bash('implementer', command), 'push-or-pr'),
  );

  it.each([
    'mcp__atlassian__transitionJiraIssue',
    'mcp__atlassian__addCommentToJiraIssue',
    'mcp__atlassian__editJiraIssue',
    'mcp__atlassian__createJiraIssue',
  ])('NFR-MNT-001: implementer Jira writes blocked (%s)', (toolName) =>
    expectBlocked(call('implementer', toolName, {}), 'jira-write'),
  );

  it('NFR-MNT-001: implementer may read Jira', () =>
    expectAllowed(call('implementer', 'mcp__atlassian__getJiraIssue', { issueIdOrKey: 'DEV-6' })));
});

describe('agent-scope-guard: test-writer', () => {
  it.each([
    'services/auth/src/login.test.ts',
    'apps/web/src/app.test.tsx',
    'scripts/check-agents.test.mjs',
    'e2e/journey.spec.ts',
  ])('NFR-TST-001: test-writer test file edit allowed (%s)', (path) => {
    expectAllowed(edit('test-writer', path, DRAFT));
    expectAllowed(call('test-writer', 'Write', { file_path: path }, DRAFT));
  });

  it.each([
    'services/auth/src/app.ts',
    'packages/shared/src/index.ts',
    'package.json',
    '../outside/x.test.ts',
    '/etc/x.test.ts',
  ])('NFR-TST-001: test-writer production code change blocked (%s)', (path) =>
    expectBlocked(edit('test-writer', path), 'production-code'),
  );

  it.each([
    'pnpm test',
    'pnpm --filter auth test',
    'pnpm exec vitest run scripts/',
    'pnpm lint',
    'git status',
    'git diff main...HEAD',
  ])('NFR-TST-001: test-writer may run tests and read git (%s)', (command) =>
    expectAllowed(bash('test-writer', command)),
  );

  it.each([
    "sed -i 's/200/201/' services/auth/src/app.ts",
    'echo x > services/auth/src/app.ts',
    'git commit -m x',
    'git checkout -- services/auth/src/app.ts',
    'pnpm add zod',
    'pnpm format',
    'node -e "1"',
    'cat $(echo x)',
  ])('NFR-TST-001: test-writer shell writes blocked (%s)', (command) =>
    expectBlocked(bash('test-writer', command), 'command-not-allowed'),
  );
});

describe('agent-scope-guard: reviewer', () => {
  it.each(['git diff main...HEAD', 'git log --oneline main..HEAD', 'git show HEAD:package.json'])(
    'NFR-TST-001: reviewer may read git (%s)',
    (command) => expectAllowed(bash('reviewer', command)),
  );

  it.each(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])(
    'NFR-TST-001: reviewer reports without editing (%s blocked)',
    (toolName) =>
      expectBlocked(call('reviewer', toolName, { file_path: 'docs/x.md' }), 'edit-not-allowed'),
  );

  it.each(['pnpm test', 'git commit -m x', 'git diff > out.txt', 'touch x'])(
    'NFR-TST-001: reviewer runs no other commands (%s)',
    (command) => expectBlocked(bash('reviewer', command), 'command-not-allowed'),
  );

  it('NFR-TST-001: reviewer may not call MCP tools', () =>
    expectBlocked(call('reviewer', 'mcp__atlassian__getJiraIssue', {}), 'tool-not-allowed'));
});

describe('agent-scope-guard: coordinator', () => {
  it.each(['docs/progress.md', 'docs/worktrees.md', '/repo/docs/progress.md'])(
    'NFR-MNT-001: coordinator status file update allowed (%s)',
    (path) => expectAllowed(edit('coordinator', path)),
  );

  it.each(['services/tracker/src/app.ts', 'docs/FRS.md', 'openspec/changes/x/tasks.md'])(
    'NFR-MNT-001: coordinator code change blocked (%s)',
    (path) => expectBlocked(edit('coordinator', path), 'edit-not-allowed'),
  );

  it.each(['git worktree list', 'git branch', 'openspec status --change dev-6-agents', 'git log'])(
    'NFR-MNT-001: coordinator may inspect plans and branches (%s)',
    (command) => expectAllowed(bash('coordinator', command)),
  );

  it.each([
    'git worktree add ../x -b feature/DEV-10-projects main',
    'git branch -D x',
    'openspec archive dev-6-agents',
    'pnpm test',
  ])('NFR-MNT-001: coordinator runs no changing commands (%s)', (command) =>
    expectBlocked(bash('coordinator', command), 'command-not-allowed'),
  );
});

describe('agent-scope-guard: input handling', () => {
  it.each(['implementer', 'test-writer', 'reviewer', 'coordinator'])(
    'NFR-MNT-001: known agent and valid input evaluated (%s reads a file)',
    (agent) => expectAllowed(call(agent, 'Read', { file_path: 'docs/FRS.md' }, DRAFT)),
  );

  it.each([
    ['unknown agent', 'writer', { tool_name: 'Read', tool_input: {} }, 'unknown-agent'],
    ['missing agent', undefined, { tool_name: 'Read', tool_input: {} }, 'unknown-agent'],
    ['null payload', 'reviewer', null, 'malformed-input'],
    ['no tool input', 'reviewer', { tool_name: 'Read' }, 'malformed-input'],
    [
      'empty command',
      'implementer',
      { tool_name: 'Bash', tool_input: { command: ' ' } },
      'malformed-input',
    ],
    ['no file path', 'test-writer', { tool_name: 'Edit', tool_input: {} }, 'malformed-input'],
  ])('NFR-MNT-001: malformed input and unknown agent blocked (%s)', (_, agent, payload, rule) =>
    expectBlocked(evaluateAgentCall(agent, payload, APPROVED), rule),
  );

  it('NFR-MNT-001: maps a feature branch to its change name', () => {
    expect(changeNameForBranch('feature/DEV-6-agents')).toBe('dev-6-agents');
    expect(changeNameForBranch('main')).toBeNull();
  });

  it('NFR-MNT-001: approval needs status, approver and date', () => {
    const approved =
      'Ticket: DEV-6\nStatus: Approved\nApproved-by: A (via chat)\nApproved-on: 2026-10-30 16:10 IST\n';
    expect(isApprovedProposal(approved)).toBe(true);
    expect(isApprovedProposal(approved.replace('Approved\n', 'Draft\n'))).toBe(false);
    expect(isApprovedProposal(approved.replace('A (via chat)', ''))).toBe(false);
    expect(isApprovedProposal(approved.replace('2026-10-30 16:10 IST', ''))).toBe(false);
  });
});

describe('agent-scope-guard CLI', () => {
  const run = (args, input) =>
    spawnSync(process.execPath, [HOOK, ...args], { input, encoding: 'utf8' });

  it('NFR-TST-001: the CLI blocks with exit code 2 and a message on stderr', () => {
    const payload = JSON.stringify({
      tool_name: 'Edit',
      tool_input: { file_path: 'services/auth/src/app.ts' },
      cwd: process.cwd(),
    });
    const result = run(['--agent', 'test-writer'], payload);
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/agent-scope-guard\.mjs \(production-code\)/);
  });

  it('NFR-MNT-001: the CLI allows with exit code 0', () => {
    const payload = JSON.stringify({ tool_name: 'Read', tool_input: { file_path: 'x' } });
    const result = run(['--agent', 'reviewer'], payload);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('NFR-MNT-001: the CLI fails closed without an agent or on unparseable input', () => {
    expect(run([], JSON.stringify({ tool_name: 'Read', tool_input: {} })).status).toBe(2);
    expect(run(['--agent', 'reviewer'], 'not json').status).toBe(2);
  });
});
