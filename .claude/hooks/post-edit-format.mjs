// Claude Code PostToolUse hook: formats and lints the file the agent just edited (DEV-5 design D4).
// Exit 0 = done; exit 2 + stderr = remaining ESLint errors for the agent to fix. Never blocks on
// its own failures, so an edit is never lost.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const FORMAT_FILE = /\.(ts|tsx|js|mjs|cjs|json|ya?ml)$/;
const LINT_FILE = /\.(ts|tsx|js|mjs|cjs)$/;
const MAX_REPORT = 4096;

/**
 * Returns the project-relative path to format, or null when the hook should do nothing.
 * @param {unknown} payload Claude Code PostToolUse payload
 * @param {string} root project directory
 */
export function fileToFormat(payload, root) {
  const filePath = payload?.tool_input?.file_path;
  if (typeof filePath !== 'string' || !FORMAT_FILE.test(filePath)) {
    return null;
  }
  const relativePath = relative(root, resolve(root, filePath));
  return relativePath.startsWith('..') || isAbsolute(relativePath) ? null : relativePath;
}

function runPrettier(root, file) {
  try {
    execFileSync(
      join(root, 'node_modules', '.bin', 'prettier'),
      ['--write', '--ignore-unknown', file],
      {
        cwd: root,
        stdio: 'ignore',
      },
    );
  } catch {
    // A syntax error is reported by ESLint below; formatting failures never block the edit.
  }
}

/** @returns {string | null} ESLint's report when errors remain after --fix */
function runEslint(root, file) {
  const result = spawnSync(
    join(root, 'node_modules', '.bin', 'eslint'),
    ['--fix', '--no-warn-ignored', file],
    { cwd: root, encoding: 'utf8' },
  );
  return result.status === 1 ? `${result.stdout}${result.stderr}`.trim() : null;
}

function readPayload() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return null;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const payload = readPayload();
  const root = process.env.CLAUDE_PROJECT_DIR ?? payload?.cwd ?? process.cwd();
  const file = fileToFormat(payload, root);
  if (file) {
    runPrettier(root, file);
    const report = LINT_FILE.test(file) ? runEslint(root, file) : null;
    if (report) {
      console.error(`ESLint errors remain in ${file}:\n${report.slice(0, MAX_REPORT)}`);
      process.exit(2);
    }
  }
}
