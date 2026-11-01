import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  changeNameForBranch,
  evaluateAgentCall,
  isApprovedHandoff,
  readApproval,
  resolveWorkRoot,
} from './agent-scope-guard.mjs';

const HOOK = join(fileURLToPath(import.meta.url), '..', 'agent-scope-guard.mjs');
const ROOT = '/repo';
const APPROVED = { projectDir: ROOT, approved: true };
const DRAFT = { projectDir: ROOT, approved: false };

const call = (agent, toolName, toolInput, context = APPROVED) =>
  evaluateAgentCall(agent, { tool_name: toolName, tool_input: toolInput }, context);
const bash = (agent, command, context) => call(agent, 'Bash', { command }, context);
const edit = (agent, filePath, context) => call(agent, 'Edit', { file_path: filePath }, context);

const block = (stage, status) => `### ${stage} | 2026-11-01 | ${status}\nhead: abc1234\n`;
const LEGACY_PROPOSAL =
  'Ticket: DEV-7\nStatus: Approved\nApproved-by: A (via chat)\nApproved-on: 2026-10-30 16:10 IST\n';

/** A temp git repo on `branch`; optional handoff.md / proposal.md of change dev-7-mcp. */
function makeRepo(branch, handoff, proposal) {
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'guard-gate-')));
  git('init', '-q', '-b', branch);
  git('config', 'user.email', 't@example.com');
  git('config', 'user.name', 't');
  writeFileSync(join(root, 'f.txt'), 'x');
  git('add', '.');
  git('commit', '-q', '-m', 'init');
  const dir = join(root, 'openspec/changes/dev-7-mcp');
  mkdirSync(dir, { recursive: true });
  if (handoff !== undefined) {
    writeFileSync(join(dir, 'handoff.md'), handoff);
  }
  if (proposal !== undefined) {
    writeFileSync(join(dir, 'proposal.md'), proposal);
  }
  return root;
}

const runCli = (root, agent, payload) =>
  spawnSync(process.execPath, [HOOK, '--agent', agent], {
    input: JSON.stringify({ ...payload, cwd: root }),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
  });

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

  it('NFR-MNT-001: Edits blocked on an unapproved change', () => {
    for (const toolName of ['Edit', 'Write', 'MultiEdit']) {
      const result = call('implementer', toolName, { file_path: 'a.ts' }, DRAFT);
      expectBlocked(result, 'not-approved');
      expect(result.reason).toMatch(/no approved OpenSpec change/);
    }
    // On a branch with no change at all the CLI exits 2 with the same message.
    const root = makeRepo('main');
    const cli = runCli(root, 'implementer', {
      tool_name: 'Edit',
      tool_input: { file_path: 'a.ts' },
    });
    expect(cli.status).toBe(2);
    expect(cli.stderr).toMatch(/no approved OpenSpec change/);
    // A change whose handoff holds only propose (no gate-1 APPROVED) is unapproved too.
    const planned = makeRepo('feature/docs/DEV-7-mcp', block('propose', 'AWAITING_GATE_1'));
    const planCli = runCli(planned, 'implementer', {
      tool_name: 'Write',
      tool_input: { file_path: join(planned, 'a.ts') },
    });
    expect(planCli.status).toBe(2);
    expect(planCli.stderr).toMatch(/no approved OpenSpec change/);
  });

  const PUSH_COMMANDS = [
    'git push',
    'git push origin feature/DEV-6-agents',
    'git -C . push',
    'git -C /abs/path push',
    'git -c core.x=y push',
    'git --git-dir=.git push',
    'command git push',
    '/usr/bin/git push',
    'env FOO=1 git push',
    'xargs git push < /dev/null',
    'command gh pr create',
    'pnpm test && git push',
    'bash -c "git push"',
    'echo $(git push)',
    'gh pr create --fill',
    'gh pr merge 3 --merge',
  ];
  const JIRA_WRITES = [
    'mcp__atlassian__transitionJiraIssue',
    'mcp__atlassian__addCommentToJiraIssue',
    'mcp__atlassian__editJiraIssue',
    'mcp__atlassian__createJiraIssue',
  ];

  it('NFR-MNT-001: Push and Jira writes blocked', () => {
    for (const command of PUSH_COMMANDS) {
      const result = bash('implementer', command);
      expectBlocked(result, 'push-or-pr');
      expect(result.reason).toMatch(/never pushes or opens\/merges PRs/);
    }
    for (const toolName of JIRA_WRITES) {
      const result = call('implementer', toolName, {});
      expectBlocked(result, 'jira-write');
      expect(result.reason).toMatch(/never writes to Jira/);
    }
    // Through the CLI the same calls exit 2 even on an approved change.
    const root = makeRepo(
      'feature/docs/DEV-7-mcp',
      block('propose', 'AWAITING_GATE_1') + block('gate-1', 'APPROVED'),
    );
    for (const [name, input] of [
      ['Bash', { command: 'git push' }],
      ['Bash', { command: 'gh pr create --fill' }],
      ['Bash', { command: 'gh pr merge 3 --merge' }],
      ['mcp__atlassian__transitionJiraIssue', {}],
    ]) {
      const cli = runCli(root, 'implementer', { tool_name: name, tool_input: input });
      expect(cli.status).toBe(2);
      expect(cli.stderr).toMatch(/never (pushes|writes to Jira)/);
    }
  });

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

  it.each([
    'pnpm test',
    'git commit -m x',
    'git diff > out.txt',
    'git diff --output=out.txt',
    'git log --output x',
    'touch x',
  ])('NFR-TST-001: reviewer runs no other commands (%s)', (command) =>
    expectBlocked(bash('reviewer', command), 'command-not-allowed'),
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

describe('agent-scope-guard: git worktrees (DEV-22)', () => {
  const git = (cwd, ...args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

  function setup() {
    const base = realpathSync(mkdtempSync(join(tmpdir(), 'guard-wt-')));
    const main = join(base, 'main');
    mkdirSync(main);
    git(main, 'init', '-q', '-b', 'main');
    git(main, 'config', 'user.email', 't@example.com');
    git(main, 'config', 'user.name', 't');
    writeFileSync(join(main, 'f.txt'), 'x');
    git(main, 'add', '.');
    git(main, 'commit', '-q', '-m', 'init');
    const wt = join(base, 'wt');
    git(main, 'worktree', 'add', '-q', '-b', 'feature/DEV-1-demo', wt);
    const dir = join(wt, 'openspec/changes/dev-1-demo');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'proposal.md'),
      'Status: Approved\nApproved-by: Me\nApproved-on: 2026-01-01 10:00 IST\n',
    );
    return { main, wt };
  }

  it('NFR-MNT-001: a file in a linked worktree resolves to that worktree and its approval', () => {
    const { main, wt } = setup();
    const payload = { tool_name: 'Write', tool_input: { file_path: join(wt, 'new/dir/a.ts') } };
    const root = resolveWorkRoot(main, payload);
    expect(root).toBe(wt);
    expect(readApproval(root)).toBe(true);
    expect(readApproval(main)).toBe(false);
  });

  it('NFR-MNT-001: a file outside the repository keeps the main project root', () => {
    const { main } = setup();
    const outside = realpathSync(mkdtempSync(join(tmpdir(), 'guard-out-')));
    const payload = { tool_name: 'Write', tool_input: { file_path: join(outside, 'a.ts') } };
    expect(resolveWorkRoot(main, payload)).toBe(main);
  });
});

describe('opsx gate (DEV-8): domain branches and the gate-1 handoff block', () => {
  const APPROVED_HANDOFF = block('propose', 'AWAITING_GATE_1') + block('gate-1', 'APPROVED');
  const editPayload = (root) => ({
    tool_name: 'Edit',
    tool_input: { file_path: join(root, 'a.ts') },
  });

  it('NFR-MNT-001: a feature/{domain}/DEV-n branch maps to its change name', () => {
    expect(changeNameForBranch('feature/docs/DEV-7-mcp')).toBe('dev-7-mcp');
    expect(changeNameForBranch('feature/auth/DEV-9-auth')).toBe('dev-9-auth');
    expect(changeNameForBranch('feature/docs/not-a-ticket')).toBeNull();
  });

  it('NFR-MNT-001: Reopened gate blocks edits', () => {
    expect(isApprovedHandoff(APPROVED_HANDOFF)).toBe(true);
    expect(isApprovedHandoff(APPROVED_HANDOFF + block('update', 'AWAITING_GATE_1'))).toBe(false);
    expect(isApprovedHandoff(block('propose', 'AWAITING_GATE_1'))).toBe(false);
    expect(isApprovedHandoff(block('gate-1', 'REJECTED'))).toBe(false);
    const root = makeRepo(
      'feature/docs/DEV-7-mcp',
      APPROVED_HANDOFF + block('update', 'AWAITING_GATE_1'),
    );
    expect(readApproval(root)).toBe(false);
    const cli = runCli(root, 'implementer', editPayload(root));
    expect(cli.status).toBe(2);
    expect(cli.stderr).toMatch(/no approved OpenSpec change/);
  });

  it('NFR-MNT-001: Edits allowed on an approved change', () => {
    const root = makeRepo('feature/docs/DEV-7-mcp');
    expect(readApproval(root)).toBe(false);
    const approved = makeRepo('feature/docs/DEV-7-mcp', APPROVED_HANDOFF);
    expect(readApproval(approved)).toBe(true);
    const cli = runCli(approved, 'implementer', editPayload(approved));
    expect(cli.status).toBe(0);
    expect(cli.stderr).toBe('');
  });

  it('NFR-MNT-001: Legacy proposal status does not approve', () => {
    const root = makeRepo('feature/docs/DEV-7-mcp', undefined, LEGACY_PROPOSAL);
    expect(readApproval(root)).toBe(false);
    const withPlanOnly = makeRepo(
      'feature/docs/DEV-7-mcp',
      block('propose', 'AWAITING_GATE_1'),
      LEGACY_PROPOSAL,
    );
    expect(readApproval(withPlanOnly)).toBe(false);
    const cli = runCli(withPlanOnly, 'implementer', editPayload(withPlanOnly));
    expect(cli.status).toBe(2);
    expect(cli.stderr).toMatch(/no approved OpenSpec change/);
  });
});
