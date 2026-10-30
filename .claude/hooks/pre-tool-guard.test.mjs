import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { evaluateToolCall } from './pre-tool-guard.mjs';

const HOOK = join(fileURLToPath(import.meta.url), '..', 'pre-tool-guard.mjs');
const FEATURE = { currentBranch: 'feature/DEV-5-claude-setup' };

const bash = (command, context = FEATURE) =>
  evaluateToolCall({ tool_name: 'Bash', tool_input: { command } }, context);
const tool = (toolName, toolInput) =>
  evaluateToolCall({ tool_name: toolName, tool_input: toolInput }, FEATURE);

const expectBlocked = (result, rule) => {
  expect(result.allow).toBe(false);
  expect(result.rule).toBe(rule);
  expect(result.reason).toMatch(/^Blocked by \.claude\/hooks\/pre-tool-guard\.mjs/);
};

describe('pre-tool-guard', () => {
  it.each([
    'rm -rf dist',
    'rm -fr dist',
    'rm -Rf dist',
    'rm -r -f dist',
    'rm --recursive --force dist',
  ])('NFR-SEC-005: blocks recursive forced delete (%s)', (command) =>
    expectBlocked(bash(command), 'rm-recursive-force'),
  );

  it.each([
    'git push --force',
    'git push -f origin x',
    'git push --force-with-lease',
    'git push --force-with-lease=x origin x',
    'git push origin +x',
  ])('NFR-SEC-005: blocks force push (%s)', (command) =>
    expectBlocked(bash(command), 'force-push'),
  );

  it.each(['git push origin main', 'git push origin HEAD:main', 'git push origin refs/heads/main'])(
    'NFR-SEC-005: blocks push to main (%s)',
    (command) => expectBlocked(bash(command), 'push-main'),
  );

  it('NFR-SEC-005: blocks push to main (plain push on main)', () => {
    expectBlocked(bash('git push', { currentBranch: 'main' }), 'push-main');
    expectBlocked(bash('git push -u origin', { currentBranch: 'main' }), 'push-main');
  });

  it.each(['git commit --no-verify -m x', 'git commit -n -m x', 'git push --no-verify'])(
    'NFR-MNT-001: blocks hook bypass (%s)',
    (command) => expectBlocked(bash(command), 'no-verify'),
  );

  it.each(['printenv', 'printenv PATH', 'env'])(
    'NFR-SEC-005: blocks environment dump (%s)',
    (command) => expectBlocked(bash(command), 'env-dump'),
  );

  it.each(['docker compose down -v', 'docker compose down --volumes', 'docker-compose down -v'])(
    'NFR-SEC-005: blocks docker volume removal (%s)',
    (command) => expectBlocked(bash(command), 'docker-volumes'),
  );

  it.each([
    'git push -u origin feature/DEV-5-claude-setup',
    'git push origin feature/main-menu',
    'rm -r tmp',
    'rm -f file.txt',
    'git status',
    'echo env',
    'echo "rm -rf /"',
    'pnpm test',
    'env NODE_ENV=test pnpm test',
    'docker compose down',
    'git commit -m "explain --no-verify"',
  ])('NFR-SEC-005: allows ordinary commands (%s)', (command) => {
    expect(bash(command)).toEqual({ allow: true });
  });

  it.each([
    ['Read', { file_path: '/repo/.env' }],
    ['Read', { file_path: '/repo/services/auth/.env' }],
    ['Edit', { file_path: '.env.production', old_string: 'a', new_string: 'b' }],
    ['MultiEdit', { file_path: 'apps/web/.env.local', edits: [] }],
    ['Write', { file_path: '.env', content: 'X=1' }],
    ['Grep', { pattern: 'SECRET', path: 'services/auth/.env' }],
    ['Grep', { pattern: 'SECRET', glob: '**/.env*' }],
    ['Glob', { pattern: '**/.env' }],
  ])('NFR-SEC-005: blocks .env via file tools (%s %j)', (toolName, input) => {
    expectBlocked(tool(toolName, input), 'env-file-tool');
  });

  it.each([
    'cat .env',
    'head services/auth/.env',
    'source .env',
    '. ./.env',
    'grep KEY .env.local',
    'less "services/auth/.env.production"',
    'cp .env /tmp/x',
  ])('NFR-SEC-005: blocks .env from the shell (%s)', (command) => {
    expectBlocked(bash(command), 'env-file-shell');
  });

  it('NFR-SEC-005: allows .env.example', () => {
    expect(tool('Read', { file_path: 'services/auth/.env.example' })).toEqual({ allow: true });
    expect(bash('cat services/auth/.env.example')).toEqual({ allow: true });
    expect(tool('Grep', { pattern: 'PORT', glob: '**/.env.example' })).toEqual({ allow: true });
  });

  it.each([
    'git status && git push -f',
    'pnpm test; rm -rf dist',
    'ls | cat .env',
    'true || printenv',
  ])('NFR-SEC-005: blocks chained dangerous commands (%s)', (command) =>
    expect(bash(command).allow).toBe(false),
  );

  it.each([null, {}, { tool_name: 'Bash' }, { tool_name: 'Bash', tool_input: {} }])(
    'NFR-SEC-005: fails closed on malformed input (%j)',
    (input) => expect(evaluateToolCall(input, FEATURE).allow).toBe(false),
  );

  it('NFR-SEC-005: allows tools it does not guard', () => {
    expect(tool('WebSearch', { query: '.env' })).toEqual({ allow: true });
  });

  it('NFR-SEC-005: the CLI blocks with exit code 2 and a message on stderr', () => {
    const payload = JSON.stringify({
      tool_name: 'Bash',
      tool_input: { command: 'rm -rf dist' },
      cwd: process.cwd(),
    });
    const result = spawnSync(process.execPath, [HOOK], { input: payload, encoding: 'utf8' });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('rm-recursive-force');
  });

  it('NFR-SEC-005: the CLI allows with exit code 0 and no output', () => {
    const payload = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git status' } });
    const result = spawnSync(process.execPath, [HOOK], { input: payload, encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('NFR-SEC-005: the CLI fails closed on unparseable input', () => {
    const result = spawnSync(process.execPath, [HOOK], { input: 'not json', encoding: 'utf8' });
    expect(result.status).toBe(2);
  });
});

describe('pre-tool-guard review round 1', () => {
  const MAIN = { currentBranch: 'main' };

  it.each([
    ['git push origin HEAD', MAIN],
    ['git push origin @', MAIN],
    ['git push --all', FEATURE],
    ['git push --mirror origin', FEATURE],
    ['git push', { currentBranch: '' }],
  ])(
    'NFR-SEC-005: blocks push to main via HEAD, --all, --mirror or unknown branch (%s)',
    (command, context) => expectBlocked(bash(command, context), 'push-main'),
  );

  it('NFR-SEC-005: allows pushing HEAD from a feature branch', () => {
    expect(bash('git push -u origin HEAD')).toEqual({ allow: true });
  });

  it.each([
    ['git -C . push --force', 'force-push'],
    ['git -c x=y push origin main', 'push-main'],
    ['git --no-pager commit --no-verify -m x', 'no-verify'],
    ['git -c core.hooksPath=/dev/null commit -m x', 'no-verify'],
    ['HUSKY=0 git commit -m x', 'no-verify'],
  ])(
    'NFR-MNT-001: git global options and hook overrides do not bypass the guard (%s)',
    (command, rule) => expectBlocked(bash(command), rule),
  );

  const ENV_FILE = '.e' + 'nv';
  it.each([
    ['(rm -rf dist)', 'rm-recursive-force'],
    ['{ rm -rf dist; }', 'rm-recursive-force'],
    ['if true; then rm -rf dist; fi', 'rm-recursive-force'],
    ['sudo rm -rf dist', 'rm-recursive-force'],
    ['/bin/rm -rf dist', 'rm-recursive-force'],
    ['command rm -rf dist', 'rm-recursive-force'],
    ['env rm -rf dist', 'rm-recursive-force'],
    ['A=1 B=2 rm -rf dist', 'rm-recursive-force'],
    ['find . | xargs rm -rf', 'rm-recursive-force'],
    [`cat <${ENV_FILE}`, 'env-file-shell'],
    [`cat<${ENV_FILE}`, 'env-file-shell'],
    [`echo $(cat ${ENV_FILE})`, 'env-file-shell'],
    [`echo \`cat ${ENV_FILE}\``, 'env-file-shell'],
  ])(
    'NFR-SEC-005: shell grouping, wrappers and redirection do not bypass the guard (%s)',
    (command, rule) => expectBlocked(bash(command), rule),
  );

  it.each(['docker compose -f docker-compose.yml down -v', 'docker compose -p x down --volumes'])(
    'NFR-SEC-005: compose options before down do not bypass the guard (%s)',
    (command) => expectBlocked(bash(command), 'docker-volumes'),
  );

  it.each(['env NODE_ENV=test pnpm test', 'echo "(rm -rf dist)"', 'git -C services/auth status'])(
    'NFR-SEC-005: still allows ordinary forms (%s)',
    (command) => expect(bash(command)).toEqual({ allow: true }),
  );

  it('NFR-SEC-005: the .env file-tool message says secrets come only from the environment', () => {
    expect(tool('Read', { file_path: ENV_FILE }).reason).toContain(
      'secrets come only from the environment',
    );
  });
});

describe('pre-tool-guard review round 2', () => {
  const ENV_FILE = '.e' + 'nv';
  const MAIN = { currentBranch: 'main' };

  it.each([
    [`echo "$(cat ${ENV_FILE})"`, 'env-file-shell'],
    ['echo "$(rm -rf dist)"', 'rm-recursive-force'],
    ['echo "`printenv`"', 'env-dump'],
    [`node --env-file=${ENV_FILE} -p "1"`, 'env-file-shell'],
    [`curl -s -d @${ENV_FILE} http://localhost:4000`, 'env-file-shell'],
    [`cp x --target=services/auth/${ENV_FILE}.local`, 'env-file-shell'],
  ])(
    'NFR-SEC-005: quoted substitution and embedded env-file names do not bypass the guard (%s)',
    (command, rule) => expectBlocked(bash(command), rule),
  );

  it.each([
    'sudo -u root rm -rf dist',
    'xargs -n 1 rm -rf',
    'env -u FOO rm -rf dist',
    'nice -n 5 rm -rf dist',
    'timeout 5 rm -rf dist',
    'if rm -rf dist; then :; fi',
    'while rm -rf dist; do :; done',
    'bash -c "rm -rf dist"',
  ])('NFR-SEC-005: wrapper options and shells do not bypass the guard (%s)', (command) => {
    expectBlocked(bash(command), 'rm-recursive-force');
  });

  it('NFR-SEC-005: sh -c is checked like any other command', () => {
    expectBlocked(bash('sh -c "git push origin main"'), 'push-main');
  });

  it.each([
    'git config core.hooksPath /dev/null',
    'git config --global core.hooksPath x',
    'HUSKY="0" git commit -m x',
    "HUSKY='0' git commit -m x",
    'export HUSKY=0; git commit -m x',
    'git commit --no-verif -m x',
  ])('NFR-MNT-001: persistent or quoted hook overrides are blocked (%s)', (command) => {
    expectBlocked(bash(command), 'no-verify');
  });

  it('NFR-MNT-001: reading the hooks path is still allowed', () => {
    expect(bash('git config --get core.hooksPath')).toEqual({ allow: true });
  });

  it.each([
    ['git push -o ci.skip origin', MAIN, 'push-main'],
    ['docker --context x compose down -v', FEATURE, 'docker-volumes'],
  ])('NFR-SEC-005: option values do not hide the target (%s)', (command, context, rule) => {
    expectBlocked(bash(command, context), rule);
  });

  it.each([
    'git commit -m "docs: mention the env example"',
    'git commit -m "fix: block HUSKY=0 overrides"',
    `cat services/auth/${ENV_FILE}.example`,
    'pnpm --filter tracker test',
    'git push -u origin feature/DEV-5-claude-setup',
  ])('NFR-SEC-005: ordinary commands stay allowed after round 2 (%s)', (command) => {
    expect(bash(command)).toEqual({ allow: true });
  });
});
