// Claude Code PostToolUse hook: formats and lints the file the agent just edited (DEV-5 design D4).
// Exit 0 = done (a note on stderr if a tool could not run); exit 2 + stderr = remaining ESLint
// errors for the agent to fix. It never fails the edit itself, so an edit is never lost.
import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const FORMAT_FILE = /\.(ts|tsx|js|mjs|cjs|json|ya?ml)$/;
const LINT_FILE = /\.(ts|tsx|js|mjs|cjs)$/;
const MAX_REPORT = 4096;

const realPath = (path) => {
  try {
    return realpathSync(path);
  } catch {
    return null;
  }
};

/**
 * @param {unknown} payload Claude Code PostToolUse payload
 * @param {string} root project directory
 * @returns {string | null} the project-relative path to format, or null to do nothing
 */
export function fileToFormat(payload, root) {
  const filePath = payload?.tool_input?.file_path;
  if (typeof filePath !== 'string' || !FORMAT_FILE.test(filePath)) {
    return null;
  }
  // Resolve symlinks so a link inside the repo cannot point the formatter outside it.
  const realRoot = realPath(root);
  const realFile = realPath(resolve(root, filePath));
  if (!realRoot || !realFile) {
    return null;
  }
  const relativePath = relative(realRoot, realFile);
  return relativePath.startsWith('..') || isAbsolute(relativePath) ? null : relativePath;
}

const run = (root, tool, args) =>
  spawnSync(join(root, 'node_modules', '.bin', tool), args, { cwd: root, encoding: 'utf8' });

/** @returns {{ errors: string | null, note: string | null }} */
function formatAndLint(root, file) {
  const notes = [];
  if (run(root, 'prettier', ['--write', '--ignore-unknown', '--', file]).status !== 0) {
    notes.push(`prettier could not format ${file}`);
  }
  if (!LINT_FILE.test(file)) {
    return { errors: null, note: notes.join('; ') || null };
  }
  const eslint = run(root, 'eslint', ['--fix', '--no-warn-ignored', '--', file]);
  const output = `${eslint.stdout ?? ''}${eslint.stderr ?? ''}`.trim();
  if (eslint.status === 1) {
    return { errors: output, note: null };
  }
  if (eslint.status !== 0) {
    notes.push(`eslint did not run on ${file} (exit ${eslint.status}): ${output.slice(0, 200)}`);
  }
  return { errors: null, note: notes.join('; ') || null };
}

function readPayload() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    // Unreadable payload: nothing to format; the edit itself already happened.
    return null;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const payload = readPayload();
  const root = process.env.CLAUDE_PROJECT_DIR ?? payload?.cwd ?? process.cwd();
  const file = fileToFormat(payload, root);
  const { errors, note } = file ? formatAndLint(root, file) : { errors: null, note: null };
  if (errors) {
    console.error(`ESLint errors remain in ${file}:\n${errors.slice(0, MAX_REPORT)}`);
    process.exit(2);
  }
  if (note) {
    console.error(`post-edit-format: ${note}`);
  }
}
