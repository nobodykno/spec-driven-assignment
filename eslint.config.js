// Enforces docs/CODING_GUIDELINES.md (design D7 and D15).
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const CONFIG_FILES = ['**/*.config.{js,mjs,cjs,ts}'];
const TEST_FILES = ['**/*.test.{ts,tsx,mjs}', 'e2e/**'];

export default defineConfig(
  globalIgnores([
    '**/dist/',
    '**/coverage/',
    // Generated Claude/OpenSpec files are ignored; the project's own hooks are linted.
    '.claude/*',
    '!.claude/hooks/',
    'openspec/',
    'test-results/',
    'playwright-report/',
  ]),
  js.configs.recommended,
  tseslint.configs.strict,
  {
    languageOptions: { globals: globals.node },
    rules: {
      eqeqeq: ['error', 'always'],
      'max-depth': ['error', 3],
      complexity: ['error', 10],
      'max-lines-per-function': ['warn', { max: 30, skipBlankLines: true, skipComments: true }],
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-exports': [
        'error',
        { restrictDefaultExports: { direct: true, named: true, defaultFrom: true } },
      ],
      // Kebab-case file names are checked by scripts/check-file-names.mjs (pnpm lint).
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'default', format: ['camelCase'], leadingUnderscore: 'allow' },
        // PascalCase for React components and Zod schemas; UPPER_CASE for constants.
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['PascalCase'] },
        // Keys mirror external names (HTTP headers, env vars, JSON bodies).
        {
          selector: ['objectLiteralProperty', 'objectLiteralMethod', 'typeProperty'],
          format: null,
        },
        { selector: 'import', format: null },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      // Express error handlers need four parameters even when `next` is unused.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
        },
      ],
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    rules: { '@typescript-eslint/explicit-function-return-type': 'off' },
  },
  {
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: CONFIG_FILES,
    rules: { 'no-restricted-exports': 'off' },
  },
  {
    files: TEST_FILES,
    rules: { 'max-lines-per-function': 'off' },
  },
  {
    // CLI scripts and Claude Code hooks talk to their caller through the console.
    files: ['scripts/**', '.claude/hooks/**'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },
  prettier,
  // After eslint-config-prettier, which turns these off; they match .prettierrc.
  {
    rules: {
      curly: ['error', 'all'],
      semi: ['error', 'always'],
      quotes: ['error', 'single', { avoidEscape: true }],
    },
  },
);
