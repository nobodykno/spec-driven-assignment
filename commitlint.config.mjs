// Commit-message rules for the commit-msg hook (NFR-MNT-001). See design D15.
const AREAS = [
  'auth',
  'tracker',
  'gateway',
  'web',
  'shared',
  'database',
  'docker',
  'workflow',
  'docs',
];
const REFS_FOOTER = /^Refs: DEV-\d+[\t ]*$/m;

export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'footer-refs': (parsed) => [
          REFS_FOOTER.test(parsed.raw ?? ''),
          'footer must contain the Jira key, e.g. "Refs: DEV-9"',
        ],
      },
    },
  ],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'build', 'ci', 'perf'],
    ],
    'scope-empty': [2, 'never'],
    'scope-enum': [2, 'always', AREAS],
    'footer-refs': [2, 'always'],
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 72],
    'subject-full-stop': [2, 'never', '.'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
  },
};
