// Commit-message rules for the commit-msg hook (NFR-MNT-001). See design D13.
import { execFileSync } from 'node:child_process';

const JIRA_KEY = /^DEV-\d+$/;
const REFS_FOOTER = /^Refs: (DEV-\d+)[\t ]*$/m;
const HOUSEKEEPING_TYPES = ['docs', 'chore'];

function currentBranch() {
  if (process.env.COMMITLINT_BRANCH) {
    return process.env.COMMITLINT_BRANCH;
  }
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

const branch = currentBranch();

// Unscoped docs:/chore: commits are allowed only on main (housekeeping). Everything else is strict.
const isHousekeeping = ({ type, scope }) =>
  branch === 'main' && !scope && HOUSEKEEPING_TYPES.includes(type ?? '');

export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'scope-jira-key': (parsed) => [
          isHousekeeping(parsed) || JIRA_KEY.test(parsed.scope ?? ''),
          'scope must be a Jira key such as DEV-9 (unscoped docs:/chore: only on main)',
        ],
        'footer-refs-scope': (parsed) => {
          if (isHousekeeping(parsed) || !JIRA_KEY.test(parsed.scope ?? '')) {
            return [true];
          }
          const refs = REFS_FOOTER.exec(parsed.raw ?? '')?.[1];
          return [refs === parsed.scope, `footer must contain "Refs: ${parsed.scope}"`];
        },
      },
    },
  ],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'test', 'docs', 'chore', 'build', 'ci', 'perf', 'style'],
    ],
    'scope-jira-key': [2, 'always'],
    'footer-refs-scope': [2, 'always'],
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 72],
    'subject-full-stop': [2, 'never', '.'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
  },
};
